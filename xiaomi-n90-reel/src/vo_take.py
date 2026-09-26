"""One continuous voice-over take → per-line clips.

    GEMINI_API_KEY=... python3 src/vo_take.py --gemini            # 1 API call (free tier: 10/day/model)
    python3 src/vo_take.py --file vo/my_take.wav                    # a take generated in AI Studio
    python3 src/vo_align.py                                          # then anchor every line to the picture

A single read keeps the intonation connected across lines; SenseVoice timestamps
cut it at the pauses into build/vo/raw/<id>.wav (ids from src/script.json).
"""
import argparse, base64, difflib, io, json, os, re, sys, time, urllib.error, urllib.request, wave
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = json.load(open(os.path.join(ROOT, 'src', 'script.json'), encoding='utf-8'))
API = 'https://generativelanguage.googleapis.com/v1beta'

# The TTS model speaks any plain instruction; direction must be an audio profile + director's notes + TRANSCRIPT.
PROMPT = """# AUDIO PROFILE
A young mainland-Chinese female voice-over artist in her twenties: sweet, bright and warm, with a smile in her voice; lively and confident, like a friend inviting you on a road trip. Never childish, never salesy, never robotic.
## THE SCENE
A fast, cinematic 15-second launch film for Xiaomi SkyNomad N90 Max, a large seven-seat range-extended SUV — family road trips, mountains, lakes and starry campsites — cut to an energetic 128 BPM electronic-cinematic track.
### DIRECTOR'S NOTES
Style: sweet and uplifting; every line lands like a headline; lightly lift the numbers (一千七百零五公里, 十一种空间); 说走就走 sounds playful and free; the last line is the signature — warm and proud, with a smile.
Pace: brisk; leave a clear pause of about one second between lines.
Accent: standard Putonghua.
#### TRANSCRIPT
把家，带去远方。
一千七百零五公里，说走就走。
大七座，十一种空间，随心而变。
四驱越野，无惧山海。
小米澎程——澎湃每一程。"""


def gemini(model, voice):
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key:
        sys.exit('Set GEMINI_API_KEY first.')
    body = {'contents': [{'parts': [{'text': PROMPT}]}],
            'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}}}}
    req = urllib.request.Request(f'{API}/models/{model}:generateContent', data=json.dumps(body).encode(),
                                 headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                res = json.load(r); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            if e.code == 429 and 'PerDay' in msg:
                sys.exit('Daily Gemini TTS quota used up for this model (resets at midnight Pacific).')
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(20 * (attempt + 1)); continue
            sys.exit(f'Gemini API error {e.code}: {msg[:400]}')
    part = res['candidates'][0]['content']['parts'][0]['inlineData']
    data = base64.b64decode(part['data'])
    if data[:4] == b'RIFF':
        with wave.open(io.BytesIO(data)) as w:
            pcm, rate = w.readframes(w.getnframes()), w.getframerate()
    else:
        pcm, rate = data, int((re.search(r'rate=(\d+)', part.get('mimeType', '')) or [0, 24000])[1])
    x = np.frombuffer(pcm, dtype='<i2').astype(np.float32) / 32768
    return x, rate


def han(s):
    return ''.join(c for c in s if '一' <= c <= '鿿')


def split(x, sr):
    sys.path.insert(0, os.path.join(ROOT, 'src'))
    from vo_align import recognizer
    R = recognizer()
    s = R.create_stream(); s.accept_waveform(sr, x); R.decode_stream(s)
    toks = [(t, ts) for t, ts in zip(s.result.tokens, s.result.timestamps) if han(t)]
    heard = ''.join(t for t, _ in toks)
    want = ''.join(han(l['text']) for l in SCRIPT['lines'])
    print('heard :', heard); print('script:', want)
    # map every script character to an ASR token time (fuzzy, tolerant of homophones)
    sm = difflib.SequenceMatcher(None, want, heard, autojunk=False)
    idx = [None] * len(want)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): idx[a + k] = b + k
    for i in range(len(want)):                                  # fill gaps by interpolation
        if idx[i] is None:
            prev = next((idx[j] for j in range(i - 1, -1, -1) if idx[j] is not None), -1)
            idx[i] = min(len(toks) - 1, prev + 1)
    times = [toks[j][1] for j in idx]
    env = np.convolve(np.abs(x), np.ones(int(0.02 * sr)) / int(0.02 * sr), mode='same')
    bounds, pos = [], 0
    for l in SCRIPT['lines']:
        n = len(han(l['text'])); bounds.append((pos, pos + n)); pos += n
    cuts = [0]
    for (a0, a1), (b0, b1) in zip(bounds, bounds[1:]):
        lo, hi = int((times[a1 - 1] + 0.18) * sr), int((times[b0] - 0.02) * sr)
        if hi <= lo: hi = lo + 1
        cuts.append(lo + int(np.argmin(env[lo:hi])))
    cuts.append(len(x))
    raw = os.path.join(ROOT, 'build', 'vo', 'raw'); os.makedirs(raw, exist_ok=True)
    for l, a, b in zip(SCRIPT['lines'], cuts, cuts[1:]):
        sf.write(os.path.join(raw, l['id'] + '.wav'), x[a:b], sr)
        print(f"{l['id']:4} {l['text']:16} {(b - a) / sr:5.2f}s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gemini', action='store_true')
    ap.add_argument('--model', default=SCRIPT['voice']['gemini']['model'])
    ap.add_argument('--voice', default=SCRIPT['voice']['gemini']['voice_name'])
    ap.add_argument('--file')
    a = ap.parse_args()
    if a.gemini:
        x, sr = gemini(a.model, a.voice)
        os.makedirs(os.path.join(ROOT, 'vo'), exist_ok=True)
        sf.write(os.path.join(ROOT, 'vo', f'take_{a.model}_{a.voice}.wav'), x, sr)
    elif a.file:
        x, sr = sf.read(a.file, dtype='float32')
        if x.ndim > 1: x = x.mean(1)
    else:
        sys.exit('use --gemini or --file')
    split(x, sr)


if __name__ == '__main__':
    main()
