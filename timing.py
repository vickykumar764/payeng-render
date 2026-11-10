#!/usr/bin/env python3
"""Word timings for a voiceover from its script, without speech recognition.

usage: python3 timing.py voice.mp3 script.txt --out work

1. Decode the voice, take a 10 ms RMS envelope, find silences >= 0.18 s -> speech segments.
2. Split the script into phrases at punctuation; count syllables per phrase.
3. DP: every speech segment and phrase is covered once, in order. A group is k phrases in l segments (k or l = 1).
   Cost = squared log deviation of the group's speaking rate from the global rate
        + a penalty for a sentence end inside a segment, a small one for a comma inside a segment
        + a penalty for a pause inside a phrase, growing with the pause length.
4. Words get times by syllable share inside their group's speech (internal pauses skipped).
Writes <out>/words.json, <out>/phrases.json, <out>/segments.json.
"""
import argparse, json, math, os, re, subprocess, sys
import numpy as np

SR = 16000


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def segments(x, hop=0.01, min_sil=0.18, rel_db=-30.0):
    n = int(hop * SR)
    fr = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    thr = max(np.percentile(db, 95) + rel_db, np.percentile(db, 5) + 8)
    sp = db > thr
    # close tiny gaps, then find silences >= min_sil
    segs, i, N = [], 0, len(sp)
    while i < N:
        if sp[i]:
            j = i
            while True:
                while j < N and sp[j]:
                    j += 1
                k = j
                while k < N and not sp[k]:
                    k += 1
                if k < N and (k - j) * hop < min_sil:
                    j = k
                    continue
                break
            if (j - i) * hop >= 0.08:
                segs.append([i * hop, j * hop])
            i = j
        else:
            i += 1
    return segs, db, thr


NUM = {"nineteen": 2, "sixty": 2, "twenty": 2, "fifty": 2, "fifteen": 2, "seventy": 3, "eleven": 3, "seven": 2}


DEV_VOW = set(range(0x0904, 0x0915))            # अ-औ (independent vowels)
DEV_CONS = set(range(0x0915, 0x093A)) | set(range(0x0958, 0x0960))  # क-ह + ड़/ढ़/क़/ख़/ग़/ज़/फ़
HALANT = 0x094D  # ्


def syl_dev(word):
    """Approx syllables in a Devanagari word: one per vowel nucleus (independent
    vowel, or consonant with inherent 'a' / vowel sign); a consonant joined by
    halant to the next consonant adds no syllable of its own."""
    import unicodedata
    NUKTA = 0x093C  # ़: joins the previous consonant (ड़/ढ़/क़/ख़/ग़/ज़/फ़)
    n, chs = 0, list(unicodedata.normalize("NFC", word))
    for i, ch in enumerate(chs):
        o = ord(ch)
        if o == NUKTA:
            continue
        if o in DEV_VOW:
            n += 1
        elif o in DEV_CONS:
            j = i + 1
            while j < len(chs) and ord(chs[j]) == NUKTA:
                j += 1  # look past the nukta: it belongs to this consonant
            nxt = chs[j] if j < len(chs) else None
            if nxt is not None and ord(nxt) == HALANT:
                continue  # conjunct: joins the next syllable
            if nxt is None:
                continue  # word-final bare consonant: inherent 'a' deleted (schwa), coda only
            n += 1
    return max(1, n)


def syl(word):
    if re.search(r"[\u0900-\u097f]", word):
        return syl_dev(word)
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    if w in NUM:
        return NUM[w]
    parts = word.lower().split("-")
    if len(parts) > 1:
        return sum(syl(p) for p in parts)
    v = re.findall(r"[aeiouy]+", w)
    n = len(v)
    if w.endswith("e") and not w.endswith(("le", "ee", "ye")) and n > 1:
        n -= 1
    if w.endswith("es") and n > 1 and not re.search(r"(ss|sh|ch|x|z|ce|ge|se)es$", w):
        n -= 1
    if w.endswith("ed") and n > 1 and not re.search(r"[td]ed$", w):
        n -= 1
    return max(1, n)


def phrases_of(text):
    text = re.sub(r"\s+", " ", text.strip())
    out = []
    for m in re.finditer(r"[^.,!?;:—।]+[.,!?;:—।]*", text):
        s = m.group(0).strip()
        if not re.search(r"[A-Za-z0-9\u0900-\u097f]", s):
            continue
        end = s[-1] if s[-1] in ".,!?;:—।" else ""
        words = s.split()
        out.append({"text": s, "words": words, "syl": [syl(w) for w in words],
                    "sentence_end": end in ".!?।", "comma": end in ",;:—"})
    return out


def align(P, S):
    nP, nS = len(P), len(S)
    tot_syl = sum(sum(p["syl"]) for p in P)
    tot_sp = sum(b - a for a, b in S)
    rate = tot_syl / tot_sp
    INF = float("inf")
    best = [[INF] * (nS + 1) for _ in range(nP + 1)]
    back = [[None] * (nS + 1) for _ in range(nP + 1)]
    best[0][0] = 0.0
    MAXK = 6
    for i in range(nP + 1):
        for j in range(nS + 1):
            if best[i][j] == INF:
                continue
            for k in range(1, MAXK + 1):
                for l in range(1, MAXK + 1):
                    if (k > 1 and l > 1) or i + k > nP or j + l > nS:
                        continue
                    grp = P[i:i + k]
                    sy = sum(sum(p["syl"]) for p in grp)
                    sp = sum(S[j + t][1] - S[j + t][0] for t in range(l))
                    c = 3.0 * math.log((sy / max(sp, 0.05)) / rate) ** 2
                    for p in grp[:-1]:  # phrase ends inside one segment
                        c += 4.0 if p["sentence_end"] else 0.6
                    for t in range(l - 1):  # pauses inside one phrase
                        gap = S[j + t + 1][0] - S[j + t][1]
                        c += 0.8 + 6.0 * gap
                    if best[i][j] + c < best[i + k][j + l]:
                        best[i + k][j + l] = best[i][j] + c
                        back[i + k][j + l] = (i, j)
    if best[nP][nS] == INF:
        sys.exit("alignment failed")
    groups, i, j = [], nP, nS
    while (i, j) != (0, 0):
        pi, pj = back[i][j]
        groups.append((pi, i, pj, j))
        i, j = pi, pj
    return groups[::-1], rate, best[nP][nS]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("voice")
    ap.add_argument("script")
    ap.add_argument("--out", default="work")
    ap.add_argument("--fps", type=int, default=30)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    x = load(a.voice)
    dur = len(x) / SR
    S, db, thr = segments(x)
    P = phrases_of(open(a.script).read())
    groups, rate, cost = align(P, S)
    words, phr = [], []
    for (p0, p1, s0, s1) in groups:
        segs = S[s0:s1]
        sp = sum(b - a for a, b in segs)
        syls = [s for p in P[p0:p1] for s in p["syl"]]
        wl = [w for p in P[p0:p1] for w in p["words"]]
        tot = sum(syls)

        def at(u):  # speech-time fraction -> clock time, skipping internal pauses
            t = u * sp
            for a0, b0 in segs:
                if t <= (b0 - a0) + 1e-9:
                    return a0 + t
                t -= b0 - a0
            return segs[-1][1]
        acc, wi = 0, 0
        for p in P[p0:p1]:
            pst = at(acc / tot)
            for w, s in zip(p["words"], p["syl"]):
                st, en = at(acc / tot), at((acc + s) / tot)
                words.append({"word": w, "start": round(st, 3), "end": round(en, 3), "f": round(st * a.fps)})
                acc += s
            phr.append({"text": p["text"], "start": round(pst, 3), "end": round(at(acc / tot), 3),
                        "f0": round(pst * a.fps), "f1": round(at(acc / tot) * a.fps), "segments": [s0, s1]})
    json.dump(words, open(os.path.join(a.out, "words.json"), "w"), indent=1)
    json.dump(phr, open(os.path.join(a.out, "phrases.json"), "w"), indent=1)
    json.dump({"duration": dur, "frames": round(dur * a.fps), "segments": S, "threshold_db": float(thr)},
              open(os.path.join(a.out, "segments.json"), "w"), indent=1)
    print(f"duration {dur:.3f}s  frames {round(dur * a.fps)}  segments {len(S)}  phrases {len(P)}  rate {rate:.2f} syl/s  cost {cost:.2f}")
    for p in phr:
        print(f"  f{p['f0']:5d}-{p['f1']:5d}  {p['start']:6.2f}-{p['end']:6.2f}  seg{p['segments']}  {p['text']}")


if __name__ == "__main__":
    main()


def refine(words_path, voice, out_path, win=0.09):
    """Snap each word start to the deepest envelope dip within +-win s (word boundaries are usually energy dips)."""
    x = load(voice)
    n = int(0.005 * SR)
    fr = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    db = np.convolve(db, np.ones(3) / 3, mode="same")
    W = json.load(open(words_path))
    for i, w in enumerate(W):
        if i == 0 or W[i - 1]["end"] < w["start"] - 0.05:  # first word after a pause: keep the segment onset
            continue
        c = int(w["start"] / 0.005)
        lo, hi = max(0, c - int(win / 0.005)), min(len(db) - 1, c + int(win / 0.005))
        k = lo + int(np.argmin(db[lo:hi + 1]))
        if db[lo:hi + 1].max() - db[k] >= 6:
            t = round(k * 0.005, 3)
            W[i - 1]["end"] = t
            w["start"] = t
            w["f"] = round(t * 30)
    json.dump(W, open(out_path, "w"), indent=1)
    return W
