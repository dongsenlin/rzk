#!/usr/bin/env python3
"""Builds the film's embedded type.

Reads the variable/static TTFs fetched by tools/fetch-fonts.sh and writes

  src/fonts.js   every face as a base64 WOFF2 (subset to Latin), registered
                 at runtime through the FontFace API, so the film also works
                 from file:// with no network.
  src/glyphs.js  outlines of the glyphs the film draws as geometry (numeral
                 masks, the particle target, the camellia petals), in font
                 units with y pointing up, plus the metrics needed to put a
                 cap height exactly on a grid line.

Bodoni Moda has an optical-size axis. Canvas text cannot set `opsz`, so the
axis is pinned into two families instead: "Bodoni Display" (opsz 96, for
anything set above ~90px) and "Bodoni Deck" (opsz 28, for lines and decks).
The weight axis stays live in both. Pinned instances are renamed, as the OFL
asks of modified versions.

Requires: fonttools, brotli.
"""

import base64
import io
import json
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, ".font-cache")

# Latin-1, French punctuation (narrow no-break space, guillemets, typographic
# quotes and dashes), the numero sign and a few typographic spaces.
UNICODES = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + [0x152, 0x153, 0x2009, 0x200A, 0x202F, 0x2013, 0x2014, 0x2018, 0x2019,
       0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2032, 0x2033, 0x2116,
       0x2044, 0x00D7]
)

FACES = [
    # family,           style,    css weight, source file,                 pin axes
    ("Bodoni Display", "normal", "400 900", "BodoniModa-Roman-VF.ttf",  {"opsz": 96}),
    ("Bodoni Display", "italic", "400 900", "BodoniModa-Italic-VF.ttf", {"opsz": 96}),
    ("Bodoni Deck",    "normal", "400 900", "BodoniModa-Roman-VF.ttf",  {"opsz": 28}),
    ("Bodoni Deck",    "italic", "400 900", "BodoniModa-Italic-VF.ttf", {"opsz": 28}),
    ("Jost",           "normal", "100 900", "Jost-Roman-VF.ttf",        {}),
    ("DM Mono",        "normal", "300",     "DMMono-Light.ttf",         None),
    ("DM Mono",        "normal", "400",     "DMMono-Regular.ttf",       None),
    ("DM Mono",        "normal", "500",     "DMMono-Medium.ttf",        None),
]

# Outlines the film uses as geometry. key -> (source, full axis location, chars)
OUTLINES = {
    "bodoni-display-400": ("BodoniModa-Roman-VF.ttf", {"opsz": 96, "wght": 400},
                           "0123456789N°.C"),
    "bodoni-display-700": ("BodoniModa-Roman-VF.ttf", {"opsz": 96, "wght": 700},
                           "0123456789N°.C"),
    "bodoni-display-italic-400": ("BodoniModa-Italic-VF.ttf", {"opsz": 96, "wght": 400},
                                  "C"),
    "jost-500": ("Jost-Roman-VF.ttf", {"wght": 500}, "CHANEL"),
    "jost-700": ("Jost-Roman-VF.ttf", {"wght": 700}, "CHANEL"),
}


def load(name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        sys.exit(f"missing {path} - run tools/fetch-fonts.sh first")
    return TTFont(path)


def rename(font, family):
    """Give a pinned instance its own family name (OFL reserved-name hygiene)."""
    name = font["name"]
    style = name.getDebugName(2) or "Regular"
    for rec in list(name.names):
        if rec.nameID in (1, 4, 6, 16, 17, 21, 22, 25):
            name.removeNames(nameID=rec.nameID)
    ps = family.replace(" ", "") + "-" + style.replace(" ", "")
    for nid, value in ((1, family), (2, style), (4, f"{family} {style}"), (6, ps)):
        name.setName(value, nid, 3, 1, 0x409)
        name.setName(value, nid, 1, 0, 0)


def subset(font):
    opts = Options()
    opts.layout_features = ["*"]  # keep kern, liga, lnum, onum, smcp, ordn...
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.hinting = False
    opts.desubroutinize = True
    s = Subsetter(options=opts)
    s.populate(unicodes=UNICODES)
    s.subset(font)


def woff2_b64(font):
    font.flavor = "woff2"
    buf = io.BytesIO()
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode("ascii"), len(buf.getvalue())


def metrics(font):
    os2 = font["OS/2"]
    hhea = font["hhea"]
    return {
        "upm": font["head"].unitsPerEm,
        "ascender": hhea.ascent,
        "descender": hhea.descent,
        "capHeight": getattr(os2, "sCapHeight", 0),
        "xHeight": getattr(os2, "sxHeight", 0),
    }


def build_faces():
    out, sizes = [], []
    face_metrics = {}
    for family, style, weight, src, pin in FACES:
        font = load(src)
        if pin:
            font = instantiateVariableFont(font, pin, inplace=False)
            rename(font, family)
            # Round-trip so the subsetter sees materialised (not lazy) gvar data.
            buf = io.BytesIO()
            font.save(buf)
            buf.seek(0)
            font = TTFont(buf)
        subset(font)
        key = f"{family}|{style}"
        face_metrics.setdefault(key, metrics(font))
        data, n = woff2_b64(font)
        sizes.append((family, style, weight, n))
        out.append({"family": family, "style": style, "weight": weight, "data": data})
    return out, sizes, face_metrics


def build_outlines():
    result = {}
    for key, (src, loc, chars) in OUTLINES.items():
        font = instantiateVariableFont(load(src), loc, inplace=False)
        gs = font.getGlyphSet()
        cmap = font.getBestCmap()
        hmtx = font["hmtx"]
        glyphs = {}
        for ch in chars:
            gname = cmap[ord(ch)]
            pen = SVGPathPen(gs, lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
            gs[gname].draw(pen)
            bpen = BoundsPen(gs)
            gs[gname].draw(bpen)
            glyphs[ch] = {
                "adv": hmtx[gname][0],
                "d": pen.getCommands(),
                "bbox": [round(v, 1) for v in (bpen.bounds or (0, 0, 0, 0))],
            }
        entry = metrics(font)
        entry["glyphs"] = glyphs
        result[key] = entry
    return result


def main():
    faces, sizes, face_metrics = build_faces()
    outlines = build_outlines()

    src_dir = os.path.join(ROOT, "src")
    with open(os.path.join(src_dir, "fonts.js"), "w") as f:
        f.write("// Generated by tools/build_fonts.py - do not edit.\n")
        f.write("// Bodoni Moda, Jost and DM Mono, SIL Open Font License 1.1 (see fonts/).\n")
        f.write("window.FONT_FACES = ")
        json.dump(faces, f, separators=(",", ":"))
        f.write(";\nwindow.FONT_METRICS = ")
        json.dump(face_metrics, f, indent=1)
        f.write(";\n")
    with open(os.path.join(src_dir, "glyphs.js"), "w") as f:
        f.write("// Generated by tools/build_fonts.py - do not edit.\n")
        f.write("// Glyph outlines in font units, y up. Bodoni Moda and Jost, OFL 1.1.\n")
        f.write("window.GLYPHS = ")
        json.dump(outlines, f, separators=(",", ":"))
        f.write(";\n")

    fonts_dir = os.path.join(ROOT, "fonts")
    for lic in ("OFL-BodoniModa.txt", "OFL-Jost.txt", "OFL-DMMono.txt"):
        with open(os.path.join(CACHE, lic), "rb") as a, open(os.path.join(fonts_dir, lic), "wb") as b:
            b.write(a.read())

    for family, style, weight, n in sizes:
        print(f"{family:16s} {style:7s} {weight:8s} {n/1024:7.1f} KiB")
    print("outlines:", ", ".join(outlines))


if __name__ == "__main__":
    main()
