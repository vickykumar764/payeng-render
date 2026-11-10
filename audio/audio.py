#!/usr/bin/env python3
"""Music + SFX stems for "The Man Who Moved a Mountain" (all original synthesis).
usage: python3 audio.py <voice> <outdir>   -> outdir/music.wav, outdir/sfx.wav (48 kHz stereo, exact voice length)
Music: Bhupali-pentatonic folk march in D (dholak-style drum, plucked bass, flute, tanpura-style drone). It stops on
"You see" (f716), a low drone carries the memory, a timpani roll builds to the breakthrough (f1021), the groove
returns, and a tender close ends with a low hit + ting on the last word (f1232).
SFX: hammer-on-rock hits, debris, footsteps, cuckoo on "madman", rock crack / rumble / crash, clay pot break,
wind, birds, crickets, whooshes. Event times in frames / 30.
"""
import sys, subprocess
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, st, place, widen, make_ir, convolve_st, write_wav
from instruments import m2f, pluck, pad, fife, glock, musicbox, timpani, cymbal, brush, triangle
from sfx_gen import rattle, clink, whoosh, bird_chirps, crickets, breeze, splash_big

FPS = 30.0
F = lambda f: f / FPS


def voice_len(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return len(raw) // 4


# ================================================================ drum + extra synths
def dholak(kind, vel, r):
    d = 0.6
    t = tt(d)
    if kind == "L":  # bass head 'ge' with pitch bend
        y = modal(d, [(92, 1.0, 0.22), (148, 0.45, 0.12), (231, 0.18, 0.06)], r, glide=0.18, glide_tau=0.05)
        y += lp(r.standard_normal(len(t)), 300) * np.exp(-t / 0.01) * 0.6
    elif kind == "H":  # treble 'na'
        y = modal(d, [(540, 1.0, 0.07), (890, 0.55, 0.045), (1270, 0.32, 0.03), (1830, 0.15, 0.02)], r)
        y += bp(r.standard_normal(len(t)), 1500, 7000, 1) * np.exp(-t / 0.004) * 0.5
    else:  # soft ghost 'ti/ka'
        y = modal(d, [(610, 0.6, 0.03), (980, 0.3, 0.02)], r) + bp(r.standard_normal(len(t)), 2000, 8000, 1) * np.exp(-t / 0.003) * 0.4
    return fades(y * vel, 0.0005, 0.05)


def shaker(vel, r):
    t = tt(0.12)
    return bp(r.standard_normal(len(t)), 4000, 11000, 2) * np.exp(-((t - 0.02) / 0.018) ** 2) * vel


def rock_hit(r, big=1.0):
    d = 1.2
    t = tt(d)
    tink = modal(d, [(2870, 0.7, 0.045), (4630, 0.45, 0.028), (7200, 0.25, 0.012)], r)
    nz = r.standard_normal(len(t))
    crack = bp(nz, 700, 6500, 1) * np.exp(-t / 0.014) * 1.5
    thump = np.sin(phase(68 * (1 + 0.5 * np.exp(-t / 0.012)))) * np.exp(-t / 0.07) * 1.4
    y = tink * 0.9 + crack + thump
    grit = rattle(0.7, r, 45, np.exp(-np.linspace(0, 1, ns(0.7)) * 4), heavy=False) * 0.45
    y[ns(0.03): ns(0.03) + len(grit)] += grit[: len(y) - ns(0.03)]
    return fades(y * big, 0.0, 0.15)


def tap(r, f0=2400.0, a=0.5):
    t = tt(0.25)
    y = modal(0.25, [(f0, 0.6, 0.03), (f0 * 1.62, 0.3, 0.018)], r) + bp(r.standard_normal(len(t)), 900, 5000, 1) * np.exp(-t / 0.008) * 0.6
    y += np.sin(phase(90 * np.ones(len(t)))) * np.exp(-t / 0.03) * 0.4
    return y * a


def step_soft(r, a=0.5):
    t = tt(0.22)
    nz = r.standard_normal(len(t))
    y = lp(nz, 500, 2) * np.exp(-t / 0.025) * 1.2 + bp(nz, 900, 4000, 1) * np.clip(t / 0.015, 0, 1) * np.exp(-t / 0.05) * 0.18
    return y * a


def rumble(dur, r, a=1.0):
    n = ns(dur)
    t = np.arange(n) / SR
    y = lp(colored(n, r, 1.2), 220, 2) * (0.6 + 0.4 * smooth_noise(n, r, 6)) * np.clip(t / (dur * 0.6), 0, 1) ** 1.5
    y += bp(colored(n, r, 0.5), 500, 2500, 1) * 0.15 * np.clip(t / dur, 0, 1) ** 2
    return fades(y * a, 0.05, 0.05)


def crash_big(r, a=1.0, dur=2.2):
    t = tt(dur)
    nz = r.standard_normal(len(t))
    y = lp(colored(len(t), r, 1.0), 300, 2) * np.exp(-t / 0.45) * 2.2
    y += np.sin(phase(46 * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.18) * 2.0
    y += bp(nz, 600, 5000, 1) * np.exp(-t / 0.05) * 1.6
    deb = rattle(dur - 0.1, r, 80, np.exp(-np.linspace(0, 1, ns(dur - 0.1)) * 3.5), heavy=True) * 0.9
    y[ns(0.05): ns(0.05) + len(deb)] += deb[: len(y) - ns(0.05)]
    return fades(y * a, 0.0, 0.3)


def crack_sharp(r, a=1.0):
    t = tt(0.5)
    nz = r.standard_normal(len(t))
    y = bp(nz, 1200, 8000, 1) * np.exp(-t / 0.006) * 1.5
    for k in range(4):
        y += np.roll(bp(nz, 800, 6000, 1) * np.exp(-t / 0.004), ns(0.02 + 0.03 * k)) * 0.6
    y += np.sin(phase(120 * np.ones(len(t)))) * np.exp(-t / 0.04) * 0.5
    return y * a


def cuckoo(r, a=1.0):
    out = np.zeros(ns(0.75))
    for t0, f, d in [(0.0, 1318.5, 0.2), (0.27, 1046.5, 0.32)]:
        t = tt(d)
        env = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.06, 0, 1)
        y = (np.sin(phase(f * np.ones(len(t)))) + 0.18 * np.sin(2 * phase(f * np.ones(len(t))))) * env
        y += bp(r.standard_normal(len(t)), f * 0.8, f * 1.5, 1) * env * 0.06
        out[ns(t0): ns(t0) + len(y)] += y
    return out * a


def clay_break(r, a=1.0):
    y = np.zeros(ns(1.2))
    t = tt(1.2)
    y += lp(r.standard_normal(len(t)), 400, 2) * np.exp(-t / 0.03) * 1.2
    y += bp(r.standard_normal(len(t)), 1500, 7000, 1) * np.exp(-t / 0.02) * 1.0
    for k in range(9):
        c = clink(r, f0=r.uniform(1800, 4200), dur=0.12, bright=0.6) * r.uniform(0.3, 0.8)
        i = ns(0.01 + k * r.uniform(0.02, 0.07))
        y[i: i + len(c)] += c[: len(y) - i]
    return y * a


def wings(dur, r, a=1.0):
    n = ns(dur)
    t = np.arange(n) / SR
    rate = 7.5 + 1.5 * smooth_noise(n, r, 1.0)
    m = (0.5 + 0.5 * np.sin(phase(rate))) ** 4
    return bp(r.standard_normal(n), 250, 2200, 1) * m * np.exp(-t / (dur * 0.6)) * a


# ================================================================ music
def music(N):
    r = rng(11)
    out = np.zeros((2, N))
    beat = 60 / 96.0
    e8 = beat / 2
    D2, A1, A2, D3, B1, G1 = m2f(38), m2f(33), m2f(45), m2f(50), m2f(35), m2f(31)
    STOP = F(716)
    BREAK = F(1021)

    def drone(t0, t1, vel=0.2):
        t = t0
        pat = [A2, D3, D3, m2f(38)]
        i = 0
        while t < t1:
            place(out, pan(pluck(pat[i % 4], 0.5, r, dur=2.4, bright=0.75, pos=0.08), [-0.35, 0.2, 0.35, -0.1][i % 4]), t, vel)
            t += beat * 1.5
            i += 1

    def groove(t0, t1, intensity=1.0, shk=False):
        pat = [("LH", 1.0), ("L", 0.6), ("H", 0.8), ("S", 0.5), ("H", 0.75), ("S", 0.45), ("LH", 0.9), ("H", 0.7)]
        t, i = t0, 0
        while t < t1 - 0.01:
            k, v = pat[i % 8]
            v *= intensity * r.uniform(0.9, 1.05)
            if "L" in k:
                place(out, pan(dholak("L", v, r), -0.1), t, 0.9)
            if "H" in k:
                place(out, pan(dholak("H", v, r), 0.25), t, 0.55)
            if k == "S":
                place(out, pan(dholak("S", v, r), 0.3), t, 0.5)
            if shk:
                for s in range(2):
                    place(out, pan(shaker(0.18 * (1.3 if s == 0 else 0.8), r), 0.5), t + s * e8 / 2, 1.0)
            if i % 4 == 0:  # bass on beats 1 and 3
                bar = int(i // 8)
                root = [D2, D2, A1, D2, B1, A1, G1, A1][bar % 8] if i % 8 == 0 else [A1, D2, D2, A1, D2, D2, D2, D2][bar % 8]
                place(out, pan(pluck(root, 0.75, r, dur=0.9, bright=0.35, pos=0.22), 0.0), t, 0.75 * intensity)
            t += e8
            i += 1

    def flute(t0, notes, vel=0.55, octave=0, p=0.15):
        for (b, d, m) in notes:
            ts = t0 + b * beat
            if ts >= STOP and ts < BREAK:
                continue
            dur = d * beat * 0.95
            if ts < STOP and ts + dur > STOP:
                dur = STOP - ts - 0.02
            place(out, pan(fife(m2f(m + 12 * octave), max(0.05, dur), vel, r, rel=0.06), p), ts, 1.0)

    A = [(0, 1, 69), (1, 0.5, 71), (1.5, 0.5, 74), (2, 1.5, 76), (3.5, 0.5, 74), (4, 1, 71), (5, 1, 69), (6, 2, 66)]
    B = [(0, 0.5, 74), (0.5, 0.5, 76), (1, 1, 78), (2, 1, 81), (3, 1, 78), (4, 0.5, 76), (4.5, 0.5, 74), (5, 1, 76), (6, 2, 74)]
    # --- hook: drone + building drum
    drone(0.0, STOP)
    for k, tm in enumerate(np.arange(1.6, 3.5, e8 / 2)):
        place(out, pan(dholak("H" if k % 2 else "S", 0.25 + 0.5 * (tm - 1.6) / 1.9, r), 0.2), tm, 0.5)
    T0 = F(106)
    groove(T0, STOP, 1.0)
    bar = 4 * beat
    flute(T0 + bar, A)
    flute(T0 + 3 * bar, [n for n in B if not (13.65 < T0 + 3 * bar + n[0] * beat < 14.9)])
    # giggle on "laughed" (f415 = 13.83 s): fast flute trill
    for j in range(8):
        place(out, pan(fife(m2f(78 if j % 2 == 0 else 81), 0.07, 0.4, r, rel=0.03), 0.2), F(413) + j * 0.085, 1.0)
    # timelapse: shaker on, flute an octave up
    groove(F(476), STOP, 1.1, shk=True)
    flute(T0 + 5 * bar, A, 0.5, octave=1)
    flute(T0 + 7 * bar, B, 0.5)
    # stop on "You see": brushed cut
    place(out, pan(brush(0.5, r, 0.4, swish=True), 0.0), STOP - 0.18, 0.8)
    # --- memory: low drone pad + sparse music box
    place(out, pad([m2f(38), m2f(45), m2f(50)], BREAK - STOP - 1.0, 0.32, r, att=1.0, rel=1.2, warm=480), STOP, 1.0)
    for tm, m in [(24.75, 74), (25.55, 71), (26.35, 69), (27.15, 66)]:
        place(out, pan(musicbox(m2f(m), 0.35, r, 1.6), 0.25), tm, 0.8)
    for j, m in enumerate([86, 83, 81, 78, 76, 74, 71, 69]):
        place(out, pan(musicbox(m2f(m), 0.22, r, 1.2), -0.2 + 0.05 * j), F(853) + j * (F(903) - F(853)) / 8, 0.7)
    # build to the breakthrough: timpani roll, accelerating, crescendo
    tm, k = F(965), 0
    while tm < BREAK - 0.05:
        u = (tm - F(965)) / (BREAK - F(965))
        place(out, pan(timpani(m2f(38), 0.08 + 0.55 * u ** 1.6, r, 0.8), -0.1 if k % 2 else 0.1), tm, 0.8)
        tm += 0.32 - 0.25 * u
        k += 1
    place(out, pad([m2f(45), m2f(52), m2f(57)], BREAK - F(985), 0.25, r, att=BREAK - F(985) - 0.1, rel=0.2, warm=900), F(985), 1.0)
    # --- breakthrough: big hit + bright chord swell, groove returns
    place(out, pan(timpani(m2f(38), 1.0, r, 2.4), 0.0), BREAK, 1.2)
    place(out, cymbal(0.6, r, 2.6), BREAK, 0.5)
    place(out, pad([m2f(50), m2f(54), m2f(57), m2f(59), m2f(62)], 3.2, 0.5, r, att=0.08, rel=1.2, warm=2200), BREAK, 1.0)
    G2 = F(1040)
    groove(G2, F(1140), 0.9, shk=True)
    flute(G2 + 2 * beat, B, 0.55, octave=0, p=0.1)
    for j, m in enumerate([74, 76, 78, 81, 83, 86, 88]):  # green route draws: rising glock
        place(out, pan(glock(m2f(m), 0.45, r, 1.4), 0.3), F(1094) + j * (F(1118) - F(1094)) / 7, 0.6)
    # --- payoff: tender close
    END = N / SR
    place(out, pad([m2f(50), m2f(57), m2f(62), m2f(64)], END - F(1140), 0.33, r, att=0.9, rel=0.4, warm=1100), F(1140), 1.0)
    drone(F(1140), END)
    for (tm, d, m) in [(F(1146), 0.9, 69), (F(1176), 0.5, 71), (F(1192), 0.45, 74), (F(1205), 0.7, 76), (F(1228), 0.12, 74), (F(1232), 0.7, 74)]:
        place(out, pan(fife(m2f(m), d, 0.42, r, rel=0.1), 0.12), tm, 1.0)
    place(out, pan(timpani(m2f(38), 0.75, r, 1.6), 0.0), F(1231), 1.0)
    place(out, pan(glock(m2f(86), 0.6, r, 1.6), 0.25), F(1232), 0.8)
    place(out, pan(triangle(0.35, r, 1.4), 0.3), F(1232), 0.5)
    # room
    ir = make_ir(1.3, 5, hf=1.4)
    wet = convolve_st(out, ir)
    out = out + 0.16 * wet
    return fades(out, 0.0, 0.25)


# ================================================================ sfx
def sfx(N):
    r = rng(23)
    out = np.zeros((2, N))
    END = N / SR
    # ambience beds
    amb = breeze(END, r, 0.35, 0.15, 800)
    lvl = np.interp(np.arange(N) / SR, [0, F(712), F(716), F(815), F(830), F(905), F(912), F(958), F(965), END], [1, 1, 0.6, 0.6, 1.6, 1.6, 0.5, 0.5, 1, 1])
    out += amb * lvl[None, :] * 0.7
    place(out, widen(bird_chirps(F(268) - F(106), r, 0.9), r), F(106), 0.10)
    place(out, widen(bird_chirps(F(712) - F(600), r, 0.7, "blackbird"), r), F(600), 0.07)
    place(out, widen(bird_chirps(F(1136) - F(1048), r, 0.8), r), F(1048), 0.08)
    place(out, widen(crickets(F(965) - F(912), r, 3), r), F(912), 0.035)
    # hook
    for fi, big in [(35, 1.0), (72, 1.25)]:
        place(out, pan(whoosh(0.32, r, 0.26, 300, 1800, 0.8, 0.06), 0.1), F(fi) - 0.27, 0.35)
        place(out, pan(rock_hit(r, big), 0.15), F(fi), 0.5)
    # walk to the hill + challenge
    place(out, pan(whoosh(1.4, r, 0.9, 200, 1500, 0.9, 0.4, 0.05), 0.0), F(100), 0.22)
    for fs in np.arange(112, 236, 10.4):
        place(out, pan(step_soft(r, r.uniform(0.35, 0.5)), -0.05 if int(fs) % 2 else 0.05), F(fs), 0.6)
    place(out, pan(whoosh(0.35, r, 0.2, 400, 2400), 0.1), F(246), 0.25)
    place(out, pan(tap(r, 1500, 0.4), 0.1), F(255), 0.5)
    # climb + hits
    for fs in np.arange(270, 334, 8.8):
        place(out, pan(step_soft(r, r.uniform(0.35, 0.5)), 0.0), F(fs), 0.6)
    place(out, pan(whoosh(0.32, r, 0.26, 300, 1800, 0.8, 0.06), 0.1), F(357) - 0.27, 0.35)
    place(out, pan(rock_hit(r, 1.0), 0.15), F(357), 0.5)
    place(out, pan(rock_hit(r, 0.55), 0.15), F(372), 0.45)
    # village: distant hammering, cuckoo on "madman"
    for fi in range(404, 476, 20):
        place(out, pan(tap(r, r.uniform(2200, 2900), 0.25), -0.2), F(fi), 0.45)
    place(out, pan(cuckoo(r, 0.55), 0.35), F(452), 0.55)
    # timelapse: rapid taps, whooshes on the year flashes
    for fi in range(479, 600, 9):
        place(out, pan(tap(r, r.uniform(2000, 3200), 0.4), -0.1), F(fi), 0.55)
    for fc in (526, 575):
        place(out, pan(whoosh(0.7, r, 0.55, 500, 4000, 0.7, 0.12, 0.25), 0.0), F(fc) - 0.55, 0.4)
    # losing
    for fi in range(600, 684, 16):
        place(out, pan(tap(r, r.uniform(2300, 2800), 0.18), -0.15), F(fi), 0.4)
    place(out, pan(crack_sharp(r, 0.9), 0.3), F(680), 0.4)
    place(out, pan(rumble(F(700) - F(684) + 0.2, r, 1.0), 0.3), F(684), 0.6)
    place(out, pan(crash_big(r, 1.0), 0.25), F(700), 0.42)
    place(out, pan(crash_big(r, 0.4, 1.2), 0.25), F(704), 0.3)
    # memory
    place(out, pan(whoosh(0.9, r, 0.75, 150, 900, 0.9, 0.3, 0.02), 0.0), F(706), 0.25)
    for fs in np.arange(716, 776, 11):
        place(out, pan(step_soft(r, 0.28), 0.05), F(fs), 0.6)
    place(out, pan(bp(r.standard_normal(ns(0.3)), 500, 4000, 1) * np.exp(-tt(0.3) / 0.09) * 0.6, -0.05), F(776), 0.5)
    place(out, pan(whoosh(0.5, r, 0.3, 300, 1400, 0.8, 0.1), 0.1), F(778), 0.15)
    place(out, pan(clay_break(r, 0.9), 0.1), F(792), 0.45)
    sp = splash_big(r)
    place(out, pan(fades(sp[: ns(0.8)], 0.0, 0.2) * 0.25, 0.1), F(793), 0.4)
    # aerial: more air
    place(out, pan(whoosh(1.3, r, 0.8, 200, 1600, 1.0, 0.5, 0.1), 0.0), F(815), 0.22)
    # breakthrough
    place(out, pan(whoosh(0.4, r, 0.33, 250, 1600, 0.8, 0.06), 0.1), F(1021) - 0.34, 0.45)
    place(out, pan(rock_hit(r, 1.3), 0.0), F(1021), 0.45)
    place(out, pan(crash_big(r, 1.2, 2.6), 0.0), F(1021) + 0.02, 0.45)
    place(out, pan(whoosh(1.4, r, 0.15, 300, 2600, 1.0, 0.9, 0.3), 0.0), F(1022), 0.35)
    # route: crane whoosh
    place(out, pan(whoosh(1.1, r, 0.6, 250, 1800, 0.9, 0.3), 0.0), F(1078), 0.25)
    for fs in np.arange(1050, 1080, 9):
        place(out, pan(step_soft(r, 0.2), 0.1), F(fs), 0.5)
    # payoff: pull-back air + wings out of the gap
    place(out, pan(whoosh(1.6, r, 1.0, 200, 1300, 1.0, 0.5, 0.05), 0.0), F(1199), 0.2)
    place(out, widen(wings(1.5, r, 0.6), r), F(1214), 0.25)
    return fades(out, 0.01, 0.25)


if __name__ == "__main__":
    voice, outdir = sys.argv[1], sys.argv[2]
    N = voice_len(voice)
    m = music(N)
    s = sfx(N)
    write_wav(f"{outdir}/music.wav", m / max(1e-9, np.abs(m).max()) * 0.5)
    write_wav(f"{outdir}/sfx.wav", s / max(1e-9, np.abs(s).max()) * 0.5)
    print("stems written", N / SR, "s")
