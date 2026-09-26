"""Music, sound design and mix for the reel — all synthesised, on the picture's beat grid.

128 BPM, 8 bars = 15.0 s.  Am | F | C (drop) | G | Am | F | G (breakdown + build) | C (final hit).
Every SFX is placed on an edit point of scenes.js.  VO clips are placed from
build/vo/manifest.json; the music bus ducks under them.  Master is normalised
to about -14 LUFS with a true-peak ceiling of -1 dBTP.

    python3 src/audio.py            → build/audio.wav (48 kHz stereo, 24-bit)
"""
import json, os
import numpy as np
import soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = 15.0
N = int(SR * DUR)
BPM = 128
BEAT = 60 / BPM
BAR = 4 * BEAT
FPS = 30
rng = np.random.default_rng(7)


def bt(n):
    return n * BEAT


def cut(beat):                       # same snapping as scenes.js
    return (round(bt(beat) * FPS - 0.5) + 0.5) / FPS


T = dict(launch=bt(1), carIn=bt(4), drop=bt(8), energy=cut(11), ai=cut(14), robot=cut(17), roles=cut(20), you=cut(24), end=cut(28))


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ───────────────────────── buses ─────────────────────────
class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, t0, sig, gain=1.0, pan=0.0):
        """sig mono (n,) or stereo (n,2); pan -1..1 (equal power) for mono."""
        i0 = int(round(t0 * SR))
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], 1) * np.sqrt(2)
        if i0 < 0:
            sig = sig[-i0:]; i0 = 0
        n = min(len(sig), N - i0)
        if n > 0:
            self.x[i0:i0 + n] += sig[:n] * gain


music, drums, sfx, verb_send = Bus(), Bus(), Bus(), Bus()


# ───────────────────────── dsp helpers ─────────────────────────
def tt(d):
    return np.arange(int(d * SR)) / SR


def phase(freq):
    return 2 * np.pi * np.cumsum(freq) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def sos(kind, f, order=2, **kw):
    return signal.butter(order, f, btype=kind, fs=SR, output='sos', **kw)


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=0)


def sweep_filter(x, f0, f1, kind='bandpass', q=1.5, curve='exp', block=256):
    """time-varying filter, coefficients updated per block (state carried)."""
    y = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        p = b / max(1, nb - 1)
        f = f0 * (f1 / f0) ** p if curve == 'exp' else f0 + (f1 - f0) * p
        f = min(max(f, 30), SR / 2 * 0.95)
        if kind == 'bandpass':
            s = signal.butter(2, [f / (2 ** (0.5 / q)), min(f * 2 ** (0.5 / q), SR / 2 * 0.98)], btype='bandpass', fs=SR, output='sos')
        else:
            s = signal.butter(2, f, btype=kind, fs=SR, output='sos')
        if zi is None or zi.shape[0] != s.shape[0]:
            zi = np.zeros((s.shape[0], 2))
        seg = x[b * block:(b + 1) * block]
        y[b * block:(b + 1) * block], zi = signal.sosfilt(s, seg, zi=zi)
    return y


def polyblep_saw(freq):
    dt = freq / SR
    ph = np.cumsum(dt) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    t = ph[m] / dt[m]; y[m] -= t + t - t * t - 1
    m = ph > 1 - dt
    t = (ph[m] - 1) / dt[m]; y[m] -= t * t + t + t + 1
    return y


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, hold=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = n - a - d - r if hold is None else int(hold * SR)
    hold = max(hold, 0)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(hold, s), np.linspace(s, 0, max(r, 1))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def expdec(d, tau):
    return np.exp(-tt(d) / tau)


def reverb_ir(d=2.2, pre=0.02, tau=0.55, bright=6000, seed=3):
    r = np.random.default_rng(seed)
    n = int(d * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-t / tau)[:, None]
    ir = signal.sosfilt(sos('lowpass', bright), ir, axis=0)
    ir[: int(pre * SR)] = 0
    # early reflections
    for k, (dl, g) in enumerate([(0.011, 0.5), (0.019, 0.4), (0.027, 0.35), (0.037, 0.3)]):
        ir[int((pre + dl) * SR), k % 2] += g
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def conv_st(x, ir):
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)


def width(sig_l, sig_r):
    return np.stack([sig_l, sig_r], 1)


# ───────────────────────── instruments ─────────────────────────
def kick(g=1.0, dec=0.32, f_hi=150, f_lo=46):
    t = tt(0.6)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.035)
    body = np.sin(phase(f)) * np.exp(-t / dec)
    click = filt(noise(0.6), 'highpass', 2500) * np.exp(-t / 0.004) * 0.35
    k = np.tanh((body + click) * 1.6) / np.tanh(1.6)
    return k * g


def clap(g=1.0):
    t = tt(0.4)
    n = filt(noise(0.4), 'bandpass', [900, 2600])
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.009, 0.018, 0.026]):
        m = t >= o
        env[m] += np.exp(-(t[m] - o) / (0.006 if k < 3 else 0.09))
    return n * env * 0.5 * g


def hat(open_=False, g=1.0):
    d = 0.35 if open_ else 0.06
    t = tt(d)
    x = filt(noise(d), 'highpass', 7000)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in [4020, 5710, 6300, 7890]) * 0.08
    x = filt(x + metal, 'highpass', 6000)
    return x * np.exp(-t / (0.11 if open_ else 0.018)) * 0.35 * g


def crash(g=1.0, d=2.2):
    t = tt(d)
    x = filt(noise(d), 'highpass', 4200)
    ring = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in [3130, 4410, 5270, 6620, 8030]) * 0.05
    x = (x + ring) * (np.exp(-t / 0.55) * 0.8 + np.exp(-t / 0.05) * 0.6)
    return width(x, np.roll(x, 211)) * 0.3 * g


def snare(g=1.0):
    t = tt(0.25)
    tone = np.sin(phase(180 + 60 * np.exp(-t / 0.02))) * np.exp(-t / 0.05)
    nz = filt(noise(0.25), 'bandpass', [1500, 7000]) * np.exp(-t / 0.07)
    return (tone * 0.5 + nz * 0.7) * g


def sub_note(f, d, g=1.0):
    t = tt(d)
    x = np.sin(phase(np.full(len(t), f))) + 0.18 * np.sin(phase(np.full(len(t), 2 * f)))
    return x * adsr(len(t), 0.005, 0.05, 0.9, 0.06) * g


def pad_chord(notes, d, cutoff=(600, 2400), g=1.0, det=0.12):
    n = int(d * SR)
    L = np.zeros(n); R = np.zeros(n)
    for nt in notes:
        f = midi(nt)
        for k, c in enumerate([-det, 0, det]):
            ff = np.full(n, f * 2 ** (c / 12)) * (1 + 0.0015 * np.sin(2 * np.pi * (0.2 + 0.07 * k) * np.arange(n) / SR))
            s = polyblep_saw(ff)
            if k != 2: L += s
            if k != 0: R += s
    env = adsr(n, 0.25, 0.3, 0.85, 0.5)
    L = sweep_filter(L * env, cutoff[0], cutoff[1], 'lowpass')
    R = sweep_filter(R * env, cutoff[0], cutoff[1], 'lowpass')
    return width(L, R) * 0.06 * g / np.sqrt(len(notes))


def pluck(f, g=1.0, dec=0.18, bright=5000):
    t = tt(0.5)
    s = polyblep_saw(np.full(len(t), f)) * 0.6 + np.sign(np.sin(phase(np.full(len(t), f)))) * 0.25
    s = sweep_filter(s, bright, 300, 'lowpass', block=128)
    return s * np.exp(-t / dec) * adsr(len(t), 0.002, 0.02, 1, 0.05) * g


def stab(notes, g=1.0):
    t = tt(1.6)
    x = np.zeros(len(t))
    for nt in notes:
        x += polyblep_saw(np.full(len(t), midi(nt))) + polyblep_saw(np.full(len(t), midi(nt) * 1.004))
    x = sweep_filter(x, 7000, 500, 'lowpass', block=128)
    x *= np.exp(-t / 0.45)
    return width(x, np.roll(x, 300)) * 0.05 * g


# ───────────────────────── sfx ─────────────────────────
def blip(f=1800, d=0.07, g=1.0):
    t = tt(d)
    return np.sin(phase(f * (1 + 0.15 * (1 - np.exp(-t / 0.01))))) * np.exp(-t / (d / 3)) * adsr(len(t), 0.001, 0.01, 1, 0.01) * g


def tick(g=1.0, f=4200):
    t = tt(0.03)
    return filt(noise(0.03), 'bandpass', [f * 0.7, f * 1.4]) * np.exp(-t / 0.0035) * g


def whoosh(d, f0=300, f1=4000, g=1.0, peak=0.6, pan=(0, 0)):
    x = noise(d)
    x = sweep_filter(x, f0, f1, 'bandpass', q=1.2)
    t = np.linspace(0, 1, len(x))
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / (1 - peak) * 4))
    x = x * env
    p = np.linspace(pan[0], pan[1], len(x))
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2) * 0.5 * g


def riser(d, g=1.0, f0=250, f1=7000):
    x = sweep_filter(noise(d), f0, f1, 'bandpass', q=2.0)
    t = np.linspace(0, 1, len(x))
    tone = np.sin(phase(np.geomspace(180, 1400, len(x)))) * 0.25
    env = t ** 2.4
    y = (x * 0.8 + tone) * env
    return width(y, np.roll(y, 97)) * 0.5 * g


def impact(g=1.0, d=2.0, f0=62, f1=31):
    t = tt(d)
    boom = np.sin(phase(f1 + (f0 - f1) * np.exp(-t / 0.18))) * np.exp(-t / 0.55)
    thud = filt(noise(d), 'lowpass', 700) * np.exp(-t / 0.09) * 0.6
    crack = filt(noise(d), 'highpass', 3000) * np.exp(-t / 0.012) * 0.3
    x = np.tanh((boom + thud + crack) * 1.4) * 0.9
    return x * g


def suck(d, g=1.0):
    x = sweep_filter(noise(d), 800, 7000, 'bandpass', q=1.3)
    t = np.linspace(0, 1, len(x))
    return x * t ** 3 * 0.6 * g


def powerup(g=1.0):
    t = tt(0.4)
    f = 280 * (2400 / 280) ** np.clip(t / 0.3, 0, 1)
    x = np.sin(phase(f * (1 + 0.01 * np.sin(2 * np.pi * 30 * t)))) * adsr(len(t), 0.01, 0.1, 0.6, 0.15)
    return x * 0.35 * g


def servo(g=1.0, up=True):
    t = tt(0.22)
    f = np.linspace(170, 420, len(t)) if up else np.linspace(420, 200, len(t))
    x = polyblep_saw(f) * 0.5 + np.sin(phase(f * 2)) * 0.3
    x = filt(x, 'lowpass', 1800) * adsr(len(t), 0.01, 0.05, 0.8, 0.08)
    clack = filt(noise(0.22), 'bandpass', [900, 3000]) * np.exp(-t / 0.01)
    ping = np.sin(2 * np.pi * 1250 * t) * np.exp(-t / 0.03) * 0.4
    return (x * 0.45 + clack * 0.6 + ping) * g


def woodblock(f=1100, g=1.0):
    t = tt(0.08)
    x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.58 * t)) * np.exp(-t / 0.018)
    x += filt(noise(0.08), 'highpass', 3000) * np.exp(-t / 0.002) * 0.4
    return x * g


def key_click(g=1.0):
    t = tt(0.06)
    x = filt(noise(0.06), 'bandpass', [2000, 6000]) * np.exp(-t / 0.004)
    x += np.sin(2 * np.pi * rng.uniform(150, 220) * t) * np.exp(-t / 0.012) * 0.5
    return x * g


def pen(d, g=1.0):
    x = filt(noise(d), 'bandpass', [1800, 5200])
    t = np.linspace(0, 1, len(x))
    env = np.sin(np.pi * t) ** 0.6 * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t))
    return x * env * 0.12 * g


def scan(d=0.4, g=1.0):
    x = sweep_filter(noise(d), 7000, 600, 'bandpass', q=3)
    t = np.linspace(0, 1, len(x))
    tone = np.sin(phase(np.geomspace(2400, 500, len(x)))) * 0.2
    return (x + tone) * np.sin(np.pi * t) * 0.5 * g


def passby(d=0.9, g=1.0):
    t = tt(d)
    f = 110 * (1.25 - 0.5 / (1 + np.exp(-(t - d * 0.35) * 18)))
    hum = polyblep_saw(f) * 0.3
    hum = filt(hum, 'lowpass', 900)
    air = sweep_filter(noise(d), 1500, 500, 'bandpass', q=1)
    env = np.exp(-((t - d * 0.33) / (d * 0.22)) ** 2)
    x = (hum + air * 0.7) * env
    p = np.linspace(-0.9, 1.0, len(x)); a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2) * 0.6 * g


# ───────────────────────── arrangement ─────────────────────────
CHORDS = {  # bass, pad voicing, arp tones
    'Am': (45, [57, 60, 64, 71], [69, 72, 76, 81]),
    'F': (41, [53, 57, 60, 64], [65, 69, 72, 76]),
    'C': (48, [55, 60, 64, 71], [72, 76, 79, 84]),
    'G': (43, [55, 59, 62, 69], [67, 71, 74, 79]),
    'Gsus': (43, [55, 60, 62, 67], [67, 72, 74, 79]),
}
PROG = ['Am', 'F', 'C', 'G', 'Am', 'F', 'Gsus', 'C']


def compose():
    # pads, one chord per bar (bar 7 moves Gsus → G), bar 8 sustains to the end
    for b, ch in enumerate(PROG):
        bass, voic, _ = CHORDS[ch]
        d = BAR + 0.6 if b < 7 else DUR - 7 * BAR
        lo, hi = [(300, 900), (500, 1600), (1200, 3800), (1500, 4200), (1500, 4200), (1500, 4200), (900, 3200), (2500, 5200)][b]
        music.add(b * BAR, pad_chord(voic, d, (lo, hi), g=[0.7, 0.9, 1.0, 1.0, 1.0, 1.0, 1.05, 1.2][b]))
        if b == 7:
            music.add(b * BAR, pad_chord([60, 67, 72, 76, 79], d, (5000, 1800), g=0.9, det=0.2))
    # sub bass
    for b, ch in enumerate(PROG):
        f = midi(CHORDS[ch][0] - 12 if CHORDS[ch][0] > 44 else CHORDS[ch][0])
        if b == 0:
            music.add(0.3, sub_note(f, BAR * 2 - 0.3, 0.35) * np.linspace(0, 1, int((BAR * 2 - 0.3) * SR)))
        elif b in (2, 3, 4, 5):
            for k in range(8):                            # 8th-note pumping bass
                music.add(b * BAR + k * BEAT / 2, sub_note(f, BEAT / 2 * 0.92, 0.55 if k % 2 else 0.4))
        elif b == 6:
            music.add(b * BAR, sub_note(f, BAR, 0.3))
        elif b == 7:
            music.add(b * BAR, sub_note(midi(36), DUR - b * BAR, 0.6) * np.exp(-tt(DUR - b * BAR) / 0.9))
    # pluck arp (16ths) — filtered intro, open in the groove, rising run at the end
    for b, ch in enumerate(PROG[:7]):
        arp = CHORDS[ch][2]
        for k in range(16):
            tk = b * BAR + k * BEAT / 4
            if b == 0 and k < 4:
                continue
            nt = arp[[0, 1, 2, 3, 2, 1, 2, 3][k % 8]] + (12 if (b >= 2 and k % 8 == 7) else 0)
            g = [0.18, 0.28, 0.5, 0.5, 0.5, 0.45, 0.3][b] * (1.0 if k % 4 == 0 else 0.7)
            br = [900, 1800, 5000, 5000, 5000, 4500, 3000][b]
            music.add(tk, pluck(midi(nt), g, dec=0.14, bright=br), pan=0.25 if k % 2 else -0.25)
    for k, nt in enumerate([72, 76, 79, 84, 88, 91, 96]):          # final run up
        music.add(T['end'] + 0.05 + k * BEAT / 4, pluck(midi(nt), 0.42, dec=0.3, bright=6000), pan=-0.5 + k / 6)

    # drums
    for b in range(2, 6):                                          # groove bars 3–6
        for k in range(4):
            drums.add(b * BAR + k * BEAT, kick(0.9))
            if k in (1, 3): drums.add(b * BAR + k * BEAT, clap(0.8)); verb_send.add(b * BAR + k * BEAT, clap(0.25))
            drums.add(b * BAR + k * BEAT + BEAT / 2, hat(k == 3, 0.8), pan=0.2)
            for s in (1, 3): drums.add(b * BAR + k * BEAT + s * BEAT / 4, hat(False, 0.35), pan=-0.2)
    for k in range(16):                                            # bar 2 build: hats + muffled kicks
        drums.add(BAR + k * BEAT / 4, hat(False, 0.12 + 0.5 * k / 15), pan=0.15)
    for k in range(3):
        drums.add(BAR + k * BEAT, filt(kick(0.6), 'lowpass', 400))
    for k in range(8):                                             # snare roll into the drop
        drums.add(bt(7) + k * BEAT / 8, snare(0.15 + 0.6 * k / 7))
    for k in range(12):                                            # bar 7 build
        tk = bt(26) + k * BEAT / 6 if k < 12 else 0
        drums.add(tk, snare(0.1 + 0.55 * (k / 11) ** 1.5))
    drums.add(T['drop'], crash(0.9)); drums.add(T['end'], crash(1.1))
    drums.add(T['end'], kick(1.1, dec=0.6))

    # ── sound design on the edit points
    sfx.add(0.18, blip(2200, 0.09, 0.25))
    sfx.add(T['launch'] - 0.02, whoosh(0.7, 500, 6000, 0.55, 0.12, (-0.8, 0.8)))
    sfx.add(T['launch'], impact(0.25, 1.2, 80, 40))
    for k in range(10): sfx.add(0.3 + k * 0.058, tick(0.12 + 0.05 * (k % 3), 3500 + 400 * (k % 4)), pan=-0.6 if k % 2 else 0.6)
    sfx.add(T['carIn'] + 0.25, pen(0.8, 1.0), pan=-0.2)
    for tb in (5, 5.5, 6):
        sfx.add(bt(tb), blip(2600, 0.05, 0.22), pan=0.3)
        for k in range(4): sfx.add(bt(tb) + 0.05 + k * 0.035, tick(0.08))
    sfx.add(bt(6), powerup(0.9), pan=0.5)
    sfx.add(bt(6.2), riser(T['drop'] - bt(6.2), 0.55))
    sfx.add(T['drop'], impact(1.0, 2.2))
    verb_send.add(T['drop'], impact(0.35, 1.0))
    sfx.add(T['drop'] - 0.08, passby(1.0, 0.9))
    sfx.add(bt(10.3), whoosh(T['energy'] + 0.12 - bt(10.3), 300, 5000, 0.9, 0.75, (-0.3, 0.9)))
    sfx.add(T['energy'] - 0.03, impact(0.45, 1.2, 90, 45))
    pent = [72, 74, 76, 79, 81, 84, 86, 88]                       # C major pentatonic for the Megapack pops
    for m, (i, j) in enumerate(sorted([(i, j) for i in range(3) for j in range(4)], key=lambda p: p[0] + p[1])):
        d = T['energy'] + 0.05 + (i + j) * 0.059 + 0.03
        sfx.add(d, blip(midi(pent[min(i + j + (m % 2), 7)]), 0.12, 0.2) + tick(0.1, 2500)[: int(0.12 * SR)].sum() * 0, pan=-0.4 + 0.2 * (i - j))
    for k in range(5): sfx.add(T['energy'] + 0.5 + k * 0.1, blip(midi(84 + [0, 4, 7, 12, 16][k]), 0.05, 0.1), pan=0.5)
    sfx.add(bt(13.35), suck(T['ai'] - bt(13.35), 0.7))
    sfx.add(T['ai'], impact(0.7, 1.6, 70, 34))
    for k in range(5): sfx.add(T['ai'] + 0.12 + k * 0.117, blip(midi(79 + [0, 2, 4, 7, 9][k]), 0.05, 0.18), pan=-0.6 + 0.3 * k)
    sfx.add(bt(16.4), scan(T['robot'] - bt(16.4) + 0.06, 0.8)[::-1].copy())
    sfx.add(T['robot'], impact(0.4, 1.0, 100, 50))
    for k in range(4): sfx.add(T['robot'] - 0.2 + k * 0.117 + 0.05, servo(0.5, k % 2 == 0), pan=[-0.3, 0.1, 0.4, 0.0][k])
    sfx.add(T['robot'] + 0.62, servo(0.35, True), pan=-0.4)
    for k in range(3): sfx.add(T['robot'] + 0.52 + k * 0.12, tick(0.1))
    sfx.add(bt(19.4) - 0.1, whoosh(T['roles'] - bt(19.4) + 0.15, 400, 6000, 0.8, 0.7, (0.9, -0.6)))
    sfx.add(T['roles'], impact(0.5, 1.0, 85, 42))
    steps = [bt(b) for b in [20.5, 21, 21.5, 22, 22.25, 22.5, 22.75, 23, 23.25, 23.5, 23.62]]
    for k, ts in enumerate(steps): sfx.add(ts, woodblock(900 * 2 ** (k / 14), 0.3), pan=0.2)
    sfx.add(T['you'], impact(0.9, 1.8, 66, 33))
    sfx.add(T['you'], woodblock(1500, 0.35))
    verb_send.add(T['you'], impact(0.3, 1.0))
    vo_man = json.load(open(os.path.join(ROOT, 'build', 'vo', 'manifest.json'), encoding='utf-8'))
    vo3 = next(l for l in vo_man['lines'] if l['id'] == 'vo3')
    for c in vo3['chars'][5:]:
        sfx.add(c['t'] - 0.02, key_click(0.35), pan=0.15)
    sfx.add(vo3['chars'][-1]['t'] + 0.14, key_click(0.3))
    sfx.add(bt(26.3), riser(T['end'] - bt(26.3), 0.7, 300, 9000))
    sfx.add(T['end'] - 0.35, suck(0.35, 0.5))
    sfx.add(T['end'], impact(1.2, 2.2, 58, 30))
    verb_send.add(T['end'], impact(0.4, 1.2))
    music.add(T['end'], stab([60, 64, 67, 72, 76], 1.0))
    verb_send.add(T['end'], stab([60, 64, 67, 72, 76], 0.5))
    for k in range(5): sfx.add(T['end'] + 0.08 + k * 0.045, tick(0.05, 5000))
    sfx.add(T['end'] + 1.2, key_click(0.4)); sfx.add(T['end'] + 1.2, blip(1400, 0.05, 0.15))


# ───────────────────────── vo ─────────────────────────
def vo_track():
    man = json.load(open(os.path.join(ROOT, 'build', 'vo', 'manifest.json'), encoding='utf-8'))
    out = np.zeros(N)
    for l in man['lines']:
        x, sr = sf.read(os.path.join(ROOT, l['file']), dtype='float64')
        if x.ndim > 1: x = x.mean(1)
        if sr != SR:
            from math import gcd
            g = gcd(SR, sr); x = signal.resample_poly(x, SR // g, sr // g)
        x = x / (np.max(np.abs(x)) + 1e-9)
        i0 = int(round(l['start'] * SR)); n = min(len(x), N - i0)
        out[i0:i0 + n] += x[:n]
    # EQ: rumble cut, low-mid clean-up, presence, air
    out = filt(out, 'highpass', 85, order=2)
    b, a = peaking(300, -2.0, 1.0); out = signal.lfilter(b, a, out)
    b, a = peaking(3200, 3.0, 0.9); out = signal.lfilter(b, a, out)
    b, a = shelf(9000, 2.5); out = signal.lfilter(b, a, out)
    out = compress(out, thresh_db=-22, ratio=3.0, att=0.004, rel=0.08, makeup_db=4)
    return out


def peaking(f0, gain_db, q):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return np.array(b) / a[0], np.array(a) / a[0]


def shelf(f0, gain_db, s=1.0):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / 2 * np.sqrt((A + 1 / A) * (1 / s - 1) + 2)
    cs = np.cos(w)
    b = [A * ((A + 1) + (A - 1) * cs + 2 * np.sqrt(A) * al), -2 * A * ((A - 1) + (A + 1) * cs), A * ((A + 1) + (A - 1) * cs - 2 * np.sqrt(A) * al)]
    a = [(A + 1) - (A - 1) * cs + 2 * np.sqrt(A) * al, 2 * ((A - 1) - (A + 1) * cs), (A + 1) - (A - 1) * cs - 2 * np.sqrt(A) * al]
    return np.array(b) / a[0], np.array(a) / a[0]


def envelope(x, att, rel):
    """peak envelope follower (vectorised via IIR on rectified signal, asymmetric by two passes)."""
    r = np.abs(x) if x.ndim == 1 else np.max(np.abs(x), 1)
    ea, er = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    up = signal.lfilter([1 - ea], [1, -ea], r)
    return np.maximum(signal.lfilter([1 - er], [1, -er], np.maximum(r, up)), up)


def compress(x, thresh_db, ratio, att, rel, makeup_db=0):
    e = envelope(x, att, rel) + 1e-9
    lvl = 20 * np.log10(e)
    gr = np.where(lvl > thresh_db, (thresh_db - lvl) * (1 - 1 / ratio), 0)
    g = 10 ** ((gr + makeup_db) / 20)
    return x * (g if x.ndim == 1 else g[:, None])


# ───────────────────────── loudness (ITU-R BS.1770) ─────────────────────────
def k_weight(x):
    # BS.1770-4 pre-filter (high shelf) and RLB high-pass, reference coefficients at 48 kHz.
    # (A Butterworth high-pass here reads bass-heavy mixes ~1.5 LU hot.)
    assert SR == 48000
    x = signal.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    return signal.lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x, axis=0)


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.sum(np.mean(y[i:i + blk] ** 2, 0)) for i in range(0, len(y) - blk, hop)])
    l = -0.691 + 10 * np.log10(ms + 1e-12)
    g = ms[l > -70]
    if len(g) == 0: return -70
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    g = ms[(l > -70) & (l > rel)]
    return -0.691 + 10 * np.log10(np.mean(g))


def true_peak(x):
    return np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)))


def limiter(x, ceiling=0.89, look=0.003, rel=0.06):
    n = int(look * SR)
    peak = np.max(np.abs(x), 1)
    need = np.minimum(1, ceiling / (peak + 1e-12))
    # look-ahead minimum, then smooth release
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(need, size=2 * n + 1, origin=0)
    er = np.exp(-1 / (rel * SR))
    g = 1 - signal.lfilter([1 - er], [1, -er], 1 - g)
    g = np.minimum(g, minimum_filter1d(need, size=2 * n + 1))
    return x * g[:, None]


def main():
    compose()
    v = vo_track()
    # reverb returns
    ir = reverb_ir(2.4, 0.025, 0.6)
    wet = conv_st(verb_send.x + music.x * 0.18 + drums.x * 0.08, ir) * 0.35
    vo_wet = conv_st(np.stack([v, v], 1), reverb_ir(1.2, 0.015, 0.25, 5000, 9)) * 0.08
    # sidechain: music + wet duck under VO, pads also pump with the kick in the groove
    ve = envelope(v, 0.01, 0.3)
    ve = ve / (np.max(ve) + 1e-9)
    duck = 1 - 0.58 * np.clip(ve * 2.2, 0, 1)
    kick_env = np.zeros(N)
    for b in range(2, 6):
        for k in range(4):
            i0 = int((b * BAR + k * BEAT) * SR); seg = 1 - 0.45 * np.exp(-np.arange(int(BEAT * SR)) / (0.09 * SR))
            kick_env[i0:i0 + len(seg)] = seg[: N - i0]
    kick_env[kick_env == 0] = 1
    mus = (music.x * kick_env[:, None] + wet) * duck[:, None]
    mix = mus * 0.9 + drums.x * 0.85 * duck[:, None] ** 0.5 + sfx.x * 0.8 + np.stack([v, v], 1) * 0.95 + vo_wet
    mix = filt(mix, 'highpass', 25)
    # tail fade
    f = int(0.35 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
    # loudness to -14 LUFS, then true-peak safe limiting
    for _ in range(3):
        mix *= 10 ** ((-14.0 - lufs(mix)) / 20)
        mix = limiter(mix, 0.87)
    tp = 20 * np.log10(true_peak(mix) + 1e-12)
    if tp > -1.0:
        mix *= 10 ** ((-1.0 - tp) / 20)
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    sf.write(os.path.join(ROOT, 'build', 'audio.wav'), mix, SR, subtype='PCM_24')
    for name, bus in [('music', music.x), ('drums', drums.x), ('sfx', sfx.x)]:
        sf.write(os.path.join(ROOT, 'build', f'stem_{name}.wav'), bus / (np.max(np.abs(bus)) + 1e-9) * 0.8, SR, subtype='PCM_16')
    sf.write(os.path.join(ROOT, 'build', 'stem_vo.wav'), v / (np.max(np.abs(v)) + 1e-9) * 0.8, SR, subtype='PCM_16')
    print(f'audio → build/audio.wav  integrated {lufs(mix):.1f} LUFS, true peak {20 * np.log10(true_peak(mix)):.1f} dBTP')


if __name__ == '__main__':
    main()
