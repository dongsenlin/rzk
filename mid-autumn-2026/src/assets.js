// Procedural assets, generated once at start-up: sky, moon texture, sprites,
// mountains, mist, auspicious clouds, the seal, grain and vignette.
'use strict';

const Assets = (() => {
  const { clamp, lerp, smooth, TAU, rng, makeNoise, canvas, rgba } = U;
  const MARGIN = 80; // bleed around full-frame layers so camera drift never shows an edge

  // ---------------------------------------------------------------- sky
  function sky() {
    const c = canvas(W + 2 * MARGIN, H + 2 * MARGIN), g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 0, c.height);
    lg.addColorStop(0.0, 'rgb(3,5,13)');
    lg.addColorStop(0.28, 'rgb(7,11,29)');
    lg.addColorStop(0.52, 'rgb(13,18,45)');
    lg.addColorStop(0.74, 'rgb(22,25,58)');
    lg.addColorStop(1.0, 'rgb(28,25,54)');
    g.fillStyle = lg;
    g.fillRect(0, 0, c.width, c.height);

    // Low-frequency colour drift (deep teal / plum) so the night is not a flat ramp.
    const N = makeNoise(11), sw = 155, sh = 270;
    const s = canvas(sw, sh), sg = s.getContext('2d'), img = sg.createImageData(sw, sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const n1 = N.fbm(x * 0.021, y * 0.021, 0.3, 4), n2 = N.fbm(x * 0.017 + 7, y * 0.017, 2.1, 4);
      const wt = smooth(0.02, 0.38, n1) * 0.9, wp = smooth(0.05, 0.4, n2) * 0.8;
      const i = (y * sw + x) * 4, tot = wt + wp + 1e-6;
      img.data[i] = (18 * wt + 58 * wp) / tot;
      img.data[i + 1] = (54 * wt + 30 * wp) / tot;
      img.data[i + 2] = (84 * wt + 88 * wp) / tot;
      img.data[i + 3] = 255 * clamp(Math.max(wt, wp)) * 0.42 * (0.35 + 0.65 * smooth(0, 0.8, y / sh));
    }
    sg.putImageData(img, 0, 0);
    g.imageSmoothingQuality = 'high';
    g.drawImage(s, 0, 0, c.width, c.height);
    return c;
  }

  // ---------------------------------------------------------------- moon
  // Albedo map of the near side: maria laid out after the real Moon (so the
  // folk "jade rabbit" reads), fine fbm detail on the sphere, ray craters.
  function moonTexture(S) {
    const c = canvas(S, S), g = c.getContext('2d');
    const img = g.createImageData(S, S), d = img.data, N = makeNoise(7), N2 = makeNoise(21);
    // [x, y, rx, ry, weight] in disc units, north up, as seen from the northern hemisphere.
    const maria = [
      [-0.63, -0.04, 0.22, 0.44, 1.0], [-0.8, 0.14, 0.1, 0.3, 0.8], [-0.3, -0.4, 0.25, 0.22, 1.05],
      [0.24, -0.43, 0.16, 0.15, 1.0], [0.43, -0.1, 0.2, 0.16, 1.0], [0.79, -0.27, 0.075, 0.1, 1.05],
      [0.7, 0.13, 0.1, 0.15, 0.9], [0.52, 0.3, 0.08, 0.08, 0.85], [-0.2, 0.36, 0.16, 0.12, 0.8],
      [-0.56, 0.38, 0.085, 0.085, 0.9], [-0.04, -0.69, 0.42, 0.055, 0.72], [0.07, -0.2, 0.07, 0.06, 0.8],
      [-0.33, 0.12, 0.13, 0.1, 0.7], [0.17, -0.06, 0.06, 0.06, 0.55], [-0.45, -0.18, 0.12, 0.1, 0.7],
    ];
    const hi = [247, 239, 218], mare = [199, 186, 157];
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const x = ((px + 0.5) / S) * 2 - 1, y = ((py + 0.5) / S) * 2 - 1, r2 = x * x + y * y;
      const i = (py * S + px) * 4;
      if (r2 > 1.0) { d[i + 3] = 0; continue; }
      const z = Math.sqrt(1 - r2);
      const wx = N.fbm(x * 2.6, y * 2.6, z * 2.6, 4) * 0.22, wy = N.fbm(x * 2.6 + 5, y * 2.6, z * 2.6, 4) * 0.22;
      let m = 0;
      for (const [mx, my, rx, ry, w] of maria) {
        const dx = (x - mx) / rx + wx, dy = (y - my) / ry + wy;
        m += w * Math.exp(-(dx * dx + dy * dy) * 1.25);
      }
      const detail = N.fbm(x * 7 + 3, y * 7, z * 7, 5);
      const mask = smooth(0.12, 1.0, m + detail * 0.18) * 0.86;
      const tone = 1 + N2.fbm(x * 22, y * 22, z * 22, 3) * 0.03 + N.fbm(x * 4, y * 4, z * 4 + 9, 4) * 0.05 + 0.03 * smooth(-0.3, 0.9, y);
      const limb = 0.93 + 0.07 * Math.pow(z, 0.5);
      for (let k = 0; k < 3; k++) d[i + k] = clamp(lerp(hi[k], mare[k], mask) * tone * limb, 0, 255);
      d[i + 3] = 255 * clamp((1 - Math.sqrt(r2)) * S * 0.5 + 0.5);
    }
    g.putImageData(img, 0, 0);

    const r = rng(99), h = S / 2;
    g.save();
    g.beginPath(); g.arc(h, h, h, 0, TAU); g.clip();
    g.globalCompositeOperation = 'screen';
    // Young bright craters: soft specks, a few with faint rims.
    for (let k = 0; k < 190; k++) {
      const a = r() * TAU, rr = Math.sqrt(r()) * 0.97;
      const cx = h + Math.cos(a) * rr * h, cy = h + Math.sin(a) * rr * h;
      const cr = (0.0025 + Math.pow(r(), 4) * 0.02) * S, al = 0.05 + r() * 0.16;
      const sp = g.createRadialGradient(cx, cy, 0, cx, cy, cr);
      sp.addColorStop(0, `rgba(255,251,240,${al})`); sp.addColorStop(1, 'rgba(255,251,240,0)');
      g.fillStyle = sp; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill();
    }
    // Ray systems: Tycho (south), Copernicus, Kepler, Aristarchus.
    const raySys = [[-0.13, 0.7, 0.62, 30, 0.1], [-0.3, -0.1, 0.3, 20, 0.08], [-0.57, -0.08, 0.18, 12, 0.07], [-0.74, -0.36, 0.08, 8, 0.1]];
    for (const [rx, ry, len, n, alpha] of raySys) {
      const cx = h + rx * h, cy = h + ry * h;
      g.save(); g.filter = `blur(${S * 0.0025}px)`;
      for (let k = 0; k < n; k++) {
        const ang = r() * TAU, l = len * h * (0.4 + r() * 0.8);
        const lg = g.createLinearGradient(cx, cy, cx + Math.cos(ang) * l, cy + Math.sin(ang) * l);
        lg.addColorStop(0, `rgba(255,251,240,${alpha})`); lg.addColorStop(1, 'rgba(255,251,240,0)');
        g.strokeStyle = lg; g.lineWidth = S * (0.003 + r() * 0.005); g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * l, cy + Math.sin(ang) * l); g.stroke();
      }
      g.restore();
      const sp = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.018);
      sp.addColorStop(0, `rgba(255,252,242,${alpha * 4})`); sp.addColorStop(1, 'rgba(255,252,242,0)');
      g.fillStyle = sp; g.beginPath(); g.arc(cx, cy, S * 0.018, 0, TAU); g.fill();
    }
    g.restore();

    // Warm limb falloff for volume.
    g.globalCompositeOperation = 'source-atop';
    const lim = g.createRadialGradient(h * 0.96, h * 0.94, 0, h, h, h);
    lim.addColorStop(0.0, 'rgba(255,255,255,0)');
    lim.addColorStop(0.78, 'rgba(236,208,160,0.0)');
    lim.addColorStop(1.0, 'rgba(208,168,112,0.34)');
    g.fillStyle = lim; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // Dim, cool copy of the moon for the earthshine on the unlit side.
  function earthshine(tex) {
    const c = canvas(tex.width, tex.height), g = c.getContext('2d');
    g.drawImage(tex, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(52,66,112,0.82)';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // ---------------------------------------------------------------- sprites
  function dot(size, stops) {
    const c = canvas(size, size), g = c.getContext('2d'), h = size / 2;
    const rg = g.createRadialGradient(h, h, 0, h, h, h);
    for (const [o, col] of stops) rg.addColorStop(o, col);
    g.fillStyle = rg; g.fillRect(0, 0, size, size);
    return c;
  }

  function spikeStar(size) {
    const c = canvas(size, size), g = c.getContext('2d'), h = size / 2;
    g.globalCompositeOperation = 'lighter';
    for (const [ang, len, wid] of [[0, 1, 1.4], [Math.PI / 2, 1, 1.4], [Math.PI / 4, 0.45, 0.9], [-Math.PI / 4, 0.45, 0.9]]) {
      g.save(); g.translate(h, h); g.rotate(ang);
      const lg = g.createLinearGradient(-h * len, 0, h * len, 0);
      lg.addColorStop(0, 'rgba(230,238,255,0)'); lg.addColorStop(0.5, 'rgba(240,244,255,0.9)'); lg.addColorStop(1, 'rgba(230,238,255,0)');
      g.fillStyle = lg; g.fillRect(-h * len, -wid / 2, 2 * h * len, wid);
      g.restore();
    }
    g.drawImage(dot(size * 0.4, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(225,235,255,0.55)'], [1, 'rgba(200,215,255,0)']]), h - size * 0.2, h - size * 0.2);
    return c;
  }

  function petal(size, blur) {
    const c = canvas(size, size), g = c.getContext('2d'), h = size / 2;
    if (blur) g.filter = `blur(${blur}px)`;
    g.translate(h, h);
    const pr = size * 0.2;
    for (let k = 0; k < 4; k++) {
      g.save(); g.rotate(k * Math.PI / 2 + 0.3);
      const lg = g.createLinearGradient(0, 0, 0, -pr * 2.1);
      lg.addColorStop(0, 'rgb(226,138,40)'); lg.addColorStop(0.5, 'rgb(248,190,84)'); lg.addColorStop(1, 'rgb(255,222,140)');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(pr * 0.95, -pr * 0.5, pr * 0.85, -pr * 2.0, 0, -pr * 2.05);
      g.bezierCurveTo(-pr * 0.85, -pr * 2.0, -pr * 0.95, -pr * 0.5, 0, 0);
      g.fill();
      g.restore();
    }
    g.fillStyle = 'rgb(196,104,30)';
    g.beginPath(); g.arc(0, 0, pr * 0.28, 0, TAU); g.fill();
    return c;
  }

  // ---------------------------------------------------------------- mountains
  // Ink-wash ridges, far to near. Each layer is pre-rendered with a moonlit
  // rim and an inner glow along the crest; ridge() is kept for the network nodes.
  const LAYERS = [
    { base: 1500, amp: 190, seed: 3, top: [40, 46, 86], bot: [23, 27, 58], rim: 0.5, peaks: [[-60, 1.0, 250], [250, 0.5, 170], [520, 0.3, 200], [790, 0.52, 170], [1130, 1.0, 250]] },
    { base: 1618, amp: 250, seed: 5, top: [27, 32, 66], bot: [14, 17, 41], rim: 0.4, peaks: [[-10, 1.0, 220], [220, 0.52, 150], [560, 0.18, 220], [880, 0.56, 160], [1095, 1.05, 210]] },
    { base: 1738, amp: 220, seed: 8, top: [17, 21, 46], bot: [9, 11, 27], rim: 0.3, peaks: [[110, 0.92, 190], [400, 0.36, 150], [690, 0.3, 150], [975, 0.88, 190]] },
    { base: 1858, amp: 150, seed: 13, top: [9, 11, 26], bot: [4, 5, 12], rim: 0.2, peaks: [[-70, 1.0, 250], [330, 0.5, 200], [760, 0.46, 220], [1150, 1.0, 240]] },
  ];

  function ridgeFn(L) {
    const N = makeNoise(L.seed);
    return x => {
      let h = 0;
      for (const [px, a, w] of L.peaks) { const u = (x - px) / w; h = Math.max(h, a * Math.pow(1 / (1 + u * u), 1.35)); }
      return L.base - L.amp * h - 22 * N.fbm(x * 0.006, L.seed, 0, 4) - 6 * N.fbm(x * 0.03, 0.5, L.seed, 3);
    };
  }

  function mountains() {
    return LAYERS.map((L, li) => {
      const ridge = ridgeFn(L), x0 = -MARGIN, x1 = W + MARGIN;
      let top = Infinity;
      const pts = [];
      for (let x = x0; x <= x1; x += 3) { const y = ridge(x); pts.push([x, y]); top = Math.min(top, y); }
      top = Math.floor(top - 40);
      const c = canvas(x1 - x0, H + MARGIN - top), g = c.getContext('2d');
      g.translate(-x0, -top);
      const shape = new Path2D();
      shape.moveTo(x0, H + MARGIN);
      for (const [x, y] of pts) shape.lineTo(x, y);
      shape.lineTo(x1, H + MARGIN); shape.closePath();
      const lg = g.createLinearGradient(0, top + 40, 0, top + 40 + (H - top) * 0.8);
      lg.addColorStop(0, `rgb(${L.top})`); lg.addColorStop(1, `rgb(${L.bot})`);
      g.fillStyle = lg; g.fill(shape);

      // Ink texture.
      const N = makeNoise(40 + li), tw = 180, th = 90, t = canvas(tw, th), tg = t.getContext('2d'), im = tg.createImageData(tw, th);
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const v = N.fbm(x * 0.05, y * 0.11, li, 4), i = (y * tw + x) * 4;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v > 0 ? 170 : 0; im.data[i + 3] = Math.abs(v) * 90;
      }
      tg.putImageData(im, 0, 0);
      g.save(); g.clip(shape); g.globalAlpha = 0.35; g.globalCompositeOperation = 'soft-light';
      g.drawImage(t, x0, top, x1 - x0, H + MARGIN - top); g.restore();

      // Crest glow (moonlight scattering on the ridge), brightest under the moon.
      const hz = g.createLinearGradient(x0, 0, x1, 0);
      hz.addColorStop(0, `rgba(170,178,230,${0.25 * L.rim})`);
      hz.addColorStop(0.5, `rgba(222,214,230,${0.9 * L.rim})`);
      hz.addColorStop(1, `rgba(170,178,230,${0.25 * L.rim})`);
      const crest = new Path2D();
      pts.forEach(([x, y], i) => (i ? crest.lineTo(x, y) : crest.moveTo(x, y)));
      g.save(); g.clip(shape); g.filter = 'blur(16px)'; g.strokeStyle = hz; g.lineWidth = 34; g.globalAlpha = 0.55; g.stroke(crest); g.restore();
      g.save(); g.strokeStyle = hz; g.lineWidth = 1.4; g.globalAlpha = 0.9; g.stroke(crest); g.restore();
      return { canvas: c, x: x0, y: top, ridge };
    });
  }

  // Soft horizontal mist band (tileable horizontally).
  function mist(w, h, seed) {
    const N = makeNoise(seed), lw = Math.round(w / 4), lh = Math.round(h / 4);
    const s = canvas(lw, lh), sg = s.getContext('2d'), im = sg.createImageData(lw, lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const u = x / lw, ang = u * TAU;
      const v = N.fbm(Math.cos(ang) * 2.2, Math.sin(ang) * 2.2, y * 0.045, 5); // periodic in x
      const band = Math.sin(Math.PI * (y / lh));
      const i = (y * lw + x) * 4;
      im.data[i] = PAL.mist[0]; im.data[i + 1] = PAL.mist[1]; im.data[i + 2] = PAL.mist[2];
      im.data[i + 3] = 255 * clamp(smooth(-0.15, 0.45, v) * band * band);
    }
    sg.putImageData(im, 0, 0);
    const c = canvas(w, h), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(s, 0, 0, w, h);
    return c;
  }

  // ---------------------------------------------------------------- 祥云
  // Auspicious-cloud motif: scroll heads with inward spirals over a flat base,
  // trailing a tapered tail. Outline = stroke every part, then fill every part.
  function cloud(spec, scale = 2) {
    const { heads, base, tail } = spec;
    const pad = 30, xs = [], ys = [];
    for (const [x, y, r] of heads) { xs.push(x - r, x + r); ys.push(y - r, y + r); }
    for (const [x, y] of tail.pts) { xs.push(x); ys.push(y); }
    xs.push(base[0], base[1]); ys.push(base[2] + base[3]);
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    const c = canvas((maxX - minX) * scale, (maxY - minY) * scale), g = c.getContext('2d');
    g.scale(scale, scale); g.translate(-minX, -minY);

    const parts = new Path2D();
    for (const [x, y, r] of heads) { parts.moveTo(x + r, y); parts.arc(x, y, r, 0, TAU); }
    const [bx0, bx1, by, bh] = base;
    parts.roundRect(bx0, by - bh, bx1 - bx0, bh * 2, bh);
    // Fill the pockets between neighbouring heads down to the base.
    const hs = [...heads].sort((p, q) => p[0] - q[0]);
    parts.moveTo(hs[0][0], hs[0][1]);
    for (const [x, y] of hs) parts.lineTo(x, y);
    parts.lineTo(hs[hs.length - 1][0], by); parts.lineTo(hs[0][0], by); parts.closePath();
    // Tail: tapered ribbon along a polyline.
    const tp = tail.pts, left = [], right = [];
    for (let i = 0; i < tp.length; i++) {
      const a = tp[Math.max(0, i - 1)], b = tp[Math.min(tp.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const w = tail.w * Math.pow(1 - i / (tp.length - 1), 0.8) + 0.6;
      left.push([tp[i][0] - (dy / l) * w, tp[i][1] + (dx / l) * w]);
      right.push([tp[i][0] + (dy / l) * w, tp[i][1] - (dx / l) * w]);
    }
    const tailPath = new Path2D();
    left.forEach(([x, y], i) => (i ? tailPath.lineTo(x, y) : tailPath.moveTo(x, y)));
    for (let i = right.length - 1; i >= 0; i--) tailPath.lineTo(right[i][0], right[i][1]);
    tailPath.closePath();

    const gold = `rgb(${PAL.gold})`, ow = 2.2;
    g.lineJoin = 'round';
    g.strokeStyle = gold; g.lineWidth = ow * 2;
    g.stroke(parts); g.stroke(tailPath);
    const fill = g.createLinearGradient(0, minY, 0, maxY);
    fill.addColorStop(0, 'rgb(36,42,86)'); fill.addColorStop(0.55, 'rgb(19,23,52)'); fill.addColorStop(1, 'rgb(12,15,36)');
    g.fillStyle = fill; g.fill(parts); g.fill(tailPath);

    // Inner scrolls.
    g.strokeStyle = gold; g.lineCap = 'round';
    for (const [x, y, r, dir = 1, start = Math.PI / 2] of heads) {
      g.lineWidth = Math.max(1.6, r * 0.05);
      g.beginPath();
      const turns = 1.55, n = 90;
      for (let i = 0; i <= n; i++) {
        const u = i / n, ang = start + dir * u * turns * TAU, rad = r * lerp(0.8, 0.14, Math.pow(u, 0.9));
        const px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    }
    // Curl at the tail tip.
    if (tail.curl) {
      const [cx, cy, cr, dir] = tail.curl;
      g.lineWidth = 2.2; g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const u = i / 60, ang = -Math.PI / 2 + dir * u * 1.4 * TAU, rad = cr * (1 - 0.8 * u);
        const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    }
    return { canvas: c, ox: minX, oy: minY, scale };
  }

  const CLOUDS = {
    big: {
      heads: [[0, -8, 64, 1, 2.2], [-104, 20, 46, -1, 0.9], [96, 16, 52, 1, 2.4], [178, 36, 32, 1, 2.6], [-178, 40, 28, -1, 0.7]],
      base: [-196, 206, 56, 20],
      tail: { pts: [[-190, 60], [-250, 62], [-310, 54], [-360, 40], [-392, 22]], w: 12, curl: [-392, 8, 16, 1] },
    },
    mid: {
      heads: [[0, 0, 50, -1, 0.8], [84, 22, 38, 1, 2.3], [-78, 26, 34, -1, 0.8]],
      base: [-104, 116, 52, 16],
      tail: { pts: [[100, 58], [160, 60], [214, 52], [256, 36], [280, 18]], w: 10, curl: [280, 4, 13, -1] },
    },
  };

  // ---------------------------------------------------------------- 桂枝
  // Foreground osmanthus branch: tapered stems, opposite leaves drooping under
  // their weight, clusters of tiny gold florets at the nodes, rim-lit from the
  // moon (lower left). Anchored at its right edge (BRANCH_ANCHOR).
  const BRANCH_ANCHOR = [640, 40];
  function branch() {
    const BW = 640, BH = 600, c = canvas(BW, BH), g = c.getContext('2d'), r = rng(1015);
    const L = [-0.62, 0.78]; // direction towards the moon (light)
    const cubic = (p0, p1, p2, p3, n) => Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n, m = 1 - t;
      return [m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
        m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]];
    });
    const main = cubic([BW + 30, 34], [BW - 170, 22], [BW - 330, 150], [120, 300], 90);
    const at = (pts, u) => pts[Math.round(u * (pts.length - 1))];
    const stems = [{ pts: main, w0: 16, w1: 2.6 }];
    for (const [u, c1, c2, e, w0, w1] of [
      [0.3, [-50, 120], [-110, 210], [-150, 290], 7, 1.8],
      [0.52, [-30, -40], [-100, -76], [-176, -64], 6, 1.6],
      [0.72, [-20, 100], [-36, 180], [-86, 240], 5, 1.4],
      [0.12, [-10, 80], [-30, 140], [-20, 196], 6, 1.6],
    ]) {
      const [x, y] = at(main, u);
      stems.push({ pts: cubic([x, y], [x + c1[0], y + c1[1]], [x + c2[0], y + c2[1]], [x + e[0], y + e[1]], 50), w0, w1 });
    }

    const drawStem = ({ pts, w0, w1 }) => {
      const left = [], right = [];
      pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (pts.length - 1)) / 2;
        left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]); right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
      });
      g.beginPath();
      left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      for (let i = right.length - 1; i >= 0; i--) g.lineTo(...right[i]);
      g.closePath();
      g.fillStyle = 'rgb(12,13,26)'; g.fill();
      // Rim light on the side facing the moon.
      for (const side of [left, right]) {
        for (let i = 1; i < side.length; i++) {
          const q = pts[i], s0 = side[i];
          const nx = s0[0] - q[0], ny = s0[1] - q[1], nl = Math.hypot(nx, ny) || 1;
          const lit = Math.max(0, (nx / nl) * L[0] + (ny / nl) * L[1]);
          if (lit < 0.05) continue;
          g.strokeStyle = rgba(PAL.gold, 0.55 * lit); g.lineWidth = 1.1;
          g.beginPath(); g.moveTo(...side[i - 1]); g.lineTo(...s0); g.stroke();
        }
      }
    };

    const leaf = (x, y, ang, len, wid) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      const path = new Path2D();
      path.moveTo(0, 0);
      path.quadraticCurveTo(len * 0.42, -wid, len, 0);
      path.quadraticCurveTo(len * 0.42, wid * 0.92, 0, 0);
      const lg = g.createLinearGradient(0, 0, len, 0);
      lg.addColorStop(0, 'rgb(13,16,32)'); lg.addColorStop(1, 'rgb(27,33,62)');
      g.fillStyle = lg; g.fill(path);
      g.strokeStyle = 'rgba(58,68,112,0.75)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(2, 0); g.quadraticCurveTo(len * 0.5, -wid * 0.08, len * 0.86, 0); g.stroke();
      // Lit edge: whichever half faces the moon.
      const up = [Math.sin(ang), -Math.cos(ang)], litUp = up[0] * L[0] + up[1] * L[1];
      g.strokeStyle = rgba(PAL.gold, 0.5 * Math.abs(litUp) + 0.08); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, 0);
      if (litUp > 0) g.quadraticCurveTo(len * 0.42, -wid, len, 0); else g.quadraticCurveTo(len * 0.42, wid * 0.92, len, 0);
      g.stroke();
      g.restore();
    };

    const florets = (x, y, n) => {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gl = g.createRadialGradient(x, y, 0, x, y, 26);
      gl.addColorStop(0, 'rgba(255,196,96,0.35)'); gl.addColorStop(1, 'rgba(255,196,96,0)');
      g.fillStyle = gl; g.fillRect(x - 26, y - 26, 52, 52);
      g.restore();
      for (let k = 0; k < n; k++) {
        const a = r() * TAU, d = Math.sqrt(r()) * 13, fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d * 0.8 + 3;
        const pr = 2.3 + r() * 1.5, rot = r() * TAU;
        for (let q = 0; q < 4; q++) {
          const pa = rot + (q * Math.PI) / 2;
          g.fillStyle = q % 2 ? 'rgb(246,184,78)' : 'rgb(255,208,112)';
          g.beginPath(); g.ellipse(fx + Math.cos(pa) * pr * 0.8, fy + Math.sin(pa) * pr * 0.8, pr, pr * 0.72, pa, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgb(206,112,34)'; g.beginPath(); g.arc(fx, fy, pr * 0.35, 0, TAU); g.fill();
      }
    };

    // Leaves first (behind the stems), then stems, then flowers.
    const nodesAt = [];
    stems.forEach((st, si) => {
      const n = si === 0 ? 7 : 3;
      for (let k = 0; k < n; k++) {
        const u = si === 0 ? 0.2 + k * 0.12 : 0.35 + k * 0.28;
        const i = Math.round(Math.min(0.97, u) * (st.pts.length - 1));
        const p = st.pts[i], q = st.pts[Math.min(st.pts.length - 1, i + 1)];
        const sa = Math.atan2(q[1] - p[1], q[0] - p[0]);
        for (const side of [-1, 1]) {
          let a = sa + side * (0.95 + r() * 0.35);
          a = a + (Math.PI / 2 - a) * (0.25 + r() * 0.2) * (Math.cos(a) > -2 ? 1 : 0);
          leaf(p[0], p[1], a, 70 + r() * 40 - (si ? 10 : 0), 18 + r() * 8);
        }
        nodesAt.push([p[0], p[1], si]);
      }
      // Terminal leaf.
      const e = st.pts[st.pts.length - 1], e0 = st.pts[st.pts.length - 4];
      leaf(e[0], e[1], Math.atan2(e[1] - e0[1], e[0] - e0[0]) + 0.15, 78, 20);
    });
    stems.forEach(drawStem);
    nodesAt.forEach(([x, y, si], k) => { if (k % 2 === 0 || si === 0) florets(x, y, 5 + Math.floor(r() * 5)); });

    // Shallow depth of field: the branch sits well in front of the moon.
    const out = canvas(BW, BH), og = out.getContext('2d');
    og.filter = 'blur(1.1px)'; og.drawImage(c, 0, 0);
    return out;
  }

  // ---------------------------------------------------------------- seal 印
  function seal(px) {
    const S = px * 2, c = canvas(S, S), g = c.getContext('2d'), r = rng(2026), N = makeNoise(88);
    g.fillStyle = `rgb(${PAL.cinnabar})`;
    g.beginPath(); g.roundRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92, S * 0.05); g.fill();
    // 白文 characters, read right column first: 花好 / 月圓.
    g.fillStyle = `rgb(${PAL.paper})`;
    g.font = `900 ${S * 0.36}px ${FONT.serif}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const cell = [[0.705, 0.285, '花'], [0.705, 0.705, '好'], [0.295, 0.285, '月'], [0.295, 0.705, '圓']];
    for (const [cx, cy, ch] of cell) {
      g.save(); g.translate(cx * S, cy * S + S * 0.01); g.scale(1, 1.08); g.fillText(ch, 0, 0); g.restore();
    }
    // Stamp wear: speckles, broken edge, uneven ink.
    const img = g.getImageData(0, 0, S, S), d = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (!d[i + 3]) continue;
      const u = x / S, v = y / S, edge = Math.min(u, v, 1 - u, 1 - v);
      const n = N.fbm(u * 18, v * 18, 0, 4), n2 = N.fbm(u * 60, v * 60, 3, 2);
      if (edge < 0.075 && n + (edge - 0.045) * 9 < -0.12) { d[i + 3] = 0; continue; }
      if (n2 > 0.36) d[i + 3] *= 0.2;
      const ink = 0.9 + 0.1 * N.fbm(u * 6, v * 6, 7, 3);
      d[i] *= ink; d[i + 1] *= ink; d[i + 2] *= ink;
    }
    g.putImageData(img, 0, 0);
    for (let k = 0; k < 60; k++) {
      g.fillStyle = r() < 0.5 ? `rgba(${PAL.cinnabar},0.9)` : 'rgba(0,0,0,0)';
      g.globalCompositeOperation = r() < 0.6 ? 'destination-out' : 'source-atop';
      g.beginPath(); g.arc(r() * S, r() * S, r() * S * 0.006 + 0.5, 0, TAU); g.fill();
    }
    return c;
  }

  // ---------------------------------------------------------------- finishing
  function grain(n, size) {
    const r = rng(5);
    return Array.from({ length: n }, () => {
      const c = canvas(size, size), g = c.getContext('2d'), im = g.createImageData(size, size);
      for (let i = 0; i < size * size; i++) {
        const v = 128 + ((r() + r() + r() - 1.5) * 150);
        im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = clamp(v, 0, 255);
        im.data[i * 4 + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      return c;
    });
  }

  function vignette() {
    const c = canvas(W, H), g = c.getContext('2d');
    const rg = g.createRadialGradient(W / 2, H * 0.44, W * 0.35, W / 2, H * 0.47, H * 0.68);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(0.7, 'rgba(1,2,8,0.28)');
    rg.addColorStop(1, 'rgba(1,2,8,0.72)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    return c;
  }

  function build() {
    const t0 = performance.now();
    const moonTex = moonTexture(640);
    const A = {
      MARGIN,
      sky: sky(),
      moon: moonTex,
      earth: earthshine(moonTex),
      glowDot: dot(64, [[0, 'rgba(255,248,230,1)'], [0.18, 'rgba(255,236,196,0.65)'], [0.5, 'rgba(255,214,150,0.12)'], [1, 'rgba(255,214,150,0)']]),
      lampDot: dot(64, [[0, 'rgba(255,246,220,1)'], [0.15, 'rgba(255,208,130,0.8)'], [0.45, 'rgba(255,170,80,0.18)'], [1, 'rgba(255,170,80,0)']]),
      starDot: dot(16, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(225,232,255,0.5)'], [1, 'rgba(210,220,255,0)']]),
      spike: spikeStar(96),
      petal: petal(64, 0),
      petalSoft: petal(64, 3.5),
      layers: mountains(),
      mist: [mist(W + 2 * MARGIN, 300, 61), mist(W + 2 * MARGIN, 240, 62)],
      clouds: { big: cloud(CLOUDS.big), mid: cloud(CLOUDS.mid) },
      branch: branch(),
      branchAnchor: BRANCH_ANCHOR,
      seal: seal(96),
      grain: grain(6, 256),
      vignette: vignette(),
    };
    A.buildMs = Math.round(performance.now() - t0);
    return A;
  }

  return { build };
})();
