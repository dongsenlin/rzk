"""Soundtrack for the 大天蓬 MV: story-opening sound design, the song (untouched), a reverb tail.

    python3 src/audio.py            # needs music/song.wav (not in git: copyrighted)

Timeline (global seconds): 0–6 opening · 6–33.7 song · 33.7–36.2 end card.
Opening: ink drop, the bloom, eleven star chimes (B major pentatonic, the song's key), the spirit
rising, three brush strokes for the title, the seal (taiko), guqin and bronze bell, a swell into the song.
Under the song only a few quiet accents: thunder on the two lightning strikes, an impact on 魄 and 飞.
Loudness to -14 LUFS (BS.1770 K-weighting), true peak -1 dBTP.
"""
import os
import numpy as np
import soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
PRE, SONG, END = 6.0, 27.7, 2.5
DUR = PRE + SONG + END
N = int(round(DUR * SR))
rng = np.random.default_rng(17)


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def filt(x, kind, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype=kind, fs=SR, output='sos'), x, axis=0)


class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, t0, sig, gain=1.0, pan=0.0):
        i0 = int(round(t0 * SR))
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], 1) * np.sqrt(2)
        if i0 < 0:
            sig = sig[-i0:]; i0 = 0
        n = min(len(sig), N - i0)
        if n > 0:
            self.x[i0:i0 + n] += sig[:n] * gain


def env_exp(d, tau, attack=0.002):
    t = tt(d)
    return np.minimum(1, t / attack) * np.exp(-t / tau)


def bell(f, d=4.0, g=1.0):                        # bronze bell: inharmonic partials, slow beating
    t = tt(d); x = np.zeros(len(t))
    for k, (m, a, tau) in enumerate([(1, 1, 2.4), (2.76, 0.55, 1.4), (5.40, 0.3, 0.8), (8.93, 0.18, 0.5), (0.5, 0.35, 3.0)]):
        x += a * np.sin(2 * np.pi * f * m * t + 0.3 * np.sin(2 * np.pi * 0.8 * t)) * np.exp(-t / tau)
    return x * np.minimum(1, t / 0.002) * g * 0.25


def chime(f, g=1.0):
    t = tt(1.6)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t / 0.25) + 0.15 * np.sin(2 * np.pi * f * 3.02 * t) * np.exp(-t / 0.12)
    return x * np.minimum(1, t / 0.001) * g * 0.22


def guqin(f, d=3.5, g=1.0):                       # Karplus-Strong string with a small upward slide
    n = int(d * SR); period = SR / f
    buf = filt(rng.standard_normal(int(period) + 2), 'lowpass', 3500)
    out = np.zeros(n); L = len(buf); idx = 0
    for i in range(n):
        out[i] = buf[idx % L]
        nxt = (idx + 1) % L
        buf[idx % L] = 0.4985 * (buf[idx % L] + buf[nxt])
        idx += 1
    body = filt(out, 'bandpass', [80, 2400])
    return body * np.exp(-tt(d) / 1.6) * g * 0.9


def drum(g=1.0, f0=90, f1=42):                    # taiko: pitched thump plus skin noise
    t = tt(1.8)
    x = np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.45)
    x += filt(noise(1.8), 'lowpass', 900) * np.exp(-t / 0.05) * 0.5
    return np.tanh(x * 1.6) * g * 0.8


def whoosh(d, f0, f1, g=1.0, peak=0.6):
    x = noise(d); n = len(x); out = np.zeros(n); blk = 512
    for i in range(0, n, blk):
        u = i / n; fc = f0 * (f1 / f0) ** u
        out[i:i + blk] = filt(x[i:i + blk], 'bandpass', [fc * 0.7, min(fc * 1.4, SR / 2 - 100)])
    u = np.linspace(0, 1, n)
    return out * np.where(u < peak, (u / peak) ** 2, np.exp(-(u - peak) / (1 - peak) * 4)) * g


def thunder(g=1.0, d=3.0):
    t = tt(d)
    rum = filt(noise(d), 'lowpass', 180) * (np.minimum(1, t / 0.08) * np.exp(-t / 1.1))
    crack = filt(noise(d), 'bandpass', [900, 5000]) * np.exp(-t / 0.08) * 0.6
    return (rum * 1.4 + crack) * g


def drop():
    t = tt(0.4)
    ping = np.sin(2 * np.pi * np.cumsum(420 + 900 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.09)
    return (ping + filt(noise(0.4), 'highpass', 3000) * np.exp(-t / 0.004) * 0.5) * 0.5


def drone(d, g=1.0):
    t = tt(d); x = np.zeros(len(t))
    for f, a in [(61.74, 1), (92.5, 0.6), (123.47, 0.4), (185.0, 0.2)]:
        x += a * np.sin(2 * np.pi * f * t + 0.5 * np.sin(2 * np.pi * 0.1 * t))
    return filt(x, 'lowpass', 400) * g * 0.18


def reverb_ir(d=3.2, tau=1.0, bright=6000, seed=3):
    r = np.random.default_rng(seed); n = int(d * SR); t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-t / tau)[:, None]
    ir = signal.sosfilt(signal.butter(2, bright, 'lowpass', fs=SR, output='sos'), ir, axis=0)
    ir[: int(0.02 * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def conv_st(x, ir):
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)


def k_weight(x):                                  # ITU-R BS.1770-4 reference coefficients at 48 kHz
    x = signal.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    return signal.lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x, axis=0)


def lufs(x):
    y = k_weight(x); blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.sum(np.mean(y[i:i + blk] ** 2, 0)) for i in range(0, len(y) - blk, hop)])
    l = -0.691 + 10 * np.log10(ms + 1e-12); g = ms[l > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    return -0.691 + 10 * np.log10(np.mean(ms[(l > -70) & (l > rel)]))


def true_peak(x):
    return np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)))


def limiter(x, ceiling=0.89, look=0.003, rel=0.08):
    from scipy.ndimage import minimum_filter1d
    n = int(look * SR); need = np.minimum(1, ceiling / (np.max(np.abs(x), 1) + 1e-12))
    g = minimum_filter1d(need, size=2 * n + 1)
    er = np.exp(-1 / (rel * SR)); g = 1 - signal.lfilter([1 - er], [1, -er], 1 - g)
    return x * np.minimum(g, minimum_filter1d(need, size=2 * n + 1))[:, None]


def main():
    song, sr = sf.read(os.path.join(ROOT, 'music', 'song.wav'), dtype='float64')
    if song.ndim == 1: song = np.stack([song, song], 1)
    if sr != SR: song = signal.resample_poly(song, SR, sr, axis=0)
    song = song[: int(SONG * SR)]
    f = int(0.012 * SR); song[:f] *= np.linspace(0, 1, f)[:, None]
    fo = int(0.9 * SR); song[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.3          # the clip ends mid-phrase
    fx, amb, mus = Bus(), Bus(), Bus()
    mus.add(PRE, song)
    # reverb tail carrying the last bars into the end card
    last = song[-int(3.0 * SR):]; tail = conv_st(np.vstack([last, np.zeros((int(4.0 * SR), 2))]), reverb_ir(4.0, 1.3, 5000, 7)) * 0.22
    tail = tail[int(2.2 * SR):]; tail *= np.linspace(1, 0, len(tail))[:, None] ** 1.5
    mus.add(PRE + SONG - 0.8, tail)
    # ── opening
    amb.add(0.0, drone(6.8) * np.minimum(1, tt(6.8) / 1.2)[:] * np.where(tt(6.8) > 5.6, np.exp(-(tt(6.8) - 5.6) / 0.4), 1), pan=0)
    amb.add(0.0, filt(noise(6.2), 'bandpass', [300, 1800]) * 0.02 * np.minimum(1, tt(6.2) / 1.5))
    fx.add(0.28, whoosh(0.3, 800, 3000, 0.15, 0.9))
    fx.add(0.55, drop(), 0.9)
    fx.add(0.55, whoosh(1.2, 120, 600, 0.35, 0.3))                          # the ink blooming out
    for k, fr in enumerate([493.9, 554.4, 622.3, 740.0, 830.6, 987.8, 1108.7, 1244.5, 1480.0, 1661.2, 1975.5]):
        fx.add(1.2 + k * 0.1, chime(fr, 0.8), pan=-0.6 + k * 0.12)
    fx.add(1.9, whoosh(1.8, 2000, 9000, 0.12, 0.7), pan=0.3)                # the spirit rising
    for k in range(3):
        fx.add(3.5 + k * 0.28, whoosh(0.3, 600, 4000, 0.28, 0.25), pan=0.4)   # brush strokes of 大天蓬
    fx.add(4.45, drum(1.0))
    fx.add(4.5, guqin(123.47, 3.0, 0.9), pan=-0.2)
    fx.add(4.52, guqin(185.0, 3.0, 0.5), pan=0.2)
    fx.add(4.6, bell(246.9, 4.0, 0.9))
    fx.add(4.9, whoosh(1.1, 300, 7000, 0.3, 0.97))                           # swell into the song
    # ── quiet accents under the song
    fx.add(PRE + 1.50, thunder(0.35), pan=-0.4)
    fx.add(PRE + 1.92, thunder(0.35), pan=0.4)
    fx.add(PRE + 19.25, drum(0.35, 70, 36))
    fx.add(PRE + 20.76, drum(0.45, 70, 34))
    fx.add(PRE + 20.76, whoosh(1.4, 500, 8000, 0.12, 0.2))
    # ── end card
    fx.add(PRE + SONG + 0.05, bell(246.9, 2.4, 0.6))
    fx.add(PRE + SONG + 0.08, guqin(123.47, 2.4, 0.5))
    # mix: opening and accents through a hall; the song stays dry and untouched
    og = np.where(np.arange(N) / SR < PRE + 0.1, 0.55, 1.0)[:, None]        # the opening sits ~5 dB under the song
    fx.x *= og; amb.x *= og
    wet = conv_st(fx.x + amb.x * 0.5, reverb_ir(3.2, 1.0, 6000, 5)) * 0.3
    mix = mus.x + fx.x * 0.9 + amb.x + wet
    f = int(0.4 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
    for _ in range(3):
        mix *= 10 ** ((-14.0 - lufs(mix)) / 20)
        mix = limiter(mix, 0.87)
    tp = 20 * np.log10(true_peak(mix) + 1e-12)
    if tp > -1.0: mix *= 10 ** ((-1.0 - tp) / 20)
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    sf.write(os.path.join(ROOT, 'build', 'audio.wav'), mix, SR, subtype='PCM_24')
    op = mix[: int(PRE * SR)]
    print(f'audio → build/audio.wav  {len(mix) / SR:.2f}s  integrated {lufs(mix):.1f} LUFS (opening {lufs(op):.1f}), true peak {20 * np.log10(true_peak(mix)):.1f} dBTP')


if __name__ == '__main__':
    main()
