"""Soundtrack for 渡 · 紧那罗与阿羞 (story short): narration, an original score, sound design, the song (untouched).

    python3 src/audio.py            # needs build/vo/manifest.json (timeline.py) and music/song.wav (not in git)

The narration lines are placed where build/vo/manifest.json puts them; every cue below is keyed to the same
character times the pictures use, so sound and picture move together if the timeline is rebuilt.
Score: B major / G♯ minor pentatonic, the key of the song — a low drone for 无天, warm pads and guqin for 阿羞,
a heartbeat through the prison and the door, silence when the lamp goes out, then the song. After the song:
cold pads, four stamps for 六根不净, the 魔罗 rising, a dark bell when his eyes open, and the end card.
The score ducks under the voice. Loudness −14 LUFS (BS.1770 K-weighting), true peak −1 dBTP.
"""
import json
import os
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import minimum_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
MAN = json.load(open(os.path.join(ROOT, 'build', 'vo', 'manifest.json')))
SONG_AT, SONG, DUR = MAN['song'], MAN['songLen'], MAN['total']
N = int(round(DUR * SR))
rng = np.random.default_rng(23)
LINES = {l['id']: l for l in MAN['lines']}


def ts(i): return LINES[i]['start']
def te(i): return LINES[i]['end']
def ch(i, k): c = LINES[i]['chars']; return c[max(0, min(k, len(c) - 1))]['t']
def SG(x): return SONG_AT + x


# notes (A4 = 440)
NOTE = {'G#1': 51.91, 'B1': 61.74, 'D#2': 77.78, 'E2': 82.41, 'F#2': 92.50, 'G#2': 103.83, 'B2': 123.47, 'C#3': 138.59, 'D#3': 155.56,
        'E3': 164.81, 'F#3': 185.00, 'G#3': 207.65, 'B3': 246.94, 'C#4': 277.18, 'D#4': 311.13, 'E4': 329.63, 'F#4': 369.99,
        'G#4': 415.30, 'B4': 493.88, 'C#5': 554.37, 'D#5': 622.25, 'F#5': 739.99, 'G#5': 830.61}


def nt(*names): return [NOTE[n] for n in names]


# ───────────── building blocks ─────────────
def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def filt(x, kind, f, order=2): return signal.sosfilt(signal.butter(order, f, btype=kind, fs=SR, output='sos'), x, axis=0)


class Bus:
    def __init__(self): self.x = np.zeros((N, 2))

    def add(self, t0, sig, gain=1.0, pan=0.0):
        i0 = int(round(t0 * SR))
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], 1) * np.sqrt(2)
        if i0 < 0: sig = sig[-i0:]; i0 = 0
        n = min(len(sig), N - i0)
        if n > 0: self.x[i0:i0 + n] += sig[:n] * gain


def fades(x, a, r):
    t = np.arange(len(x)) / SR; d = len(x) / SR
    e = np.minimum(1, t / max(a, 1e-3)) * np.minimum(1, (d - t) / max(r, 1e-3))
    return x * (np.clip(e, 0, 1) ** 1.5 if x.ndim == 1 else np.clip(e, 0, 1)[:, None] ** 1.5)


def pad(d, freqs, g=1.0, bright=1400, a=2.0, r=2.5, wob=0.12):   # a soft sustained chord: detuned voices, lowpassed
    t = tt(d); L = np.zeros(len(t)); R = np.zeros(len(t))
    for k, f in enumerate(freqs):
        for j, det in enumerate((-0.0035, 0.0, 0.0041)):
            ph = rng.random() * 6.28; ff = f * (1 + det) * (1 + 0.0015 * np.sin(2 * np.pi * wob * t + k + j))
            v = np.sin(2 * np.pi * np.cumsum(ff) / SR + ph); v += 0.28 * np.sin(2 * np.pi * np.cumsum(2 * ff) / SR + ph * 2) + 0.1 * np.sin(2 * np.pi * np.cumsum(3 * ff) / SR)
            if j == 0: L += v
            elif j == 2: R += v
            else: L += v * 0.7; R += v * 0.7
    st = np.stack([L, R], 1) / (len(freqs) * 2.2)
    return fades(filt(st, 'lowpass', bright), a, r) * g * 0.5


def drone(d, freqs=None, g=1.0, a=2.0, r=2.0):
    freqs = freqs or nt('G#1', 'D#2', 'G#2')
    t = tt(d); x = np.zeros(len(t))
    for k, f in enumerate(freqs):
        x += (1 / (k + 1)) * np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * 0.07 * t + k))
    x += filt(noise(d), 'lowpass', 120) * 0.25
    return fades(filt(x, 'lowpass', 380), a, r) * g * 0.22


def bell(f, d=4.0, g=1.0):
    t = tt(d); x = np.zeros(len(t))
    for m, amp, tau in [(1, 1, 2.4), (2.76, 0.55, 1.4), (5.40, 0.3, 0.8), (8.93, 0.18, 0.5), (0.5, 0.35, 3.0)]:
        x += amp * np.sin(2 * np.pi * f * m * t + 0.3 * np.sin(2 * np.pi * 0.8 * t)) * np.exp(-t / tau)
    return x * np.minimum(1, t / 0.002) * g * 0.25


def bowl(f, d=5.0, g=1.0):
    t = tt(d); x = np.zeros(len(t))
    for m, amp in [(1, 1), (1.004, 0.8), (2.71, 0.4), (5.1, 0.15)]:
        x += amp * np.sin(2 * np.pi * f * m * t)
    return x * np.minimum(1, t / 0.004) * np.exp(-t / 2.8) * g * 0.18


def chime(f, g=1.0, d=1.6):
    t = tt(d)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t / 0.25) + 0.15 * np.sin(2 * np.pi * f * 3.02 * t) * np.exp(-t / 0.12)
    return x * np.minimum(1, t / 0.001) * g * 0.22


def guqin(f, d=3.5, g=1.0):                       # Karplus-Strong string
    n = int(d * SR); period = SR / f
    buf = filt(rng.standard_normal(int(period) + 2), 'lowpass', 3200)
    out = np.zeros(n); L = len(buf); idx = 0
    for i in range(n):
        out[i] = buf[idx % L]; nxt = (idx + 1) % L
        buf[idx % L] = 0.4986 * (buf[idx % L] + buf[nxt]); idx += 1
    return filt(out, 'bandpass', [80, 2400]) * np.exp(-tt(d) / 1.7) * g * 0.9


def drum(g=1.0, f0=90, f1=42, d=1.8, tau=0.45):
    t = tt(d)
    x = np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / 0.06)) / SR) * np.exp(-t / tau)
    x += filt(noise(d), 'lowpass', 900) * np.exp(-t / 0.05) * 0.5
    return np.tanh(x * 1.6) * g * 0.8


def heartbeat(g=1.0):                             # lub-dub
    x = np.zeros(int(0.9 * SR)); a = drum(1.0, 70, 38, 0.5, 0.12); b = drum(0.7, 64, 36, 0.5, 0.1)
    x[:len(a)] += a; i = int(0.26 * SR); x[i:i + len(b)] += b[: len(x) - i]
    return filt(x, 'lowpass', 220) * g


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
    crk = filt(noise(d), 'bandpass', [900, 5000]) * np.exp(-t / 0.08) * 0.6
    return (rum * 1.4 + crk) * g


def drip(g=1.0):
    t = tt(0.5)
    return np.sin(2 * np.pi * np.cumsum(900 + 1400 * np.exp(-t / 0.012)) / SR) * np.exp(-t / 0.05) * g * 0.35


def ignite(g=1.0):
    d = 1.6; t = tt(d)
    puff = filt(noise(d), 'bandpass', [200, 2500]) * np.exp(-t / 0.12) * np.minimum(1, t / 0.01)
    flut = filt(noise(d), 'bandpass', [150, 900]) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t) ** 2) * np.exp(-t / 0.7) * 0.5
    return (puff + flut) * g * 0.6


def flame(d, g=1.0, gutter=None):                 # a small flame breathing; gutter = time it starts to die
    t = tt(d); body = filt(noise(d), 'bandpass', [120, 700]) * (0.6 + 0.4 * filt(np.abs(noise(d)), 'lowpass', 6) * 3)
    env = np.ones(len(t))
    if gutter is not None: env = np.where(t > gutter, np.clip(1 - (t - gutter) / (d - gutter), 0, 1) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t) ** 2), 1)
    return fades(body * env, 0.3, 0.05) * g * 0.35


def crumble(d=1.4, g=1.0, bright=3500):
    n = int(d * SR); x = np.zeros(n); r = np.random.default_rng(int(d * 1000) + int(bright))
    for _ in range(int(d * 260)):
        i = int(r.random() ** 1.5 * (n - 2000)); L = int(SR * (0.002 + r.random() * 0.01))
        x[i:i + L] += r.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * (0.3 + r.random())
    return filt(x, 'bandpass', [400, bright]) * np.exp(-tt(d) / (d * 0.6)) * g * 0.5


def crack(g=1.0):
    d = 1.8; t = tt(d)
    snap = filt(noise(d), 'highpass', 1500) * np.exp(-t / 0.015)
    groan = filt(noise(d), 'lowpass', 140) * np.minimum(1, t / 0.03) * np.exp(-t / 0.5) * 1.6
    return (snap * 0.8 + groan) * g


def shatter(g=1.0):
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


def metal(n=5, span=0.4, g=1.0, f0=1700, seed=1):  # chain links touching
    r = np.random.default_rng(seed); d = span + 0.6; x = np.zeros(int(d * SR))
    for _ in range(n):
        i = int(r.random() * span * SR); f = f0 * (1 + r.random() * 0.9); L = int(0.5 * SR); tl = np.arange(L) / SR
        seg = sum(a * np.sin(2 * np.pi * f * m * tl) * np.exp(-tl / (0.09 / m ** 0.5)) for m, a in [(1, 1), (2.41, 0.5), (3.93, 0.3)])
        seg += filt(r.standard_normal(L), 'highpass', 2500) * np.exp(-tl / 0.004) * 0.6
        m = min(L, len(x) - i); x[i:i + m] += seg[:m] * (0.4 + 0.6 * r.random())
    return x * g * 0.25


def stamp(g=1.0):                                 # a verdict stamped: a deep hit and a dull bronze ring
    x = drum(1.0, 75, 32, 2.0, 0.5)
    b = bell(NOTE['G#2'], 2.0, 0.6); x[:len(b)] += b
    return x * g


def creak(d=1.2, g=1.0, f0=38):                   # a heavy door on its pivot
    t = tt(d); f = f0 * (1 + 0.25 * np.sin(2 * np.pi * 0.7 * t)); saw = (np.cumsum(f) / SR) % 1 - 0.5
    x = filt(saw * (0.5 + 0.5 * np.abs(filt(noise(d), 'lowpass', 20)) * 4), 'bandpass', [300, 1800])
    return fades(x, 0.15, 0.3) * g * 0.35


def steps(t0, n, every, g=1.0, bus=None, pan=0.0, jingle=False):
    for k in range(n):
        s = filt(noise(0.2), 'lowpass', 500) * np.exp(-tt(0.2) / 0.03) * 0.4
        bus.add(t0 + k * every, s, g, pan)
        if jingle and k % 2 == 0: bus.add(t0 + k * every + 0.02, metal(4, 0.12, 0.55, 2600, seed=40 + k), g, pan)


def shimmer(d, freqs, g=1.0, rate=7.0):            # a trembling high cluster (战栗)
    t = tt(d); x = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate(freqs)) / len(freqs)
    return fades(x * (0.55 + 0.45 * np.sin(2 * np.pi * rate * t) ** 2), d * 0.35, d * 0.4) * g * 0.12


def water(d, g=1.0):                              # a wash of clear water
    t = tt(d); x = noise(d); out = np.zeros(len(t)); blk = 1024
    for i in range(0, len(t), blk):
        fc = 2400 + 1800 * np.sin(2 * np.pi * 0.35 * i / SR) ** 2
        out[i:i + blk] = filt(x[i:i + blk], 'bandpass', [fc * 0.6, fc * 1.5])
    return fades(out * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t)), d * 0.3, d * 0.4) * g * 0.25


def growl(d, g=1.0):                              # 魔罗 rising: sub sweep, a rough low voice, rumble
    t = tt(d); f = 28 + 22 * (t / d) ** 1.5
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR)
    rough = filt(((np.cumsum(f * 1.5) / SR) % 1 - 0.5) * (1 + 0.6 * filt(noise(d), 'lowpass', 30) * 5), 'lowpass', 400)
    rum = filt(noise(d), 'lowpass', 160)
    return fades((sub * 0.8 + rough * 0.5 + rum * 0.8) * (t / d) ** 1.2, 0.2, 0.5) * g


def reverb_ir(d=3.2, tau=1.0, bright=6000, seed=3):
    r = np.random.default_rng(seed); n = int(d * SR); t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-t / tau)[:, None]
    ir = signal.sosfilt(signal.butter(2, bright, 'lowpass', fs=SR, output='sos'), ir, axis=0)
    ir[: int(0.02 * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def conv_st(x, ir): return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)


def k_weight(x):
    x = signal.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    return signal.lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x, axis=0)


def lufs(x):
    y = k_weight(x); blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.sum(np.mean(y[i:i + blk] ** 2, 0)) for i in range(0, len(y) - blk, hop)])
    l = -0.691 + 10 * np.log10(ms + 1e-12); g = ms[l > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    return -0.691 + 10 * np.log10(np.mean(ms[(l > -70) & (l > rel)]))


def true_peak(x): return np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)))


def limiter(x, ceiling=0.89, look=0.003, rel=0.08):         # true-peak aware: peaks measured 4× oversampled
    up = np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)), 1)[: len(x) * 4]
    pk = np.maximum(np.max(np.abs(x), 1), np.pad(up, (0, len(x) * 4 - len(up))).reshape(len(x), 4).max(1))
    n = int(look * SR); need = np.minimum(1, ceiling / (pk + 1e-12))
    g = minimum_filter1d(need, size=2 * n + 1)
    er = np.exp(-1 / (rel * SR)); g = 1 - signal.lfilter([1 - er], [1, -er], 1 - g)
    return x * np.minimum(g, minimum_filter1d(need, size=2 * n + 1))[:, None]


def lossy(mix, ceiling_db=-2.8):
    """The same mix for AAC delivery: −14 LUFS with the true peak held lower, since the codec's overshoot is ~1.5 dB."""
    x = filt(mix, 'lowpass', 15000, 4)                  # the codec drops this band anyway; its own cut on sharp transients is what overshoots
    for _ in range(4):
        x *= 10 ** ((-14.0 - lufs(x)) / 20)
        x = limiter(x, 10 ** (ceiling_db / 20))
    sf.write(os.path.join(ROOT, 'build', 'audio_lossy.wav'), x, SR, subtype='PCM_24')
    print(f'lossy → build/audio_lossy.wav  {lufs(x):.1f} LUFS, true peak {20 * np.log10(true_peak(x)):.1f} dBTP')


# ───────────── the mix ─────────────
def main():
    vo, mus, sco, fx = Bus(), Bus(), Bus(), Bus()
    # narration: 24 kHz lines → 48 kHz, levelled part way to −16.5 LUFS (the quiet lines stay a little quieter)
    for l in MAN['lines']:
        y, sr = sf.read(os.path.join(ROOT, l['file']), dtype='float64')
        if y.ndim > 1: y = y.mean(1)
        y = signal.resample_poly(y, SR, sr) if sr != SR else y
        y = filt(y, 'highpass', 70)
        f = int(0.01 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
        st = np.stack([y, y], 1)
        gdb = 0.6 * (-16.5 - lufs(st))
        vo.add(l['start'], y * 10 ** (gdb / 20))
    # the song, untouched but for level; a reverb tail where the clip stops mid-phrase
    song, sr = sf.read(os.path.join(ROOT, 'music', 'song.wav'), dtype='float64')
    if song.ndim == 1: song = np.stack([song, song], 1)
    if sr != SR: song = signal.resample_poly(song, SR, sr, axis=0)
    song = song[: int(SONG * SR)]
    f = int(0.012 * SR); song[:f] *= np.linspace(0, 1, f)[:, None]
    fo = int(0.9 * SR); song[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.3
    song *= 10 ** ((-13.5 - lufs(song)) / 20)
    mus.add(SONG_AT, song)
    last = song[-int(3.0 * SR):]; tail = conv_st(np.vstack([last, np.zeros((int(4.0 * SR), 2))]), reverb_ir(4.0, 1.3, 5000, 7)) * 0.22
    tail = tail[int(2.2 * SR):]; tail *= np.linspace(1, 0, len(tail))[:, None] ** 1.5
    mus.add(SONG_AT + SONG - 0.8, tail)

    # ── 序: 无天 in the dark; the black drains; the title
    t_white = ch('L02', 9) + 0.2
    sco.add(0.0, drone(t_white + 1.5, g=1.0, a=1.5, r=1.6))
    fx.add(ts('L01') - 0.05, bell(NOTE['G#2'], 5.0, 0.7))
    fx.add(ch('L01', 9) - 0.25, whoosh(0.9, 80, 400, 0.35, 0.5)); fx.add(ch('L01', 9) - 0.1, fire_roar(1.6, 0.12))      # the eyes kindle
    fx.add(ts('L02') + 0.3, whoosh(t_white - ts('L02') - 0.2, 300, 6000, 0.12, 0.95))                                     # the black drains away
    sco.add(ts('L02') + 0.5, pad(te('L02') - ts('L02') + 1.6, nt('B2', 'F#3', 'D#4', 'B4'), 0.9, 2200, 2.5, 1.0))
    fx.add(t_white, bowl(NOTE['B3'], 4.5, 0.9), pan=-0.2)
    t_title = te('L02') + 0.15
    for k in range(3): fx.add(t_title + 0.05 + k * 0.16, whoosh(0.28, 600, 4000, 0.2, 0.25), pan=0.1)                     # the brush
    fx.add(t_title + 0.5, drum(0.6)); fx.add(t_title + 0.52, bell(NOTE['B3'], 4.0, 0.5)); fx.add(t_title + 0.55, guqin(NOTE['B2'], 3.0, 0.6), pan=-0.2)
    # ── 灵山 → 西牛贺洲: high air, the walker's steps and his staff
    t_desc = ts('L03') - 0.25
    sco.add(t_desc - 0.3, pad(ts('L04') - t_desc + 1.5, nt('E3', 'B3', 'F#4', 'G#4'), 0.8, 3000, 1.2, 1.5))
    sco.add(t_desc, filt(noise(ts('L04') - t_desc + 0.5), 'bandpass', [300, 1600]) * 0.04, pan=0.2)                       # wind on the heights
    for k, (n, dt) in enumerate([('F#4', 0.6), ('E4', 1.9), ('C#4', 3.1), ('B3', 4.4)]): sco.add(t_desc + dt, guqin(NOTE[n], 2.6, 0.5), pan=0.15 * (k % 2 * 2 - 1))
    steps(t_desc + 0.3, 8, np.pi / 4.6, 0.5, fx, pan=-0.1, jingle=True)
    # ── 三难: the priest, torches, three portraits stamped up, a veil falls
    t_tri = ts('L04') - 0.25
    sco.add(t_tri, pad(ts('L05') - t_tri + 0.8, nt('G#2', 'B2', 'D#3'), 0.8, 900, 1.0, 1.2))
    sco.add(t_tri, drone(ts('L05') - t_tri, nt('G#1', 'D#2'), 0.5, 1.0, 1.0))
    fx.add(t_tri, flame(ts('L05') - t_tri, 0.35), pan=-0.5)
    for k, i in enumerate([11, 19, 26]):
        fx.add(ch('L04', i) - 0.2, drum(0.45, 110, 55, 1.2, 0.25), pan=[-0.4, 0.0, 0.4][k]); fx.add(ch('L04', i) - 0.18, chime(NOTE[['D#5', 'F#5', 'G#5'][k]], 0.35), pan=[-0.4, 0.0, 0.4][k])
    fx.add(ch('L04', 29), whoosh(ch('L04', 34) + 0.3 - ch('L04', 29), 900, 3000, 0.1, 0.4), pan=0.4)                     # the veil slips
    # ── 阿羞: warmth, the look, the heart
    t_h = ts('L05') - 0.25
    sco.add(t_h - 0.4, pad(ts('L06') - t_h + 1.2, nt('B2', 'F#3', 'B3', 'D#4'), 0.85, 1800, 1.4, 1.4))
    for k, (n, dt) in enumerate([('B3', 0.4), ('C#4', 1.5), ('D#4', 2.6), ('F#4', 3.9), ('D#4', 5.2)]): sco.add(t_h + dt, guqin(NOTE[n], 2.8, 0.45), pan=0.2)
    fx.add(ch('L05', 22) - 0.3, bowl(NOTE['D#4'], 4.0, 0.6), pan=0.2)
    # ── the lamp: it catches; her soul trembles
    t_lit = ch('L06', 3) - 0.1
    sco.add(ts('L06') - 0.5, pad(ts('L07') - ts('L06') + 1.0, nt('E3', 'B3', 'D#4', 'G#4'), 0.6, 1700, 1.5, 1.5))
    fx.add(t_lit - 0.05, ignite(0.9), pan=-0.1); fx.add(t_lit, bowl(NOTE['B3'], 5.0, 0.4))
    fx.add(t_lit + 0.4, flame(te('L06') - t_lit + 0.2, 0.18))
    t_tr = ch('L06', 20) - 0.2
    fx.add(t_tr, shimmer(te('L06') + 0.6 - t_tr, nt('F#5', 'G#5', 'B4'), 0.3)); fx.add(t_tr + 0.1, heartbeat(0.35))
    # ── the vow: water washes the paint away; gold falls; the vow
    w0, w1 = ch('L07', 1) - 0.2, ch('L07', 4) + 0.6
    sco.add(ts('L07') - 0.3, pad(te('L07') - ts('L07') + 1.5, nt('G#2', 'D#3', 'B3', 'F#4'), 0.8, 1600, 1.2, 1.4))
    fx.add(w0, water(w1 - w0 + 0.6, 0.8))
    for k in range(7): fx.add(w0 + 0.2 + k * 0.23, chime(NOTE[['D#5', 'B4', 'F#5', 'G#5', 'C#5', 'D#5', 'B4'][k]], 0.18), pan=(k % 3 - 1) * 0.5)
    fx.add(ch('L07', 10) - 0.15, bell(NOTE['B3'], 4.0, 0.35))
    for k, (n, dt) in enumerate([('G#3', 0.3), ('B3', 1.8), ('C#4', 3.2)]): sco.add(ch('L07', 10) + dt, guqin(NOTE[n], 2.8, 0.4), pan=-0.2)
    # ── the prison: dark, torches, chains, a heart counting the hours
    t_pr = ts('L08') - 0.25
    fx.add(t_pr - 0.05, drum(0.7, 60, 30, 2.0, 0.6))
    sco.add(t_pr, drone(te('L09') - t_pr + 0.5, nt('G#1', 'D#2', 'G#2'), 0.9, 0.6, 0.8))
    fx.add(t_pr, flame(ch('L08', 8) - t_pr, 0.5), pan=0.4)
    t_cell = ch('L08', 8) - 0.15
    fx.add(t_cell, metal(6, 0.5, 0.8, 1500, 3), pan=0.1); fx.add(t_cell + 1.6, metal(3, 0.3, 0.5, 1500, 4), pan=0.2)
    t_hb = t_cell; hb = 0
    while t_hb < te('L09') + 0.1:
        fx.add(t_hb, heartbeat(0.4 + 0.1 * min(1, hb / 6))); hb += 1
        t_hb += 60 / (62 + 16 * min(1, (t_hb - t_cell) / (te('L09') - t_cell)))
    # ── the door: her steps, the lamp, the door opens, and closes
    t_d = ts('L09') - 0.25
    steps(t_d + 0.4, 6, 0.55, 0.35, fx, pan=0.1)
    fx.add(t_d, flame(te('L09') - t_d, 0.25), pan=0.2)
    fx.add(ch('L09', 12) - 0.1, creak(1.3, 0.5, 34), pan=0.1)
    t_shut = te('L09') + 0.2
    fx.add(t_shut - 0.12, drum(1.2, 55, 28, 2.4, 0.7)); fx.add(t_shut - 0.1, filt(noise(1.0), 'lowpass', 300) * np.exp(-tt(1.0) / 0.2) * 0.4)
    # ── broken: the red flower falls and breaks; the chains fall away; dawn
    hit = ch('L10', 3) + 0.05
    fx.add(ts('L10') - 0.3, whoosh(hit - ts('L10') + 0.35, 500, 1800, 0.08, 0.9))
    fx.add(hit, crumble(1.2, 0.25, 6000)); fx.add(hit, bowl(NOTE['D#4'], 4.0, 0.35)); fx.add(hit + 0.02, chime(NOTE['G#5'], 0.2), pan=0.3)
    fx.add(ch('L10', 5), metal(10, 0.9, 0.55, 1300, 9), pan=-0.1); fx.add(ch('L10', 5) + 0.95, drum(0.3, 90, 50, 0.8, 0.12))
    t_dawn = ch('L10', 7)
    sco.add(t_dawn - 0.5, pad(ts('L12') - t_dawn + 1.0, nt('B2', 'F#3', 'C#4', 'D#4', 'F#4'), 0.65, 1800, 2.0, 1.5))
    fx.add(ts('L11') - 0.1, bell(NOTE['B2'], 5.0, 0.25), pan=0.5)                                                        # a far temple bell at dawn
    sco.add(ch('L11', 6) - 0.2, guqin(NOTE['D#4'], 3.0, 0.45)); sco.add(ch('L11', 6) + 1.2, guqin(NOTE['C#4'], 3.0, 0.4))
    # ── the lamp goes out; dark; the song
    t_lo = ts('L12') - 0.25; t_out = te('L12') + 0.35
    sco.add(t_lo, pad(t_out - t_lo + 0.3, nt('G#2', 'B2', 'D#3', 'F#3'), 0.7, 1200, 1.0, 0.5))
    fx.add(t_lo, flame(t_out - t_lo, 0.35, gutter=ch('L12', 8) - t_lo))
    fx.add(t_out - 0.06, filt(noise(0.5), 'bandpass', [200, 1400]) * np.exp(-tt(0.5) / 0.06) * 0.25)                     # the last breath of the flame
    fx.add(SONG_AT - 1.3, whoosh(1.3, 200, 5000, 0.14, 0.96))                                                              # into the song

    # ── under the song: quiet accents only
    fx.add(SG(0.86), drip(0.45), pan=-0.1)                                                                                 # his tear on her cheek
    fx.add(SG(1.46), thunder(0.4), pan=-0.4); fx.add(SG(1.88), thunder(0.4), pan=0.4)
    for x, p in [(2.52, 0.0), (2.94, -0.5), (3.24, 0.5)]:
        fx.add(SG(x), crack(0.45), pan=p); fx.add(SG(x) + 0.05, crumble(1.2, 0.35), pan=p)
    fx.add(SG(5.1), crack(0.25), pan=0.3); fx.add(SG(5.6), crumble(2.2, 0.5, 5000))
    fx.add(SG(8.0), filt(noise(5.5), 'bandpass', [250, 1200]) * 0.035 * np.minimum(1, tt(5.5) / 1.5), pan=0.3)            # wind on the stair
    for x in (15.78, 16.08, 16.5, 16.9): fx.add(SG(x), stamp(0.22))
    fx.add(SG(16.9), whoosh(0.9, 200, 2500, 0.22, 0.8))
    fx.add(SG(19.25), shatter(0.6)); fx.add(SG(19.3), crack(0.35), pan=-0.3)
    fx.add(SG(19.4), whoosh(1.1, 90, 500, 0.16, 0.9))
    fx.add(SG(20.76), drum(0.5, 70, 34)); fx.add(SG(20.76), fire_roar(2.4, 0.3))
    fx.add(SG(22.2), whoosh(1.4, 120, 500, 0.12, 0.5))
    fx.add(SG(23.6), bowl(NOTE['B3'], 4.0, 0.25), pan=-0.4)                                                               # she comes back, once

    # ── 六根不净: the cold face; four stamps
    t_v = ts('L13') - 0.3
    sco.add(t_v - 0.4, pad(ts('L14') - t_v + 0.8, nt('G#2', 'D#3', 'B3'), 0.7, 900, 1.5, 1.0))
    sco.add(t_v, fades(np.sin(2 * np.pi * NOTE['D#5'] * tt(ts('L14') - t_v)) * 0.018, 2.0, 0.8), pan=0.2)
    for k in range(20, 24): fx.add(ch('L13', k) + 0.06, stamp(0.6), pan=(k - 21.5) * 0.15)
    # ── 魔罗: the shadow rises; the robe goes black
    t_m = ts('L14') - 0.25; r0, r1 = ch('L14', 5), ch('L14', 8) + 0.6
    sco.add(t_m, drone(ts('L15') - t_m + 1.0, nt('G#1', 'D#2', 'G#2'), 1.0, 0.6, 1.0))
    fx.add(r0 - 0.2, growl(r1 - r0 + 0.5, 0.55)); fx.add(r1 - 0.1, fire_roar(2.4, 0.3)); fx.add(r1 - 0.15, drum(0.6, 60, 28, 2.0, 0.6))
    fx.add((r0 + r1) / 2 + 0.2, whoosh(0.7, 100, 900, 0.18, 0.4))                                                         # the ember eye
    fx.add(ch('L14', 9) - 0.1, whoosh(te('L14') - ch('L14', 9) + 0.6, 80, 700, 0.14, 0.85))                                 # ink through the robe
    # ── 只有无天: the eyes open; a dark bell; black
    t_e = ch('L15', 9) - 0.1
    sco.add(ts('L15') - 0.25, drone(te('L15') - ts('L15') + 1.0, nt('G#1', 'D#2'), 0.9, 0.5, 0.6))
    fx.add(t_e + 0.35, drum(0.8, 55, 26, 2.6, 0.8)); fx.add(t_e + 0.37, bell(NOTE['G#2'] / 2, 5.0, 0.9)); fx.add(t_e + 0.3, fire_roar(1.8, 0.14))
    # ── end card
    t_c = te('L15') + 0.7
    fx.add(t_c + 0.05, bowl(NOTE['B3'], 2.6, 0.7)); fx.add(t_c + 0.1, guqin(NOTE['B2'], 2.6, 0.45))

    # ── duck the score (and, less, the effects) under the voice
    act = filt(np.abs(vo.x[:, 0]), 'lowpass', 8)
    act = np.clip(act / (np.percentile(act[act > 1e-4], 60) + 1e-9), 0, 1)
    att, rel = np.exp(-1 / (0.06 * SR / 64)), np.exp(-1 / (0.6 * SR / 64))
    d = np.empty_like(act); y = 0.0
    for i in range(0, len(act), 64):                                   # fast-up, slow-down follower (block-wise)
        v = act[i:i + 64].max(); k = att if v > y else rel; y = k * y + (1 - k) * v; d[i:i + 64] = y
    sco.x *= (1 - 0.8 * d)[:, None]                                    # the score drops ~14 dB under the voice
    fx.x *= (1 - 0.5 * d)[:, None]                                     # effects ~6 dB
    # ── mix, space, loudness
    room = reverb_ir(0.9, 0.25, 6000, 11)
    vo_wet = conv_st(vo.x, room) * 0.07
    wet = conv_st(fx.x + sco.x * 0.5, reverb_ir(3.2, 1.1, 5500, 5)) * 0.3
    mix = vo.x + vo_wet + mus.x + sco.x * 0.5 + fx.x * 0.8 + wet
    if os.environ.get('STEMS'):                                          # for checking the balance
        for nm, x in [('vo', vo.x + vo_wet), ('bed', sco.x * 0.5 + fx.x * 0.8 + wet), ('song', mus.x)]: sf.write(os.path.join(ROOT, 'build', f'stem_{nm}.wav'), x, SR, subtype='FLOAT')
    f = int(0.5 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
    for _ in range(4):
        mix *= 10 ** ((-13.95 - lufs(mix)) / 20)
        mix = limiter(mix, 0.87)
    tp = 20 * np.log10(true_peak(mix) + 1e-12)
    if tp > -1.0: mix *= 10 ** ((-1.0 - tp) / 20)
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    sf.write(os.path.join(ROOT, 'build', 'audio.wav'), mix, SR, subtype='PCM_24')
    lossy(mix)
    a, b = int(SONG_AT * SR), int((SONG_AT + SONG) * SR)
    print(f'audio → build/audio.wav  {len(mix) / SR:.2f}s  integrated {lufs(mix):.1f} LUFS  (narration part {lufs(mix[:a]):.1f}, song {lufs(mix[a:b]):.1f}, epilogue {lufs(mix[b:]):.1f})  true peak {20 * np.log10(true_peak(mix)):.1f} dBTP')


if __name__ == '__main__':
    import sys
    if '--lossy' in sys.argv: lossy(sf.read(os.path.join(ROOT, 'build', 'audio.wav'))[0])   # only redo the delivery copy
    else: main()
