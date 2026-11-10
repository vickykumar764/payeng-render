#!/usr/bin/env python3
"""Music + SFX stems for "Jadav Payeng — The Forest Man of India" (all original synthesis).
usage: python3 audio_payeng.py <voice> <outdir>   -> outdir/music.wav, outdir/sfx.wav (48 kHz stereo, exact voice length)
Music: Bhupali-pentatonic folk in D (dholak-style drum, plucked bass, flute, tanpura-style drone).
Arc: groove on the bare sand -> SAD DROP on the dead snakes (f481, low drone only) -> gentle return
when the first seedling goes in (f670) -> timelapse groove (f886) -> giggle trill on "हँसे" (f1112) ->
rising glock as the forest grows (f1288) -> SECRET drone + music box (f1790) -> timpani build to the
"मोलाई वन" board reveal (f2152) -> scale swell (f2199, peak f2366) -> tender payoff close, low hit + ting
on the last word "वन-मानव" (f2618).
SFX: breeze bed, footsteps to the riverbank, dust + splash on planting, cuckoo on "हँसे", deer hoofbeats,
elephant low call, tiger growl, whooshes on the aerials, board-reveal ting, wings at the payoff.
Event times in frames / 30.
"""
import sys, subprocess
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, st, place, widen, make_ir, convolve_st, write_wav
from instruments import m2f, pluck, pad, fife, glock, musicbox, timpani, cymbal, brush, triangle, brass
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
    if kind == "L":
        y = modal(d, [(92, 1.0, 0.22), (148, 0.45, 0.12), (231, 0.18, 0.06)], r, glide=0.18, glide_tau=0.05)
        y += lp(r.standard_normal(len(t)), 300) * np.exp(-t / 0.01) * 0.6
    elif kind == "H":
        y = modal(d, [(540, 1.0, 0.07), (890, 0.55, 0.045), (1270, 0.32, 0.03), (1830, 0.15, 0.02)], r)
        y += bp(r.standard_normal(len(t)), 1500, 7000, 1) * np.exp(-t / 0.004) * 0.5
    else:
        y = modal(d, [(610, 0.6, 0.03), (980, 0.3, 0.02)], r) + bp(r.standard_normal(len(t)), 2000, 8000, 1) * np.exp(-t / 0.003) * 0.4
    return fades(y * vel, 0.0005, 0.05)


def shaker(vel, r):
    t = tt(0.12)
    return bp(r.standard_normal(len(t)), 4000, 11000, 2) * np.exp(-((t - 0.02) / 0.018) ** 2) * vel


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


def cuckoo(r, a=1.0):
    out = np.zeros(ns(0.75))
    for t0, f, d in [(0.0, 1318.5, 0.2), (0.27, 1046.5, 0.32)]:
        t = tt(d)
        env = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.06, 0, 1)
        y = (np.sin(phase(f * np.ones(len(t)))) + 0.18 * np.sin(2 * phase(f * np.ones(len(t))))) * env
        y += bp(r.standard_normal(len(t)), f * 0.8, f * 1.5, 1) * env * 0.06
        out[ns(t0): ns(t0) + len(y)] += y
    return out * a


def growl(dur, r, a=1.0):
    """tiger growl: low rumble pulsed at ~9 Hz"""
    n = ns(dur)
    t = np.arange(n) / SR
    y = lp(colored(n, r, 1.4), 160, 2) * (0.55 + 0.45 * np.sin(phase(9.0 * np.ones(n)))) ** 2
    y += np.sin(phase(55 * np.ones(n))) * 0.4 * (0.5 + 0.5 * np.sin(phase(9.0 * np.ones(n))))
    return fades(y * a, 0.1, 0.2)


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
    SAD = F(481)      # dead snakes: music drops out
    PLANT = F(670)    # first seedling: gentle return
    TIMELAPSE = F(886)
    SECRET = F(1790)  # aerial secret: drone + music box
    NAME = F(2000)    # officials arrive
    BOARD = F(2152)   # "मोलाई वन" reveal
    SCALE = F(2199)   # aerial scale swell
    PAYOFF = F(2405)
    CLOSE = F(2618)   # "वन-मानव": low hit + ting
    END = N / SR

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
            if i % 4 == 0:
                bar = int(i // 8)
                root = [D2, D2, A1, D2, B1, A1, G1, A1][bar % 8] if i % 8 == 0 else [A1, D2, D2, A1, D2, D2, D2, D2][bar % 8]
                place(out, pan(pluck(root, 0.75, r, dur=0.9, bright=0.35, pos=0.22), 0.0), t, 0.75 * intensity)
            t += e8
            i += 1

    def flute(t0, notes, vel=0.55, octave=0, p=0.15, stop_at=None):
        for (b, d, m) in notes:
            ts = t0 + b * beat
            if stop_at is not None and ts >= stop_at:
                continue
            dur = d * beat * 0.95
            if stop_at is not None and ts + dur > stop_at:
                dur = stop_at - ts - 0.02
            if dur <= 0.05:
                continue
            place(out, pan(fife(m2f(m + 12 * octave), max(0.05, dur), vel, r, rel=0.06), p), ts, 1.0)

    A = [(0, 1, 69), (1, 0.5, 71), (1.5, 0.5, 74), (2, 1.5, 76), (3.5, 0.5, 74), (4, 1, 71), (5, 1, 69), (6, 2, 66)]
    B = [(0, 0.5, 74), (0.5, 0.5, 76), (1, 1, 78), (2, 1, 81), (3, 1, 78), (4, 0.5, 76), (4.5, 0.5, 74), (5, 1, 76), (6, 2, 74)]
    # --- hook: drone + building drum on the bare sand
    drone(0.0, SAD)
    for k, tm in enumerate(np.arange(1.6, 3.5, e8 / 2)):
        place(out, pan(dholak("H" if k % 2 else "S", 0.25 + 0.5 * (tm - 1.6) / 1.9, r), 0.2), tm, 0.5)
    T0 = F(106)
    groove(T0, SAD, 1.0)
    bar = 4 * beat
    flute(T0 + bar, A)
    flute(T0 + 3 * bar, B)
    # --- sad drop on the dead snakes: low drone pad only, sparse music box
    place(out, pan(brush(0.5, r, 0.4, swish=True), 0.0), SAD - 0.18, 0.8)
    place(out, pad([m2f(38), m2f(45), m2f(50)], PLANT - SAD - 1.0, 0.3, r, att=1.0, rel=1.2, warm=480), SAD, 1.0)
    for tm, m in [(F(510), 74), (F(560), 71), (F(610), 69)]:
        place(out, pan(musicbox(m2f(m), 0.3, r, 1.6), 0.25), tm, 0.8)
    # --- gentle return: the first seedling
    groove(PLANT, TIMELAPSE, 0.85)
    flute(PLANT + bar, A, 0.5)
    # --- timelapse: shaker on, flute an octave up
    groove(TIMELAPSE, SECRET, 1.05, shk=True)
    flute(TIMELAPSE + bar, A, 0.5, octave=1)
    flute(TIMELAPSE + 3 * bar, B, 0.5, octave=1)
    # giggle on "हँसे" (f1112): fast flute trill
    for j in range(8):
        place(out, pan(fife(m2f(78 if j % 2 == 0 else 81), 0.07, 0.4, r, rel=0.03), 0.2), F(1110) + j * 0.085, 1.0)
    # forest grows: rising glock
    for j, m in enumerate([74, 76, 78, 81, 83, 86, 88]):
        place(out, pan(glock(m2f(m), 0.45, r, 1.4), 0.3), F(1302) + j * (F(1492) - F(1302)) / 7, 0.6)
    # animals: bird-like flute calls over the groove
    for tm, m in [(F(1598), 81), (F(1656), 78), (F(1727), 83)]:
        place(out, pan(fife(m2f(m), 0.35, 0.45, r, rel=0.08), 0.2), tm, 1.0)
    # --- secret: music stops, low drone + sparse music box (mystery)
    place(out, pan(brush(0.5, r, 0.4, swish=True), 0.0), SECRET - 0.18, 0.8)
    place(out, pad([m2f(38), m2f(45), m2f(50)], NAME - SECRET - 1.0, 0.32, r, att=1.0, rel=1.2, warm=480), SECRET, 1.0)
    for tm, m in [(F(1830), 74), (F(1875), 71), (F(1920), 69), (F(1965), 66)]:
        place(out, pan(musicbox(m2f(m), 0.3, r, 1.6), 0.25), tm, 0.8)
    # --- name: groove returns, timpani build to the board reveal
    groove(NAME, BOARD, 0.95)
    tm, k = F(2050), 0
    while tm < BOARD - 0.05:
        u = (tm - F(2050)) / (BOARD - F(2050))
        place(out, pan(timpani(m2f(38), 0.08 + 0.55 * u ** 1.6, r, 0.8), -0.1 if k % 2 else 0.1), tm, 0.8)
        tm += 0.32 - 0.25 * u
        k += 1
    place(out, pad([m2f(45), m2f(52), m2f(57)], BOARD - F(2080), 0.25, r, att=BOARD - F(2080) - 0.1, rel=0.2, warm=900), F(2080), 1.0)
    place(out, pan(timpani(m2f(38), 1.0, r, 2.4), 0.0), BOARD, 1.2)
    place(out, cymbal(0.6, r, 2.6), BOARD, 0.5)
    place(out, pad([m2f(50), m2f(54), m2f(57), m2f(59), m2f(62)], 3.2, 0.5, r, att=0.08, rel=1.2, warm=2200), BOARD, 1.0)
    # --- scale: big swell, groove + pad, peak on "बड़ा" (f2366)
    groove(BOARD + 0.2, PAYOFF, 1.0, shk=True)
    flute(BOARD + 2 * beat, B, 0.55, octave=0, p=0.1)
    place(out, pad([m2f(50), m2f(57), m2f(62), m2f(64)], PAYOFF - BOARD - 1.0, 0.3, r, att=1.2, rel=0.8, warm=1400), BOARD + 0.5, 1.0)
    for j, m in enumerate([74, 76, 78, 81, 83, 86, 88]):
        place(out, pan(glock(m2f(m), 0.5, r, 1.6), 0.3), F(2300) + j * (F(2366) - F(2300)) / 7, 0.6)
    place(out, pan(timpani(m2f(38), 0.9, r, 2.0), 0.0), F(2366), 1.0)
    # --- payoff: tender close
    place(out, pad([m2f(50), m2f(57), m2f(62), m2f(64)], END - PAYOFF, 0.33, r, att=0.9, rel=0.4, warm=1100), PAYOFF, 1.0)
    drone(PAYOFF, END)
    for (tm, d, m) in [(F(2430), 0.9, 69), (F(2470), 0.5, 71), (F(2500), 0.45, 74), (F(2540), 0.7, 76), (F(2590), 0.12, 74), (CLOSE, 0.7, 74)]:
        place(out, pan(fife(m2f(m), d, 0.42, r, rel=0.1), 0.12), tm, 1.0)
    place(out, pan(timpani(m2f(38), 0.75, r, 1.6), 0.0), CLOSE - 0.03, 1.0)
    place(out, pan(glock(m2f(86), 0.6, r, 1.6), 0.25), CLOSE, 0.8)
    place(out, pan(triangle(0.35, r, 1.4), 0.3), CLOSE, 0.5)
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
    # breeze bed: stronger on the bare sandbar, softer inside the forest, airy on aerials
    amb = breeze(END, r, 0.35, 0.15, 800)
    lvl = np.interp(np.arange(N) / SR, [0, F(481), F(670), F(1288), F(1790), F(2000), F(2199), F(2405), END],
                    [1, 1, 0.7, 0.5, 0.9, 0.5, 0.9, 0.5, 0.5])
    out += amb * lvl[None, :] * 0.7
    # birds: only once the forest exists
    place(out, widen(bird_chirps(F(1530) - F(1288), r, 0.9), r), F(1288), 0.08)
    place(out, widen(bird_chirps(F(1789) - F(1531), r, 0.7, "blackbird"), r), F(1531), 0.07)
    place(out, widen(bird_chirps(F(2666) - F(2405), r, 0.8), r), F(2405), 0.08)
    place(out, widen(crickets(F(1101) - F(1010), r, 3), r), F(1010), 0.03)
    # hook: wind whoosh + soft sand step
    place(out, pan(whoosh(0.32, r, 0.26, 300, 1800, 0.8, 0.06), 0.1), F(35) - 0.27, 0.35)
    # walk to the riverbank (f208-430): footsteps on sand
    for fs in np.arange(212, 428, 10.4):
        place(out, pan(step_soft(r, r.uniform(0.35, 0.5)), -0.05 if int(fs) % 2 else 0.05), F(fs), 0.6)
    # kneel by the snake (f441): soft thud + stillness
    place(out, pan(step_soft(r, 0.6), 0.0), F(441), 0.7)
    # planting (f735): dust puff, then water splash (f760)
    place(out, pan(bp(r.standard_normal(ns(0.4)), 300, 2500, 1) * np.exp(-tt(0.4) / 0.08) * 0.5, 0.0), F(735), 0.5)
    sp = splash_big(r)
    place(out, pan(fades(sp[: ns(0.8)], 0.0, 0.2) * 0.25, 0.1), F(760), 0.4)
    # timelapse: rapid planting taps, whooshes on the year flashes
    for fi in range(890, 1101, 9):
        place(out, pan(tap(r, r.uniform(2000, 3200), 0.4), -0.1), F(fi), 0.55)
    for fc in (950, 1030):
        place(out, pan(whoosh(0.7, r, 0.55, 500, 4000, 0.7, 0.12, 0.25), 0.0), F(fc) - 0.55, 0.4)
    # village laugh: cuckoo on "हँसे" (f1112)
    place(out, pan(cuckoo(r, 0.55), 0.35), F(1112), 0.55)
    for fi in range(1102, 1120, 4):
        place(out, pan(tap(r, r.uniform(2200, 2900), 0.2), -0.2), F(fi), 0.4)
    # animals: deer hoofbeats (f1531-1700), elephant low call (f1656), tiger growl (f1727)
    for fs in np.arange(1531, 1700, 4.5):
        place(out, pan(step_soft(r, r.uniform(0.3, 0.45)), 0.1 if int(fs) % 2 else -0.1), F(fs), 0.55)
    place(out, pan(brass(m2f(45), 1.4, vel=0.35, r=r, kind="tuba", rel=0.3), 0.0), F(1656) - 0.1, 0.6)
    place(out, pan(growl(1.6, r, 0.8), 0.2), F(1727), 0.7)
    place(out, pan(rumble(1.2, r, 0.5), 0.0), F(1727), 0.5)
    # secret aerial: more air
    place(out, pan(whoosh(1.3, r, 0.8, 200, 1600, 1.0, 0.5, 0.1), 0.0), F(1790), 0.22)
    # name: handshake tap (f2080), board reveal ting (f2152)
    place(out, pan(tap(r, 1500, 0.4), 0.1), F(2080), 0.5)
    place(out, pan(glock(m2f(86), 0.6, r, 1.6), 0.25), F(2152), 0.7)
    place(out, pan(triangle(0.35, r, 1.4), 0.3), F(2152), 0.5)
    # scale aerial: crane whoosh
    place(out, pan(whoosh(1.1, r, 0.6, 250, 1800, 0.9, 0.3), 0.0), F(2199), 0.25)
    place(out, pan(whoosh(1.4, r, 0.9, 200, 1600, 1.0, 0.5, 0.1), 0.0), F(2366) - 0.5, 0.3)
    # payoff: pull-back air + wings
    place(out, pan(whoosh(1.6, r, 1.0, 200, 1300, 1.0, 0.5, 0.05), 0.0), F(2500), 0.2)
    place(out, widen(wings(1.5, r, 0.6), r), F(2620), 0.25)
    return fades(out, 0.01, 0.25)


if __name__ == "__main__":
    voice, outdir = sys.argv[1], sys.argv[2]
    N = voice_len(voice)
    m = music(N)
    s = sfx(N)
    write_wav(f"{outdir}/music.wav", m / max(1e-9, np.abs(m).max()) * 0.5)
    write_wav(f"{outdir}/sfx.wav", s / max(1e-9, np.abs(s).max()) * 0.5)
    print("stems written", N / SR, "s")
