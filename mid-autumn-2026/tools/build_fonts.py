#!/usr/bin/env python3
"""Subset the typefaces to the glyphs the film uses.

Cormorant Garamond defaults to old-style figures, where "5.5" reads like
"5·5"; its lining figures (lnum) are frozen into the cmap so canvas text, which
cannot request OpenType features, gets them by default.

usage: build_fonts.py SRC_DIR [OUT_DIR]

SRC_DIR holds the upstream files from https://github.com/google/fonts (OFL):
  ofl/notoserifsc/NotoSerifSC[wght].ttf
  ofl/mashanzheng/MaShanZheng-Regular.ttf
  ofl/cormorantgaramond/CormorantGaramond[wght].ttf
  ofl/jetbrainsmono/JetBrainsMono[wght].ttf
"""
import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASCII = "".join(chr(c) for c in range(0x20, 0x7F))
EXTRA = "·—×"


def film_text():
    text = ""
    for path in glob.glob(os.path.join(ROOT, "src", "*.js")):
        if not path.endswith("glyphs.js"):
            with open(path, encoding="utf-8") as fh:
                text += fh.read()
    return text


def freeze_lnum(font):
    """Point the digit code points at their lining-figure glyphs."""
    gsub = font["GSUB"].table
    mapping = {}
    for rec in gsub.FeatureList.FeatureRecord:
        if rec.FeatureTag != "lnum":
            continue
        for idx in rec.Feature.LookupListIndex:
            for st in gsub.LookupList.Lookup[idx].SubTable:
                st = getattr(st, "ExtSubTable", st)
                mapping.update(getattr(st, "mapping", {}) or {})
    for table in font["cmap"].tables:
        for cp in range(ord("0"), ord("9") + 1):
            if cp in table.cmap and table.cmap[cp] in mapping:
                table.cmap[cp] = mapping[table.cmap[cp]]


def build(src_dir, out_dir):
    text = film_text()
    cjk = sorted({ch for ch in text if ord(ch) >= 0x2E80})
    jobs = [
        ("NotoSerifSC[wght].ttf", "NotoSerifSC-VF.ttf", "".join(cjk) + ASCII + EXTRA, False),
        ("MaShanZheng-Regular.ttf", "MaShanZheng-Regular.ttf", "中秋", False),
        ("CormorantGaramond[wght].ttf", "CormorantGaramond-VF.ttf", ASCII + EXTRA, True),
        ("JetBrainsMono[wght].ttf", "JetBrainsMono-VF.ttf", ASCII + EXTRA, False),
    ]
    os.makedirs(out_dir, exist_ok=True)
    for src, dst, chars, lnum in jobs:
        font = TTFont(os.path.join(src_dir, src))
        if lnum:
            freeze_lnum(font)
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        opts.drop_tables += ["DSIG"]
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=sorted({ord(c) for c in chars}))
        sub.subset(font)
        out = os.path.join(out_dir, dst)
        font.save(out)
        print(f"{dst:28s} {len(chars):4d} chars  {os.path.getsize(out) / 1024:7.1f} KiB")
    print("CJK:", "".join(cjk))


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "fonts"))
