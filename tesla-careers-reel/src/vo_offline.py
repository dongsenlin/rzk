"""Offline Mandarin voice-over with Kokoro v1.1-zh through sherpa-onnx.

Used because this build environment has no Gemini API key.  Speaker 50 was
picked from all 55 Mandarin female speakers by UTMOS naturalness score plus an
ASR check of every line (see README).  Run vo_align.py afterwards.
"""
import json, os
import numpy as np
import soundfile as sf
import sherpa_onnx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = json.load(open(os.path.join(ROOT, 'src', 'script.json'), encoding='utf-8'))
K = os.path.join(ROOT, 'assets', 'models', 'kokoro-multi-lang-v1_1')


def main():
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=f'{K}/model.onnx', voices=f'{K}/voices.bin', tokens=f'{K}/tokens.txt',
                data_dir=f'{K}/espeak-ng-data', dict_dir=f'{K}/dict',
                lexicon=f'{K}/lexicon-us-en.txt,{K}/lexicon-zh.txt'),
            num_threads=4),
        rule_fsts=f'{K}/phone-zh.fst,{K}/date-zh.fst,{K}/number-zh.fst')
    tts = sherpa_onnx.OfflineTts(cfg)
    sid = SCRIPT['voice']['offline']['speaker_id']
    raw = os.path.join(ROOT, 'build', 'vo', 'raw')
    os.makedirs(raw, exist_ok=True)
    for line in SCRIPT['lines']:
        a = tts.generate(line['text'], sid=sid, speed=line['speed'])
        sf.write(os.path.join(raw, line['id'] + '.wav'), np.array(a.samples, dtype=np.float32), a.sample_rate)
        print(line['id'], line['text'], f"{len(a.samples) / a.sample_rate:.2f}s")


if __name__ == '__main__':
    main()
