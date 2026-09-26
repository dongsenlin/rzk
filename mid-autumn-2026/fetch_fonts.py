"""Download Google Fonts subsets (only the glyphs this piece uses) into ./fonts.

Variable families are fetched once with their full weight axis, so the scene can
animate font-weight continuously. Run again whenever the copy in scene.js changes.
"""
import re
import urllib.parse
import urllib.request
import pathlib

CN = ("栋森网络科技携祝大家中秋快乐千里共婵娟但愿人长久苏轼水调歌头明月几时有"
      "丙午年八月十五相连团圆阖家北京上海深圳成都乌鲁木齐哈尔滨东京新加坡悉尼"
      "伦敦纽约旧金山迪拜温哥华巴黎拉萨之遥一线此印敬贺")
PUNCT = "·《》—，、。「」：×→≈°"
LATIN = "".join(chr(c) for c in range(32, 127))
MONO_EXTRA = "ŌŪÀÈÜōūàèü°×→≈·—–•"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0 Safari/537.36")

FAMILIES = {
    # family spec                     : subset text
    "Noto Serif SC:wght@200..900":       CN + PUNCT + LATIN,
    "Noto Sans SC:wght@100..900":        CN + PUNCT + LATIN,
    "JetBrains Mono:wght@100..800":      LATIN + MONO_EXTRA,
}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read()


out = pathlib.Path(__file__).parent / "fonts"
out.mkdir(exist_ok=True)
css_all = []
for spec, text in FAMILIES.items():
    q = {"family": spec, "display": "block", "text": "".join(sorted(set(text)))}
    css = get("https://fonts.googleapis.com/css2?" + urllib.parse.urlencode(q, safe=":;@,.")).decode()
    fam = spec.split(":")[0]
    for block in re.findall(r"@font-face\s*{[^}]*}", css):
        style = re.search(r"font-style:\s*(\w+)", block).group(1)
        weight = re.search(r"font-weight:\s*(\d+(?: \d+)?)", block).group(1)
        src = re.search(r"url\((https://[^)]+)\)", block).group(1)
        tag = "VF" if " " in weight else weight
        name = f"{fam.replace(' ', '')}-{tag}{'i' if style == 'italic' else ''}.woff2"
        (out / name).write_bytes(get(src))
        css_all.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{weight};"
                       f"font-display:block;src:url('{name}');}}")
        print(f"{name:34s} {(out / name).stat().st_size / 1024:7.1f} KB")
(out / "fonts.css").write_text("\n".join(css_all) + "\n")
