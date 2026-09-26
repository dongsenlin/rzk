"""Score for 千里共婵娟 — synthesised from scratch and locked to the picture.

Everything that happens on screen is in events.json (exported by the scene), so
every pluck, whoosh and hit below lands on the exact frame it belongs to:

  0.5 s   sonar ping; every node the sweep reveals is a grain of light (panned by x)
  2.0 s   千里 — a low open fifth; the characters leave the frame as two whooshes (L / R)
  4.0 s   共 — the arcs launch as a rising 32nd-note arpeggio, arrivals chime
  5.72 s  the ring closes as a real guzheng glissando (刮奏), swept in ring order
  6.0 s   团圆 — tremolo (摇指) climbs D–E–F#–A under a riser; the room inhales
  8.0 s   the moon — boom, gong, full D chord; Su Shi's couplet as call and response
  10 s    中 秋 快 乐 — taiko + guzheng on every beat, bass climbs G A B C# → D
  12 s    resolution; the sign-off types itself; the seal lands; one last harmonic

Key: D major pentatonic (宫调式), 120 BPM.  Output: score.wav (48 kHz, stereo).
"""
import json
import pathlib

import numpy as np
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, fftconvolve, filtfilt, istft, lfilter, sosfilt, stft

SR = 48000
DUR = 15.0
N = int(SR * DUR)
HERE = pathlib.Path(__file__).parent
RNG = np.random.default_rng(20260925)

PENTA = [0, 2, 4, 7, 9]  # D E F# A B


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def penta(i, base=62):
    """i-th note of D pentatonic starting at MIDI `base` (D4 = 62)."""
    o, k = divmod(i, 5)
    return base + 12 * o + PENTA[k]


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def pan_lr(p):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def biquad_peak(f, gain_db, q):
    a = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = np.array([1 + al * a, -2 * np.cos(w), 1 - al * a])
    aa = np.array([1 + al / a, -2 * np.cos(w), 1 - al / a])
    return b / aa[0], aa / aa[0]


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR * 0.45) / (SR / 2), 'low', output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1 / (SR / 2), min(f2, SR * 0.45) / (SR / 2)], 'band', output='sos'), x)


# ── mixing buses ────────────────────────────────────────────────────────────
class Bus:
    def __init__(self, name, send=0.0):
        self.name, self.send = name, send
        self.buf = np.zeros((2, N))

    def add(self, sig, t, pan=0.0, gain=1.0):
        i0 = int(round(t * SR))
        sig = np.asarray(sig, dtype=float)
        if sig.ndim == 1:
            l, r = pan_lr(pan)
            sig = np.stack([sig * l, sig * r])
        if i0 < 0:
            sig, i0 = sig[:, -i0:], 0
        n = min(sig.shape[1], N - i0)
        if n > 0:
            self.buf[:, i0:i0 + n] += sig[:, :n] * gain


zheng = Bus('guzheng', send=0.30)
pad = Bus('pad', send=0.45)
bass = Bus('bass', send=0.05)
perc = Bus('perc', send=0.18)
fx = Bus('fx', send=0.40)
sparkle = Bus('sparkle', send=0.55)
BUSES = [zheng, pad, bass, perc, fx, sparkle]


# ── instruments ─────────────────────────────────────────────────────────────
BODY = [biquad_peak(190, 3.0, 1.1), biquad_peak(820, 2.0, 1.4), biquad_peak(2700, 2.5, 1.8)]


def guzheng(m, dur=3.0, vel=0.7, t60=None, bright=0.65, pos=0.12, vib=0.0, vib_at=0.3, bend=None, seed=None):
    """Karplus–Strong string with an allpass-tuned loop, nail click, body EQ,
    and pitch modulation for 揉弦 (vibrato) and 按音 (bends)."""
    f = midi(m)
    n = int(dur * SR)
    P = SR / f
    Nd = int(np.floor(P - 0.6))
    d = P - 0.5 - Nd
    c = (1 - d) / (1 + d)
    if t60 is None:
        t60 = float(np.interp(np.log2(f), [np.log2(90), np.log2(1500)], [6.0, 1.6]))
    g = 10 ** (-3 / (f * t60))
    rng = np.random.default_rng(seed if seed is not None else int(m * 1000 + vel * 100))
    L = int(round(P))
    exc = rng.uniform(-1, 1, L)
    a1 = float(np.clip(1 - (0.25 + 0.7 * bright * (0.55 + 0.45 * vel)), 0.03, 0.95))
    exc = lfilter([1 - a1], [1, -a1], exc)
    k = max(1, int(pos * L))
    exc = exc - np.concatenate([np.zeros(k), exc[:-k]])
    exc -= exc.mean()
    x = np.zeros(n)
    x[:L] = exc
    a = np.zeros(Nd + 3)
    a[0] = 1.0
    a[1] += c
    a[Nd] -= g * 0.5 * c
    a[Nd + 1] -= g * (0.5 + 0.5 * c)
    a[Nd + 2] -= g * 0.5
    y = lfilter([1.0, c], a, x)
    nc = int(0.004 * SR)
    click = hp(rng.standard_normal(nc) * np.exp(-np.linspace(0, 6, nc)), 2500)
    y[:nc] += click * 0.35 * vel * np.max(np.abs(y[:L * 4] if L * 4 < n else y))
    for b_, a_ in BODY:
        y = lfilter(b_, a_, y)
    if vib or bend:
        tt = np.arange(n) / SR
        cents = np.zeros(n)
        if vib:
            cents += vib * np.sin(2 * np.pi * 5.4 * tt) * smooth((tt - vib_at) / 0.35)
        if bend:
            t0, t1, amt = bend
            cents += amt * smooth((tt - t0) / (t1 - t0))
        ph = np.cumsum(2 ** (cents / 1200))
        y = np.interp(ph - ph[0], np.arange(n), y)
    fade = min(n, int(0.02 * SR))
    y[-fade:] *= np.linspace(1, 0, fade)
    return y / (np.max(np.abs(y)) + 1e-12) * vel


def harmonic(m, dur=3.0, vel=0.5):
    """泛音 — a touched-string harmonic: pure, glassy, slow to fade."""
    f = midi(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t) + 0.05 * np.sin(2 * np.pi * 3 * f * t))
    y *= (1 - np.exp(-t / 0.004)) * np.exp(-t / (dur * 0.33))
    return y * vel / 1.23


def saw_table(f, size=4096, tilt=1.15):
    kmax = int(max(1, min(60, (SR * 0.45) / f)))
    ph = np.arange(size) / size * 2 * np.pi
    tab = sum(np.sin(k * ph) / k ** tilt for k in range(1, kmax + 1))
    return tab / np.max(np.abs(tab))


def osc(f, n, table, cents=0.0, phase=0.0):
    inc = f * 2 ** (cents / 1200) / SR * len(table)
    idx = (phase * len(table) + inc * np.arange(n)) % len(table)
    return np.interp(idx, np.arange(len(table) + 1), np.append(table, table[0]))


def pad_chord(notes, dur, att=0.8, rel=1.2, cutoff=1600, vel=0.5, width=0.7):
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    envl = np.clip(t / att, 0, 1) ** 1.6 * np.where(t < dur, 1.0, np.exp(-(t - dur) / (rel / 3)))
    out = np.zeros((2, n))
    for j, m in enumerate(notes):
        f = midi(m)
        tab = saw_table(f)
        for v, (cents, p) in enumerate([(-7, -width), (0, 0.0), (7, width)]):
            s = osc(f, n, tab, cents, phase=RNG.random())
            s = lp(s, cutoff)
            l, r = pan_lr(p * (0.6 + 0.4 * (j % 2)))
            out[0] += s * l
            out[1] += s * r
    out *= envl * vel / (len(notes) * 2.2)
    return out


def sub(m, dur, vel=0.6, att=0.02, rel=0.6, drive=1.4):
    f = midi(m)
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    y = np.tanh(drive * np.sin(2 * np.pi * f * t)) / np.tanh(drive)
    e = np.clip(t / att, 0, 1) * np.where(t < dur, 1.0, np.exp(-(t - dur) / (rel / 4)))
    return lp(y * e, 300) * vel


def fm_bell(f, dur=2.0, ratio=3.5, index=2.2, vel=0.4, decay=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t + index * np.exp(-t * 3.5) * np.sin(2 * np.pi * f * ratio * t))
    return y * np.exp(-t / decay) * (1 - np.exp(-t / 0.002)) * vel


def blip(f, dur=0.07, vel=0.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.018) * (1 - np.exp(-t / 0.0015)) * vel


def tick(vel=0.1, f=4200, seed=0):
    rng = np.random.default_rng(seed)
    n = int(0.012 * SR)
    y = bp(rng.standard_normal(n), f * 0.7, f * 1.4) * np.exp(-np.arange(n) / (0.0025 * SR))
    return y / (np.max(np.abs(y)) + 1e-12) * vel


def gong(f0=86.0, dur=6.0, vel=0.8):
    """大锣: inharmonic partials that bloom after the strike and sag in pitch."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    ratios = [1.0, 1.52, 1.97, 2.44, 2.95, 3.49, 4.08, 4.71, 5.43, 6.21, 7.05, 8.3]
    y = np.zeros(n)
    rng = np.random.default_rng(7)
    for k, r in enumerate(ratios):
        f = f0 * r * (1 + rng.uniform(-0.006, 0.006))
        glide = 1 - 0.018 * (1 - np.exp(-t / 0.9))
        ph = 2 * np.pi * np.cumsum(f * glide) / SR
        rise = 0.004 + 0.05 * k
        amp = (0.45 if k == 0 else 1) * (1 / (1 + 0.45 * k)) * (1 - np.exp(-t / rise)) * np.exp(-t / (4.2 / (1 + 0.22 * k)))
        y += np.sin(ph + rng.uniform(0, 2 * np.pi)) * amp * rng.uniform(0.7, 1.0)
    nm = int(0.03 * SR)
    y[:nm] += lp(rng.standard_normal(nm), 1800) * np.exp(-np.arange(nm) / (0.006 * SR)) * 0.8
    return y / np.max(np.abs(y)) * vel


def boom(vel=0.9, f_hi=120, f_lo=38, tau=0.7):
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.07)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    y = np.tanh(2.2 * y) / np.tanh(2.2)
    ns = lp(RNG.standard_normal(n), 380) * np.exp(-t / 0.09) * 0.55
    return (y + ns) * (1 - np.exp(-t / 0.0015)) * vel


def taiko(f0=72, vel=0.8):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.65 * np.exp(-t / 0.025))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    skin = bp(RNG.standard_normal(n), 180, 1400) * np.exp(-t / 0.035) * 0.6
    y = np.tanh(1.6 * (body + skin))
    return y / np.max(np.abs(y)) * vel


def shaped_noise(dur, centers, widths, gains, seed=0):
    """Noise whose spectrum is a moving gaussian band — whooshes and risers."""
    n = int(dur * SR)
    x = np.random.default_rng(seed).standard_normal(n)
    f, tt, Z = stft(x, SR, nperseg=2048, noverlap=1536)
    tn = np.clip(tt / dur, 0, 1)
    c = np.interp(tn, np.linspace(0, 1, len(centers)), np.log(centers))
    w = np.interp(tn, np.linspace(0, 1, len(widths)), widths)
    gn = np.interp(tn, np.linspace(0, 1, len(gains)), gains)
    lf = np.log(np.maximum(f, 20))[:, None]
    Z *= np.exp(-0.5 * ((lf - c[None, :]) / w[None, :]) ** 2) * gn[None, :]
    _, y = istft(Z, SR, nperseg=2048, noverlap=1536)
    y = y[:n]
    return y / (np.max(np.abs(y)) + 1e-12)


def strum(notes, t, vel=0.7, spread=0.045, dur=4.0, bus=None, pan=0.0, **kw):
    bus = bus or zheng
    for i, m in enumerate(notes):
        p = pan + (i / max(1, len(notes) - 1) - 0.5) * 0.8
        bus.add(guzheng(m, dur, vel * (0.85 + 0.15 * i / len(notes)), **kw), t + i * spread / len(notes) * 1.0, pan=p)


def limit(x, ceiling, hold=0.012, smooth_ms=2.5):
    """Stereo-linked look-ahead peak limiter: the gain starts falling before the peak arrives."""
    env = maximum_filter1d(np.max(np.abs(x), axis=0), size=2 * int(hold * SR) + 1)
    g = np.minimum(1.0, ceiling / np.maximum(env, 1e-9))
    r = np.exp(-1 / (smooth_ms * 1e-3 * SR))
    g = filtfilt([1 - r], [1, -r], g)
    return x * np.minimum(g, 1.0)


# ── reverb ──────────────────────────────────────────────────────────────────
def make_ir(t60=2.7, pre=0.024):
    n = int(SR * (t60 + 0.4))
    t = np.arange(n) / SR
    rng = np.random.default_rng(99)
    out = []
    for ch in range(2):
        x = rng.standard_normal(n) * np.exp(-6.9 * t / t60)
        dark = lp(x, 2600)
        mix = np.clip(t / (t60 * 0.5), 0, 1)
        x = x * (1 - mix) + dark * mix
        x[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        for d_, g_ in [(0.011, 0.5), (0.019, 0.4), (0.027, 0.33), (0.041, 0.25)]:
            j = int((d_ + 0.003 * ch) * SR)
            x[j] += g_ * 6
        out.append(np.concatenate([np.zeros(int(pre * SR)), x]))
    ir = np.stack(out)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


# ── the score ───────────────────────────────────────────────────────────────
def score(ev):
    by = lambda typ: [e for e in ev if e['type'] == typ]

    # 0.0 – 0.5  the caret blinks twice
    for tb in (0.06, 0.28):
        fx.add(tick(0.10, 5200, seed=int(tb * 100)), tb, gain=1.0)
    # 0.5  first light: sonar ping (harmonic + ping), a heartbeat under it
    sparkle.add(harmonic(86, 3.2, 0.26), 0.5, pan=0)
    sparkle.add(fm_bell(midi(81), 2.2, ratio=2.0, index=0.8, vel=0.18, decay=0.7), 0.5)
    for b in range(1, 12):  # home pulses on every beat until the ring forms
        tb = b * 0.5
        v = (0.30 + 0.25 * min(1, b / 6)) * (1 - smooth((tb - 3.5) / 2.0))   # hands over to the arcs
        perc.add(boom(v * 0.32, f_hi=110, f_lo=62, tau=0.1), tb)
    # the sweep reveals the world — every node a grain of light, panned where it sits
    for e in by('pop'):
        m = penta(10 + int((1 - min(1, e['d'] / 800)) * 6) + RNG.integers(0, 3))
        sparkle.add(blip(midi(m), 0.08, 0.035 + RNG.random() * 0.025), e['t'], pan=e['pan'] * 0.9)
    for i, e in enumerate(by('cityPop')):
        sparkle.add(fm_bell(midi(penta(7 + i % 6)), 1.2, ratio=3.01, index=1.2, vel=0.07, decay=0.35), e['t'], pan=e['pan'])
        fx.add(tick(0.05, 3800, seed=i), e['t'] + 0.05, pan=e['pan'])
    # drone: an open fifth that swells out of silence
    pad.add(pad_chord([50, 57, 64], 3.5, att=1.6, rel=1.0, cutoff=900, vel=0.55), 0.5)

    # 2.0  千里 — a low open fifth, far apart
    zheng.add(guzheng(50, 5.0, 0.8, bright=0.55), 2.0, pan=-0.25)
    zheng.add(guzheng(57, 4.5, 0.62, bright=0.55), 2.02, pan=0.25)
    zheng.add(guzheng(38, 4.0, 0.35, bright=0.4), 2.0, pan=0.0)
    pad.add(pad_chord([50, 57, 62, 64, 69], 2.0, att=0.4, rel=0.9, cutoff=1300, vel=0.42), 2.0)
    zheng.add(guzheng(66, 2.5, 0.38), 2.5, pan=0.3)
    zheng.add(guzheng(69, 2.5, 0.42), 2.75, pan=-0.2)
    zheng.add(guzheng(76, 3.0, 0.45, vib=14, vib_at=0.25, bend=(0.28, 0.42, -200)), 3.0, pan=0.1)   # E5 falling to D5
    # 3.5  the two characters leave the frame: two whooshes, left and right
    for side in (-1, 1):
        w = shaped_noise(0.55, [500, 3500, 7000], [0.5, 0.7, 0.6], [0, 1, 0], seed=3 + side)
        fx.add(w * np.hanning(len(w)) ** 0.5, 3.42, pan=0.85 * side, gain=0.22)

    # 4.0  共 — Bm7(11); the arcs launch as a 32nd-note arpeggio, arrivals chime
    bass.add(sub(47, 1.9, 0.5), 4.0)
    pad.add(pad_chord([59, 62, 64, 66, 69], 2.0, att=0.3, rel=0.6, cutoff=1700, vel=0.55), 4.0)
    for e in by('arc'):
        zheng.add(guzheng(penta(e['k']), 1.6, 0.30 + 0.02 * e['k'], bright=0.7), e['t'], pan=e['pan'] * 0.8)
    for e in by('arrive'):
        sparkle.add(fm_bell(midi(penta(e['k'] + 5)), 1.0, ratio=3.5, index=1.6, vel=0.05, decay=0.3), e['t'], pan=e['pan'])
    for e in by('arrive'):  # packets riding the arcs: faint ticks
        for k in range(3):
            fx.add(tick(0.025, 6000, seed=e['k'] * 7 + k), e['t'] + 0.12 + k * 0.33 + 0.42, pan=e['pan'] * 0.6)
    # 5.45  共 flies through the camera
    w = shaped_noise(0.6, [300, 1200, 5000], [0.6, 0.7, 0.8], [0, 0.8, 1.0], seed=11)
    fx.add(w * np.linspace(0, 1, len(w)) ** 2, 5.35, gain=0.3)
    # 5.72 → 6.02  the ring closes: one sweep across the strings (刮奏), in ring order
    lands = sorted(by('land'), key=lambda e: e['t'])
    last = -1
    for e in lands:
        s = int(e['rank'] * 21 / len(lands))
        if s == last:
            continue
        last = s
        zheng.add(guzheng(penta(s, 50), 1.2, 0.2 + 0.14 * s / 21, t60=0.9, bright=0.75, seed=s), e['t'], pan=e['pan'] * 0.9)

    # 6.0  团圆 — Gmaj9 → Asus4, tremolo climbing D–E–F#–A under a riser
    sparkle.add(fm_bell(midi(86), 2.4, ratio=2.0, index=1.0, vel=0.12, decay=0.8), 6.02)
    sparkle.add(fm_bell(midi(93), 2.4, ratio=2.0, index=0.8, vel=0.07, decay=0.8), 6.03, pan=0.3)
    bass.add(sub(43, 1.0, 0.35), 6.0)
    bass.add(sub(45, 0.97, 0.45), 7.0)
    pad.add(pad_chord([55, 59, 62, 66, 69], 1.0, att=0.5, rel=0.4, cutoff=2000, vel=0.55), 6.0)
    pad.add(pad_chord([57, 62, 64, 69, 76], 0.97, att=0.6, rel=0.02, cutoff=3200, vel=0.75), 7.0)
    for j, (t0, t1, m) in enumerate([(6.0, 6.5, 74), (6.5, 7.0, 76), (7.0, 7.5, 78), (7.5, 7.75, 81)]):
        t = t0
        while t < t1 - 1e-6:
            v = 0.3 + 0.7 * ((t - 6.0) / 1.75) ** 1.4
            zheng.add(guzheng(m, 0.35, v, t60=0.5, bright=0.8, seed=int(t * 1000)), t, pan=0.15 * np.sin(t * 9))
            t += 0.0625
    riser = shaped_noise(1.85, [400, 1500, 9000], [0.5, 0.45, 0.5], [0.0, 0.35, 1.0], seed=21)
    fx.add(riser * np.linspace(0, 1, len(riser)) ** 1.8, 6.1, gain=0.62)
    # a tone that climbs with the string-art multiplier k (the same curve the picture uses)
    n = int(1.72 * SR)
    tt = 6.25 + np.arange(n) / SR
    u = np.clip((tt - 6.25) / 1.75, 0, 1)
    k = 2 + u + 6.4 * u ** 4
    f = 220 * 2 ** (2 * (k - 2) / 7.4)
    ph = np.cumsum(f) / SR
    tab = saw_table(440)
    tone = np.interp((ph * len(tab)) % len(tab), np.arange(len(tab) + 1), np.append(tab, tab[0]))
    tone = lp(tone, 2400) * (u ** 1.6) * 0.5
    fx.add(np.stack([tone, np.roll(tone, 240)]), 6.25, gain=0.35)

    # 7.75 → 8.0  the inhale: the drop chord, reversed, sucked back to silence
    drop_chord = [50, 57, 62, 66, 69, 74, 76]
    ring = np.zeros(int(1.2 * SR))
    for m in drop_chord:
        g_ = guzheng(m, 1.2, 0.5, bright=0.6)
        ring[:len(g_)] += g_
    ir = make_ir(1.6, 0.0)
    rev = fftconvolve(ring, ir[0])[:int(1.0 * SR)]
    rev = rev[::-1] * np.linspace(0, 1, len(rev)) ** 2
    fx.add(rev / np.max(np.abs(rev)), 7.97 - len(rev) / SR, gain=0.3)

    # 8.0  THE MOON
    bass.add(boom(1.0, f_hi=130, f_lo=44, tau=0.55), 8.0)
    bass.add(sub(38, 1.8, 0.5, att=0.005, rel=1.2), 8.0)
    perc.add(gong(84, 6.0, 0.55), 8.0)
    strum(drop_chord, 8.0, vel=0.85, spread=0.05, dur=4.5)
    crash = hp(RNG.standard_normal(int(2.5 * SR)), 3500) * env_exp(int(2.5 * SR), 0.45)
    fx.add(np.stack([crash, np.roll(crash, 97)]) * 0.16, 8.0)
    pad.add(pad_chord([50, 57, 62, 66, 69, 76], 1.0, att=0.02, rel=0.5, cutoff=2800, vel=0.75), 8.0)
    pad.add(pad_chord([47, 59, 62, 66, 69, 74], 1.0, att=0.3, rel=0.5, cutoff=2200, vel=0.6), 9.0)
    bass.add(sub(47, 0.95, 0.4), 9.0)
    # Su Shi's couplet — 上联 rises, 下联 answers
    melody = [74, 76, 78, 81, 83, 81, 78, 76, 74, 69]
    for e in by('couplet'):
        i = e['i']
        end = i in (4, 9)
        zheng.add(guzheng(melody[i], 2.8 if end else 1.6, 0.44 + (0.1 if end else 0), bright=0.62,
                          vib=16 if end else 0, vib_at=0.28), e['t'], pan=0.35 if i < 5 else -0.35)
    rc = shaped_noise(0.5, [2000, 6000], [0.6, 0.5], [0, 1], seed=31)
    fx.add(rc * np.linspace(0, 1, len(rc)) ** 2, 9.5, gain=0.12)

    # 10.0  中 秋 快 乐 — every beat a hit; the bass climbs to the tonic
    hits = [(10.0, 43, [55, 59, 62], 74), (10.5, 45, [57, 61, 64], 76), (11.0, 47, [59, 62, 66], 78), (11.5, 49, [57, 61, 64], 81)]
    for t, b, chord, top in hits:
        perc.add(taiko(84, 0.6), t)
        bass.add(sub(b, 0.46, 0.3, att=0.004, rel=0.25), t)
        zheng.add(guzheng(top, 1.8, 0.95, bright=0.82), t, pan=0.1)
        zheng.add(guzheng(top - 12, 1.8, 0.55, bright=0.7), t + 0.008, pan=-0.1)
        pad.add(pad_chord(chord, 0.42, att=0.01, rel=0.3, cutoff=3000, vel=0.55), t)
    pull = shaped_noise(0.3, [800, 6000], [0.6, 0.7], [0, 1], seed=41)
    fx.add(pull * np.linspace(0, 1, len(pull)) ** 3, 11.7, gain=0.2)

    # 12.0  resolution — the line pulls back into place; D major, wide and warm
    w = shaped_noise(0.7, [6000, 900, 300], [0.7, 0.6, 0.6], [1, 0.5, 0], seed=51)
    fx.add(w * np.linspace(1, 0, len(w)) ** 1.5, 12.0, gain=0.22)
    bass.add(boom(0.35, f_hi=100, f_lo=46, tau=0.6), 12.0)
    bass.add(sub(50, 2.2, 0.45, att=0.01, rel=1.0), 12.0)
    strum([50, 57, 62, 66, 69, 74, 78, 86], 12.0, vel=0.72, spread=0.08, dur=3.0)
    pad.add(pad_chord([50, 57, 64, 66, 69, 74], 2.6, att=0.05, rel=0.8, cutoff=2400, vel=0.9), 12.0)
    # the sign-off types itself, token by token
    for e in by('token'):
        fx.add(tick(0.07, 3000 + 400 * (e['k'] % 3), seed=100 + e['k']), e['t'])
        sparkle.add(blip(midi(penta(12 + e['k'] % 5)), 0.06, 0.03), e['t'], pan=-0.3 + 0.08 * e['k'])
    zheng.add(guzheng(81, 2.5, 0.62, vib=12), 12.5, pan=0.2)
    # 13.0  the seal: a soft, woody press into paper
    seal_t = by('seal')[0]['t']
    thud = boom(0.55, f_hi=180, f_lo=90, tau=0.07)
    perc.add(thud, seal_t)
    perc.add(bp(RNG.standard_normal(int(0.06 * SR)), 300, 2400) * env_exp(int(0.06 * SR), 0.012) * 0.25, seal_t)
    zheng.add(guzheng(78, 2.0, 0.58, vib=12), 13.0, pan=-0.2)
    # 13.55  the light sweeps across 中秋快乐, left to right
    sh = fm_bell(midi(93), 1.6, ratio=2.76, index=1.4, vel=0.12, decay=0.5)
    shs = fm_bell(midi(98), 1.6, ratio=2.76, index=1.0, vel=0.06, decay=0.4)
    for k, (s_, p_) in enumerate([(sh, -0.6), (shs, 0.6)]):
        sparkle.add(s_, by('shine')[0]['t'] + k * 0.3, pan=p_)
    # 14.0  home, last: the tonic with a gentle press, and a harmonic above it
    zheng.add(guzheng(76, 1.4, 0.66, vib=18, vib_at=0.3, bend=(0.0, 0.14, -200)), 14.0, pan=0.0)   # E5 pressed down to D5
    sparkle.add(harmonic(86, 1.4, 0.32), 14.25, pan=0.25)


def main():
    data = json.loads((HERE / 'events.json').read_text())
    score(data['events'])
    ir = make_ir()
    mix = np.zeros((2, N))
    GAIN = {'guzheng': 1.0, 'pad': 0.9, 'bass': 0.28, 'perc': 0.62, 'fx': 1.0, 'sparkle': 1.2}
    b_, a_ = biquad_peak(3200, 4.0, 0.8)              # guzheng presence
    zheng.buf = lfilter(b_, a_, zheng.buf, axis=-1)
    for b in BUSES:
        b.buf *= GAIN[b.name]
        mix += b.buf
        if b.send:
            for ch in range(2):
                mix[ch] += fftconvolve(hp(b.buf[ch], 160), ir[ch])[:N] * b.send * 0.5   # no mud in the tail
    mix = hp(mix, 36)
    mix /= np.max(np.abs(mix)) / 0.9
    mix = limit(mix, 0.9 * 10 ** (-4.5 / 20))     # shave the drop's peaks so loudness can stay linear
    mix /= np.max(np.abs(mix)) / 0.9
    mix = np.tanh(1.15 * mix) / np.tanh(1.15)
    t = np.arange(N) / SR
    mix *= np.clip(t / 0.005, 0, 1) * np.where(t > 14.3, np.cos(np.clip((t - 14.3) / 0.7, 0, 1) * np.pi / 2) ** 1.5, 1.0)
    mix /= np.max(np.abs(mix)) / 0.95
    out = (mix.T * 32767).astype('<i2')
    import wave
    with wave.open(str(HERE / 'score.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(out.tobytes())
    seg = lambda a, b: 20 * np.log10(np.sqrt(np.mean(mix[:, int(a * SR):int(b * SR)] ** 2)) + 1e-9)
    print('score.wav written;', ' '.join(f'{a:g}-{b:g}s:{seg(a, b):.1f}dB' for a, b in
                                         [(0, 2), (2, 4), (4, 6), (6, 8), (8, 10), (10, 12), (12, 15)]))


if __name__ == '__main__':
    main()
