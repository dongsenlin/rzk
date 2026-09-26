#!/usr/bin/env python3
"""Mural textures, generated once into build/tex/ (the page loads them as images).

wall.png     2560² RGB   aged plaster: warm lime ground, water stains with tide lines, sand, pits, straw
surface.png  2560² L     multiply layer laid over everything painted: grain, pits, craquelure, long cracks
wear.png     1024² LA    pigment retention (alpha): islands where paint has flaked off, tileable
grain.png     512² LA    coarse mineral grains for azurite / malachite fills, tileable
mottle.png    512² LA    uneven pigment density, tileable
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import Voronoi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'tex')
os.makedirs(OUT, exist_ok=True)


def tnoise(size, sigma, seed):
    """Tileable smooth noise in 0..1: white noise blurred with wrap-around.
    Wide blurs run on a smaller grid and are upsampled with wrap-around interpolation."""
    r = np.random.default_rng(seed)
    f = 1
    while sigma / f > 6 and size // (f * 2) >= 16 and size % (f * 2) == 0:
        f *= 2
    n = size // f
    v = ndimage.gaussian_filter(r.standard_normal((n, n)), sigma / f, mode='wrap')
    if f > 1:
        v = ndimage.zoom(v, f, order=3, mode='grid-wrap', grid_mode=True)[:size, :size]
    v -= v.min()
    return v / (v.max() or 1)


def fbm(size, sigma0, octaves, seed, pers=0.55):
    v = np.zeros((size, size)); a = 1.0; tot = 0.0
    for o in range(octaves):
        v += a * tnoise(size, max(0.6, sigma0 / 2 ** o), seed + 17 * o)
        tot += a; a *= pers
    v /= tot
    v -= v.min()
    return v / (v.max() or 1)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def jitter_line(p0, p1, rng, amp, depth=4):
    pts = [p0, p1]
    for _ in range(depth):
        out = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            L = (dx * dx + dy * dy) ** 0.5 or 1
            k = (rng.random() - 0.5) * amp * L
            out += [((a[0] + b[0]) / 2 - dy / L * k, (a[1] + b[1]) / 2 + dx / L * k), b]
        pts = out
    return pts


def long_crack(draw, rng, S, start, ang, length, width, shade, branch=2):
    x, y = start; pts = [(x, y)]
    for _ in range(int(length / 5)):
        ang += rng.normal() * 0.1 + (rng.normal() * 0.7 if rng.random() < 0.07 else 0)   # straight runs, sudden kinks
        x += np.cos(ang) * 5; y += np.sin(ang) * 5
        pts.append((x, y))
    for dx in (-S, 0, S):                       # wrap so the wall tiles
        for dy in (-S, 0, S):
            q = [(px + dx, py + dy) for px, py in pts]
            draw.line([(px + 1, py + 1) for px, py in q], fill=255, width=1)      # lit lip
            draw.line(q, fill=shade, width=width)
    if branch > 0:
        for _ in range(branch):
            i = rng.integers(len(pts) // 4, len(pts))
            long_crack(draw, rng, S, pts[i], ang + (rng.random() - 0.5) * 2.2, length * (0.25 + rng.random() * 0.35),
                       max(1, width - 1), min(255, shade + 30), branch - 1)


def main():
    S = 2560
    # ── albedo ──
    big = fbm(S, 420, 5, 11)
    mid = fbm(S, 60, 4, 23)
    fine = tnoise(S, 1.2, 5)
    light = np.array([228, 207, 170], float); dark = np.array([184, 150, 108], float)
    k = np.clip(0.5 + (big - 0.5) * 1.3 + (mid - 0.5) * 0.45, 0, 1)
    img = dark + (light - dark) * k[..., None]
    img += ((fine - 0.5) * 16)[..., None]
    # water stains: darker ochre bodies with a sharp tide line on their rim
    st = fbm(S, 260, 5, 37)
    body = smooth(0.58, 0.68, st)
    img = img * (1 - 0.18 * body[..., None]) + np.array([120, 88, 58]) * 0.18 * body[..., None]
    tide = np.exp(-((st - 0.585) / 0.004) ** 2)
    img -= (tide * 26)[..., None] * np.array([1, 1.1, 1.25])
    # soot from lamps: cool grey clouds, faint
    soot = smooth(0.62, 0.8, fbm(S, 300, 4, 51))
    img = img * (1 - 0.22 * soot[..., None]) + np.array([70, 64, 60]) * 0.22 * soot[..., None]
    rng = np.random.default_rng(3)
    wall = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(wall)
    for _ in range(420):                        # straw in the clay
        x, y = rng.random(2) * S; a = rng.random() * np.pi; l = 8 + rng.random() * 26
        c = tuple(int(v) for v in (light * (0.97 if rng.random() < 0.5 else 0.88)))
        d.line([(x, y), (x + np.cos(a) * l, y + np.sin(a) * l)], fill=c, width=1)
    wall.save(os.path.join(OUT, 'wall.png'))

    # ── surface (multiply) ──
    surf = 236 + (tnoise(S, 0.8, 71) - 0.5) * 30 + (fbm(S, 40, 3, 72) - 0.5) * 24
    surf = Image.fromarray(np.clip(surf, 0, 255).astype(np.uint8), 'L')
    d = ImageDraw.Draw(surf)
    for _ in range(2600):                       # pits
        x, y = rng.random(2) * S; r = 0.6 + rng.random() ** 3 * 3.0
        d.ellipse([x - r, y - r, x + r, y + r], fill=int(150 + rng.random() * 60))
    # craquelure in patches: voronoi edges kept where a patch mask is high
    pts = rng.random((2600, 2)) * S
    vor = Voronoi(np.vstack([pts + [dx, dy] for dx in (-S, 0, S) for dy in (-S, 0, S)]))
    patch = fbm(S, 200, 4, 91)
    for (a, b) in vor.ridge_vertices:
        if a < 0 or b < 0: continue
        p0, p1 = vor.vertices[a], vor.vertices[b]
        mx, my = (p0 + p1) / 2
        if not (0 <= mx < S and 0 <= my < S): continue
        if patch[int(my), int(mx)] < 0.52 or rng.random() < 0.25: continue
        line = jitter_line(tuple(p0), tuple(p1), rng, 0.18, 3)
        shade = int(178 + rng.random() * 50)
        d.line(line, fill=shade, width=1)
    for _ in range(6):
        long_crack(d, rng, S, tuple(rng.random(2) * S), rng.random() * np.pi * 2, 400 + rng.random() * 600,
                   1, int(185 + rng.random() * 30), 1)
    surf.save(os.path.join(OUT, 'surface.png'))

    # ── wear: paint retention, islands of loss with crisp edges ──
    T = 1024
    w = fbm(T, 90, 5, 101)
    w2 = tnoise(T, 3, 102)
    keep = 1 - smooth(0.66, 0.69, w) * 0.92 - smooth(0.78, 0.8, w2) * 0.8
    keep = np.clip(keep, 0, 1)
    la = np.stack([np.full((T, T), 255, np.uint8), (keep * 255).astype(np.uint8)], -1)
    Image.fromarray(la, 'LA').save(os.path.join(OUT, 'wear.png'))

    # ── grain and mottle ──
    G = 512
    g = tnoise(G, 0.7, 111)
    ga = np.clip((g - 0.55) * 4, 0, 1) * 200
    Image.fromarray(np.stack([np.full((G, G), 255, np.uint8), ga.astype(np.uint8)], -1), 'LA').save(os.path.join(OUT, 'grain.png'))
    m = fbm(G, 40, 4, 121)
    ma = np.clip((m - 0.3) / 0.5, 0, 1) * 255
    Image.fromarray(np.stack([np.full((G, G), 255, np.uint8), ma.astype(np.uint8)], -1), 'LA').save(os.path.join(OUT, 'mottle.png'))
    print('textures →', OUT)


if __name__ == '__main__':
    main()
