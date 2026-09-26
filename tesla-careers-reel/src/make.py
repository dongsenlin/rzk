"""One command from sources to the finished MP4.

    python src/make.py                    # offline voice (or Gemini automatically if GEMINI_API_KEY is set)
    python src/make.py --fetch            # first download the real tesla.cn imagery (local machine only)
    python src/make.py --gemini --model gemini-2.5-flash-preview-tts --voice Leda
    python src/make.py --takes            # rebuild with the committed Gemini 3.8 Flash TTS takes (no API calls)
    python src/make.py --preview          # quick half-resolution check

Steps: [fetch_site.js] → vo_gemini.py | vo_offline.py → vo_align.py → audio.py → render.js → delivery encode.
Result: out/tesla_careers_reel_15s_final.mp4 (H.264 1080p30, AAC 256k).
"""
import argparse, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable


def run(cmd):
    print('▶', ' '.join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def ffmpeg():
    exe = os.environ.get('FFMPEG') or shutil.which('ffmpeg')
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fetch', action='store_true', help='download tesla.cn images first (node src/fetch_site.js)')
    ap.add_argument('--gemini', action='store_true', help='force Gemini TTS')
    ap.add_argument('--offline', action='store_true', help='force the offline Kokoro voice')
    ap.add_argument('--skip-vo', action='store_true', help='reuse build/vo as it is')
    ap.add_argument('--takes', action='store_true', help='use the committed Gemini takes in vo_takes/gemini (no API calls)')
    ap.add_argument('--model'); ap.add_argument('--voice')
    ap.add_argument('--workers', default=str(max(1, min(8, (os.cpu_count() or 4)))))
    ap.add_argument('--preview', action='store_true')
    a = ap.parse_args()

    if a.fetch:
        run(['node', 'src/fetch_site.js'])
    if a.takes:
        raw = os.path.join(ROOT, 'build', 'vo', 'raw'); os.makedirs(raw, exist_ok=True)
        for f in os.listdir(os.path.join(ROOT, 'vo_takes', 'gemini')):
            shutil.copy(os.path.join(ROOT, 'vo_takes', 'gemini', f), os.path.join(raw, f))
        run([PY, 'src/vo_align.py'])
    elif not a.skip_vo:
        use_gemini = a.gemini or (not a.offline and (os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')))
        if use_gemini:
            cmd = [PY, 'src/vo_gemini.py']
            if a.model: cmd += ['--model', a.model]
            if a.voice: cmd += ['--voice', a.voice]
            run(cmd)
        else:
            run([PY, 'src/vo_offline.py'])
        run([PY, 'src/vo_align.py'])
    run([PY, 'src/audio.py'])
    render = ['node', 'src/render.js', '--workers', a.workers]
    if a.preview:
        render += ['--scale', '0.5', '--samples', '2']
    run(render)
    master = os.path.join(ROOT, 'out', 'tesla_careers_reel_15s.mp4')
    final = os.path.join(ROOT, 'out', 'tesla_careers_reel_15s_final.mp4')
    run([ffmpeg(), '-y', '-loglevel', 'error', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
         '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', final])
    print('done →', final)


if __name__ == '__main__':
    main()
