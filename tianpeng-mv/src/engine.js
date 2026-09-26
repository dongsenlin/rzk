// ─────────────────────────────────────────────────────────────────────────────
//  Reel engine: deterministic time → frame renderer.
//  Scenes draw with Canvas 2D into two layers (base + emissive).  Every output
//  frame averages several sub-frame renders inside a 180° shutter in linear
//  light (real motion blur), then a CPU post pass adds bloom from the emissive
//  layer, chromatic aberration, vignette, film grain and dithering.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);   // 16:9 or 9:16, chosen by render.js
const VERT = H > W;
const SCALE = parseFloat(Q.get('scale') || '1');
const PRE = 6.0, SONG = 27.7, END = 2.5;   // story opening (whole frames) · the song · the end card
const MAIN = SONG + END;
const FPS = 30, DUR = PRE + MAIN, NFRAMES = Math.round(FPS * DUR);
const BPM = 136, BEAT = 60 / BPM, BAR = BEAT * 4;
const SHUTTER = 0.5;                       // 180°

// ───────────── math ─────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const mix = lerp;
const TAU = Math.PI * 2;
const bt = n => n * BEAT;                  // beat → seconds
// Hard cuts land between two shutter windows so no frame straddles a cut.
const cut = beat => (Math.round(bt(beat) * FPS - 0.5) + 0.5) / FPS;

function cubicBezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1;
    for (let i = 0; i < 30 && Math.abs(sx(t) - x) > 1e-6; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}
const E = {
  lin: t => t,
  inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  inCubic: t => t ** 3, outCubic: t => 1 - (1 - t) ** 3,
  inOutCubic: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
  inQuart: t => t ** 4, outQuart: t => 1 - (1 - t) ** 4,
  inOutQuart: t => t < .5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2,
  inQuint: t => t ** 5, outQuint: t => 1 - (1 - t) ** 5,
  inOutQuint: t => t < .5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2,
  inExpo: t => t <= 0 ? 0 : 2 ** (10 * t - 10), outExpo: t => t >= 1 ? 1 : 1 - 2 ** (-10 * t),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inBack: (t, s = 1.70158) => (s + 1) * t ** 3 - s * t * t,
  outCirc: t => Math.sqrt(1 - (t - 1) ** 2), inCirc: t => 1 - Math.sqrt(1 - t * t),
  tesla: cubicBezier(0.5, 0, 0, 0.75),          // tesla.cn UI transition curve
  swift: cubicBezier(0.8, 0, 0.1, 1),            // hard-in, soft-out: kinetic type
  glide: cubicBezier(0.16, 1, 0.3, 1),
};
// Damped spring 0→1 (overshoots).  f: Hz, z: damping ratio.
function spring(t, f = 3, z = 0.45) {
  if (t <= 0) return 0;
  const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
const ease = (t0, t1, t, fn = E.outCubic) => fn(inv(t0, t1, t));
// trapezoid envelope: 0 → 1 over [a,b], hold, 1 → 0 over [c,d]
const env = (t, a, b, c, d, fi = E.outCubic, fo = E.inCubic) =>
  t < b ? fi(inv(a, b, t)) : t < c ? 1 : 1 - fo(inv(c, d, t));

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function hash2(a, b) { return hash(a * 57.31 + b * 113.17 + 7.1); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
function fbm(x, o = 3) { let v = 0, a = 0.5, s = 1; for (let i = 0; i < o; i++) { v += a * noise1(x * s + i * 17.3); s *= 2; a *= 0.5; } return v; }

// ───────────── palette: ink, xuan paper, vermilion, gold leaf ─────────────
const C = {
  ink: '#141212', ink2: '#26231F', charcoal: '#3B3834', grey: '#8D8880', mist: '#C8C2B6',
  paper: '#E6DDC9', paperLight: '#EFE8D8', paperDark: '#CFC4AC',
  night: '#16161A', nightHi: '#2E2E33', indigo: '#1B2230',
  verm: '#B3302A', vermHi: '#D8463A', vermDeep: '#6E1B17',
  gold: '#C8A259', goldHi: '#F3D892', goldDeep: '#7F5F27',
  teal: '#2E6C66', moon: '#ECEBE3', white: '#F4F1E8',
  skin: '#E8D2BA', skinShade: '#C49E80', blush: '#D9765A', line: '#2E2622',
};
const FONT = { brush: '"Ma Shan Zheng", "Noto Serif SC"', xing: '"Zhi Mang Xing", "Ma Shan Zheng"', cao: '"Liu Jian Mao Cao", "Zhi Mang Xing"',
  long: '"Long Cang", "Zhi Mang Xing"', serif: '"Noto Serif SC"', latin: '"Noto Serif SC"' };

// ───────────── layers ─────────────
// base: full resolution.  emissive: half resolution, only feeds the bloom.
const RW = Math.round(W * SCALE), RH = Math.round(H * SCALE);
const EW = Math.ceil(RW / 2), EH = Math.ceil(RH / 2);
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const baseCv = mk(RW, RH), emisCv = mk(EW, EH);
const bctx = baseCv.getContext('2d', { alpha: false, willReadFrequently: true });
const ectx = emisCv.getContext('2d', { alpha: false, willReadFrequently: true });
bctx.__s = SCALE; ectx.__s = SCALE / 2;

// L: draw into both layers at once (transforms, clips) — c = base, e = emissive
const L = {
  c: bctx, e: ectx,
  save() { bctx.save(); ectx.save(); }, restore() { bctx.restore(); ectx.restore(); },
  translate(x, y) { bctx.translate(x, y); ectx.translate(x, y); },
  scale(x, y = x) { bctx.scale(x, y); ectx.scale(x, y); },
  rotate(a) { bctx.rotate(a); ectx.rotate(a); },
  alpha(a) { bctx.globalAlpha *= a; ectx.globalAlpha *= a; },
  clipRect(x, y, w, h) { for (const c of [bctx, ectx]) { c.beginPath(); c.rect(x, y, w, h); c.clip(); } },
  clipPath(fn) { for (const c of [bctx, ectx]) { c.beginPath(); fn(c); c.clip(); } },
  // fill the base background and black out emission inside the current clip
  bg(color) {
    for (const [c, col] of [[bctx, color], [ectx, '#000']]) {
      c.save(); c.setTransform(c.__s, 0, 0, c.__s, 0, 0); c.globalAlpha = 1; c.fillStyle = col; c.fillRect(-10, -10, W + 20, H + 20); c.restore();
    }
  },
  reset() { for (const c of [bctx, ectx]) { c.setTransform(c.__s, 0, 0, c.__s, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.shadowBlur = 0; c.letterSpacing = '0px'; c.setLineDash([]); } },
};

// ───────────── text helpers ─────────────
function setFont(c, weight, size, fam = FONT.zh, tracking = 0) {
  c.font = `${weight} ${size}px ${fam}`;
  c.letterSpacing = tracking ? `${tracking}px` : '0px';
}
// per-glyph layout that keeps kerning (measure growing substrings)
function layout(c, str) {
  const out = []; let prev = 0;
  const chars = Array.from(str);
  for (let i = 0; i < chars.length; i++) {
    const w = c.measureText(chars.slice(0, i + 1).join('')).width;
    out.push({ ch: chars[i], x: prev, w: w - prev }); prev = w;
  }
  return { glyphs: out, width: prev };
}
// Kinetic line of text.  opts.anim(i, n, g) → {dx, dy, s, a, r, sx}
function kText(c, str, x, y, opts = {}) {
  const { weight = 500, size = 64, fam = FONT.zh, color = C.white, align = 'left', tracking = 0, anim = null, baseline = 'alphabetic' } = opts;
  setFont(c, weight, size, fam, tracking);
  c.textBaseline = baseline;
  const lay = layout(c, str);
  const w = lay.width - (tracking || 0);
  let x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.fillStyle = color;
  const n = lay.glyphs.length;
  lay.glyphs.forEach((g, i) => {
    const a = anim ? anim(i, n, g) : {};
    const alpha = a.a === undefined ? 1 : a.a;
    if (alpha <= 0.001) return;
    c.save();
    c.globalAlpha *= alpha;
    c.translate(x0 + g.x + g.w / 2 + (a.dx || 0), y + (a.dy || 0));
    if (a.r) c.rotate(a.r);
    const s = a.s === undefined ? 1 : a.s;
    c.scale(s * (a.sx || 1), s * (a.sy || 1));
    c.letterSpacing = '0px';
    c.textAlign = 'center';
    if (a.color) c.fillStyle = a.color;
    c.fillText(a.ch || g.ch, 0, 0);
    c.restore();
  });
  return { x0, w };
}
function textW(c, str, weight, size, fam = FONT.zh, tracking = 0) { setFont(c, weight, size, fam, tracking); return c.measureText(str).width - tracking; }

// deterministic "decode" scramble: resolves glyphs left→right between t0 and t1
const SCR_LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_-+=#';
const SCR_ZH = '澎程远方空间座舱续航四驱越野山海家公里布局随心自由探索星空湖泊雪山';
let FRAME = 0;                              // frame index (scramble glyphs freeze inside a frame)
function scramble(str, p, zh = false, seed = 0) {
  const chars = Array.from(str), set = zh ? SCR_ZH : SCR_LAT;
  const n = chars.length;
  return chars.map((ch, i) => {
    const local = clamp(p * (n + 3) - i);
    if (ch === ' ' || local >= 1) return ch;
    if (local <= 0) return '';
    return set[Math.floor(hash2(FRAME * 0.37 + i * 3.1, seed + i) * set.length)];
  }).join('');
}

// ───────────── path helpers ─────────────
// Poly-line with arc-length, for "draw-on" strokes
class Poly {
  constructor(pts, closed = false) {
    this.p = closed ? pts.concat([pts[0]]) : pts.slice();
    this.len = [0];
    for (let i = 1; i < this.p.length; i++) this.len.push(this.len[i - 1] + Math.hypot(this.p[i][0] - this.p[i - 1][0], this.p[i][1] - this.p[i - 1][1]));
    this.L = this.len[this.len.length - 1];
  }
  at(s) {                                   // point at arc length s
    s = clamp(s, 0, this.L);
    let lo = 0, hi = this.len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.len[m] < s) lo = m; else hi = m; }
    const seg = this.len[hi] - this.len[lo] || 1, f = (s - this.len[lo]) / seg;
    return [lerp(this.p[lo][0], this.p[hi][0], f), lerp(this.p[lo][1], this.p[hi][1], f)];
  }
  trace(c, a, b) {                          // sub-path between fractions a..b
    if (b <= a) return;
    const s0 = a * this.L, s1 = b * this.L;
    const p0 = this.at(s0); c.moveTo(p0[0], p0[1]);
    for (let i = 1; i < this.p.length; i++) if (this.len[i] > s0 && this.len[i] < s1) c.lineTo(this.p[i][0], this.p[i][1]);
    const p1 = this.at(s1); c.lineTo(p1[0], p1[1]);
  }
  full(c) { c.moveTo(this.p[0][0], this.p[0][1]); for (let i = 1; i < this.p.length; i++) c.lineTo(this.p[i][0], this.p[i][1]); }
}
// sample cubic bezier chain given as [[x,y], [c1x,c1y,c2x,c2y,x,y], ...] into points
function bez(chain, stepsPer = 24) {
  const pts = [chain[0].slice(0, 2)];
  let [px, py] = chain[0];
  for (let k = 1; k < chain.length; k++) {
    const s = chain[k];
    if (s.length === 2) { pts.push(s.slice()); [px, py] = s; continue; }
    const [c1x, c1y, c2x, c2y, x, y] = s;
    for (let i = 1; i <= stepsPer; i++) {
      const t = i / stepsPer, u = 1 - t;
      pts.push([u * u * u * px + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
                u * u * u * py + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y]);
    }
    px = x; py = y;
  }
  return pts;
}
function arcPts(cx, cy, r, a0, a1, n = 64) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function rrect(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// ───────────── CPU compositor ─────────────
// Linear-light float accumulation (motion blur), bloom pyramid from the
// emissive layer, radial chromatic aberration, vignette, grain, dither.
const CPU = (() => {
  const NP = RW * RH, NE = EW * EH;
  const LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const v = i / 255; LIN[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  const TO = new Float32Array(4097);
  for (let i = 0; i <= 4096; i++) { const v = i / 4096; TO[i] = (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255; }
  const accB = new Float32Array(NP * 3), accE = new Float32Array(NE * 3);
  const OUT = new ImageData(RW, RH);
  // per-pixel radial maps
  const VIG = new Float32Array(NP), CAX = new Float32Array(NP), CAY = new Float32Array(NP);
  const asp = RW / RH;
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    const u = (x + 0.5) / RW - 0.5, v = (y + 0.5) / RH - 0.5, qx = u * asp, r2 = qx * qx + v * v, r = Math.sqrt(r2) * 1.1;
    const i = y * RW + x, k = clamp((1.25 - r) / (1.25 - 0.2)); VIG[i] = k * k * (3 - 2 * k);
    CAX[i] = u * (0.6 + r2) * RW; CAY[i] = v * (0.6 + r2) * RH;
  }
  // grain tile
  const NT = 1024, NOISE = new Float32Array(NT * NT);
  let sd = 1234567;
  const rnd = () => { sd |= 0; sd = sd + 0x6D2B79F5 | 0; let t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let i = 0; i < NT * NT; i++) NOISE[i] = rnd() + rnd() - 1;

  function begin() { accB.fill(0); accE.fill(0); }
  function accumulate(w) {
    const d = bctx.getImageData(0, 0, RW, RH).data;
    for (let i = 0, j = 0, n = NP * 3; i < n; i += 3, j += 4) { accB[i] += LIN[d[j]] * w; accB[i + 1] += LIN[d[j + 1]] * w; accB[i + 2] += LIN[d[j + 2]] * w; }
    const e = ectx.getImageData(0, 0, EW, EH).data;
    for (let i = 0, j = 0, n = NE * 3; i < n; i += 3, j += 4) { if (e[j] | e[j + 1] | e[j + 2]) { accE[i] += LIN[e[j]] * w; accE[i + 1] += LIN[e[j + 1]] * w; accE[i + 2] += LIN[e[j + 2]] * w; } }
  }
  function down2(src, w, h) {
    const W2 = Math.max(1, w >> 1), H2 = Math.max(1, h >> 1), o = new Float32Array(W2 * H2 * 3);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const a = ((2 * y) * w + 2 * x) * 3, b = a + 3, c = a + w * 3, d = c + 3, k = (y * W2 + x) * 3;
      for (let ch = 0; ch < 3; ch++) o[k + ch] = (src[a + ch] + src[b + ch] + src[c + ch] + src[d + ch]) * 0.25;
    }
    return { b: o, w: W2, h: H2 };
  }
  const KER = (() => { const r = 6, s = 3.0, k = []; let sum = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * s * s)); k.push(v); sum += v; } return k.map(v => v / sum); })();
  function blur(L0) {
    const { b, w, h } = L0, tmp = new Float32Array(b.length), R = (KER.length - 1) / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, bb = 0;
      for (let k = -R; k <= R; k++) { const xx = Math.min(w - 1, Math.max(0, x + k)), i = (y * w + xx) * 3, kw = KER[k + R]; r += b[i] * kw; g += b[i + 1] * kw; bb += b[i + 2] * kw; }
      const o = (y * w + x) * 3; tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = bb;
    }
    const out = new Float32Array(b.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, bb = 0;
      for (let k = -R; k <= R; k++) { const yy = Math.min(h - 1, Math.max(0, y + k)), i = (yy * w + x) * 3, kw = KER[k + R]; r += tmp[i] * kw; g += tmp[i + 1] * kw; bb += tmp[i + 2] * kw; }
      const o = (y * w + x) * 3; out[o] = r; out[o + 1] = g; out[o + 2] = bb;
    }
    return { b: out, w, h };
  }
  function addUp(dst, dw, dh, L0, wgt) {               // bilinear upsample-add
    const { b, w, h } = L0, sx = w / dw, sy = h / dh;
    for (let y = 0; y < dh; y++) {
      const fy = Math.max(0, (y + 0.5) * sy - 0.5), y0 = Math.min(h - 1, fy | 0), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
      for (let x = 0; x < dw; x++) {
        const fx = Math.max(0, (x + 0.5) * sx - 0.5), x0 = Math.min(w - 1, fx | 0), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
        const a = (y0 * w + x0) * 3, bq = (y0 * w + x1) * 3, c = (y1 * w + x0) * 3, d = (y1 * w + x1) * 3, o = (y * dw + x) * 3;
        for (let ch = 0; ch < 3; ch++) dst[o + ch] += wgt * ((b[a + ch] * (1 - tx) + b[bq + ch] * tx) * (1 - ty) + (b[c + ch] * (1 - tx) + b[d + ch] * tx) * ty);
      }
    }
  }
  const GLOW = new Float32Array(NE * 3);
  function finish(fx) {
    // bloom pyramid
    GLOW.fill(0);
    let any = false; for (let i = 0; i < accE.length; i += 97) if (accE[i] > 0) { any = true; break; }
    if (!any) for (let i = 0; i < accE.length; i++) if (accE[i] > 0) { any = true; break; }
    if (any && fx.bloom > 0) {
      let lvl = { b: accE, w: EW, h: EH };
      const wts = [0.9, 0.8, 0.8, 0.9];
      for (let k = 0; k < 4; k++) { lvl = down2(lvl.b, lvl.w, lvl.h); const bl = blur(lvl); addUp(GLOW, EW, EH, bl, wts[k] * fx.bloom); lvl = bl; }
      for (let i = 0; i < GLOW.length; i++) GLOW[i] += accE[i] * fx.sharpE;
    }
    const d = OUT.data, ca = fx.ca || 0, ex = fx.exposure ?? 1, fl = clamp(fx.flash || 0), fc = fx.flashCol, vig = fx.vig, vc = fx.vigCol;
    const gr = (fx.grain || 0) * 255, ox = (fx.seed * 7919) % NT, oy = (fx.seed * 104729) % NT, lift = (fx.lift || 0) * 255;
    for (let y = 0; y < RH; y++) {
      const gy = Math.min(EH - 1, Math.max(0, (y - 0.5) * 0.5)), gy0 = gy | 0, gy1 = Math.min(EH - 1, gy0 + 1), ty = gy - gy0;
      const nrow = ((y + oy) & (NT - 1)) * NT, nrow2 = ((y * 3 + oy + 17) & (NT - 1)) * NT;
      for (let x = 0; x < RW; x++) {
        const i = y * RW + x, k = i * 3;
        let r, g, b;
        if (ca > 0.0004) {
          const dx = CAX[i] * ca, dy = CAY[i] * ca;
          const xr = Math.min(RW - 1, Math.max(0, Math.round(x + dx))), yr = Math.min(RH - 1, Math.max(0, Math.round(y + dy)));
          const xb = Math.min(RW - 1, Math.max(0, Math.round(x - dx))), yb = Math.min(RH - 1, Math.max(0, Math.round(y - dy)));
          r = accB[(yr * RW + xr) * 3]; g = accB[k + 1]; b = accB[(yb * RW + xb) * 3 + 2];
        } else { r = accB[k]; g = accB[k + 1]; b = accB[k + 2]; }
        r *= ex; g *= ex; b *= ex;
        if (any) {
          const gx = Math.min(EW - 1, Math.max(0, (x - 0.5) * 0.5)), gx0 = gx | 0, gx1 = Math.min(EW - 1, gx0 + 1), tx = gx - gx0;
          const a0 = (gy0 * EW + gx0) * 3, a1 = (gy0 * EW + gx1) * 3, a2 = (gy1 * EW + gx0) * 3, a3 = (gy1 * EW + gx1) * 3;
          const w0 = (1 - tx) * (1 - ty), w1 = tx * (1 - ty), w2 = (1 - tx) * ty, w3 = tx * ty;
          r += GLOW[a0] * w0 + GLOW[a1] * w1 + GLOW[a2] * w2 + GLOW[a3] * w3;
          g += GLOW[a0 + 1] * w0 + GLOW[a1 + 1] * w1 + GLOW[a2 + 1] * w2 + GLOW[a3 + 1] * w3;
          b += GLOW[a0 + 2] * w0 + GLOW[a1 + 2] * w1 + GLOW[a2 + 2] * w2 + GLOW[a3 + 2] * w3;
        }
        if (vig > 0) { const v = VIG[i]; r *= 1 - vig * (1 - v) * (1 - vc[0]); g *= 1 - vig * (1 - v) * (1 - vc[1]); b *= 1 - vig * (1 - v) * (1 - vc[2]); }
        let R = TO[Math.min(4096, Math.max(0, r * 4096) | 0)], G = TO[Math.min(4096, Math.max(0, g * 4096) | 0)], B = TO[Math.min(4096, Math.max(0, b * 4096) | 0)];
        if (fl > 0) { R += (fc[0] * 255 - R) * fl; G += (fc[1] * 255 - G) * fl; B += (fc[2] * 255 - B) * fl; }
        const Lm = (R * 0.299 + G * 0.587 + B * 0.114) / 255;
        const n = NOISE[nrow + ((x + ox) & (NT - 1))] * gr * (0.35 + 1.98 * (1 - Lm) * Lm) + NOISE[nrow2 + ((x * 3 + ox + 5) & (NT - 1))] * 0.5 + lift;
        const o = i * 4;
        d[o] = R + n; d[o + 1] = G + n; d[o + 2] = B + n; d[o + 3] = 255;
      }
    }
    return OUT;
  }
  return { begin, accumulate, finish, OUT };
})();

// ───────────── frame loop ─────────────
function hexSrgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
function hexLin(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); }
const outCv = document.getElementById('out'); outCv.width = RW; outCv.height = RH;
const octx = outCv.getContext('2d');

function renderAt(tCenter, samples) {
  CPU.begin();
  for (let s = 0; s < samples; s++) {
    const t = samples === 1 ? tCenter : tCenter + ((s + 0.5) / samples - 0.5) * SHUTTER / FPS;
    L.reset();
    drawFrame(Math.max(0, Math.min(DUR - 1e-4, t)));
    CPU.accumulate(1 / samples);
  }
  const f = fxAt(tCenter);
  return CPU.finish({
    seed: FRAME % 997 + 1, ca: f.ca || 0, vig: f.vig ?? 0.35, grain: f.grain ?? 0.035, bloom: f.bloom ?? 1,
    flash: f.flash || 0, flashCol: hexSrgb(f.flashCol || '#ffffff'), vigCol: hexLin(f.vigCol || '#000000'),
    sharpE: f.sharpE ?? 0.25, exposure: f.exposure ?? 1, lift: f.lift || 0,
  });
}
window.renderFrame = (i, samples, show = true) => {
  FRAME = i;
  const img = renderAt(i / FPS, samples || samplesAt(i / FPS));
  if (show) octx.putImageData(img, 0, 0);
  return true;
};
// render and stream raw RGBA to the local render server
window.renderSend = async (i, samples, url) => {
  window.renderFrame(i, samples, false);
  const r = await fetch(url, { method: 'POST', body: CPU.OUT.data });
  return r.ok;
};
window.META = { W, H, FPS, DUR, NFRAMES, BPM, PRE, MAIN, SONG, END };
