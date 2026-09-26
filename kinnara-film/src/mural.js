// ─────────────────────────────────────────────────────────────────────────────
//  Mural kit (Dunhuang).  The cave wall comes from tex.py.  On it: mineral
//  pigment fills with pooled edges, uneven density, grain and losses;
//  iron-wire outlines; soft red shading; gold; the mural vocabulary — scroll
//  clouds, flame tongues, halos, lotus, scattered flowers — and the ways a
//  wall ages on screen: cracks that run, paint that flakes off, pigment that
//  oxidises dark.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; }); }
function toCanvas(img) { const cv = mk(img.width, img.height); cv.getContext('2d').drawImage(img, 0, 0); return cv; }
function mapPixels(cv, fn) {
  const out = mk(cv.width, cv.height), c = out.getContext('2d'); c.drawImage(cv, 0, 0);
  const img = c.getImageData(0, 0, cv.width, cv.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) fn(d, i);
  c.putImageData(img, 0, 0); return out;
}
const tintTex = (cv, [r, g, b]) => mapPixels(cv, (d, i) => { d[i] = r; d[i + 1] = g; d[i + 2] = b; });

async function PREPARE_MURAL() {
  const names = ['wall', 'surface', 'wear', 'grain', 'mottle', 'silk', 'weave'];
  const imgs = await Promise.all(names.map(n => loadImg(`../build/tex/${n}.png`)));
  names.forEach((n, i) => { TEX[n] = toCanvas(imgs[i]); });
  TEX.loss = mapPixels(TEX.wear, (d, i) => { d[i + 3] = 255 - d[i + 3]; });
  TEX.grainLt = tintTex(TEX.grain, [250, 244, 228]);
  TEX.grainDk = tintTex(TEX.grain, [34, 24, 18]);
}

// ───────────── colour ─────────────
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const rgba = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
function shadeHex(h, k, a = 1) { const [r, g, b] = hexRgb(h); return rgba(Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k), a); }
function mixHex(h1, h2, t, a = 1) { const A = hexRgb(h1), B = hexRgb(h2); return rgba(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), a); }
const alphaHex = (h, a) => { const [r, g, b] = hexRgb(h); return rgba(r, g, b, a); };

// ───────────── paths ─────────────
const P2D = new Map(), BBX = new Map();
function P2(d) { if (typeof d !== 'string') return d; let p = P2D.get(d); if (!p) { p = new Path2D(d); P2D.set(d, p); } return p; }
function bboxOf(d) {
  let b = BBX.get(d); if (b) return b;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const sp of pl(d)) for (const [x, y] of sp) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  b = [x0, y0, x1, y1]; BBX.set(d, b); return b;
}
// polyline → SVG path string (closed)
const polyD = (pts, close = true) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + (close ? ' Z' : '');
const circleD = (x, y, r, n = 72) => polyD(Array.from({ length: n }, (_, i) => [x + Math.cos(i / n * TAU) * r, y + Math.sin(i / n * TAU) * r]));

// ───────────── pigment fill ─────────────
let SKETCH = false;                                   // when set, figures paint only their underdrawing
let PT = null;
function tmpCtx(w, h) {
  if (!PT || PT.width < w || PT.height < h) PT = mk(Math.max(64, w, PT ? PT.width : 0), Math.max(64, h, PT ? PT.height : 0));
  const t = PT.getContext('2d');
  t.setTransform(1, 0, 0, 1, 0, 0); t.globalAlpha = 1; t.globalCompositeOperation = 'source-over'; t.filter = 'none';
  t.clearRect(0, 0, w + 2, h + 2);
  return t;
}
function devBox(c, bb, pad) {
  const m = c.getTransform();
  const xs = [], ys = [];
  for (const [x, y] of [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - pad)), y0 = Math.max(0, Math.floor(Math.min(...ys) - pad));
  const x1 = Math.min(c.canvas.width, Math.ceil(Math.max(...xs) + pad)), y1 = Math.min(c.canvas.height, Math.ceil(Math.max(...ys) + pad));
  return [x0, y0, x1 - x0, y1 - y0];
}
function patFill(t, tex, off, sc, op, alpha, w, h) {
  const p = t.createPattern(tex, 'repeat'), m = new DOMMatrix();
  m.translateSelf(off[0], off[1]); m.scaleSelf(sc, sc); p.setTransform(m);
  t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = op; t.globalAlpha = alpha; t.fillStyle = p; t.fillRect(0, 0, w, h); t.restore();
}
// Fill path d with a mineral pigment.  o: edge (pooled darker rim) · edgeW · edgeCol · shade(t, sc) soft shading
// drawn clipped to the shape · mottle (thin patches) · grain · wear (flaked losses) · alpha · op · bbox · seed
function pigment(c, d, color, o = {}) {
  if (SKETCH) return;
  const P = P2(d), bb = o.bbox || bboxOf(d);
  const m = c.getTransform(), sc = Math.hypot(m.a, m.b), ew = o.edgeW ?? 6;
  const [bx, by, bw, bh] = devBox(c, bb, 4 + ew * sc * 2);
  if (bw <= 0 || bh <= 0) return;
  const t = tmpCtx(bw, bh);
  t.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by);
  t.fillStyle = color; t.fill(P);
  const edge = o.edge ?? 0.35;
  if (edge > 0) { t.save(); t.clip(P); t.filter = `blur(${Math.max(0.5, ew * sc * 0.6)}px)`; t.strokeStyle = o.edgeCol || shadeHex(color, 0.7); t.globalAlpha = edge; t.lineWidth = ew * 2; t.stroke(P); t.restore(); }
  if (o.shade) { t.save(); t.clip(P); o.shade(t, sc); t.restore(); }
  const seed = o.seed || 1, off = [(seed * 137) % 512 - bx, (seed * 311) % 512 - by];
  const mot = o.mottle ?? 0.22; if (mot > 0) patFill(t, TEX.mottle, off, o.mScale || 1.6, 'destination-out', mot, bw, bh);
  const gr = o.grain ?? 0.16;
  if (gr > 0) { patFill(t, TEX.grainLt, off, o.gScale || 1, 'source-atop', gr, bw, bh); patFill(t, TEX.grainDk, [off[0] + 97, off[1] + 41], o.gScale || 1, 'source-atop', gr * 0.7, bw, bh); }
  const wear = o.wear ?? 0;
  if (wear > 0) patFill(t, TEX.loss, [(seed * 71) % 1024 - bx, (seed * 53) % 1024 - by], o.wScale || 1, 'destination-out', wear, bw, bh);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); if (o.op) c.globalCompositeOperation = o.op; c.globalAlpha *= o.alpha ?? 1;
  c.drawImage(PT, 0, 0, bw, bh, bx, by, bw, bh); c.restore();
}
// soft shading, used inside pigment(…, { shade(t, sc) { … } }) where t is clipped to the shape
function sEdge(t, sc, d, color, w, a = 0.5, blur = w * 0.9) { t.save(); t.filter = `blur(${Math.max(0.5, blur * sc)}px)`; t.strokeStyle = color; t.globalAlpha = a; t.lineWidth = w * 2; t.lineJoin = 'round'; t.stroke(P2(d)); t.restore(); }
function sLine(t, sc, d, color, w, a = 0.5, blur = w * 0.7) { t.save(); t.filter = `blur(${Math.max(0.5, blur * sc)}px)`; t.strokeStyle = color; t.globalAlpha = a; t.lineWidth = w; t.lineCap = 'round'; t.lineJoin = 'round'; t.stroke(P2(d)); t.restore(); }
function sSpot(t, x, y, r, color, a = 1) { const g = t.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, alphaHex(color, a)); g.addColorStop(1, alphaHex(color, 0)); t.fillStyle = g; t.fillRect(x - r, y - r, r * 2, r * 2); }

// ───────────── lines ─────────────
// iron-wire line (铁线描): even width, a faint tremor, rare breaks where the wall has worn
function mline(c, d, o = {}) {
  const { w = 2.2, color = C.line, alpha = 0.92, seed = 1, taper = [0.06, 0.16], breaks = 0.05, reveal = 1, press = 0.16 } = o;
  const col = SKETCH ? C.lineRed : color, al = SKETCH ? alpha * 0.75 : alpha;
  pl(d).forEach((sp, i) => brush(c, sp, { w, color: col, alpha: al, taper, dry: SKETCH ? 0.25 : breaks, bristles: 2, press, seed: seed + i * 7, reveal, rough: 0.05, body: 0.92 }));
}
function mlines(c, list, o = {}) { list.forEach((d, i) => mline(c, d, { ...o, seed: (o.seed || 1) + i * 31 })); }

// ───────────── gold ─────────────
function goldFill(c, d, o = {}) {
  pigment(c, d, C.gold, { edge: 0.6, edgeCol: C.goldDeep, edgeW: o.edgeW || 3, grain: 0.1, mottle: 0.08, seed: o.seed || 3,
    shade: (t, sc) => { const b = o.bbox || bboxOf(d); const g = t.createLinearGradient(b[0], b[1], b[2], b[3]); g.addColorStop(0, alphaHex(C.goldHi, 0.55)); g.addColorStop(0.5, alphaHex(C.goldHi, 0)); g.addColorStop(1, alphaHex(C.goldDeep, 0.35)); t.fillStyle = g; t.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); } });
}
function goldDot(c, x, y, r) {
  if (SKETCH) return;
  c.save(); c.fillStyle = C.goldDeep; c.beginPath(); c.arc(x + r * 0.15, y + r * 0.2, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r); g.addColorStop(0, C.goldHi); g.addColorStop(0.6, C.gold); g.addColorStop(1, C.goldDeep);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
}

// ───────────── scroll clouds (朵云) ─────────────
// A head of curling lobes with a streaming tail, in coloured bands with a dark outline.  Painted once as a sprite.
function cloudSprite(s, o = {}) {
  const { bands = [C.mala, C.malaLt, C.white], line = C.line, seed = 1, tail = 2.3, lobesN = 5, lw = Math.max(2, s * 0.045), wave = 0.25 } = o;
  const R = rng(seed), pad = s * 0.3;
  const w = s * (2 + tail * 1.2) + pad * 2, h = s * 1.9 + pad * 2;
  const cv = mk(Math.ceil(w), Math.ceil(h)), c = cv.getContext('2d');
  const hx = w - s * 1.1 - pad, hy = s * 1.05 + pad;             // head centre (tail streams to the left)
  const lobes = [];
  for (let i = 0; i < lobesN; i++) {
    const a = Math.PI * (1.0 + 1.0 * i / (lobesN - 1)), mid = 1 - Math.abs(i / (lobesN - 1) - 0.5) * 2;
    lobes.push([hx + Math.cos(a) * s * 0.66, hy + Math.sin(a) * s * 0.46 + s * 0.12, s * (0.28 + 0.14 * mid + 0.08 * R())]);
  }
  lobes.push([hx, hy + s * 0.1, s * 0.5]);
  // tail spine
  const sp = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, x = hx - s * 0.4 - u * s * tail * 1.25, y = hy + s * 0.32 - u * s * 0.15 + Math.sin(u * Math.PI * 1.6 + seed) * s * wave * u;
    sp.push([x, y, s * 0.42 * Math.pow(1 - u, 0.9)]);
  }
  const tailD = k => { const L = sp.map(([x, y, r]) => [x, y - r * k]), Rr = sp.map(([x, y, r]) => [x, y + r * k * 0.8]).reverse(); return polyD(L.concat(Rr)); };
  const layer = (k, grow, col) => {
    c.fillStyle = col; c.beginPath();
    lobes.forEach(([x, y, r]) => { c.moveTo(x + r * k + grow, y); c.arc(x, y + (1 - k) * r * 0.35, r * k + grow, 0, TAU); });
    c.fill(); c.fill(new Path2D(tailD(k + grow / (s * 0.42))));
  };
  layer(1, lw, line);
  bands.forEach((col, i) => layer(1 - i * 0.3, 0, col));
  // curls
  c.strokeStyle = line; c.lineWidth = lw * 0.8; c.lineCap = 'round';
  lobes.slice(0, lobesN).forEach(([x, y, r], i) => {
    c.beginPath();
    for (let k = 0; k <= 40; k++) { const u = k / 40, a = (i % 2 ? -1 : 1) * (u * TAU * 1.15) + (i * 0.9 + 3.6), rr = r * (0.82 - 0.62 * u); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.9; k ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.stroke();
  });
  c.beginPath(); sp.slice(4, 34).forEach(([x, y, r], i) => i ? c.lineTo(x, y + r * 0.05) : c.moveTo(x, y + r * 0.05)); c.lineWidth = lw * 0.6; c.stroke();
  // wall texture into the sprite: thin patches and grain
  c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.25; c.fillStyle = c.createPattern(TEX.mottle, 'repeat'); c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.14; c.fillStyle = c.createPattern(TEX.grainLt, 'repeat'); c.fillRect(0, 0, w, h);
  return { cv, ax: hx / w, ay: hy / h, w, h };
}
function drawSprite(c, sp, x, y, sc = 1, o = {}) {
  if (SKETCH) return;
  c.save(); c.translate(x, y); if (o.rot) c.rotate(o.rot); c.scale(sc * (o.flip ? -1 : 1), sc); c.globalAlpha *= o.alpha ?? 1;
  c.drawImage(sp.cv, -sp.ax * sp.w, -sp.ay * sp.h, sp.w, sp.h); c.restore();
}

// ───────────── flames (火焰纹) ─────────────
// One flame tongue, base at (x, y), pointing up (rotate the context for other directions).
// t: time for the flicker; bands outer→inner.
function flameTongue(c, x, y, w, h, t, seed, o = {}) {
  const { bands = [C.red, C.redHi, C.yellow], line = C.line, lw = Math.max(1, w * 0.05), sway = 0.35 } = o;
  const ph = seed * 1.7, sw = (Math.sin(t * 5.1 + ph) * 0.6 + Math.sin(t * 8.3 + ph * 2) * 0.4) * sway * w;
  const hh = h * (0.86 + 0.14 * Math.sin(t * 6.7 + ph * 3));
  const tongue = (k, grow = 0) => {
    const ww = w * k + grow, hk = hh * (0.35 + 0.65 * k) + grow, tx = x + sw * (0.5 + 0.5 * k);
    c.beginPath();
    c.moveTo(x - ww / 2, y);
    c.bezierCurveTo(x - ww * 0.62, y - hk * 0.42, tx - ww * 0.05 + sw * 0.4, y - hk * 0.55, tx + sw * 0.25, y - hk);
    c.bezierCurveTo(tx + ww * 0.22, y - hk * 0.62, x + ww * 0.62, y - hk * 0.35, x + ww / 2, y);
    c.closePath();
  };
  c.fillStyle = line; tongue(1, lw * 2); c.fill();
  bands.forEach((col, i) => { c.fillStyle = col; tongue(1 - i * 0.3); c.fill(); });
}
// a row of flame tongues along a polyline (normal side), e.g. the rim of a mandorla or a pyre
function flameRow(c, e, pts, t, o = {}) {
  const { w = 40, h = 90, n = 12, seed = 1, glow = 0.6, jitter = 0.35 } = o;
  const R = resample(pts, 2);
  if (R.length < 2) return;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, p = R[Math.min(R.length - 1, Math.floor(u * (R.length - 1)))];
    const k = 0.75 + jitter * rnd01(i, seed), ang = Math.atan2(p.ny, p.nx) + Math.PI / 2;
    c.save(); c.translate(p.x, p.y); c.rotate(ang); flameTongue(c, 0, 0, w * k, h * k, t, seed + i * 3.1, o); c.restore();
    if (e && glow > 0) { e.save(); e.globalAlpha = glow; const g = e.createRadialGradient(p.x, p.y, 0, p.x, p.y, h * k); g.addColorStop(0, 'rgba(255,170,80,0.9)'); g.addColorStop(1, 'rgba(255,120,40,0)'); e.fillStyle = g; e.fillRect(p.x - h * k, p.y - h * k, h * k * 2, h * k * 2); e.restore(); }
  }
}
const rnd01 = (i, k) => hash2(i * 1.618 + k * 7.13, k * 2.414 + 0.31);

// ───────────── halos and wheels ─────────────
// rings: [[r0, r1, colour], …] from the centre out; a thin dark line on every boundary
function haloRings(c, cx, cy, rings, o = {}) {
  const { line = C.line, lw = 2, alpha = 1 } = o;
  c.save(); c.globalAlpha *= alpha;
  for (const [r0, r1, col] of rings) { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r1, 0, TAU); if (r0 > 0) c.arc(cx, cy, r0, 0, TAU, true); c.fill('evenodd'); }
  c.strokeStyle = line; c.lineWidth = lw;
  for (const [r0, r1] of rings) { c.beginPath(); c.arc(cx, cy, r1, 0, TAU); c.stroke(); }
  c.restore();
}
// repeating motif around a ring (petals, dots, small flames), rotated by rot
function ringMotif(c, cx, cy, r, n, rot, fn) { for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; c.save(); c.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.rotate(a + Math.PI / 2); fn(c, i); c.restore(); } }
function petalShape(c, w, h) { c.beginPath(); c.moveTo(0, h / 2); c.bezierCurveTo(-w * 0.7, h * 0.2, -w * 0.5, -h * 0.35, 0, -h / 2); c.bezierCurveTo(w * 0.5, -h * 0.35, w * 0.7, h * 0.2, 0, h / 2); c.closePath(); }

// ───────────── flowers (散花) ─────────────
function flowerSprite(r, o = {}) {
  const { petals = 5 + (o.seed || 0) % 2, col = C.red, inner = C.white, line = C.line, seed = 1 } = o;
  const s = Math.ceil(r * 2.6), cv = mk(s, s), c = cv.getContext('2d'); c.translate(s / 2, s / 2);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < petals; i++) {
    c.save(); c.rotate(i / petals * TAU + seed); c.translate(0, -r * 0.55);
    petalShape(c, r * 0.7 + (pass ? 0 : 3), r * 1.0 + (pass ? 0 : 3)); c.fillStyle = pass ? col : line; c.fill(); c.restore();
  }
  c.fillStyle = inner; c.beginPath(); c.arc(0, 0, r * 0.28, 0, TAU); c.fill();
  c.fillStyle = C.yellow; c.beginPath(); c.arc(0, 0, r * 0.14, 0, TAU); c.fill();
  return { cv, ax: 0.5, ay: 0.5, w: s, h: s };
}

// ───────────── the wall, the camera, the light ─────────────
// camera in wall units: centre (x, y), zoom z (wall px → screen px), optional roll r
function camApply(K) { L.translate(W / 2, H / 2); L.scale(K.z); if (K.r) L.rotate(K.r); L.translate(-K.x, -K.y); }
function camRect(K, m = 60) { const f = K.r ? 1.25 : 1.02, hw = W / 2 / K.z * f + m, hh = H / 2 / K.z * f + m; return [K.x - hw, K.y - hh, K.x + hw, K.y + hh]; }
function tile(c, tex, [x0, y0, x1, y1], s = 1, a = 1, op = null, ox = 0, oy = 0) {
  const tw = tex.width * s, th = tex.height * s;
  c.save(); if (op) c.globalCompositeOperation = op; c.globalAlpha *= a;
  for (let i = Math.floor((x0 - ox) / tw); i * tw + ox < x1; i++) for (let j = Math.floor((y0 - oy) / th); j * th + oy < y1; j++) c.drawImage(tex, i * tw + ox, j * th + oy, tw + 0.5, th + 0.5);
  c.restore();
}
function wallBg(K) { L.bg(C.night); tile(L.c, TEX.wall, camRect(K)); }
function silkBg(K) { L.bg('#E3D0AA'); tile(L.c, TEX.silk, camRect(K)); }
function weavePass(K, a = 1) { tile(L.c, TEX.weave, camRect(K), 1, a, 'multiply'); }
function surfacePass(K, a = 1) { tile(L.c, TEX.surface, camRect(K), 1, a, 'multiply'); }
// lamp light: multiply the frame by a warm pool fading into the dark of the cave (screen space)
function lampPass(c, o = {}) {
  const { x = W / 2, y = H / 2, r = Math.hypot(W, H) * 0.62, dark = 0.8, core = [255, 244, 222], inner = 0.35, flick = 0 } = o;
  c.save(); c.setTransform(c.__s, 0, 0, c.__s, 0, 0);
  const k = 1 + flick;
  const g = c.createRadialGradient(x, y, r * 0.02, x, y, r * k);
  const edge = [Math.round(255 * (1 - dark) * 0.9), Math.round(255 * (1 - dark) * 0.72), Math.round(255 * (1 - dark) * 0.6)];
  g.addColorStop(0, rgba(...core)); g.addColorStop(inner, rgba(core[0], core[1] * 0.97, core[2] * 0.92));
  g.addColorStop(1, rgba(...edge));
  c.globalCompositeOperation = 'multiply'; c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.restore();
}
function darkPass(c, a) { if (a <= 0) return; c.save(); c.setTransform(c.__s, 0, 0, c.__s, 0, 0); c.globalAlpha = a; c.fillStyle = C.night; c.fillRect(0, 0, W, H); c.restore(); }

// ───────────── cracks that run ─────────────
// A branching crack as polylines with a start time; each grows at `speed` wall px/s.
function crackGen(seed, x, y, ang, len, o = {}) {
  const { depth = 2, t0 = 0, speed = 900, w = 3, step = 5, wob = 0.22, kink = 0.18 } = o;
  const R = rng(seed), out = [];
  (function grow(x, y, ang, len, t0, w, d) {
    const pts = [[x, y]];
    for (let s = 0; s < len; s += step) {
      ang += (R() - 0.5) * wob * 2 + (R() < kink ? (R() - 0.5) * 1.4 : 0);
      x += Math.cos(ang) * step; y += Math.sin(ang) * step; pts.push([x, y]);
    }
    const P = new Poly(pts); out.push({ P, t0, t1: t0 + P.L / speed, w });
    if (d > 0) {
      const nb = 1 + Math.floor(R() * 3);
      for (let b = 0; b < nb; b++) {
        const f = 0.2 + R() * 0.7, [bx, by] = P.at(f * P.L);
        grow(bx, by, ang + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.8), len * (0.25 + R() * 0.4), t0 + f * P.L / speed, Math.max(1, w * 0.6), d - 1);
      }
    }
  })(x, y, ang, len, t0, w, depth);
  return out;
}
function crackDraw(c, cracks, t, o = {}) {
  const { a = 1, col = 'rgba(46,30,20,0.78)', lip = 'rgba(255,244,222,0.5)', open = 1 } = o;
  for (const k of cracks) {
    const p = inv(k.t0, k.t1, t); if (p <= 0) continue;
    const w = k.w * (0.6 + 0.4 * open);
    c.save(); c.globalAlpha *= a; c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = lip; c.lineWidth = w * 0.8; c.beginPath(); c.translate(1.2, 1.2); k.P.trace(c, 0, p); c.stroke(); c.translate(-1.2, -1.2);
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); k.P.trace(c, 0, p); c.stroke();
    c.restore();
  }
}

// ───────────── flaking paint ─────────────
// irregular pieces tiling a box; each falls away at its own time
function flakeGen(seed, [x0, y0, x1, y1], cell, o = {}) {
  const R = rng(seed), nx = Math.ceil((x1 - x0) / cell), ny = Math.ceil((y1 - y0) / cell), J = [];
  for (let j = 0; j <= ny; j++) { J.push([]); for (let i = 0; i <= nx; i++) { const edge = i === 0 || j === 0 || i === nx || j === ny; J[j].push([x0 + i * cell + (edge ? 0 : (R() - 0.5) * cell * 0.7), y0 + j * cell + (edge ? 0 : (R() - 0.5) * cell * 0.7)]); } }
  const jag = (a, b) => { const out = [a]; for (let k = 1; k < 4; k++) { const f = k / 4; out.push([lerp(a[0], b[0], f) + (R() - 0.5) * cell * 0.16, lerp(a[1], b[1], f) + (R() - 0.5) * cell * 0.16]); } return out; };
  const E = new Map(), edgeKey = (i0, j0, i1, j1) => `${i0},${j0}-${i1},${j1}`;
  const edgePts = (i0, j0, i1, j1) => {
    const k = edgeKey(i0, j0, i1, j1), kr = edgeKey(i1, j1, i0, j0);
    if (E.has(kr)) return E.get(kr).slice().reverse();
    if (!E.has(k)) E.set(k, jag(J[j0][i0], J[j1][i1]));
    return E.get(k);
  };
  const pieces = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const poly = [].concat(edgePts(i, j, i + 1, j), edgePts(i + 1, j, i + 1, j + 1), edgePts(i + 1, j + 1, i, j + 1), edgePts(i, j + 1, i, j));
    let cx = 0, cy = 0; poly.forEach(([x, y]) => { cx += x; cy += y; }); cx /= poly.length; cy /= poly.length;
    pieces.push({ poly, cx, cy, r: R(), r2: R(), r3: R() });
  }
  return pieces;
}
// Draw the flaking: `drawSrc(c)` paints the intact image in wall space; pieces whose start time has passed
// leave a hole of bare plaster and fall (gravity, spin, fade).  start(p) → start time of piece p.
function flakeDraw(c, pieces, t, start, drawSrc, o = {}) {
  const { g = 900, holeCol = 'rgba(214,196,160,1)', dur = 1.4 } = o;
  drawSrc(c);
  const fallen = pieces.filter(p => t >= start(p));
  if (!fallen.length) return;
  c.save();                                           // holes
  c.beginPath(); fallen.forEach(p => { p.poly.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); });
  c.fillStyle = holeCol; c.fill();
  c.clip(); tile(c, TEX.wall, bboxPts(fallen.flatMap(p => p.poly)), 1, 0.55, 'multiply', 137, 91);
  c.restore();
  for (const p of fallen) {                           // falling pieces
    const u = t - start(p); if (u > dur) continue;
    const dx = (p.r - 0.5) * 120 * u, dy = 0.5 * g * u * u + (p.r2 - 0.3) * 60 * u, rot = (p.r3 - 0.5) * 5 * u;
    c.save(); c.globalAlpha *= 1 - E.inQuad(u / dur);
    c.translate(p.cx + dx, p.cy + dy); c.rotate(rot); c.scale(1 - 0.3 * u / dur, 1 - 0.3 * u / dur); c.translate(-p.cx, -p.cy);
    c.beginPath(); p.poly.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.clip();
    drawSrc(c); c.restore();
  }
}
function bboxPts(pts) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
// dust falling from a crack or a flake
function dust(c, e, x, y, t, n, seed, o = {}) {
  const { spread = 60, g = 300, life = 1.6, col = 'rgba(226,210,178,A)' } = o;
  for (let i = 0; i < n; i++) {
    const t0 = rnd01(i, seed) * 0.6, u = t - t0; if (u < 0 || u > life) continue;
    const px = x + (rnd01(i, seed + 1) - 0.5) * spread + (rnd01(i, seed + 2) - 0.5) * 40 * u, py = y + 0.5 * g * u * u * (0.4 + rnd01(i, seed + 3));
    c.fillStyle = col.replace('A', (0.7 * (1 - u / life)).toFixed(3)); c.beginPath(); c.arc(px, py, 0.8 + 2.2 * rnd01(i, seed + 4), 0, TAU); c.fill();
  }
}

// ───────────── pigment that turns dark (变色) ─────────────
// Lead-based flesh and red tones oxidise to a grey-black; chalk whites stay white.  Returns a new canvas.
function oxidised(cv, k = 1) {
  return mapPixels(cv, (d, i) => {
    if (!d[i + 3]) return;
    const r = d[i], g = d[i + 1], b = d[i + 2], warm = clamp((r - b - 12) / 70), lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
    const white = clamp((lum - 0.8) / 0.12) * (1 - clamp((r - b) / 60));
    const m = warm * k * (1 - white) * 0.92;
    const dk = [28 + 26 * lum, 25 + 23 * lum, 26 + 24 * lum];
    const mm = Math.min(1, m * 1.06);
    d[i] = lerp(r, dk[0], mm); d[i + 1] = lerp(g, dk[1], mm); d[i + 2] = lerp(b, dk[2], mm);
    const cool = (1 - warm) * (1 - white) * k * 0.35;                  // blues and greens dim a little
    d[i] = lerp(d[i], d[i] * 0.55, cool); d[i + 1] = lerp(d[i + 1], d[i + 1] * 0.55, cool); d[i + 2] = lerp(d[i + 2], d[i + 2] * 0.6, cool);
  });
}

// A painted figure losing its paint.  img: the painting; sketch: its underdrawing; both drawn at (x, y) scale sc in wall
// space.  Pieces (figure-local coords) fall from start(p); `fade` desaturates what remains.
let FLK = null;
function flakeFigure(c, e, img, sketch, x, y, sc, pieces, t, start, o = {}) {
  const { dur = 1.6, g = 700, fade = 0, sketchA = 0.9 } = o;
  const fallen = pieces.filter(p => t >= start(p));
  c.save(); c.translate(x, y); c.scale(sc, sc);
  if (sketch && fallen.length) { c.save(); c.globalAlpha *= sketchA; c.drawImage(sketch, 0, 0); c.restore(); }
  let src = img;
  if (fallen.length) {
    if (!FLK || FLK.width !== img.width || FLK.height !== img.height) FLK = mk(img.width, img.height);
    const f = FLK.getContext('2d'); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, img.width, img.height); f.drawImage(img, 0, 0);
    f.globalCompositeOperation = 'destination-out'; f.beginPath();
    fallen.forEach(p => { p.poly.forEach(([px, py], i) => i ? f.lineTo(px, py) : f.moveTo(px, py)); f.closePath(); }); f.fill();
    f.globalCompositeOperation = 'source-over'; src = FLK;
  }
  c.save(); if (fade > 0) c.filter = `saturate(${1 - fade * 0.85}) brightness(${1 + fade * 0.08})`; c.drawImage(src, 0, 0); c.restore();
  for (const p of fallen) {
    const u = t - start(p); if (u > dur) continue;
    const dx = (p.r - 0.5) * 90 * u, dy = 0.5 * g * u * u + (p.r2 - 0.2) * 40 * u, rot = (p.r3 - 0.5) * 4 * u;
    c.save(); c.globalAlpha *= 1 - E.inQuad(u / dur);
    c.translate(p.cx + dx, p.cy + dy); c.rotate(rot); c.translate(-p.cx, -p.cy);
    c.beginPath(); p.poly.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); c.clip();
    if (fade > 0) c.filter = `saturate(${1 - fade * 0.85})`;
    c.drawImage(img, 0, 0); c.restore();
  }
  c.restore();
}

// ───────────── halos, rays, bursts ─────────────
// a head halo painted once: rings in mineral colours, a band of petals, a rim of flame tongues
function haloSprite(r, o = {}) {
  const { rings = [[0, 0.52, C.mala], [0.52, 0.66, C.white], [0.66, 0.8, C.red], [0.8, 0.92, C.azure]], flames = true, seed = 1 } = o;
  const S = Math.ceil(r * 2.5), cv = mk(S, S), c = cv.getContext('2d'), cx = S / 2, cy = S / 2;
  if (flames) flameRow(c, null, arcPts(cx, cy, r * 0.93, 0, TAU, 120), 0, { n: 26, w: r * 0.16, h: r * 0.3, seed, sway: 0, bands: [C.red, C.redHi, C.yellow] });
  haloRings(c, cx, cy, rings.map(([a, b, col]) => [a * r, b * r, col]), { lw: Math.max(1.5, r * 0.012) });
  ringMotif(c, cx, cy, r * 0.59, 22, 0, cc => { petalShape(cc, r * 0.05, r * 0.1); cc.fillStyle = C.redHi; cc.fill(); cc.strokeStyle = C.line; cc.lineWidth = 1.2; cc.stroke(); });
  c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.28; c.fillStyle = c.createPattern(TEX.mottle, 'repeat'); c.fillRect(0, 0, S, S);
  c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.16; c.fillStyle = c.createPattern(TEX.grainLt, 'repeat'); c.fillRect(0, 0, S, S);
  return { cv, ax: 0.5, ay: 0.5, w: S, h: S };
}
// soft rays of light from (x, y) between angles a0..a1 (base layer screen + emissive)
function rays(c, e, x, y, a0, a1, n, len, a, t, col = [255, 222, 150]) {
  if (a <= 0) return;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, ang = lerp(a0, a1, u) + Math.sin(t * 0.7 + i * 2.3) * 0.02, w = (0.018 + 0.03 * rnd01(i, 3)) * (1 + 0.3 * Math.sin(t * 1.3 + i));
    const k = a * (0.35 + 0.65 * rnd01(i, 7)) * (0.75 + 0.25 * Math.sin(t * 2 + i * 1.7));
    for (const [ctx, m] of [[c, 0.28], [e, 0.5]]) {
      if (!ctx) continue;
      ctx.save(); ctx.globalCompositeOperation = ctx === c ? 'screen' : 'lighter'; ctx.globalAlpha = Math.min(1, k * m);
      const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.addColorStop(0, rgba(...col, 1)); g.addColorStop(1, rgba(...col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang - w) * len, y + Math.sin(ang - w) * len); ctx.lineTo(x + Math.cos(ang + w) * len, y + Math.sin(ang + w) * len); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
}
// motes of dust turning in a beam
function motes(c, e, s, n, seed, box, o = {}) {
  const [x0, y0, x1, y1] = box;
  for (let i = 0; i < n; i++) {
    const ph = (s * (o.speed ?? 0.05) * (0.5 + rnd01(i, seed)) + rnd01(i, seed + 1)) % 1;
    const x = lerp(x0, x1, rnd01(i, seed + 2)) + Math.sin(s * 0.8 + i) * 30, y = lerp(y1, y0, ph) + Math.sin(s * 1.1 + i * 2) * 20;
    const a = Math.sin(ph * Math.PI) * (o.a ?? 1), r = (1 + 2.5 * rnd01(i, seed + 3)) * (o.r || 1);
    c.fillStyle = `rgba(255,236,196,${(0.5 * a).toFixed(3)})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (e) { e.fillStyle = `rgba(255,220,160,${(0.6 * a).toFixed(3)})`; e.beginPath(); e.arc(x, y, r * 1.6, 0, TAU); e.fill(); }
  }
}
// a sprite breaking into pieces that fly out from its centre (pieces from flakeGen over [0,0,w,h])
function burstSprite(c, e, sp, x, y, sc, pieces, t0, t, o = {}) {
  const { v = 700, g = 500, dur = 1.4, spin = 6 } = o, u = t - t0;
  if (u < 0) { drawSprite(c, sp, x, y, sc); return; }
  const cx = sp.w / 2, cy = sp.h / 2;
  c.save(); c.translate(x, y); c.scale(sc, sc); c.translate(-sp.ax * sp.w, -sp.ay * sp.h);
  for (const p of pieces) {
    if (u > dur) break;
    const dx = p.cx - cx, dy = p.cy - cy, L = Math.hypot(dx, dy) || 1, sp2 = v * (0.6 + 0.8 * p.r);
    const px = dx / L * sp2 * u, py = dy / L * sp2 * u + 0.5 * g * u * u, rot = (p.r3 - 0.5) * spin * u;
    c.save(); c.globalAlpha *= 1 - E.inQuad(clamp(u / dur));
    c.translate(p.cx + px, p.cy + py); c.rotate(rot); c.translate(-p.cx, -p.cy);
    c.beginPath(); p.poly.forEach(([qx, qy], i) => i ? c.lineTo(qx, qy) : c.moveTo(qx, qy)); c.closePath(); c.clip();
    c.drawImage(sp.cv, 0, 0); c.restore();
  }
  c.restore();
}
// pigment darkening that spreads outwards from cracks: a soft mask in figure space (size² at half resolution)
let OXM = null;
function spreadMask(cracks, t, rate, size = 1400, step = 16) {
  const h = size / 2; if (!OXM || OXM.width !== h) OXM = mk(h, h);
  const m = OXM.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, h, h); m.filter = 'blur(10px)';
  m.setTransform(0.5, 0, 0, 0.5, 0, 0); m.fillStyle = '#000'; m.beginPath();
  for (const k of cracks) {
    const n = Math.max(1, Math.floor(k.P.L / step));
    for (let i = 0; i <= n; i++) {
      const sA = i / n, ta = k.t0 + sA * (k.t1 - k.t0), r = (t - ta) * rate; if (r <= 0) continue;
      const [x, y] = k.P.at(sA * k.P.L); m.moveTo(x + r, y); m.arc(x, y, r, 0, TAU);
    }
  }
  m.fill(); m.filter = 'none';
  return OXM;
}

// Every painted figure sits on an opaque lime ground, so thin pigment shows plaster, never what is behind the figure.
function groundUnder(cv, col = '#DCC9A4') {
  const [r, g, b] = hexRgb(col);
  const gcv = mapPixels(cv, (d, i) => { const a = d[i + 3]; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.max(0, Math.min(255, (a - 24) * 1.6)); });   // soft at the edges: no pale rim on dark grounds
  const c = cv.getContext('2d'); c.save(); c.globalCompositeOperation = 'destination-over'; c.drawImage(gcv, 0, 0); c.restore();
  return cv;
}
