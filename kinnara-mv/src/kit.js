// ─────────────────────────────────────────────────────────────────────────────
//  Drawing kit shared with the ink MV: noise, an SVG path parser so figures are
//  written as path data, brush strokes with a width profile and dry-brush
//  bristles, washes with pooled edges, splatter, gold leaf, ribbons, lightning.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

function rng(seed) {                               // mulberry32
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// 2D value noise on an integer lattice with a hashed grid
function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => { let n = (i * 374761393 + j * 668265263 + seed * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function vnoiseP(x, y, P, seed = 0) {                 // value noise that wraps every P cells
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => { i = ((i % P) + P) % P; j = ((j % P) + P) % P; let n = (i * 374761393 + j * 668265263 + seed * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function makeTileNoise(size = 512, cells = 6, seed = 41, lo = 0, hi = 1, oct = 5) {
  const cv = mk(size, size), c = cv.getContext('2d'), img = c.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, a = 0.5, n = 0;
    for (let o = 0; o < oct; o++) { const P = cells << o; v += a * vnoiseP(x / size * P, y / size * P, P, seed + o * 31); n += a; a *= 0.5; }
    v /= n; const o4 = (y * size + x) * 4;
    d[o4] = d[o4 + 1] = d[o4 + 2] = 255; d[o4 + 3] = 255 * lerp(lo, hi, clamp((v - 0.3) / 0.45));
  }
  c.putImageData(img, 0, 0);
  return cv;
}
function fbm2(x, y, oct = 5, seed = 0) { let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, y * f, seed + i * 31); n += a; a *= 0.5; f *= 2.03; } return v / n; }

const TEX = {};
// draw a texture so it covers the frame (optionally offset / zoomed for drift)
function coverTex(c, tex, ox = 0, oy = 0, z = 1) {
  const s = Math.max(W / tex.width, H / tex.height) * z;
  const w = tex.width * s, h = tex.height * s;
  c.drawImage(tex, (W - w) / 2 + ox, (H - h) / 2 + oy, w, h);
}

// ── SVG path data → polylines (M L H V C S Q T Z, absolute and relative) ──
function parsePath(d, steps = 18) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const out = []; let cur = null, i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lcx = null, lcy = null, lq = null;
  const num = () => parseFloat(toks[i++]);
  const push = (px, py) => { cur.push([px, py]); };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C0 = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C0 === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; cur = [[x, y]]; out.push(cur); cmd = rel ? 'l' : 'L'; lcx = lq = null; continue; }
    if (C0 === 'Z') { if (cur) push(sx, sy); x = sx; y = sy; lcx = lq = null; continue; }
    if (C0 === 'L') { x = ox + num(); y = oy + num(); push(x, y); lcx = lq = null; continue; }
    if (C0 === 'H') { x = ox + num(); push(x, y); lcx = lq = null; continue; }
    if (C0 === 'V') { y = oy + num(); push(x, y); lcx = lq = null; continue; }
    if (C0 === 'C' || C0 === 'S') {
      let c1x, c1y;
      if (C0 === 'C') { c1x = ox + num(); c1y = oy + num(); }
      else { c1x = lcx === null ? x : 2 * x - lcx; c1y = lcy === null ? y : 2 * y - lcy; }
      const c2x = ox + num(), c2y = oy + num(), ex = ox + num(), ey = oy + num();
      for (let k = 1; k <= steps; k++) {
        const t = k / steps, u = 1 - t;
        push(u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex, u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey);
      }
      lcx = c2x; lcy = c2y; lq = null; x = ex; y = ey; continue;
    }
    if (C0 === 'Q' || C0 === 'T') {
      let qx, qy;
      if (C0 === 'Q') { qx = ox + num(); qy = oy + num(); } else { qx = lq ? 2 * x - lq[0] : x; qy = lq ? 2 * y - lq[1] : y; }
      const ex = ox + num(), ey = oy + num();
      for (let k = 1; k <= steps; k++) { const t = k / steps, u = 1 - t; push(u * u * x + 2 * u * t * qx + t * t * ex, u * u * y + 2 * u * t * qy + t * t * ey); }
      lq = [qx, qy]; lcx = null; x = ex; y = ey; continue;
    }
    i++;                                            // unsupported token: skip
  }
  return out;
}
const PATHS = new Map();                            // parse cache
function pl(d) { if (!PATHS.has(d)) PATHS.set(d, parsePath(d)); return PATHS.get(d); }

// resample a polyline at a fixed spacing; returns points with tangent/normal
function resample(pts, step) {
  const out = []; if (pts.length < 2) return out;
  let acc = 0; out.push({ x: pts[0][0], y: pts[0][1], s: 0 });
  let carry = 0, total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg === 0) continue;
    let d = step - carry;
    while (d <= seg) { const f = d / seg; total += step; out.push({ x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, s: total }); d += step; }
    carry = seg - (d - step);
  }
  const lp = pts[pts.length - 1], lo = out[out.length - 1];
  if (Math.hypot(lp[0] - lo.x, lp[1] - lo.y) > step * 0.3) out.push({ x: lp[0], y: lp[1], s: total + Math.hypot(lp[0] - lo.x, lp[1] - lo.y) });
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    out[i].tx = dx / l; out[i].ty = dy / l; out[i].nx = -dy / l; out[i].ny = dx / l;
  }
  const L = out.length ? out[out.length - 1].s : 0;
  for (const p of out) p.u = L ? p.s / L : 0;
  return out;
}

// ── brush stroke ──
// pts: polyline.  o.w: width (px) or fn(u).  o.taper [in, out] as fractions.  o.dry 0..1 makes the
// bristles break up towards the tail.  o.reveal 0..1 draws only the first part (stroke being written).
function brush(c, pts, o = {}) {
  const { w = 6, color = C.ink, alpha = 1, taper = [0.12, 0.3], dry = 0.25, bristles = 0, seed = 1, reveal = 1, press = 0.25, body = 0.85, rough = 0.12 } = o;
  const step = Math.max(0.8, (typeof w === 'number' ? w : 6) / 5);
  const R = resample(pts, step); if (R.length < 2) return;
  const n = Math.max(2, Math.floor(R.length * clamp(reveal)));
  const wf = typeof w === 'function' ? w : () => w;
  const width = u => {
    const ti = taper[0] > 0 ? E.outQuad(clamp(u / taper[0])) : 1, to = taper[1] > 0 ? E.outQuad(clamp((1 - u) / taper[1])) : 1;
    return wf(u) * (0.35 + 0.65 * ti) * (0.2 + 0.8 * to) * (1 + press * (vnoise(u * 9, 0.5, seed) - 0.5) * 2);
  };
  c.save(); c.globalAlpha *= alpha; c.fillStyle = color; c.strokeStyle = color;
  // body: the ribbon of the stroke, edges roughened
  if (body > 0) {
    c.save(); c.globalAlpha *= body;
    c.beginPath();
    for (let i = 0; i < n; i++) { const p = R[i], hw = width(p.u) / 2 * (1 + rough * (vnoise(p.s / 7, 1.3, seed) - 0.5)); c[i ? 'lineTo' : 'moveTo'](p.x + p.nx * hw, p.y + p.ny * hw); }
    for (let i = n - 1; i >= 0; i--) { const p = R[i], hw = width(p.u) / 2 * (1 + rough * (vnoise(p.s / 7, 7.7, seed) - 0.5)); c.lineTo(p.x - p.nx * hw, p.y - p.ny * hw); }
    c.closePath(); c.fill(); c.restore();
  }
  // bristles: thin tracks across the width, breaking up where the brush runs dry
  const nb = bristles || Math.min(14, Math.max(3, Math.round((typeof w === 'number' ? w : 8) / 2.2)));
  for (let k = 0; k < nb; k++) {
    const off = (k + 0.5) / nb - 0.5, bw = Math.max(0.5, (typeof w === 'number' ? w : 8) / nb * 0.9);
    c.lineWidth = bw; c.globalAlpha = alpha * (0.35 + 0.5 * hash2(k, seed));
    c.beginPath(); let pen = false;
    for (let i = 0; i < n; i++) {
      const p = R[i], hw = width(p.u);
      const gap = vnoise(p.s / (6 + 10 * hash2(k, seed + 3)), k * 3.1, seed + 11) < dry * (0.25 + 0.95 * p.u);
      const x = p.x + p.nx * off * hw, y = p.y + p.ny * off * hw;
      if (gap || hw < 0.3) { pen = false; continue; }
      if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.restore();
}
// brush along every subpath of an SVG path string
function brushPath(c, d, o = {}) { pl(d).forEach((sp, i) => brush(c, sp, { ...o, seed: (o.seed || 1) + i * 13 })); }

// ── wash: a filled shape with mottled density and ink pooled at the edge ──
let WASH_TMP = null;
function wash(c, d, o = {}) {
  const { color = C.ink, alpha = 0.8, mottle = 0.45, edge = 0.5, edgeBlur = 6, edgeW = 5, noise = null, noiseScale = 1, bbox = null } = o;
  const P = typeof d === 'string' ? new Path2D(d) : d;
  const cw = c.canvas.width, ch = c.canvas.height;
  if (!WASH_TMP || WASH_TMP.width < cw || WASH_TMP.height < ch) WASH_TMP = mk(Math.max(cw, 64), Math.max(ch, 64));
  const t = WASH_TMP.getContext('2d');
  t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, WASH_TMP.width, WASH_TMP.height);
  t.setTransform(c.getTransform());
  t.fillStyle = color; t.globalAlpha = 1; t.fill(P);
  if (edge > 0) { t.save(); t.clip(P); t.filter = `blur(${edgeBlur}px)`; t.strokeStyle = o.edgeColor || color; t.lineWidth = edgeW * 2; t.globalAlpha = 1; t.stroke(P); t.restore(); }
  if (mottle > 0 && (noise || TEX.mottle)) {
    const nz = noise || TEX.mottle;
    t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'destination-out'; t.globalAlpha = mottle;
    const pat = t.createPattern(nz, 'repeat'); const m = new DOMMatrix(); m.scaleSelf(noiseScale, noiseScale); pat.setTransform(m);
    t.fillStyle = pat; t.fillRect(0, 0, cw, ch); t.restore();
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= alpha; c.drawImage(WASH_TMP, 0, 0, cw, ch, 0, 0, cw, ch); c.restore();
}

// ── splatter ──
function blob(c, x, y, r, seed, irregular = 0.35, n = 14) {
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, k = 1 + irregular * (vnoise(Math.cos(a) * 1.7 + 5, Math.sin(a) * 1.7 + 5, seed) - 0.5) * 2;
    const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fill();
}
function splat(c, x, y, r, seed = 1, o = {}) {
  const { color = C.white, alpha = 1, drops = 5, spray = 10 } = o;
  const R = rng(seed);
  c.save(); c.globalAlpha *= alpha; c.fillStyle = color;
  blob(c, x, y, r, seed);
  for (let i = 0; i < drops; i++) { const a = R() * TAU, d = r * (1.2 + R() * 1.8); blob(c, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.12 + R() * 0.3), seed + i + 1, 0.3, 9); }
  for (let i = 0; i < spray; i++) { const a = R() * TAU, d = r * (1.5 + R() * 3.5); c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(0.4, r * 0.05 * R()), 0, TAU); c.fill(); }
  c.restore();
}

// ── gold leaf: crinkled irregular flake that catches the light as it turns ──
function goldLeaf(c, x, y, s, rot, spin, seed, o = {}) {
  const R = rng(seed), n = 5 + Math.floor(R() * 3), sq = Math.cos(spin);
  const bright = 0.45 + 0.55 * Math.abs(Math.cos(spin * 1.3 + seed));
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, 0.25 + 0.75 * Math.abs(sq));
  c.globalAlpha *= o.alpha ?? 1;
  const g = c.createLinearGradient(-s, -s, s, s);
  g.addColorStop(0, C.goldDeep); g.addColorStop(0.5, bright > 0.8 ? C.goldHi : C.gold); g.addColorStop(1, C.goldDeep);
  c.fillStyle = g; c.beginPath();
  for (let i = 0; i < n; i++) { const a = i / n * TAU + R() * 0.5, rr = s * (0.55 + R() * 0.5); i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(90,60,20,0.35)'; c.lineWidth = Math.max(0.4, s * 0.05);
  c.beginPath(); c.moveTo(-s * 0.4, -s * 0.1); c.lineTo(s * 0.3, s * 0.2); c.stroke();
  c.restore();
  return bright;
}

// ── silk ribbon along a spine, twisting (front vermilion, back darker) ──
function ribbonDraw(c, spine, o = {}) {
  const { w = 18, front = C.verm, back = C.vermDeep, twist = 0, twistF = 2.2, alpha = 1, taperEnd = 0.6, taperStart = 0.1 } = o;
  const R = resample(spine, 3); if (R.length < 2) return;
  c.save(); c.globalAlpha *= alpha;
  for (let i = 1; i < R.length; i++) {
    const a = R[i - 1], b = R[i];
    const u = b.u, th = twist + u * twistF * TAU, k = Math.cos(th);
    const wt = w * (taperStart ? E.outQuad(clamp(u / taperStart)) : 1) * (1 - taperEnd * u);
    const hwA = wt * Math.abs(Math.cos(twist + a.u * twistF * TAU)) / 2 + 0.4, hwB = wt * Math.abs(k) / 2 + 0.4;
    c.fillStyle = k > 0 ? front : back;
    c.beginPath();
    c.moveTo(a.x + a.nx * hwA, a.y + a.ny * hwA); c.lineTo(b.x + b.nx * hwB, b.y + b.ny * hwB);
    c.lineTo(b.x - b.nx * hwB, b.y - b.ny * hwB); c.lineTo(a.x - a.nx * hwA, a.y - a.ny * hwA); c.closePath(); c.fill();
  }
  c.restore();
}

// ── lightning: a jagged dry-brush bolt with branches ──
function boltPts(x0, y0, x1, y1, seed, rough = 0.22, depth = 6) {
  let pts = [[x0, y0], [x1, y1]]; const R = rng(seed);
  for (let d = 0; d < depth; d++) {
    const np = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], l = Math.hypot(bx - ax, by - ay);
      const mx = (ax + bx) / 2 + (R() - 0.5) * l * rough * 2 * (-(by - ay) / l), my = (ay + by) / 2 + (R() - 0.5) * l * rough * 2 * ((bx - ax) / l);
      np.push([mx, my], [bx, by]);
    }
    pts = np;
  }
  return pts;
}
