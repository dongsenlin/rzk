"""Fetch the official xiaomiev.com imagery (uploaded by the user as a GitHub release asset)
and copy the frames the film uses into photos/selected/ (git-ignored).

    python3 src/get_photos.py
"""
import io, os, shutil, sys, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://github.com/dongsenlin/rzk/releases/download/435/41.zip'
USED = ['2.jpg', '31.jpg', '37.jpg', '12.jpg', 'New_1-2.jpg', 'New_1-3.jpg', 'New_1-4.jpg', 'New_1-1.jpg',
        '6.jpg', '18cover.jpg', '27-1.jpg', '32-2.jpg', '20.jpg', '29.jpg', '1.jpg']


def main():
    out = os.path.join(ROOT, 'photos', 'selected')
    os.makedirs(out, exist_ok=True)
    if all(os.path.exists(os.path.join(out, f)) for f in USED):
        print('photos already present'); return
    zpath = sys.argv[1] if len(sys.argv) > 1 else None
    data = open(zpath, 'rb').read() if zpath else urllib.request.urlopen(URL, timeout=600).read()
    z = zipfile.ZipFile(io.BytesIO(data))
    for name in z.namelist():
        base = os.path.basename(name)
        if '/n90/pc/' in name and base in USED and '__MACOSX' not in name:
            with z.open(name) as src, open(os.path.join(out, base), 'wb') as dst:
                shutil.copyfileobj(src, dst)
    missing = [f for f in USED if not os.path.exists(os.path.join(out, f))]
    print('copied', len(USED) - len(missing), 'photos', 'missing: ' + ', '.join(missing) if missing else '')


if __name__ == '__main__':
    main()
