"""Voice-over with Gemini TTS (drop-in replacement for vo_offline.py).

    export GEMINI_API_KEY=...            # Google AI Studio key
    python3 src/vo_gemini.py             # picks the newest "flash ... tts" model the key can use
    python3 src/vo_gemini.py --model gemini-3.8-flash-tts --voice Leda
    python3 src/vo_gemini.py --only vo4  # regenerate single lines (free tier: 10 requests/day/model)
    python3 src/vo_align.py && python3 src/audio.py && node src/render.js

Writes build/vo/raw/<id>.wav (24 kHz mono); vo_align.py then re-anchors every
line to the picture, so a different voice or pace stays in sync.
Standard library only.
"""
import argparse, base64, io, json, os, re, sys, time, urllib.error, urllib.request
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = json.load(open(os.path.join(ROOT, 'src', 'script.json'), encoding='utf-8'))
API = 'https://generativelanguage.googleapis.com/v1beta'

# Gemini TTS reads everything in the prompt unless the direction is structured as an
# audio profile + director's notes followed by a TRANSCRIPT section (a plain Mandarin
# instruction line gets spoken aloud; systemInstruction is rejected by the TTS models).
PROFILE = ("# AUDIO PROFILE\nA young mainland-Chinese female voice-over artist in her twenties: bright, sweet and warm, "
           "with a smile in her voice; confident and modern, never childish, never robotic.\n"
           "## THE SCENE\nA fast, energetic 15-second recruitment film for Tesla China — electric cars, clean energy, AI and robots — "
           "cut to a 128 BPM electronic track.\n### DIRECTOR'S NOTES\n")
TITLE = "Style: one crisp, confident chapter title, bright and upbeat. Pace: brisk. Accent: standard Putonghua."
NOTES = {
    'vo1': "Style: the opening line; sincere and inspiring, like inviting a talented friend; gently lift 世界 and 一条线. "
           "Pace: brisk, a short natural pause at the comma. Accent: standard Putonghua.",
    'vo2a': TITLE, 'vo2b': TITLE, 'vo2c': TITLE, 'vo2d': TITLE,
    'vo3': "Style: the emotional peak; warm, encouraging and direct, speaking to the viewer; emphasise 突破 and 你. "
           "Pace: brisk, a short pause at the comma. Accent: standard Putonghua.",
    'vo4': "Style: the final call to action; warm, inviting, a clear smile in the voice. Pace: natural. Accent: standard Putonghua.",
}


def prompt(line):
    text = line['text'] if line['text'][-1] in '。！？' else line['text'] + '。'
    return PROFILE + NOTES.get(line['id'], TITLE) + "\n#### TRANSCRIPT\n" + text


def call(url, key, body=None):
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(),
                                 headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            if e.code == 429 and 'PerDay' in msg:
                sys.exit('Gemini daily quota for this model is used up (free tier: 10 requests/day/model). '
                         'It resets at midnight Pacific time; rerun later with --only for the missing lines.')
            if e.code in (429, 500, 502, 503, 504) and attempt < 5:
                m = re.search(r'"retryDelay":\s*"(\d+)', msg)
                time.sleep(int(m.group(1)) + 1 if m else 2 ** attempt + 1)
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
        return ('flash' in n and 'lite' not in n, float(v.group(1)) if v else 0.0, 'preview' not in n, n)
    names.sort(key=rank, reverse=True)
    print('TTS models available:', ', '.join(names))
    return names[0]


def synth(key, model, voice, line):
    body = {
        'contents': [{'parts': [{'text': prompt(line)}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}},
        },
    }
    r = call(f'{API}/models/{model}:generateContent', key, body)
    part = r['candidates'][0]['content']['parts'][0]['inlineData']
    data, mime = base64.b64decode(part['data']), part.get('mimeType', '')
    if 'wav' in mime or data[:4] == b'RIFF':           # newer models return a complete WAV file
        with wave.open(io.BytesIO(data)) as w:
            return w.readframes(w.getnframes()), w.getframerate()
    m = re.search(r'rate=(\d+)', mime)                   # older models: raw 16-bit PCM
    return data, int(m.group(1)) if m else 24000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default=os.environ.get('GEMINI_TTS_MODEL'))
    ap.add_argument('--voice', default=SCRIPT['voice']['gemini']['voice_name'])
    ap.add_argument('--only', help='comma-separated line ids to (re)generate, e.g. vo4 (saves quota)')
    a = ap.parse_args()
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key:
        sys.exit('Set GEMINI_API_KEY (or GOOGLE_API_KEY) first.')
    model = a.model or pick_model(key)
    print(f'model={model} voice={a.voice}')
    raw = os.path.join(ROOT, 'build', 'vo', 'raw')
    os.makedirs(raw, exist_ok=True)
    only = set(a.only.split(',')) if a.only else None
    keep = os.path.join(ROOT, 'vo_takes', 'gemini')
    os.makedirs(keep, exist_ok=True)
    for line in SCRIPT['lines']:
        if only and line['id'] not in only:
            continue
        pcm, rate = synth(key, model, a.voice, line)
        for d in (raw, keep):                           # vo_takes/ keeps the chosen takes in git
            with wave.open(os.path.join(d, line['id'] + '.wav'), 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
        print(line['id'], line['text'], f'{len(pcm) / 2 / rate:.2f}s')


if __name__ == '__main__':
    main()
