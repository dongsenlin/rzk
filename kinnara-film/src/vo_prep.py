"""Cut the narration take into lines.

Reads build/vo/take.wav (one Gemini take of vo/AISTUDIO_PROMPT.md), finds speech with an energy gate,
gets per-character timestamps from SenseVoice, aligns them to the script (difflib, homophones allowed),
and cuts one clip per line at the quietest point between lines.  Writes build/vo/lines/Lxx.wav and
build/vo/lines.json (per line: clip, duration, and each character's time inside the clip).
"""
import json, os, re, difflib
import numpy as np
import soundfile as sf
import sherpa_onnx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASR = os.environ.get('SENSEVOICE_DIR', os.path.join(ROOT, 'assets', 'models', 'sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17'))
PROMPT = open(os.path.join(ROOT, 'vo', 'AISTUDIO_PROMPT.md'), encoding='utf-8').read()
LINES = PROMPT.split('【正文】\n')[1].split('【正文结束】')[0].strip().splitlines()
han = lambda s: ''.join(c for c in s if '一' <= c <= '鿿')


def main():
    x, sr = sf.read(os.path.join(ROOT, 'build', 'vo', 'take.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    hop = int(0.01 * sr); n = len(x) // hop
    db = 20 * np.log10(np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(n)]) + 1e-9)
    voiced = db > db.max() - 38
    segs, s0 = [], None
    for i, v in enumerate(voiced):
        if v and s0 is None: s0 = i
        if not v and s0 is not None: segs.append([s0, i]); s0 = None
    if s0 is not None: segs.append([s0, n])
    merged = []
    for s in segs:
        if merged and (s[0] - merged[-1][1]) * 0.01 < 0.35: merged[-1][1] = s[1]
        else: merged.append(s)
    merged = [m for m in merged if (m[1] - m[0]) * 0.01 > 0.15]
    R = sherpa_onnx.OfflineRecognizer.from_sense_voice(model=f'{ASR}/model.int8.onnx', tokens=f'{ASR}/tokens.txt', num_threads=4, use_itn=False, language='zh')
    heard = []                                          # (char, absolute time)
    for a, b in merged:
        t0 = max(0, a * 0.01 - 0.05); seg = x[int(t0 * sr):int((b * 0.01 + 0.05) * sr)]
        st = R.create_stream(); st.accept_waveform(sr, seg); R.decode_stream(st)
        for tok, ts in zip(st.result.tokens, st.result.timestamps):
            for ch in han(tok): heard.append((ch, t0 + ts))
    want = ''.join(han(l) for l in LINES)
    got = ''.join(c for c, _ in heard)
    # align (homophones differ in characters, so match on position blocks and interpolate the rest)
    sm = difflib.SequenceMatcher(None, want, got, autojunk=False)
    tw = [None] * len(want)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): tw[blk.a + k] = heard[blk.b + k][1]
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'replace' and i2 - i1 == j2 - j1:
            for k in range(i2 - i1): tw[i1 + k] = heard[j1 + k][1]
    known = [i for i, t in enumerate(tw) if t is not None]
    for i in range(len(tw)):
        if tw[i] is None:
            lo = max([k for k in known if k < i], default=None); hi = min([k for k in known if k > i], default=None)
            tw[i] = tw[lo] + 0.22 if hi is None else (tw[hi] - 0.22 if lo is None else tw[lo] + (tw[hi] - tw[lo]) * (i - lo) / (hi - lo))
    # line spans and cut points at the quietest 10 ms frame between lines
    idx, spans = 0, []
    for l in LINES:
        m = len(han(l)); spans.append((tw[idx], tw[idx + m - 1])); idx += m
    env = db
    cuts = [0.0]
    for (a0, a1), (b0, b1) in zip(spans, spans[1:]):
        lo, hi = int((a1 + 0.12) / 0.01), int((b0 - 0.02) / 0.01)
        if hi <= lo: lo, hi = int(a1 / 0.01), int(b0 / 0.01) + 1
        k = lo + int(np.argmin(env[lo:hi])) if hi > lo else lo
        cuts.append(k * 0.01)
    cuts.append(len(x) / sr)
    os.makedirs(os.path.join(ROOT, 'build', 'vo', 'lines'), exist_ok=True)
    out, idx = [], 0
    for i, l in enumerate(LINES):
        c0, c1 = cuts[i], cuts[i + 1]
        y = x[int(c0 * sr):int(c1 * sr)].copy()
        # trim silence at both ends (keep 60 ms), short fades
        e = np.abs(y); k = np.where(e > 0.006)[0]
        a = max(0, k[0] - int(0.06 * sr)); b = min(len(y), k[-1] + int(0.12 * sr)); y = y[a:b]
        f = int(0.01 * sr); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
        fn = os.path.join(ROOT, 'build', 'vo', 'lines', f'L{i + 1:02d}.wav'); sf.write(fn, y, sr)
        m = len(han(l)); base = c0 + a / sr
        chars = [dict(ch=ch, t=round(tw[idx + j] - base, 3)) for j, ch in enumerate(han(l))]; idx += m
        out.append(dict(id=f'L{i + 1:02d}', text=l, file=os.path.relpath(fn, ROOT), sr=sr, duration=round(len(y) / sr, 3), chars=chars))
        print(f'L{i + 1:02d} {len(y) / sr:5.2f}s  take {base:6.2f}  {l}')
    json.dump(dict(lines=out), open(os.path.join(ROOT, 'build', 'vo', 'lines.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('heard:', got)


if __name__ == '__main__':
    main()
