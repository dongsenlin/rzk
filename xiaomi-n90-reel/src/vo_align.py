"""Align raw voice-over takes to the edit.

Reads build/vo/raw/<id>.wav (any TTS engine), trims silence, gets per-character
timestamps from SenseVoice ASR, checks the words, and places every line so that
its anchor character lands on the frame the picture expects
(script.json: anchor_char / anchor_time).  Writes build/vo/manifest.json, which
both the mixer (audio.py) and the renderer (render.js) read.
"""
import json, os, sys
import numpy as np
import soundfile as sf
import sherpa_onnx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = json.load(open(os.path.join(ROOT, 'src', 'script.json'), encoding='utf-8'))
ASR_DIR = os.path.join(ROOT, 'assets', 'models', 'sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17')


def recognizer():
    return sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=f'{ASR_DIR}/model.int8.onnx', tokens=f'{ASR_DIR}/tokens.txt',
        num_threads=4, use_itn=False, language='zh')


def han(s):
    return ''.join(c for c in s if '一' <= c <= '鿿')


def trim(x, sr, thresh=0.008, pad=0.03):
    idx = np.where(np.abs(x) > thresh)[0]
    if len(idx) == 0:
        return x, 0.0
    a = max(0, idx[0] - int(pad * sr))
    b = min(len(x), idx[-1] + int(pad * sr))
    y = x[a:b].copy()
    f = int(0.012 * sr)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    return y, a / sr


def main():
    raw = os.path.join(ROOT, 'build', 'vo', 'raw')
    R = recognizer()
    out = []
    for line in SCRIPT['lines']:
        x, sr = sf.read(os.path.join(raw, line['id'] + '.wav'), dtype='float32')
        if x.ndim > 1:
            x = x.mean(1)
        s = R.create_stream(); s.accept_waveform(sr, x); R.decode_stream(s)
        toks, ts = list(s.result.tokens), list(s.result.timestamps)
        pairs = [(t, v) for t, v in zip(toks, ts) if han(t)]
        want = han(line['text'])
        got = ''.join(t for t, _ in pairs)
        if got != want:
            print(f"WARNING {line['id']}: ASR heard '{got}', expected '{want}'", file=sys.stderr)
        y, lead = trim(x, sr)
        chars = [dict(ch=t, t=round(v - lead, 3)) for t, v in pairs]
        k = min(line['anchor_char'], len(chars) - 1)
        start = line['anchor_time'] - chars[k]['t']
        dur = len(y) / sr
        fn = os.path.join(ROOT, 'build', 'vo', line['id'] + '.wav')
        sf.write(fn, y, sr)
        out.append(dict(id=line['id'], text=line['text'], file=os.path.relpath(fn, ROOT), sr=sr,
                        start=round(start, 3), end=round(start + dur, 3), duration=round(dur, 3),
                        chars=[dict(ch=c['ch'], t=round(start + c['t'], 3)) for c in chars], asr=got))
        print(f"{line['id']:5} {line['text']:14} start={start:6.3f} end={start + dur:6.3f}  "
              + ' '.join(f"{c['ch']}@{start + c['t']:.2f}" for c in chars))
    json.dump(dict(lines=out), open(os.path.join(ROOT, 'build', 'vo', 'manifest.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    # overlap sanity check
    for a, b in zip(out, out[1:]):
        if a['end'] > b['start']:
            print(f"WARNING: {a['id']} ends {a['end']:.2f} after {b['id']} starts {b['start']:.2f}", file=sys.stderr)


if __name__ == '__main__':
    main()
