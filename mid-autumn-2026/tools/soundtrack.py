#!/usr/bin/env python3
"""Procedural soundtrack for the film, scored against the scene's cue sheet.

Everything is synthesised - no samples: guzheng-like plucks (additive strings
with a pluck-position spectrum and per-partial decay), Risset bells used as
wind chimes, a D-major-pentatonic pad moving I-vi-IV-I, filtered-noise swells
and brush strokes, a sub drop on the full moon, the seal's wooden "thock" and
far-off crickets, glued together by a synthetic hall reverb.

usage: soundtrack.py [output/cues.json] [output/soundtrack.wav]
"""
import json
import os
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, istft, sosfilt, stft

SR = 48000
DUR = 15.0
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(815)

SEMI = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}


def hz(name):
    return 440.0 * 2 ** ((SEMI[name[:-1]] + 12 * (int(name[-1]) - 4)) / 12)


dry = np.zeros((2, N))
wet = np.zeros((2, N))


def place(sig, t, gain=1.0, pan=0.0, rev=0.3):
    """Mix a mono or stereo signal in at t seconds, equal-power panned, with a reverb send."""
    if sig.ndim == 1:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)])
    i = int(round(t * SR))
    if i < 0:
        sig, i = sig[:, -i:], 0
    if i >= N:
        return
    n = min(sig.shape[1], N - i)
    dry[:, i:i + n] += sig[:, :n] * gain
    wet[:, i:i + n] += sig[:, :n] * gain * rev


def ramp(n, attack=0.002, release=0.03):
    e = np.ones(n)
    na, nr = max(1, int(attack * SR)), max(1, int(release * SR))
    e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e


def bandnoise(n, lo, hi, order=2):
    sos = butter(order, [lo, hi], "band", fs=SR, output="sos")
    return sosfilt(sos, rng.standard_normal(n))


# ------------------------------------------------------------------ voices
def pluck(f, dur=None, bright=0.6, vib=0.0, pos=0.21, tau=None):
    """Guzheng-like plucked string."""
    dur = dur or float(np.clip(1.6 + 160 / f, 1.6, 4.5))
    n = int(dur * SR)
    t = np.arange(n) / SR
    tau = tau or (0.35 + 140 / f)
    wob = vib * 0.0055 * np.sin(2 * np.pi * 5.4 * t) * np.clip((t - 0.22) / 0.35, 0, 1)
    fin = f * (1 + 0.004 * np.exp(-t / 0.025) + wob)
    ph = 2 * np.pi * np.cumsum(fin) / SR
    out = np.zeros(n)
    tilt = 1.35 - 0.5 * bright
    for k in range(1, 24):
        stretch = k * np.sqrt(1 + 1.2e-4 * k * k)
        if f * stretch > 15000:
            break
        a = abs(np.sin(np.pi * k * pos)) / k ** tilt
        tk = tau / (1 + 0.55 * (k - 1) ** 1.15)
        out += a * np.sin(stretch * ph + rng.uniform(0, 2 * np.pi)) * np.exp(-t / tk)
    nb = int(0.008 * SR)
    out[:nb] += bandnoise(nb, 2000, 7000) * np.hanning(nb) * 0.05 * (1 + bright)
    out *= ramp(n, 0.0015, 0.05)
    return out / (np.abs(out).max() + 1e-9)


RISSET = [(0.56, 0, 1, 1), (0.56, 1, 0.67, 0.9), (0.92, 0, 1, 0.65), (0.92, 1.7, 1.8, 0.55), (1.19, 0, 2.67, 0.325),
          (1.7, 0, 1.67, 0.35), (2.0, 0, 1.46, 0.25), (2.74, 0, 1.33, 0.2), (3.0, 0, 1.33, 0.15), (3.76, 0, 1, 0.1), (4.07, 0, 1.33, 0.075)]


def bell(f, dur=4.0):
    """Risset bell - used as wind chimes and the full-moon strike."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, off, amp, d in RISSET:
        fr = f * ratio + off
        if fr > 16000:
            continue
        out += amp * np.exp(-t / (d * dur / 6.9)) * np.sin(2 * np.pi * fr * t + rng.uniform(0, 2 * np.pi))
    out *= ramp(n, 0.001, 0.1)
    return out / (np.abs(out).max() + 1e-9)


def pad_chord(notes, t0, t1, gain, bright=0.5, xf=0.9):
    """Warm detuned additive pad from t0 to t1 with crossfade edges."""
    n = int((t1 - t0 + xf) * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for f in notes:
        for ch, cents in ((0, -4.0), (1, 4.0)):
            ff = f * 2 ** (cents / 1200)
            for k in range(1, 7):
                if ff * k > 9000:
                    break
                a = bright ** (k - 1) / k ** 1.4
                lfo = 1 + 0.18 * np.sin(2 * np.pi * rng.uniform(0.07, 0.2) * t + rng.uniform(0, 6.3))
                out[ch] += a * lfo * np.sin(2 * np.pi * ff * k * t + rng.uniform(0, 6.3))
    e = np.ones(n)
    na = int(xf * SR)
    e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    e[-na:] *= np.cos(np.linspace(0, np.pi / 2, na)) ** 2
    out *= e / (np.abs(out).max() + 1e-9)
    place(out, t0 - xf / 2, gain, rev=0.35)


def swell(dur, f0, f1, shape="rise", width=0.5, seed_gain=1.0):
    """Filtered-noise whoosh: centre frequency glides f0 -> f1 (log), gaussian in log-f."""
    n = int(dur * SR)
    x = rng.standard_normal(n + 4096)
    fr, tt, Z = stft(x, fs=SR, nperseg=2048)
    tt = np.clip(tt / dur, 0, 1)
    centre = f0 * (f1 / f0) ** tt
    lf = np.log2(np.maximum(fr, 20))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log2(centre)[None, :]) / width) ** 2)
    _, y = istft(Z * mask, fs=SR, nperseg=2048)
    y = y[:n]
    u = np.linspace(0, 1, n)
    env = {"rise": u ** 2.2 * ramp(n, 0.01, 0.012), "bell": np.sin(np.pi * u) ** 2, "fall": (1 - u) ** 2 * ramp(n, 0.02, 0.01)}[shape]
    y *= env
    return y / (np.abs(y).max() + 1e-9) * seed_gain


def boom(dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 36 + 30 * np.exp(-t / 0.22)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.75) * (1 - np.exp(-t / 0.006))
    nb = int(0.02 * SR)
    y[:nb] += sosfilt(butter(2, 180, "low", fs=SR, output="sos"), rng.standard_normal(nb)) * np.hanning(nb) * 0.4
    return y / np.abs(y).max()


def thock():
    """Seal pressed onto paper on a wooden table."""
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(72 + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.16)
    knock = np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.045) * 0.5
    nb = int(0.03 * SR)
    click = np.zeros(n)
    click[:nb] = bandnoise(nb, 700, 3200) * np.exp(-np.arange(nb) / (0.006 * SR))
    y = (body + knock + 0.8 * click) * ramp(n, 0.0008, 0.05)
    return y / np.abs(y).max()


def brush(dur, speed):
    """Brush on rice paper: band noise with bristle grain, loudness following stroke speed."""
    n = int(dur * SR)
    x = bandnoise(n, 700, 3400, order=3)
    grain = sosfilt(butter(2, 40, "low", fs=SR, output="sos"), rng.standard_normal(n))
    grain = 0.6 + 0.4 * grain / (np.abs(grain).max() + 1e-9)
    y = x * grain * speed(np.linspace(0, 1, n))
    return y / (np.abs(y).max() + 1e-9)


def shimmer(dur, notes):
    """Glassy sustained cluster (bowed-glass feel) for the gold contour trace."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i, f in enumerate(notes):
        trem = 0.7 + 0.3 * np.sin(2 * np.pi * (3.1 + i * 0.7) * t + i)
        y += np.sin(2 * np.pi * f * t + i) * trem + 0.25 * np.sin(2 * np.pi * 2 * f * t + 2 * i) * trem
    u = np.linspace(0, 1, n)
    y *= np.sin(np.pi * u) ** 1.5
    return y / np.abs(y).max()


def ping(f):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.05)) * np.exp(-t / 0.22)
    return y * ramp(n, 0.0008, 0.05)


def crickets(t0, t1, f, period, pan, gain):
    t = t0
    while t < t1:
        n = int(0.11 * SR)
        tt = np.arange(n) / SR
        y = np.zeros(n)
        for p in range(3):
            s0 = int((p * 0.024) * SR)
            m = int(0.015 * SR)
            y[s0:s0 + m] += np.sin(2 * np.pi * f * tt[:m] * (1 + 0.01 * np.sin(2 * np.pi * 60 * tt[:m]))) * np.hanning(m)
        fade = np.clip((t - t0) / 1.5, 0, 1)
        place(y, t, gain * fade * rng.uniform(0.7, 1.0), pan, rev=0.5)
        t += period * rng.uniform(0.85, 1.2)


def hall_ir(dur=3.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for ch in range(2):
        x = rng.standard_normal(n)
        lo = sosfilt(butter(2, 450, "low", fs=SR, output="sos"), x) * np.exp(-t / 0.62)
        mid = sosfilt(butter(2, [450, 3800], "band", fs=SR, output="sos"), x) * np.exp(-t / 0.46)
        hi = sosfilt(butter(2, 3800, "high", fs=SR, output="sos"), x) * np.exp(-t / 0.2)
        y = (lo + mid + 0.5 * hi) * (1 - np.exp(-t / 0.015))
        pre = int(0.02 * SR)
        y = np.concatenate([np.zeros(pre), y[:-pre]])
        for d, gtap in ((0.011, 0.5), (0.019, 0.35), (0.029, 0.28), (0.041, 0.2)):
            y[int((d + ch * 0.003) * SR)] += gtap * 6
        ir[ch] = y / np.sqrt(np.sum(y ** 2))
    return ir


# ------------------------------------------------------------------ score
def score(cues):
    by = {}
    for c in cues:
        by.setdefault(c["type"], []).append(c)
    at = lambda k: by[k][0]["t"]
    full = at("full")

    # Harmony: D(5) -> Dadd9 -> Bm7 -> Gmaj7 -> Dadd9, entering with the scenes.
    pad_chord([hz("D2"), hz("A2"), hz("D3")], 0.0, full, 0.10, bright=0.35, xf=1.2)
    pad_chord([hz("D2"), hz("A2"), hz("D3"), hz("F#3"), hz("A3"), hz("E4")], full, 5.0, 0.12, bright=0.5)
    pad_chord([hz("F#2"), hz("B2"), hz("D3"), hz("F#3"), hz("A3")], 5.0, 7.0, 0.11, bright=0.45)
    pad_chord([hz("D2"), hz("G2"), hz("B2"), hz("D3"), hz("F#3")], 7.0, 9.6, 0.11, bright=0.45)
    pad_chord([hz("D2"), hz("A2"), hz("D3"), hz("F#3"), hz("A3"), hz("E4")], 9.6, 16.0, 0.12, bright=0.55)
    for t, root in ((full, "D2"), (5.0, "B1"), (7.0, "G1"), (9.62, "D2")):
        place(pluck(hz(root), dur=4.5, bright=0.3, tau=2.0), t, 0.17, rev=0.3)

    # Opening: an airy breath as the dial draws.
    r = by["ring"][0]
    place(swell(r["dur"] + 0.4, 300, 2400, "bell", 0.6), r["t"], 0.05, pan=-0.2, rev=0.6)

    # Counting 初一..十五: a rising pentatonic run, landing on the tonic at full moon.
    run = ["E3", "F#3", "A3", "B3", "D4", "E4", "F#4", "A4", "B4", "D5", "E5", "F#5", "A5", "B5", "D6"]
    for c in by["tick"]:
        i = c["i"]
        last = i == len(run) - 1
        place(pluck(hz(run[i]), bright=0.55 + 0.03 * i, vib=0.6 if last else 0.0), c["t"], 0.2 if not last else 0.3,
              pan=-0.35 + 0.05 * i, rev=0.3)

    # Full moon: reverse-like swell, sub drop, bell strike, chord bloom.
    place(swell(1.1, 400, 5200, "rise", 0.55), full - 1.1, 0.12, rev=0.4)
    place(boom(), full, 0.55, rev=0.15)
    place(bell(hz("D6"), 5.0), full, 0.16, pan=0.1, rev=0.6)
    place(bell(hz("A5"), 4.5), full + 0.02, 0.09, pan=-0.25, rev=0.6)
    for k, nm in enumerate(["D4", "A4", "D5"]):
        place(pluck(hz(nm), bright=0.5, vib=0.4), full + 0.012 * k, 0.12, pan=-0.2 + 0.2 * k, rev=0.35)

    # Moonrise phrase (guzheng), clouds glide in, crickets wake in the hills.
    for t, nm, v in ((2.95, "A4", 0.0), (3.28, "D5", 0.5), (3.62, "E5", 0.0), (3.9, "F#5", 1.0)):
        place(pluck(hz(nm), vib=v), t, 0.22, pan=0.15, rev=0.35)
    cl = at("clouds")
    place(swell(1.8, 250, 900, "bell", 0.8), cl, 0.06, pan=-0.6, rev=0.5)
    place(swell(1.8, 280, 1000, "bell", 0.8), cl + 0.2, 0.06, pan=0.6, rev=0.5)
    crickets(3.2, 14.5, 4650, 0.78, -0.55, 0.012)
    crickets(3.9, 14.5, 5020, 0.93, 0.6, 0.009)

    # Network: village lights ping, arcs reach the moon like wind chimes.
    chimes = ["D6", "E6", "F#6", "A6", "B6"]
    for c in by["node"]:
        place(ping(hz(chimes[c["i"] % 5]) / 2), c["t"], 0.05, pan=c["pan"] * 0.8, rev=0.5)
    for c in by["connect"]:
        place(bell(hz(chimes[(c["i"] * 2) % 5]), 2.6), c["t"], 0.045, pan=c["pan"], rev=0.65)

    # 但愿人长久 / 千里共婵娟: a guzheng run rising, then settling open on A.
    poem = ["D5", "E5", "F#5", "A5", "B5", "A5", "F#5", "E5", "D5", "A4"]
    for c in by["poem"]:
        i = c["i"]
        place(pluck(hz(poem[i]), bright=0.5, vib=0.8 if i in (4, 9) else 0.0), c["t"], 0.13 if i not in (4, 9) else 0.18,
              pan=0.3 - 0.06 * i, rev=0.4)

    # Calligraphy: brush strokes + glassy shimmer while the gold contour draws, warm bloom on fill.
    tr = by["trace"][0]
    speed = lambda u: np.sin(np.pi * np.clip(u, 0, 1)) ** 1.2
    place(brush(tr["dur"], speed), tr["t"], 0.06, pan=-0.1, rev=0.25)
    place(brush(tr["dur"] - 0.3, speed), tr["t"] + 0.3, 0.045, pan=0.15, rev=0.25)
    place(shimmer(tr["dur"] + 0.6, [hz("B5"), hz("D6"), hz("F#6")]), tr["t"], 0.035, rev=0.6)
    fl = by["fill"][0]
    place(swell(fl["dur"] + 0.4, 180, 700, "bell", 0.7), fl["t"], 0.06, rev=0.5)
    place(bell(hz("B5"), 3.0), at("shine"), 0.06, pan=0.35, rev=0.6)
    # Over the ink fill (Gmaj7): a descending guzheng line that hands over to the seal.
    for t, nm, v, gn in ((fl["t"] + 0.05, "F#5", 0.0, 0.16), (fl["t"] + 0.33, "E5", 0.0, 0.14),
                         (fl["t"] + 0.58, "D5", 0.0, 0.15), (fl["t"] + 0.9, "B4", 1.0, 0.19)):
        place(pluck(hz(nm), bright=0.5, vib=v), t, gn, pan=0.2, rev=0.4)
    place(pluck(hz("G2"), dur=4.5, bright=0.25, tau=2.0), fl["t"], 0.16, rev=0.3)

    # The seal.
    place(thock(), at("seal"), 0.42, pan=0.25, rev=0.22)

    # Lock-up and greeting: a low dyad, then a 刮奏-style sweep up the scale, resolving.
    lk = at("lockup")
    place(pluck(hz("D3"), bright=0.4, tau=1.6), lk, 0.2, pan=-0.15, rev=0.35)
    place(pluck(hz("A3"), bright=0.4, tau=1.6), lk + 0.03, 0.16, pan=0.15, rev=0.35)
    place(bell(hz("A5"), 3.0), lk + 0.45, 0.06, pan=0.4, rev=0.6)
    sweep = ["D4", "E4", "F#4", "A4", "B4", "D5", "E5", "F#5", "A5"]
    for c in by["greet"]:
        place(pluck(hz(sweep[c["i"]]), bright=0.55), c["t"], 0.12, pan=-0.4 + 0.1 * c["i"], rev=0.4)
    end = by["greet"][-1]["t"] + 0.32
    for k, nm in enumerate(["D4", "F#4", "A4", "D5"]):
        place(pluck(hz(nm), bright=0.5, vib=0.5, dur=4.0), end + 0.02 * k, 0.12, pan=-0.3 + 0.2 * k, rev=0.4)
    place(bell(hz("D6"), 4.5), end, 0.1, rev=0.6)

    # Final light sweep: a quick rising chime glissando, then two string harmonics (泛音).
    sw = at("sweep")
    for k, nm in enumerate(["D6", "E6", "F#6", "A6", "B6", "D7"]):
        place(bell(hz(nm), 2.4), sw + 0.07 * k, 0.03, pan=-0.5 + 0.2 * k, rev=0.7)
    for t, nm in ((sw + 0.55, "A5"), (sw + 1.05, "D6")):
        place(pluck(hz(nm), bright=0.05, pos=0.5, tau=1.4, dur=3.0), t, 0.12, pan=0.25, rev=0.6)


def master(out_path):
    ir = hall_ir()
    rev = np.stack([fftconvolve(wet[ch], ir[ch])[:N] for ch in range(2)])
    mix = dry + 0.55 * rev
    mix = sosfilt(butter(2, 34, "high", fs=SR, output="sos"), mix, axis=1)
    n = int(DUR * SR)
    mix = mix[:, :n]
    t = np.arange(n) / SR
    fade = np.clip((DUR - t) / 0.6, 0, 1) ** 1.5 * np.clip(t / 0.02, 0, 1)
    mix *= fade
    mix /= np.abs(mix).max()
    mix = np.tanh(1.4 * mix) / np.tanh(1.4)       # gentle glue / soft limit
    mix *= 10 ** (-1.0 / 20) / np.abs(mix).max()  # -1 dBFS peak
    dither = (rng.random(mix.shape) - rng.random(mix.shape)) / 32768
    pcm = np.clip(np.round((mix + dither) * 32767), -32768, 32767).astype(np.int16)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    wavfile.write(out_path, SR, pcm.T)
    rms = 20 * np.log10(np.sqrt(np.mean(mix ** 2)) + 1e-12)
    print(f"wrote {out_path}  {n / SR:.2f}s  rms {rms:.1f} dBFS")


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cues_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "output", "cues.json")
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "output", "soundtrack.wav")
    with open(cues_path) as fh:
        score(json.load(fh))
    master(out)
