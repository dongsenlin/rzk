"""Place the narration lines and the song on the film's timeline.

Reads build/vo/lines.json (vo_prep.py), writes build/vo/manifest.json — read by audio.py and, through
render.js, by the page (window.VO).  Gaps between lines are set by hand here: they are the film's pacing.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREROLL = 1.2
# gap before each line (seconds); TITLE after L02; SONG after L12
GAP = {'L02': 0.45, 'L03': 2.3, 'L04': 0.45, 'L05': 0.7, 'L06': 0.6, 'L07': 0.6, 'L08': 0.95, 'L09': 0.55,
       'L10': 0.8, 'L11': 0.9, 'L12': 0.75, 'L13': 0.85, 'L14': 0.65, 'L15': 0.75}
SONG, SONG_GAP, END = 27.7, 1.0, 3.3


def main():
    L = json.load(open(os.path.join(ROOT, 'build', 'vo', 'lines.json'), encoding='utf-8'))['lines']
    t, out, song = PREROLL, [], None
    for ln in L:
        t += GAP.get(ln['id'], 0)
        if ln['id'] == 'L13':                          # the song sits between L12 and L13
            song = round(out[-1]['end'] + SONG_GAP, 3); t = song + SONG + GAP['L13']
        start = round(t, 3); end = round(t + ln['duration'], 3)
        out.append(dict(ln, start=start, end=end, chars=[dict(ch=c['ch'], t=round(start + c['t'], 3)) for c in ln['chars']]))
        t = end
    total = round(out[-1]['end'] + END, 3)
    json.dump(dict(lines=out, song=song, songLen=SONG, total=total), open(os.path.join(ROOT, 'build', 'vo', 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for ln in out: print(f"{ln['id']} {ln['start']:7.2f}–{ln['end']:7.2f}  {ln['text']}")
    print(f'song {song:.2f}–{song + SONG:.2f}   total {total:.2f}s')


if __name__ == '__main__':
    main()
