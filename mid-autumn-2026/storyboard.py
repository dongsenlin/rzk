"""Storyboard sheet from rendered frames: python3 storyboard.py <frames dir> <out.jpg>"""
import sys
from PIL import Image, ImageDraw, ImageFont

FRAMES, OUT = sys.argv[1], sys.argv[2]
SHOTS = [  # (frame, caption)
    (45, '0.75  声呐扫出世界'), (156, '2.6  千里'), (270, '4.5  相连 · 共'), (324, '5.4  汇聚'),
    (420, '7.0  团圆 · 弦图'), (486, '8.1  满月'), (552, '9.2  千里共婵娟'), (606, '10.1  中'),
    (720, '12.0  拉远落版'), (899, '15.0  祝大家中秋快乐'),
]
w, h, pad, cap = 324, 576, 12, 34
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 20)
except OSError:
    font = ImageFont.load_default()
cols = 5
rows = (len(SHOTS) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + cap + pad) + pad), (8, 10, 18))
d = ImageDraw.Draw(sheet)
for k, (f, text) in enumerate(SHOTS):
    im = Image.open(f'{FRAMES}/{f:04d}.png').convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = pad + (k % cols) * (w + pad), pad + (k // cols) * (h + cap + pad)
    sheet.paste(im, (x, y))
    d.text((x + 2, y + h + 6), text, fill=(236, 214, 170), font=font)
sheet.save(OUT, quality=90)
