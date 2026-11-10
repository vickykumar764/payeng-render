#!/usr/bin/env python3
"""mix.py voice music.wav sfx.wav [out.wav]
Music at exactly -6 dB (50 %) of the voice's gated loudness (BS.1770 integrated), SFX at -6 dB with peaks capped at
0.7 x the voice peak. No ducking, no compression: one gain per stem (+ a peak cap on the SFX stem only)."""
import sys, subprocess
import numpy as np
from dsp import SR, integrated, read_wav, write_wav, st, lp

def load_voice(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2).T

def peak_cap(x, ceiling, look=0.003, rel=0.08):
    """lookahead peak limiter on one stem (gain only where |x| would exceed the ceiling)"""
    a = np.abs(x).max(0)
    need = np.minimum(1.0, ceiling / np.maximum(a, 1e-12))
    L = int(look * SR)
    g = np.minimum.accumulate(np.r_[need[L:], np.ones(L)][::-1])[::-1] if False else None
    # sliding minimum over the lookahead window, then smooth release
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(need, size=2 * L + 1, mode="nearest")
    k = np.exp(-1.0 / (rel * SR))
    out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else cur * k + g[i] * (1 - k)
        out[i] = cur
    return x * out[None, :]

if __name__ == "__main__":
    v = load_voice(sys.argv[1]); m, _ = read_wav(sys.argv[2]); s, _ = read_wav(sys.argv[3])
    out = sys.argv[4] if len(sys.argv) > 4 else "mix.wav"
    n = v.shape[1]; m = st(m)[:, :n]; s = st(s)[:, :n]
    m = np.pad(m, ((0, 0), (0, n - m.shape[1]))); s = np.pad(s, ((0, 0), (0, n - s.shape[1])))
    Lv, Lm, Ls = integrated(v), integrated(m), integrated(s)
    m *= 10 ** ((Lv - 6.0 - Lm) / 20)
    s *= 10 ** ((Lv - 6.0 - Ls) / 20)
    vpk = np.abs(v).max()
    s = peak_cap(s, 0.7 * vpk)
    mix = v + m + s
    write_wav(out, mix)
    Lm2, Ls2 = integrated(m), integrated(s)
    print(f"voice {Lv:.2f} LUFS  peak {20*np.log10(vpk):.2f} dBFS")
    print(f"music {Lm2 - Lv:+.2f} dB vs voice (gated)   peak {20*np.log10(np.abs(m).max()):.2f} dBFS")
    print(f"sfx   {Ls2 - Lv:+.2f} dB vs voice (gated)   peak {np.abs(s).max()/vpk:.2f} x voice peak")
    print(f"mix   {integrated(mix):.2f} LUFS  peak {20*np.log10(np.abs(mix).max()):.2f} dBFS  -> {out}")
