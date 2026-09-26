"""Voice-over with Gemini TTS (drop-in replacement for vo_offline.py).

    export GEMINI_API_KEY=...            # Google AI Studio key
    python3 src/vo_gemini.py             # picks the newest "flash ... tts" model the key can use
    python3 src/vo_gemini.py --model gemini-2.5-flash-preview-tts --voice Leda
    python3 src/vo_align.py && python3 src/audio.py && node src/render.js

Writes build/vo/raw/<id>.wav (24 kHz mono); vo_align.py then re-anchors every
line to the picture, so a different voice or pace stays in sync.
Standard library only.
"""
import argparse, base64, json, os, re, sys, time, urllib.error, urllib.request
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = json.load(open(os.path.join(ROOT, 'src', 'script.json'), encoding='utf-8'))
API = 'https://generativelanguage.googleapis.com/v1beta'

# Style direction, in Mandarin so the model keeps a mainland Putonghua read.
DIRECTION = ('用年轻女声、标准普通话朗读。声音明亮、甜美、温暖，带一点微笑感；'
             '语气自信干练，像科技品牌招聘广告的旁白，语速稍快，干净利落。请只读冒号后的文字')


def call(url, key, body=None):
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(),
                                 headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            if e.code in (429, 500, 502, 503, 504) and attempt < 5:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f'Gemini API error {e.code}: {msg[:500]}')


def pick_model(key):
    models = call(f'{API}/models?pageSize=1000', key).get('models', [])
    names = [m['name'].split('/', 1)[1] for m in models
             if 'tts' in m['name'] and 'generateContent' in m.get('supportedGenerationMethods', [])]
    if not names:
        sys.exit('No TTS-capable Gemini model is available to this key; pass --model explicitly.')

    def rank(n):
        v = re.search(r'gemini-(\d+(?:\.\d+)?)', n)
        return ('flash' in n, float(v.group(1)) if v else 0.0, 'preview' not in n, n)
    names.sort(key=rank, reverse=True)
    print('TTS models available:', ', '.join(names))
    return names[0]


def synth(key, model, voice, text):
    body = {
        'contents': [{'parts': [{'text': f'{DIRECTION}：{text}'}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}},
        },
    }
    r = call(f'{API}/models/{model}:generateContent', key, body)
    part = r['candidates'][0]['content']['parts'][0]['inlineData']
    rate = int(re.search(r'rate=(\d+)', part.get('mimeType', 'rate=24000')).group(1))
    return base64.b64decode(part['data']), rate


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default=os.environ.get('GEMINI_TTS_MODEL'))
    ap.add_argument('--voice', default=SCRIPT['voice']['gemini']['voice_name'])
    a = ap.parse_args()
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key:
        sys.exit('Set GEMINI_API_KEY (or GOOGLE_API_KEY) first.')
    model = a.model or pick_model(key)
    print(f'model={model} voice={a.voice}')
    raw = os.path.join(ROOT, 'build', 'vo', 'raw')
    os.makedirs(raw, exist_ok=True)
    for line in SCRIPT['lines']:
        pcm, rate = synth(key, model, a.voice, line['text'])
        with wave.open(os.path.join(raw, line['id'] + '.wav'), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
        print(line['id'], line['text'], f'{len(pcm) / 2 / rate:.2f}s')


if __name__ == '__main__':
    main()
