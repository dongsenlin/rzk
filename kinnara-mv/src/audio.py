"""Soundtrack for 渡 (紧那罗与阿羞): cave-opening sound design, the song (untouched), a reverb tail.

    python3 src/audio.py            # needs music/song.wav (not in git: copyrighted)

Timeline (global seconds): 0–6 opening · 6–33.7 song · 33.7–36.2 end card.
Opening: the hush of a cave (air, a drip), an oil lamp catching, a low drone, a singing bowl as the lamp
finds him, a second as it finds her, the title written (brush), the seal (taiko), bell and guqin, a swell.
Under the song, quiet accents only: thunder on 天 and 怒, the ground cracking on 地也恼, plaster
crumbling as her portrait flakes away, the wheel on 轮回, the halo shattering on 魄, the dark fire on 飞.
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


def bowl(f, d=5.0, g=1.0):                        # singing bowl: two close partials beating, long ring
    t = tt(d); x = np.zeros(len(t))
    for m, a, tau in [(1, 1, 3.2), (1.004, 0.8, 3.0), (2.71, 0.4, 1.6), (5.1, 0.15, 0.7)]:
        x += a * np.sin(2 * np.pi * f * m * t)
    return x * np.minimum(1, t / 0.004) * np.exp(-t / 2.8) * g * 0.18


def drip(g=1.0):
    t = tt(0.5)
    return np.sin(2 * np.pi * np.cumsum(900 + 1400 * np.exp(-t / 0.012)) / SR) * np.exp(-t / 0.05) * g * 0.35


def ignite(g=1.0):                                # a lamp catching: a soft puff and a flutter of flame
    d = 1.6; t = tt(d)
    puff = filt(noise(d), 'bandpass', [200, 2500]) * np.exp(-t / 0.12) * np.minimum(1, t / 0.01)
    flut = filt(noise(d), 'bandpass', [150, 900]) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t) ** 2) * np.exp(-t / 0.7) * 0.5
    return (puff + flut) * g * 0.6


def crumble(d=1.4, g=1.0, bright=3500):          # plaster: grains and small pieces trickling down
    n = int(d * SR); x = np.zeros(n); r = np.random.default_rng(int(d * 1000) + int(bright))
    for _ in range(int(d * 260)):
        i = int(r.random() ** 1.5 * (n - 2000)); L = int(SR * (0.002 + r.random() * 0.01))
        x[i:i + L] += r.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * (0.3 + r.random())
    return filt(x, 'bandpass', [400, bright]) * np.exp(-tt(d) / (d * 0.6)) * g * 0.5


def crack(g=1.0):                                 # a wall splitting: a sharp snap and a low groan
    d = 1.8; t = tt(d)
    snap = filt(noise(d), 'highpass', 1500) * np.exp(-t / 0.015)
    groan = filt(noise(d), 'lowpass', 140) * np.minimum(1, t / 0.03) * np.exp(-t / 0.5) * 1.6
    return (snap * 0.8 + groan) * g


def shatter(g=1.0):                               # the halo breaking: glassy shards over a thump
    d = 2.0; t = tt(d); x = np.zeros(len(t)); r = np.random.default_rng(5)
    for _ in range(40):
        i = int(r.random() ** 2 * SR * 0.9); f = 1800 + r.random() * 5000; L = int(SR * 0.25)
        seg = np.sin(2 * np.pi * f * np.arange(L) / SR) * np.exp(-np.arange(L) / (SR * 0.04)) * (0.2 + 0.6 * r.random())
        m = min(L, len(x) - i); x[i:i + m] += seg[:m] * 0.6
    th = drum(0.6, 80, 38); x[: len(th)] += th * 0.8
    return x * 0.6 * g


def fire_roar(d=2.6, g=1.0):
    t = tt(d)
    body = filt(noise(d), 'bandpass', [60, 700]) * (0.7 + 0.3 * np.sin(2 * np.pi * 6 * t))
    return body * np.minimum(1, t / 0.08) * np.exp(-t / 1.0) * g


def main():
    song, sr = sf.read(os.path.join(ROOT, 'music', 'song.wav'), dtype='float64')
    if song.ndim == 1: song = np.stack([song, song], 1)
    if sr != SR: song = signal.resample_poly(song, SR, sr, axis=0)
    song = song[: int(SONG * SR)]
    f = int(0.012 * SR); song[:f] *= np.linspace(0, 1, f)[:, None]
    fo = int(0.9 * SR); song[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.3          # the clip ends mid-phrase
    fx, amb, mus = Bus(), Bus(), Bus()
    mus.add(PRE, song)
    last = song[-int(3.0 * SR):]; tail = conv_st(np.vstack([last, np.zeros((int(4.0 * SR), 2))]), reverb_ir(4.0, 1.3, 5000, 7)) * 0.22
    tail = tail[int(2.2 * SR):]; tail *= np.linspace(1, 0, len(tail))[:, None] ** 1.5
    mus.add(PRE + SONG - 0.8, tail)
    # ── opening: the cave, the lamp, the two of them, the title
    amb.add(0.0, filt(noise(6.4), 'bandpass', [120, 900]) * 0.05 * np.minimum(1, tt(6.4) / 1.0) * np.where(tt(6.4) > 5.7, np.exp(-(tt(6.4) - 5.7) / 0.3), 1))
    amb.add(0.3, drone(6.2) * np.minimum(1, tt(6.2) / 1.5) * np.where(tt(6.2) > 5.4, np.exp(-(tt(6.2) - 5.4) / 0.35), 1))
    fx.add(0.15, drip(0.8), pan=0.5); fx.add(2.2, drip(0.5), pan=-0.4)
    fx.add(0.3, ignite(1.0), pan=-0.2)
    fx.add(1.0, bowl(246.9, 4.5, 0.9), pan=-0.3)                            # the lamp finds him
    fx.add(2.95, bowl(329.6, 3.5, 0.7), pan=0.35)                           # …and her
    fx.add(2.5, whoosh(1.0, 200, 900, 0.18, 0.6))                             # the lamp swings across
    for k in range(3):
        fx.add(4.35 + k * 0.16, whoosh(0.28, 600, 4000, 0.26, 0.25), pan=0.1)   # the brush writes 渡
    fx.add(4.95, drum(1.0))
    fx.add(5.0, bell(246.9, 4.0, 0.8)); fx.add(5.02, guqin(123.47, 3.0, 0.7), pan=-0.2)
    fx.add(5.0, whoosh(1.0, 300, 7000, 0.3, 0.97))                            # swell into the song
    # ── accents under the song
    S = lambda x: PRE + x
    fx.add(S(1.46), thunder(0.4), pan=-0.4); fx.add(S(1.88), thunder(0.4), pan=0.4)
    for x, p in [(2.52, 0.0), (2.94, -0.5), (3.24, 0.5)]:
        fx.add(S(x), crack(0.45), pan=p); fx.add(S(x) + 0.05, crumble(1.2, 0.35), pan=p)
    fx.add(S(0.2), fire_roar(3.6, 0.10), pan=0.3)
    fx.add(S(5.6), crumble(2.2, 0.5, 5000)); fx.add(S(5.1), crack(0.25), pan=0.3)
    fx.add(S(16.9), whoosh(0.9, 200, 2500, 0.22, 0.8))
    fx.add(S(19.25), shatter(0.6)); fx.add(S(19.3), crack(0.35), pan=-0.3)
    fx.add(S(20.76), drum(0.5, 70, 34)); fx.add(S(20.76), fire_roar(2.4, 0.3))
    fx.add(S(22.2), whoosh(1.4, 120, 500, 0.12, 0.5))
    # ── end card
    fx.add(PRE + SONG + 0.05, bowl(246.9, 2.4, 0.7))
    fx.add(PRE + SONG + 0.08, guqin(123.47, 2.4, 0.45))
    og = np.where(np.arange(N) / SR < PRE + 0.1, 0.55, 1.0)[:, None]        # the opening sits ~5 dB under the song
    fx.x *= og; amb.x *= og
    wet = conv_st(fx.x + amb.x * 0.5, reverb_ir(3.2, 1.1, 5500, 5)) * 0.32
    mix = mus.x + fx.x * 0.9 + amb.x + wet
    f = int(0.4 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
    for _ in range(4):
        mix *= 10 ** ((-13.9 - lufs(mix)) / 20)
        mix = limiter(mix, 0.84)
    tp = 20 * np.log10(true_peak(mix) + 1e-12)
    if tp > -1.0: mix *= 10 ** ((-1.0 - tp) / 20)
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    sf.write(os.path.join(ROOT, 'build', 'audio.wav'), mix, SR, subtype='PCM_24')
    op = mix[: int(PRE * SR)]
    print(f'audio → build/audio.wav  {len(mix) / SR:.2f}s  integrated {lufs(mix):.1f} LUFS (opening {lufs(op):.1f}), true peak {20 * np.log10(true_peak(mix)):.1f} dBTP')


if __name__ == '__main__':
    main()
