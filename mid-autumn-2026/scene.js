/* ═══════════════════════════════════════════════════════════════════════════
   千里共婵娟 — 栋森网络科技 携 Opus 5.5 · 中秋 2026
   15 s · 1080×1920 · 60 fps · 120 BPM (one beat = 0.5 s = 30 frames)

   Story, one idea per bar:
     01 千里  home lights up; a sonar sweep reveals the world, a thousand li apart
     02 相连  every city is wired back home — the network warms up
     03 团圆  the network spirals into a ring; an algorithm weaves its chords
     04 婵娟  the ring becomes the full moon; Su Shi's couplet hangs beside it
     05 中秋  中 / 秋 / 快 / 乐 on every beat, then the sign-off and the seal

   Every pixel is a pure function of t: the render is deterministic, can be
   motion-blurred by sampling sub-frames, and the soundtrack is generated from
   the very same event list (window.scene.events).
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const W = 1080, H = 1920, FPS = 60, DUR = 15;
const BW = W / 4, BH = H / 4;          // quarter-res bloom buffer
const TAU = Math.PI * 2;

// ── timeline (s) ─────────────────────────────────────────────────────────────
const T = {
  home: 0.5,        // beacon + sonar sweep
  sonarEnd: 2.1,
  measure: 1.9,     // dashed distance lines
  qianli: 2.0,      // 千里
  qianliOut: 3.5,
  gong: 4.0,        // 共 — arcs launch on 32nds
  gongOut: 5.45,
  land: 5.72,       // ring landings sweep 5.72 → 6.02
  tuanyuan: 6.0,    // 团圆 — string-art build
  inhale: 7.75,
  drop: 8.0,        // the moon
  couplet: 8.25,
  stacc: 10.0,      // 中 秋 快 乐
  collapse: 12.0,
  lead: 12.25,
  seal: 13.0,
  shine: 13.55,
};

const L = {
  cx: 540, cy: 760,  // home = ring centre = moon centre (camera focus)
  moonR: 290,
  ringR: 300,
  typeY: 1420,       // centre line of the lower type zone
};

const PAL = {
  ivory: [243, 234, 213],
  moon: [252, 244, 226],
  gold: [240, 200, 128],
  amber: [218, 160, 84],
  cool: [150, 184, 240],
  cinnabar: [190, 46, 36],
  sky0: [3, 5, 12], sky1: [9, 14, 30], sky2: [4, 6, 11],
};

// ── math ─────────────────────────────────────────────────────────────────────
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(4)})`;
const wrapPI = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(a, b = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x9e3779b9, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  const dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x; if (Math.abs(e) < 1e-6) return Y(t);
      const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 40; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
// The house curves. `out` is the signature deceleration used almost everywhere.
const ez = {
  out: cubicBezier(0.16, 1, 0.3, 1),
  out2: cubicBezier(0.25, 1, 0.5, 1),
  inOut: cubicBezier(0.76, 0, 0.24, 1),
  soft: cubicBezier(0.45, 0, 0.55, 1),
  in: cubicBezier(0.7, 0, 0.84, 0),
  in2: cubicBezier(0.55, 0, 1, 0.45),
};

// 3D simplex noise (Gustavson), seeded
function makeSimplex(rnd) {
  const G = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm[i] = perm[i] % 12; }
  const F3 = 1 / 3, G3 = 1 / 6;
  return (x, y, z) => {
    const s = (x + y + z) * F3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3, x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 0.5, y3 = y0 - 1 + 0.5, z3 = z0 - 1 + 0.5;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const c = (tt, g, a, b, d) => { if (tt < 0) return 0; tt *= tt; return tt * tt * (G[g][0] * a + G[g][1] * b + G[g][2] * d); };
    return 32 * (
      c(0.6 - x0 * x0 - y0 * y0 - z0 * z0, pm[ii + perm[jj + perm[kk]]], x0, y0, z0) +
      c(0.6 - x1 * x1 - y1 * y1 - z1 * z1, pm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x1, y1, z1) +
      c(0.6 - x2 * x2 - y2 * y2 - z2 * z2, pm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x2, y2, z2) +
      c(0.6 - x3 * x3 - y3 * y3 - z3 * z3, pm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x3, y3, z3));
  };
}

const S = { frame: 0, events: [] };
const noise = (x, y, z = 0) => S.noise(x, y, z);
function fbm(x, y, z, oct = 4) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * S.noise(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ── type ─────────────────────────────────────────────────────────────────────
const FAM = {
  serif: '"Noto Serif SC"',
  sans: '"Noto Sans SC"',
  mono: '"JetBrains Mono", "Noto Sans SC"',
};
const POOL_LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
const POOL_CJK = '栋森网络科技携祝大家中秋快乐千里共婵娟但愿人长久明月几时有相连团圆北京上海深圳成都东京伦敦纽约';
const isCJK = ch => ch.charCodeAt(0) > 0x2e80;

function font(ctx, w, px, fam) {
  ctx.font = `${Math.round(w)} ${px.toFixed(2)}px ${fam}`;
}
const WCACHE = new Map();
function charW(ctx, ch) {
  const k = ctx.font + '|' + ch;
  let w = WCACHE.get(k);
  if (w === undefined) { w = ctx.measureText(ch).width; WCACHE.set(k, w); }
  return w;
}
// draw one CJK glyph centred (optically, on its em box) at x, y
function glyph(ctx, ch, x, y, px, w = 900, fam = 'serif') {
  font(ctx, w, px, FAM[fam]);
  ctx.textAlign = 'center';
  ctx.fillText(ch, x, y + S.emc[fam] * px);
}
// A line of text, laid out per glyph from the *final* string so decoding never jitters.
// p ∈ [0,1] drives a scramble-decode; y is the alphabetic baseline.
function line(ctx, str, x, y, px, o = {}) {
  const { w = 400, fam = 'mono', track = 0, align = 'left', p = 1, seed = 1 } = o;
  font(ctx, w, px, FAM[fam]);
  ctx.textAlign = 'left';
  const chars = [...str], tr = track * px;
  const ws = chars.map(ch => charW(ctx, ch));
  const total = ws.reduce((a, b) => a + b, 0) + tr * (chars.length - 1);
  let cx = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const lock = (i / chars.length) * 0.7 + hash(seed, i) * 0.3;
    if (p >= lock) ctx.fillText(ch, cx, y);
    else if (p >= lock - 0.32 && ch !== ' ') {
      const pool = isCJK(ch) ? POOL_CJK : POOL_LAT;
      const r = pool[(hash(seed * 131 + i, S.frame >> 1) * pool.length) | 0];
      ctx.fillText(r, cx + (ws[i] - charW(ctx, r)) / 2, y);
    }
    cx += ws[i] + tr;
  }
  return total;
}
function textWidth(ctx, str, px, w, fam, track = 0) {
  font(ctx, w, px, FAM[fam]);
  return [...str].reduce((a, ch) => a + charW(ctx, ch), 0) + track * px * ([...str].length - 1);
}

// ── the world: home, cities, nodes ───────────────────────────────────────────
// Home sits on 大地原点 (China's geodetic origin, Jingyang, Shaanxi). Cities are
// placed by their true great-circle bearing and a compressed distance.
const ORIGIN = [34.54, 108.92];
const CITIES = [
  // cn        en              lat     lon      label side, nudge
  ['北京', 'BEIJING', 39.90, 116.41],
  ['上海', 'SHANGHAI', 31.23, 121.47],
  ['深圳', 'SHENZHEN', 22.54, 114.06],
  ['成都', 'CHENGDU', 30.57, 104.07],
  ['乌鲁木齐', 'URUMQI', 43.83, 87.62],
  ['哈尔滨', 'HARBIN', 45.80, 126.53],
  ['东京', 'TOKYO', 35.68, 139.69],
  ['新加坡', 'SINGAPORE', 1.35, 103.82],
  ['悉尼', 'SYDNEY', -33.87, 151.21],
  ['伦敦', 'LONDON', 51.51, -0.13],
  ['纽约', 'NEW YORK', 40.71, -74.01],
  ['旧金山', 'SAN FRANCISCO', 37.77, -122.42],
  ['迪拜', 'DUBAI', 25.20, 55.27],
];
const LABEL_SIDE = { '上海': 1 };   // hand-placed where the automatic side would collide
function geo(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, p1 = lat1 * r, p2 = lat2 * r, dl = (lon2 - lon1) * r;
  const d = Math.acos(clamp(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl), -1, 1)) * 6371;
  const b = Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl));
  return { d, b };
}
const sonarR = t => { const u = prog(t, T.home, T.sonarEnd); return 950 * (1 - Math.pow(1 - u, 1.6)); };
const sonarHit = d => T.home + (T.sonarEnd - T.home) * (1 - Math.pow(1 - clamp(d / 950), 1 / 1.6));

function ringR(t) { return t < T.inhale ? L.ringR : lerp(L.ringR, 240, ez.in(prog(t, T.inhale, T.drop))); }
function ringRot(t) { const u = Math.max(0, t - T.tuanyuan); return 0.1 * u + 0.055 * u * u * u; }
function kAt(t) { const u = prog(t, 6.25, 8.0); return 2 + 1.0 * u + 6.4 * Math.pow(u, 4); }
const drift = (n, t) => [2.4 * Math.sin(t * 0.8 + n.ph), 2.4 * Math.cos(t * 0.7 + n.ph * 1.3)];

function buildWorld(R) {
  const nodes = [];
  nodes.push({ home: true, x0: L.cx, y0: L.cy, r: 4.5, ph: 0 });
  // cities
  CITIES.forEach(([cn, en, lat, lon], ci) => {
    const g = geo(ORIGIN[0], ORIGIN[1], lat, lon);
    const f = Math.pow(Math.min(1, g.d / 12500), 0.42);
    const up = Math.cos(g.b) > 0;
    const x = L.cx + 450 * f * Math.sin(g.b);
    const y = L.cy - (up ? 500 : 400) * f * Math.cos(g.b);
    nodes.push({ city: true, ci, cn, en, km: g.d, li: g.d * 2, x0: x, y0: y, r: 3.2, ph: R() * TAU });
  });
  // label boxes (to keep the filler network out of them)
  const boxes = [];
  for (const n of nodes) {
    if (!n.city && !n.home) continue;
    n.side = LABEL_SIDE[n.cn] ?? (n.x0 > 700 ? -1 : 1);
    const w = 190, h = 52;
    const bx = n.side > 0 ? n.x0 + 6 : n.x0 - 6 - w;
    boxes.push([bx - 6, n.y0 - 30, w + 12, h + 12]);
  }
  // filler: Poisson disk, thinned by a noise field so it reads as clusters and voids
  const pts = poisson(R, 60, 230, 1020, 1330, 58);
  for (const p of pts) {
    if (boxes.some(([x, y, w, h]) => p.x > x && p.x < x + w && p.y > y && p.y < y + h)) continue;
    if (nodes.some(n => (n.city || n.home) && Math.hypot(n.x0 - p.x, n.y0 - p.y) < 46)) continue;
    const dens = 0.5 + 0.5 * noise(p.x / 260, p.y / 260, 3.7);
    const fall = sstep(1080, 1320, p.y);
    if (R() > dens * 1.25 - fall) continue;
    nodes.push({ x0: p.x, y0: p.y, r: 1.3 + R() * 1.4, ph: R() * TAU, a: 0.45 + R() * 0.5 });
  }
  nodes.forEach((n, i) => {
    n.i = i;
    n.a = n.a ?? 1;
    n.d = Math.hypot(n.x0 - L.cx, n.y0 - L.cy);
    n.appear = n.home ? T.home : sonarHit(n.d) + (R() - 0.5) * 0.02;
  });
  S.nodes = nodes;
  S.cityNodes = nodes.filter(n => n.city).sort((a, b) => a.km - b.km);
  S.home = nodes[0];

  // cities: measuring line → arc launch (32nds, nearest first) → arrival
  S.cityNodes.forEach((c, k) => {
    c.tm = T.measure + k * 0.045;
    c.ta = T.gong + k * 0.0625;
    c.tArrive = c.ta + 0.45;
  });
  // warmth spreads from each connected city through its neighbourhood
  for (const n of nodes) {
    if (n.home) { n.warm0 = T.gong; continue; }
    if (n.city) { n.warm0 = n.tArrive; continue; }
    let best = Infinity;
    for (const c of S.cityNodes) best = Math.min(best, c.tArrive + Math.hypot(c.x0 - n.x0, c.y0 - n.y0) / 900);
    n.warm0 = Math.min(best, 5.5);
  }

  // mesh: union of 3-nearest-neighbour edges, drawn outward from home
  const set = new Set(), edges = [];
  for (const a of nodes) {
    const near = nodes.filter(b => b !== a).map(b => [Math.hypot(a.x0 - b.x0, a.y0 - b.y0), b])
      .sort((p, q) => p[0] - q[0]).slice(0, 3);
    for (const [d, b] of near) {
      const key = a.i < b.i ? a.i + ':' + b.i : b.i + ':' + a.i;
      if (set.has(key) || d > 190) continue;
      set.add(key);
      const [p, q] = a.d < b.d ? [a, b] : [b, a];
      edges.push({ a: p.i, b: q.i, t0: T.gong + 0.95 * Math.min(1, ((p.d + q.d) / 2) / 640) + R() * 0.05 });
    }
  }
  S.edges = edges;

  // ring: every node but home, ordered by its angle around home, evenly spaced
  const ring = nodes.filter(n => !n.home);
  ring.forEach(n => { n.phi = Math.atan2(n.y0 - L.cy, n.x0 - L.cx); });
  ring.sort((a, b) => a.phi - b.phi);
  S.ringN = ring.length;
  S.theta0 = ring[0].phi;
  ring.forEach((n, k) => {
    n.rank = k;
    n.theta = S.theta0 + (TAU * k) / ring.length;
    n.ce = T.land + (0.3 * k) / ring.length;          // landings sweep around the ring
    n.cs = n.ce - (0.72 + 0.28 * Math.min(1, n.d / 700));
    const [dx, dy] = drift(n, n.cs);
    const x = n.x0 + dx - L.cx, y = n.y0 + dy - L.cy;
    n.r0 = Math.hypot(x, y); n.phi0 = Math.atan2(y, x);
    n.dA = wrapPI(n.theta - n.phi0);
  });
  S.ring = ring;
}

function poisson(R, x0, y0, x1, y1, r, k = 30) {
  const cell = r / Math.SQRT2, gw = Math.ceil((x1 - x0) / cell), gh = Math.ceil((y1 - y0) / cell);
  const grid = new Int32Array(gw * gh).fill(-1), pts = [], active = [];
  const add = p => { pts.push(p); active.push(p); grid[((p.y - y0) / cell | 0) * gw + ((p.x - x0) / cell | 0)] = pts.length - 1; };
  const ok = (x, y) => {
    if (x < x0 || y < y0 || x >= x1 || y >= y1) return false;
    const gx = (x - x0) / cell | 0, gy = (y - y0) / cell | 0;
    for (let j = Math.max(0, gy - 2); j <= Math.min(gh - 1, gy + 2); j++)
      for (let i = Math.max(0, gx - 2); i <= Math.min(gw - 1, gx + 2); i++) {
        const q = grid[j * gw + i];
        if (q >= 0 && (pts[q].x - x) ** 2 + (pts[q].y - y) ** 2 < r * r) return false;
      }
    return true;
  };
  add({ x: lerp(x0, x1, R()), y: lerp(y0, y1, R()) });
  while (active.length) {
    const i = (R() * active.length) | 0, p = active[i];
    let found = false;
    for (let n = 0; n < k; n++) {
      const a = R() * TAU, d = r * (1 + R());
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (ok(x, y)) { add({ x, y }); found = true; break; }
    }
    if (!found) active.splice(i, 1);
  }
  return pts;
}

function nodePos(n, t) {
  if (n.home) return [L.cx, L.cy];
  if (t <= n.cs) { const [dx, dy] = drift(n, t); return [n.x0 + dx, n.y0 + dy]; }
  const rot = ringRot(t), Rr = ringR(t);
  if (t >= n.ce) { const a = n.theta + rot; return [L.cx + Rr * Math.cos(a), L.cy + Rr * Math.sin(a)]; }
  const u = ez.inOut(prog(t, n.cs, n.ce));
  const r = lerp(n.r0, Rr, u);
  const a = n.phi0 + n.dA * u + 0.55 * Math.sin(Math.PI * u) + rot * u;
  return [L.cx + r * Math.cos(a), L.cy + r * Math.sin(a)];
}
const warmth = (n, t) => ez.soft(prog(t, n.warm0, n.warm0 + 0.45));

// ── particles & stars ────────────────────────────────────────────────────────
function buildParticles(R) {
  S.stars = Array.from({ length: 190 }, () => ({
    x: R() * W, y: R() * H * 0.9, r: 0.45 + Math.pow(R(), 3) * 1.3,
    a: 0.12 + R() * 0.4, f: 0.2 + R() * 0.9, ph: R() * TAU,
  }));
  // at the drop every ring node bursts into an osmanthus fleck
  S.burst = S.ring.map(n => ({
    n, v: 260 + 1000 * Math.pow(R(), 1.8), k: 2.0 + R() * 1.8, tang: (R() - 0.5) * 0.7,
    life: 1.6 + R() * 5.5, size: 0.8 + R() * 1.9, tw: R() * TAU, fl: R() < 0.14, rot: R() * TAU,
  }));
  S.ambient = Array.from({ length: 64 }, () => ({
    x: R() * W, y: R() * H, vy: 14 + R() * 34, vx: 5 + R() * 12, sw: 6 + R() * 18, sf: 0.2 + R() * 0.5,
    ph: R() * TAU, size: 0.8 + R() * 2.2, a: 0.2 + R() * 0.55, fl: R() < 0.3, rot: R() * TAU, vr: (R() - 0.5) * 1.4,
  }));
  S.bokeh = Array.from({ length: 8 }, () => ({
    x: R() * W, y: R() * H, vy: 40 + R() * 50, vx: 10 + R() * 20, size: 9 + R() * 16, a: 0.07 + R() * 0.12, ph: R() * TAU,
  }));
}

// ── textures ─────────────────────────────────────────────────────────────────
// Lunar near side, north up: the maria layout people subconsciously know (玉兔).
const MARIA = [
  // u,     v,     rx,   ry,   strength
  [-0.30, -0.40, 0.27, 0.24, 1.00],   // Imbrium
  [ 0.12, -0.38, 0.15, 0.14, 0.95],   // Serenitatis
  [ 0.28, -0.10, 0.19, 0.15, 0.95],   // Tranquillitatis
  [ 0.64, -0.28, 0.09, 0.12, 1.00],   // Crisium
  [ 0.55,  0.12, 0.10, 0.16, 0.85],   // Fecunditatis
  [ 0.33,  0.27, 0.09, 0.09, 0.80],   // Nectaris
  [-0.60, -0.02, 0.24, 0.44, 0.85],   // Procellarum
  [-0.20,  0.30, 0.16, 0.13, 0.75],   // Nubium
  [-0.50,  0.37, 0.09, 0.09, 0.85],   // Humorum
  [-0.10, -0.73, 0.40, 0.085, 0.35],  // Frigoris (faint)
  [ 0.00, -0.22, 0.08, 0.07, 0.70],   // Vaporum
  [-0.30,  0.10, 0.10, 0.09, 0.55],   // Cognitum / Insularum
  [-0.08, -0.06, 0.07, 0.06, 0.45],   // Medii
];
function makeMoon(size) {
  const cv = mk(size, size), x = cv.getContext('2d');
  const img = x.createImageData(size, size), d = img.data;
  const hi = [255, 249, 236], ma = [212, 200, 178];
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const u = ((px + 0.5) / size) * 2 - 1, v = ((py + 0.5) / size) * 2 - 1;
    const r2 = u * u + v * v;
    if (r2 > 1) continue;
    const r = Math.sqrt(r2), nz = Math.sqrt(1 - r2);
    // organic, soft-edged maria: warped ellipses combined as a soft union
    const wx = u + 0.055 * fbm(u * 2.6, v * 2.6, nz * 2.6 + 11, 3), wy = v + 0.055 * fbm(u * 2.6 + 7, v * 2.6, nz * 2.6 + 3, 3);
    let keep = 1;
    for (const [mu, mv, rx, ry, s] of MARIA) {
      const dx = (wx - mu) / rx, dy = (wy - mv) / ry;
      keep *= 1 - s * (1 - sstep(0.3, 1.2, Math.sqrt(dx * dx + dy * dy)));
    }
    const f1 = fbm(u * 5, v * 5, nz * 5 + 2, 4), f2 = fbm(u * 26, v * 26, nz * 26, 3), f3 = fbm(u * 11, v * 11, nz * 11 + 9, 3);
    let m = clamp((1 - keep) * (0.72 + 0.5 * sstep(-0.45, 0.55, f1)));
    const south = 0.03 * sstep(0.1, 0.8, v);                 // brighter southern highlands
    const alb = 0.955 - 0.2 * m + 0.022 * f1 + 0.034 * f2 + 0.03 * f3 * (1 - m) + south;
    const limb = 0.86 + 0.14 * Math.pow(nz, 0.5);
    const I = alb * limb;
    const c = mixc(hi, ma, m);
    const i = (py * size + px) * 4;
    d[i] = c[0] * I; d[i + 1] = c[1] * I; d[i + 2] = c[2] * I;
    d[i + 3] = 255 * clamp((1 - r) * size * 0.5 / 1.1);
  }
  x.putImageData(img, 0, 0);
  // craters & Tycho's rays, clipped to the disc
  const R = mulberry32(404), c = size / 2;
  x.save();
  x.beginPath(); x.arc(c, c, c - 0.5, 0, TAU); x.clip();
  x.globalCompositeOperation = 'lighter';
  const tycho = [-0.12, 0.64];
  for (let i = 0; i < 34; i++) {
    const a = R() * TAU, len = 0.2 + R() * 0.75;
    const g = x.createLinearGradient(c + tycho[0] * c, c + tycho[1] * c, c + (tycho[0] + Math.cos(a) * len) * c, c + (tycho[1] + Math.sin(a) * len) * c);
    g.addColorStop(0, 'rgba(255,250,235,0.022)'); g.addColorStop(1, 'rgba(255,250,235,0)');
    x.strokeStyle = g; x.lineWidth = (0.003 + R() * 0.006) * c;
    x.beginPath(); x.moveTo(c + tycho[0] * c, c + tycho[1] * c);
    x.lineTo(c + (tycho[0] + Math.cos(a) * len) * c, c + (tycho[1] + Math.sin(a) * len) * c); x.stroke();
  }
  const bright = [[-0.12, 0.64, 0.016, 0.14], [-0.27, -0.16, 0.018, 0.16], [-0.47, -0.12, 0.011, 0.14], [-0.64, -0.30, 0.01, 0.26], [0.52, -0.26, 0.008, 0.12]];
  const craters = bright.concat(Array.from({ length: 260 }, () => {
    const a = R() * TAU, rr = Math.sqrt(R()) * 0.95;
    return [Math.cos(a) * rr, Math.sin(a) * rr, 0.003 + Math.pow(R(), 3) * 0.018, 0.025 + R() * 0.06];
  }));
  for (const [u, v, rr, a] of craters) {
    const nz = Math.sqrt(Math.max(0.05, 1 - u * u - v * v));
    x.save();
    x.translate(c + u * c, c + v * c); x.rotate(Math.atan2(v, u)); x.scale(nz, 1);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rr * c * 2);
    g.addColorStop(0, `rgba(255,250,236,${a})`); g.addColorStop(0.45, `rgba(255,250,236,${a * 0.5})`); g.addColorStop(1, 'rgba(255,250,236,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, rr * c * 2, 0, TAU); x.fill();
    x.restore();
  }
  x.restore();
  return cv;
}
// glow sprites are laid out around the moon at radius L.moonR
function makeGlow() {
  const s = 2000, c = s / 2, R0 = L.moonR, cv = mk(s, s), x = cv.getContext('2d');
  const g = x.createRadialGradient(c, c, R0 * 0.9, c, c, c);
  for (let i = 0; i <= 24; i++) {
    const f = i / 24, r = R0 * 0.9 + f * (c - R0 * 0.9), dr = Math.max(0, r - R0);
    const I = 0.46 * Math.exp(-dr / 48) + 0.34 * Math.exp(-dr / 165) + 0.13 * Math.exp(-dr / 440);
    const col = mixc([255, 230, 184], [120, 138, 196], sstep(0, 620, dr));
    g.addColorStop(f, rgba(col, I * (1 - f * f)));
  }
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return cv;
}
function makeDot(col) {
  const s = 64, cv = mk(s, s), x = cv.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.2, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return cv;
}
function makeSeal() {
  const s = 256, pad = 12, q = s - pad * 2, cv = mk(s, s), x = cv.getContext('2d'), R = mulberry32(8);
  x.fillStyle = rgba(PAL.cinnabar);
  x.beginPath();
  const corners = [[pad, pad], [s - pad, pad], [s - pad, s - pad], [pad, s - pad]];
  for (let e = 0; e < 4; e++) {
    const [ax, ay] = corners[e], [bx, by] = corners[(e + 1) % 4];
    for (let j = 0; j < 28; j++) {
      const u = j / 28, jx = (R() - 0.5) * 3.2, jy = (R() - 0.5) * 3.2;
      const px = lerp(ax, bx, u) + jx, py = lerp(ay, by, u) + jy;
      if (e === 0 && j === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
  }
  x.closePath(); x.fill();
  // 白文: the characters are carved out of the stone, so the paper shows through.
  // Read right column first: 栋森 / 网络
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#f4e8d2';
  const cell = q / 2, g = [['栋', 1, 0], ['森', 1, 1], ['网', 0, 0], ['络', 0, 1]];
  for (const [ch, col, row] of g) {
    x.save();
    x.translate(pad + cell * (col + 0.5) + (col ? -3 : 3), pad + cell * (row + 0.5) + (row ? -3 : 3));
    x.scale(1.06, 1.1);
    glyph(x, ch, 0, 0, cell * 0.86, 800, 'serif');
    x.restore();
  }
  // stone texture: speckle erosion, heavier toward the edges
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = '#000';
  for (let i = 0; i < 900; i++) {
    const px = R() * s, py = R() * s;
    const edge = Math.min(px, py, s - px, s - py);
    if (R() > 0.35 + 0.65 * (1 - clamp(edge / 40))) continue;
    x.globalAlpha = 0.3 + R() * 0.7;
    x.beginPath(); x.arc(px, py, 0.5 + R() * 1.6, 0, TAU); x.fill();
  }
  x.globalAlpha = 1;
  // ink density variation
  x.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 60; i++) {
    x.fillStyle = R() < 0.5 ? 'rgba(90,10,6,0.10)' : 'rgba(255,120,90,0.07)';
    x.beginPath(); x.arc(R() * s, R() * s, 6 + R() * 26, 0, TAU); x.fill();
  }
  return cv;
}

// ── build ────────────────────────────────────────────────────────────────────
async function build() {
  const fontsToLoad = [
    ['900 64px "Noto Serif SC"', '中秋快乐千里共团圆但愿人长久婵娟苏轼栋森网络'],
    ['400 64px "Noto Sans SC"', '栋森网络科技携祝大家北京上海深圳成都乌鲁木齐哈尔滨东京新加坡悉尼伦敦纽约旧金山迪拜家里'],
    ['400 64px "JetBrains Mono"', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ŌŪÀÈ→×·'],
  ];
  await Promise.all(fontsToLoad.map(([f, s]) => document.fonts.load(f, s)));
  await document.fonts.ready;

  const m = mk(8, 8).getContext('2d');
  S.emc = {};
  for (const k of ['serif', 'sans']) {
    font(m, 700, 100, FAM[k]);
    const mt = m.measureText('中');
    S.emc[k] = (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2 / 100;
  }

  S.noise = makeSimplex(mulberry32(7));
  const R = mulberry32(0x2026925);
  buildWorld(R);
  buildParticles(R);

  S.moonTex = makeMoon(1024);
  S.glow = makeGlow();
  S.dotCool = makeDot(PAL.cool);
  S.dotWarm = makeDot(PAL.gold);
  S.seal = makeSeal();

  // grain field (2px grain), gaussian-ish
  S.GW = W >> 1; S.GH = H >> 1;
  S.grain = new Float32Array(S.GW * S.GH);
  const G = mulberry32(31);
  for (let i = 0; i < S.grain.length; i++) S.grain[i] = (G() + G() + G() - 1.5) * 1.15;

  // working surfaces
  S.canvas = document.getElementById('stage');
  S.ctx = S.canvas.getContext('2d');
  S.sub = mk(W, H); S.sctx = S.sub.getContext('2d', { willReadFrequently: true });
  S.glowA = mk(BW, BH); S.gA = S.glowA.getContext('2d', { willReadFrequently: true });
  S.glowB = mk(BW, BH); S.gB = S.glowB.getContext('2d', { willReadFrequently: true });
  S.fx = mk(W, 420); S.fxc = S.fx.getContext('2d');
  S.acc = new Uint16Array(W * H * 4);
  S.bacc = new Float32Array(BW * BH * 4);
  S.rgb = new Uint8ClampedArray(W * H * 3);
  S.out = S.ctx.createImageData(W, H);
  // bilinear taps for the 4× bloom upsample
  S.bx0 = new Int32Array(W); S.bx1 = new Int32Array(W); S.bfx = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const g = (x + 0.5) / 4 - 0.5, x0 = clamp(Math.floor(g), 0, BW - 1);
    S.bx0[x] = x0 * 4; S.bx1[x] = Math.min(BW - 1, x0 + 1) * 4; S.bfx[x] = clamp(g - x0);
  }

  // pre-rendered sky: a base gradient and three atmospheres (cool dim, cool bright, moonlit)
  const sky = (atmo, a) => {
    const c = mk(W, H), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(PAL.sky0)); g.addColorStop(0.4, rgba(PAL.sky1)); g.addColorStop(1, rgba(PAL.sky2));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const r = x.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, 1250);
    r.addColorStop(0, rgba(atmo, a)); r.addColorStop(0.3, rgba(atmo, a * 0.45)); r.addColorStop(0.7, rgba(atmo, a * 0.1)); r.addColorStop(1, rgba(atmo, 0));
    x.globalCompositeOperation = 'lighter'; x.fillStyle = r; x.fillRect(0, 0, W, H);
    return c;
  };
  S.skyA = sky([60, 92, 170], 0.07);
  S.skyB = sky([60, 92, 170], 0.2);
  S.skyC = sky([150, 132, 120], 0.13);
  S.vig = mk(W, H);
  const vx = S.vig.getContext('2d'), vg = vx.createRadialGradient(L.cx, H * 0.46, H * 0.18, L.cx, H * 0.46, H * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  vx.fillStyle = vg; vx.fillRect(0, 0, W, H);

  buildEvents();
}

// ── camera ───────────────────────────────────────────────────────────────────
function camera(t) {
  let s = 1 + 0.03 * ez.soft(prog(t, 0, 6)) + 0.075 * ez.in(prog(t, 6, T.inhale)) + 0.02 * ez.out(prog(t, T.inhale, T.drop));
  let x = 0, y = 0;
  if (t >= T.drop) {
    const u = t - T.drop;
    s = 1 + 0.125 * Math.exp(-5 * u) + 0.02 * ez.soft(prog(t, 8.6, 12)) - 0.02 * ez.soft(prog(t, 11.9, 12.6)) + 0.012 * ez.soft(prog(t, 12.6, 15));
    const sh = 8 * Math.exp(-9 * u);
    x += sh * noise(u * 28, 1.3); y += sh * noise(u * 28, 7.1);
  }
  for (let i = 0; i < 4; i++) {
    const u = t - (T.stacc + 0.5 * i);
    if (u >= 0 && u < 0.6) s += 0.018 * Math.exp(-9 * u);
  }
  const us = t - T.seal;
  if (us >= 0 && us < 0.5) { const sh = 3.5 * Math.exp(-12 * us); x += sh * noise(us * 40, 3.3); y += sh * noise(us * 40, 9.9); }
  return { s, x, y };
}
function applyCam(ctx, cam, par = 1, k = 1) {
  const s = 1 + (cam.s - 1) * par;
  ctx.setTransform(k * s, 0, 0, k * s, k * (L.cx - L.cx * s + cam.x * par), k * (L.cy - L.cy * s + cam.y * par));
}

// ── world layers ─────────────────────────────────────────────────────────────
function drawSky(ctx, t) {
  // cool and dim → cool and charged (the build) → moonlit
  const build = ez.soft(prog(t, 0.4, 2)) * 0.3 + ez.soft(prog(t, 4.5, 7.9)) * 0.7;
  const moonlit = ez.soft(prog(t, 7.95, 9.2));
  ctx.globalAlpha = 1; ctx.drawImage(S.skyA, 0, 0);
  if (build * (1 - moonlit) > 0.004) { ctx.globalAlpha = build * (1 - moonlit); ctx.drawImage(S.skyB, 0, 0); }
  if (moonlit > 0.004) { ctx.globalAlpha = moonlit; ctx.drawImage(S.skyC, 0, 0); }
  ctx.globalAlpha = 1;
}

function drawStars(ctx, t) {
  const intro = ez.soft(prog(t, 0.1, 1.6));
  const glare = ez.soft(prog(t, 7.9, 8.6));
  ctx.fillStyle = '#dde6ff';
  for (const s of S.stars) {
    let a = s.a * (0.6 + 0.4 * Math.sin(t * s.f * TAU + s.ph)) * intro;
    if (glare > 0) a *= lerp(1, sstep(320, 720, Math.hypot(s.x - L.cx, s.y - L.cy)), glare);
    if (a < 0.01) continue;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSonar(ctx, g, t) {
  // heartbeat: a ring leaves home on every beat, 0.5 s → 5.5 s
  for (let b = 1; b <= 11; b++) {
    const u = (t - b * 0.5) / 0.6;
    if (u < 0 || u > 1) continue;
    const k = ez.out(u), w = warmth(S.home, b * 0.5);
    ctx.strokeStyle = rgba(mixc(PAL.cool, PAL.gold, w), 0.42 * (1 - u) * (1 - prog(t, 5.6, 6)));
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(L.cx, L.cy, 7 + 44 * k, 0, TAU); ctx.stroke();
  }
  const u = prog(t, T.home, T.sonarEnd);
  if (u <= 0 || u >= 1) return;
  const r = sonarR(t), a = 0.55 * Math.pow(1 - u, 1.2);
  const band = ctx.createRadialGradient(L.cx, L.cy, Math.max(0, r - 110), L.cx, L.cy, r);
  band.addColorStop(0, rgba(PAL.cool, 0)); band.addColorStop(1, rgba(PAL.cool, a * 0.13));
  ctx.fillStyle = band; ctx.beginPath(); ctx.arc(L.cx, L.cy, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(PAL.cool, a); ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(L.cx, L.cy, r, 0, TAU); ctx.stroke();
  g.strokeStyle = rgba(PAL.cool, a * 0.8); g.lineWidth = 5;
  g.beginPath(); g.arc(L.cx, L.cy, r, 0, TAU); g.stroke();
}

function drawMesh(ctx, g, t) {
  if (t < T.gong || t > 6.7) return;
  const fade = 1 - ez.soft(prog(t, 6.0, 6.7));
  ctx.lineWidth = 1;
  for (const e of S.edges) {
    const k = ez.out(prog(t, e.t0, e.t0 + 0.34));
    if (k <= 0) continue;
    const A = S.P[e.a], B = S.P[e.b], na = S.nodes[e.a], nb = S.nodes[e.b];
    const w = (warmth(na, t) + warmth(nb, t)) / 2;
    ctx.strokeStyle = rgba(mixc(PAL.cool, PAL.gold, w), (0.13 + 0.12 * w) * fade);
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(lerp(A[0], B[0], k), lerp(A[1], B[1], k)); ctx.stroke();
  }
}

const qb = (p0, c, p1, s) => { const m = 1 - s; return [m * m * p0[0] + 2 * m * s * c[0] + s * s * p1[0], m * m * p0[1] + 2 * m * s * c[1] + s * s * p1[1]]; };
function arcGeom(c, t) {
  const H0 = S.P[0], P = S.P[c.i];
  const cv = ez.inOut(prog(t, c.ta, c.ta + 0.55));
  const dx = P[0] - H0[0], dy = P[1] - H0[1], len = Math.hypot(dx, dy) || 1;
  const bul = 0.2 * len * cv;
  return { H0, P, cv, C: [(H0[0] + P[0]) / 2 - (dy / len) * bul, (H0[1] + P[1]) / 2 + (dx / len) * bul] };
}
function strokeQuad(ctx, p0, c, p1, s0, s1) {
  const n = 28;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const p = qb(p0, c, p1, lerp(s0, s1, i / n));
    if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
}
function drawArcs(ctx, g, t) {
  if (t < T.measure || t > 6.6) return;
  const fade = 1 - ez.soft(prog(t, 5.95, 6.55));
  for (const c of S.cityNodes) {
    const { H0, P, cv, C } = arcGeom(c, t);
    // measuring line: dashed, straight, marching — "how far"
    const m = ez.out(prog(t, c.tm, c.tm + 0.55));
    if (m > 0 && cv < 1) {
      ctx.setLineDash([2, 6]); ctx.lineDashOffset = -t * 18;
      ctx.strokeStyle = rgba(PAL.cool, 0.34 * (1 - cv) * fade); ctx.lineWidth = 1;
      strokeQuad(ctx, H0, C, P, 0, m);
      ctx.setLineDash([]);
    }
    // connection: a warm arc drawn by a travelling head
    const h = ez.out(prog(t, c.ta, c.tArrive));
    if (h > 0) {
      ctx.strokeStyle = rgba(PAL.gold, 0.62 * fade); ctx.lineWidth = 1.4;
      strokeQuad(ctx, H0, C, P, 0, h);
      g.strokeStyle = rgba(PAL.gold, 0.5 * fade); g.lineWidth = 4;
      strokeQuad(g, H0, C, P, 0, h);
      if (h < 1) {
        const p = qb(H0, C, P, h);
        g.globalAlpha = 1; g.drawImage(S.dotWarm, p[0] - 22, p[1] - 22, 44, 44);
        ctx.fillStyle = rgba(PAL.moon, 0.95); ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, TAU); ctx.fill();
      }
      // packets: out and back again, twice
      for (let k = 0; k < 3; k++) {
        const t0 = c.tArrive + 0.12 + k * 0.33;
        const u = prog(t, t0, t0 + 0.42);
        if (u <= 0 || u >= 1) continue;
        const s = k % 2 ? 1 - ez.soft(u) : ez.soft(u);
        const tail = k % 2 ? 0.1 : -0.1;
        ctx.strokeStyle = rgba(PAL.moon, 0.9 * fade); ctx.lineWidth = 2;
        strokeQuad(ctx, H0, C, P, clamp(s + tail), s);
        const p = qb(H0, C, P, s);
        g.globalAlpha = 0.9 * fade; g.drawImage(S.dotWarm, p[0] - 16, p[1] - 16, 32, 32); g.globalAlpha = 1;
      }
    }
  }
}

function drawChords(ctx, g, t) {
  if (t < 6.05 || t > T.drop + 0.35) return;
  const N = S.ringN, R = ringR(t), rot = ringRot(t), k = kAt(t);
  let a = 0.3 * ez.soft(prog(t, 6.05, 6.75)) * (1 + 1.1 * ez.in(prog(t, 7.0, 8.0)));
  if (t >= T.drop) a = 0.66 * 2.4 * Math.exp(-(t - T.drop) * 10);
  const col = mixc(PAL.gold, PAL.moon, ez.in(prog(t, 7.3, 8.0)));
  ctx.globalCompositeOperation = 'lighter'; g.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 1;
  g.strokeStyle = rgba(col, a * 0.55); g.lineWidth = 4;
  for (let i = 0; i < N; i++) {
    const a1 = S.theta0 + (TAU * i) / N + rot, a2 = S.theta0 + (TAU * ((i * k) % N)) / N + rot;
    const x1 = L.cx + R * Math.cos(a1), y1 = L.cy + R * Math.sin(a1), x2 = L.cx + R * Math.cos(a2), y2 = L.cy + R * Math.sin(a2);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (i % 2 === 0) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  }
  ctx.globalCompositeOperation = 'source-over'; g.globalCompositeOperation = 'source-over';
}

// the moment the circle closes (团圆): one clean pulse along the ring
function drawRingLock(ctx, g, t) {
  const u = prog(t, 6.02, 6.7);
  if (u <= 0 || u >= 1) return;
  const r = L.ringR * (1 + 0.035 * ez.out(u)), a = Math.pow(1 - u, 2);
  ctx.strokeStyle = rgba(PAL.moon, 0.85 * a); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(L.cx, L.cy, r, 0, TAU); ctx.stroke();
  g.strokeStyle = rgba(PAL.gold, 0.9 * a); g.lineWidth = 8;
  g.beginPath(); g.arc(L.cx, L.cy, r, 0, TAU); g.stroke();
}

function drawNodes(ctx, g, t) {
  if (t >= T.drop) return;
  for (const n of S.nodes) {
    if (n.home) continue;
    const u = t - n.appear;
    if (u < 0) continue;
    const [x, y] = S.P[n.i];
    const w = warmth(n, t), col = mixc(PAL.cool, PAL.gold, w);
    const pop = 1 + 1.3 * Math.exp(-11 * u);
    const tw = 0.75 + 0.25 * Math.sin(t * 2.3 + n.ph * 3);
    const onRing = sstep(n.ce - 0.1, n.ce + 0.2, t);
    const r = n.r * pop * lerp(1, 0.75, onRing) * (1 + 0.6 * ez.in(prog(t, 7.3, 8.0)));
    const a = n.a * clamp(u / 0.05) * lerp(tw, 1, onRing);
    ctx.fillStyle = rgba(mixc(col, PAL.moon, 0.35), a);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    g.globalAlpha = a * (0.55 + 0.45 * w);
    const gs = n.city ? 30 : 20;
    g.drawImage(w > 0.5 ? S.dotWarm : S.dotCool, x - gs / 2, y - gs / 2, gs, gs);
    if (u < 0.55) { // ripple on arrival of the sonar
      const k = ez.out(u / 0.55);
      ctx.strokeStyle = rgba(col, 0.55 * (1 - k)); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 3 + (n.city ? 26 : 14) * k, 0, TAU); ctx.stroke();
    }
    if (n.city && u > 0.02 && t < n.cs + 0.3) { // map-pin ring
      const k = ez.out(prog(t, n.appear, n.appear + 0.4)) * (1 - prog(t, 4.9, 5.3));
      ctx.strokeStyle = rgba(col, 0.8 * k); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU); ctx.stroke();
    }
    const fl = t - (n.tArrive ?? 99);   // flash when the connection lands
    if (fl > 0 && fl < 0.5) { g.globalAlpha = 1.3 * Math.exp(-7 * fl); g.drawImage(S.dotWarm, x - 36, y - 36, 72, 72); }
  }
  g.globalAlpha = 1;
}

function drawHome(ctx, g, t) {
  if (t < T.home) { // a caret blinks where home will be — someone is about to write
    const on = t > 0.06 && Math.floor((t - 0.06) / 0.11) % 2 === 0;
    const sq = ez.in(prog(t, 0.4, T.home));
    if (on || sq > 0) {
      ctx.fillStyle = rgba(PAL.ivory, 0.9);
      ctx.fillRect(L.cx - 1.5, L.cy - 15 * (1 - sq), 3, 30 * (1 - sq) + 3 * sq);
    }
    return;
  }
  if (t >= T.drop) return;
  const u = t - T.home, w = warmth(S.home, t);
  const col = mixc(PAL.cool, PAL.gold, w);
  const k = ez.out(prog(u, 0, 0.5));
  const pop = 1 + 1.6 * Math.exp(-9 * u);
  ctx.fillStyle = rgba(mixc(col, PAL.moon, 0.5), k);
  ctx.beginPath(); ctx.arc(L.cx, L.cy, 4.2 * pop, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(col, 0.9 * k * (1 - prog(t, 5.5, 6.2))); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(L.cx, L.cy, 11 + 3 * Math.exp(-6 * u), 0, TAU); ctx.stroke();
  // crosshair ticks
  const cr = 1 - prog(t, 5.3, 5.8);
  if (cr > 0) {
    ctx.strokeStyle = rgba(col, 0.6 * k * cr); ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(L.cx + dx * 17, L.cy + dy * 17); ctx.lineTo(L.cx + dx * 25, L.cy + dy * 25); }
    ctx.stroke();
  }
  g.globalAlpha = k; g.drawImage(w > 0.5 ? S.dotWarm : S.dotCool, L.cx - 40, L.cy - 40, 80, 80); g.globalAlpha = 1;
  // the core gathers light before the drop
  const c = ez.in(prog(t, 5.8, 7.98));
  if (c > 0) {
    const rr = 30 + 170 * c;
    const rg = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, rr);
    rg.addColorStop(0, rgba(PAL.moon, 0.2 + 0.7 * c)); rg.addColorStop(0.25, rgba(PAL.gold, 0.25 * c + 0.05)); rg.addColorStop(1, rgba(PAL.gold, 0));
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(L.cx, L.cy, rr, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  }
}

function drawLabels(ctx, t) {
  if (t > 5.2) return;
  const items = [S.home, ...S.cityNodes];
  items.forEach((n, idx) => {
    const t0 = n.appear + 0.05;
    const kin = ez.out(prog(t, t0, t0 + 0.45));
    if (kin <= 0) return;
    const out = ez.in(prog(t, 4.62 + idx * 0.022, 4.92 + idx * 0.022));
    const [x, y] = S.P[n.i];
    const side = n.side, a = kin * (1 - out);
    if (a <= 0.01) return;
    const x0 = x + side * 12;
    // leader
    ctx.strokeStyle = rgba(PAL.ivory, 0.35 * a); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + side * 5, y); ctx.lineTo(x0 + side * 10 * kin, y); ctx.stroke();
    // wipe mask
    const wid = 230 * lerp(kin, 1, 0) * (1 - out);
    ctx.save();
    ctx.beginPath();
    if (side > 0) ctx.rect(x0 + 12, y - 40, wid, 80); else ctx.rect(x0 - 12 - wid, y - 40, wid, 80);
    ctx.clip();
    const tx = x0 + side * 16, al = side > 0 ? 'left' : 'right';
    ctx.fillStyle = rgba(PAL.ivory, 0.94 * a);
    const cn = n.home ? '家' : n.cn;
    const cw = line(ctx, cn, tx, y + 2, n.home ? 25 : 21, { w: n.home ? 600 : 500, fam: n.home ? 'serif' : 'sans', align: al, track: 0.06 });
    ctx.fillStyle = rgba(PAL.ivory, 0.46 * a);
    const en = n.home ? 'HOME' : n.en;
    line(ctx, en, tx + side * (cw + 9), y + 1, 10.5, { w: 500, track: 0.16, align: al, p: prog(t, t0, t0 + 0.4), seed: 40 + idx });
    ctx.fillStyle = rgba(PAL.ivory, 0.58 * a);
    const sub = n.home ? '34.54°N 108.92°E' : `${Math.round(n.li * ez.out(prog(t, t0, t0 + 0.8))).toLocaleString('en-US')} 里`;
    line(ctx, sub, tx, y + 22, 12, { w: 400, track: 0.06, align: al });
    ctx.restore();
  });
}

function moonScale(t) { const u = t - T.drop; return 1 - 0.172 * Math.exp(-9 * u) * Math.cos(TAU * 2.2 * u); }
function moonGlowI(t) {
  if (t < T.drop) return 0;
  const u = t - T.drop;
  let I = 1 + 1.3 * Math.exp(-4.5 * u) + 0.05 * Math.sin(t * 1.9);
  for (let i = 0; i < 4; i++) { const v = t - (T.stacc + 0.5 * i); if (v >= 0 && v < 0.8) I += 0.55 * Math.exp(-7 * v); }
  const v = t - T.collapse; if (v >= 0 && v < 1) I += 0.4 * Math.exp(-5 * v);
  return I;
}
function drawMoon(ctx, t) {
  if (t < T.drop) return;
  const u = t - T.drop, R = L.moonR * moonScale(t), I = moonGlowI(t);
  // glow is blitted 1:1 (no resampling — the cheap path); intensity rides on alpha
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(I * 0.62);
  ctx.drawImage(S.glow, L.cx - 1000, L.cy - 1000);
  if (I > 1.6) { ctx.globalAlpha = clamp((I - 1.6) * 0.55); ctx.drawImage(S.glow, L.cx - 1000, L.cy - 1000); }
  // 月晕 — a faint 22° halo
  const hr = R * 1.62, ha = 0.07 * ez.soft(prog(t, 8.3, 9.5));
  const hg = ctx.createRadialGradient(L.cx, L.cy, hr - 40, L.cx, L.cy, hr + 26);
  hg.addColorStop(0, 'rgba(255,170,120,0)'); hg.addColorStop(0.55, `rgba(255,214,170,${ha})`); hg.addColorStop(0.8, `rgba(170,200,255,${ha * 0.5})`); hg.addColorStop(1, 'rgba(170,200,255,0)');
  ctx.globalAlpha = 1; ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(L.cx, L.cy, hr + 26, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(S.moonTex, L.cx - R, L.cy - R, R * 2, R * 2);
  // the disc is born white-hot and cools into its surface
  const hot = Math.exp(-7 * u);
  if (hot > 0.004) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,246,226,${(hot * 0.95).toFixed(4)})`;
    ctx.beginPath(); ctx.arc(L.cx, L.cy, R + 0.5, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  // edge bloom spilling over the limb
  const eg = ctx.createRadialGradient(L.cx, L.cy, R * 0.9, L.cx, L.cy, R * 1.12);
  eg.addColorStop(0, 'rgba(255,236,200,0)'); eg.addColorStop(0.45, `rgba(255,236,200,${0.1 * I})`); eg.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = eg;
  ctx.beginPath(); ctx.arc(L.cx, L.cy, R * 1.12, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function floret(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  for (let k = 0; k < 4; k++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.ellipse(s * 0.55, 0, s * 0.55, s * 0.36, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawParticles(ctx, g, t) {
  if (t < T.drop) return;
  const u = t - T.drop, rot = ringRot(T.drop), R0 = ringR(T.drop - 1e-4);
  ctx.globalCompositeOperation = 'lighter';
  for (const b of S.burst) {
    if (u > b.life) continue;
    const a0 = b.n.theta + rot;
    const dx = Math.cos(a0) - b.tang * Math.sin(a0), dy = Math.sin(a0) + b.tang * Math.cos(a0);
    const disp = (b.v / b.k) * (1 - Math.exp(-b.k * u));
    const x = L.cx + R0 * Math.cos(a0) + dx * disp + 16 * u + 7 * Math.sin(u * 1.3 + b.tw);
    const y = L.cy + R0 * Math.sin(a0) + dy * disp + 10 * u * u * 0.5 + 12 * u;
    const life = 1 - sstep(b.life * 0.55, b.life, u);
    const a = life * (0.55 + 0.45 * Math.sin(t * 5 + b.tw)) * clamp(u / 0.03);
    const col = mixc(PAL.moon, PAL.gold, clamp(u / 1.2));
    ctx.fillStyle = rgba(col, a);
    if (b.fl) floret(ctx, x, y, b.size * 2.1, b.rot + u * 0.9);
    else { ctx.beginPath(); ctx.arc(x, y, b.size * (1 + 1.2 * Math.exp(-6 * u)), 0, TAU); ctx.fill(); }
    if (u < 0.6 || b.fl) { g.globalAlpha = a * 0.8; g.drawImage(S.dotWarm, x - 10, y - 10, 20, 20); }
  }
  // drifting osmanthus
  const af = ez.soft(prog(t, 8.3, 9.4));
  for (const p of S.ambient) {
    const y = ((p.y + p.vy * u) % (H + 80)) - 40;
    const x = ((p.x + p.vx * u + p.sw * Math.sin(u * p.sf * TAU + p.ph)) % (W + 40) + W + 40) % (W + 40) - 20;
    const a = p.a * af * (0.6 + 0.4 * Math.sin(t * 2.2 + p.ph));
    ctx.fillStyle = rgba(PAL.gold, a);
    if (p.fl) floret(ctx, x, y, p.size * 1.8, p.rot + u * p.vr);
    else { ctx.beginPath(); ctx.arc(x, y, p.size * 0.8, 0, TAU); ctx.fill(); }
  }
  ctx.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}
function drawBokeh(ctx, t) {
  if (t < T.drop) return;
  const u = t - T.drop, af = ez.soft(prog(t, 8.4, 9.6));
  ctx.globalCompositeOperation = 'lighter';
  for (const p of S.bokeh) {
    const y = ((p.y + p.vy * u) % (H + 200)) - 100, x = (p.x + p.vx * u + 30 * Math.sin(u * 0.6 + p.ph)) % (W + 100) - 50;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, p.size);
    rg.addColorStop(0, rgba(PAL.gold, p.a * af)); rg.addColorStop(0.7, rgba(PAL.gold, p.a * af * 0.6)); rg.addColorStop(1, rgba(PAL.gold, 0));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}
function drawShock(ctx, g, t) {
  const u = t - T.drop;
  if (u < 0 || u > 1.2) return;
  const rAt = (d, uu) => 250 + 1250 * ez.out(prog(uu, d, d + 1.05));
  for (const [d, wmax, amax] of [[0, 3, 0.75], [0.07, 1.4, 0.45]]) {
    const v = prog(u, d, d + 1.05);
    if (v <= 0 || v >= 1) continue;
    const r = rAt(d, u);
    // widen the stroke to the distance travelled between motion-blur samples (keeps energy constant)
    const step = Math.abs(rAt(d, u + 0.001) - rAt(d, u - 0.001)) / 0.002 * (0.5 / FPS / 8);
    const w0 = wmax * (1 - v) + 0.4, lw = Math.max(w0, step * 1.15);
    ctx.strokeStyle = rgba(PAL.moon, amax * Math.pow(1 - v, 1.6) * (w0 / lw)); ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(L.cx, L.cy, r, 0, TAU); ctx.stroke();
    g.strokeStyle = rgba(PAL.gold, amax * 0.8 * Math.pow(1 - v, 1.6)); g.lineWidth = 10;
    g.beginPath(); g.arc(L.cx, L.cy, r, 0, TAU); g.stroke();
  }
}

// ── typography ───────────────────────────────────────────────────────────────
function typeQianli(ctx, t) {
  if (t < T.qianli || t > 3.95) return;
  const px = 250, cy = L.typeY - 14;
  const gap = lerp(0.1, 0.8, ez.soft(prog(t, 2.05, 3.55)));      // the two characters drift apart…
  const fly = 860 * ez.in(prog(t, T.qianliOut, 3.92));            // …and leave the frame
  ctx.fillStyle = rgba(PAL.ivory);
  ['千', '里'].forEach((ch, i) => {
    const dir = i ? 1 : -1;
    const x = L.cx + dir * px * (0.5 + gap / 2) + dir * fly;
    const k = ez.out(prog(t, T.qianli + i * 0.07, T.qianli + i * 0.07 + 0.8));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - px, cy - px * 0.58, px * 2, px * 1.16); ctx.clip();
    glyph(ctx, ch, x, cy + (1 - k) * px * 1.12, px, lerp(200, 320, k));
    ctx.restore();
  });
  const a = ez.out(prog(t, 2.2, 2.7)) * (1 - prog(t, 3.45, 3.62));
  ctx.fillStyle = rgba(PAL.ivory, 0.6 * a);
  line(ctx, 'A THOUSAND MILES APART', L.cx, cy + px * 0.5 + 76, 16, { w: 500, track: 0.42 + gap * 0.5, align: 'center', p: prog(t, 2.2, 2.9), seed: 11 });
}

function typeGong(ctx, t) {
  if (t < T.gong || t > 5.95) return;
  const px = 420, cy = L.typeY + 6;
  const wgt = lerp(200, 900, ez.soft(prog(t, 4.0, 5.2)));   // the stroke thickens as the ties form
  let s = lerp(1.13, 1, ez.out(prog(t, 4.0, 4.9)));
  let a = ez.out(prog(t, 4.0, 4.2));
  const blur = (1 - ez.out(prog(t, 4.0, 4.45))) * 16;
  const zo = prog(t, T.gongOut, 5.93);
  s *= 1 + 5.2 * ez.in(zo);
  a *= 1 - ez.in2(prog(t, 5.56, 5.93));
  ctx.save();
  ctx.translate(L.cx, cy); ctx.scale(s, s);
  if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.fillStyle = rgba(PAL.ivory, a);
  glyph(ctx, '共', 0, 0, px, wgt);
  ctx.restore();
  const ca = ez.out(prog(t, 4.25, 4.7)) * (1 - prog(t, 5.3, 5.5));
  ctx.fillStyle = rgba(PAL.ivory, 0.6 * ca);
  line(ctx, 'TOGETHER AS ONE', L.cx, cy + px * 0.5 + 64, 16, { w: 500, track: 0.5, align: 'center', p: prog(t, 4.25, 4.95), seed: 21 });
}

function typeTuanyuan(ctx, t) {
  if (t < T.tuanyuan || t >= T.drop) return;
  const px = 240, cy = L.typeY - 14;
  const gap = lerp(0.34, 0.04, ez.soft(prog(t, 6.6, 7.72)));     // …and here they come back together
  const inh = ez.in(prog(t, T.inhale, 7.99));
  ctx.fillStyle = rgba(PAL.ivory, 1 - inh);
  ['团', '圆'].forEach((ch, i) => {
    const dir = i ? 1 : -1;
    const k = ez.out(prog(t, T.tuanyuan + i * 0.035, T.tuanyuan + i * 0.035 + 0.75));
    const x = lerp(L.cx + dir * 880, L.cx + dir * px * (0.5 + gap / 2), k) - dir * inh * px * 0.45;
    ctx.save(); ctx.translate(x, cy); ctx.scale(1 - 0.18 * inh, 1 - 0.18 * inh);
    glyph(ctx, ch, 0, 0, px, 900);
    ctx.restore();
  });
  const k = kAt(t), ca = ez.out(prog(t, 6.3, 6.8)) * (1 - inh);
  ctx.fillStyle = rgba(PAL.ivory, 0.5 * ca);
  line(ctx, `n → n × k  mod ${S.ringN}`, L.cx - 30, cy + px * 0.5 + 76, 15, { w: 400, track: 0.12, align: 'right', p: prog(t, 6.3, 6.9), seed: 31 });
  ctx.fillStyle = rgba(PAL.gold, 0.85 * ca);
  line(ctx, `k = ${k.toFixed(3)}`, L.cx + 30, cy + px * 0.5 + 76, 15, { w: 500, track: 0.12, align: 'left', p: prog(t, 6.35, 6.95), seed: 32 });
}

const COUPLET = ['但愿人长久', '千里共婵娟'];
function typeCouplet(ctx, t) {
  if (t < T.couplet || (t > 10.0 && t < 12.3)) return;
  const px = 46, pitch = 62, y0 = L.cy - 2 * pitch;
  const cols = [{ x: 942, t0: T.couplet }, { x: 138, t0: T.couplet + 0.625 }];
  const leave = 1 - prog(t, 9.84, 9.98);
  const back = ez.out(prog(t, 12.35, 13.0));
  cols.forEach((c, ci) => {
    [...COUPLET[ci]].forEach((ch, i) => {
      const tc = c.t0 + i * 0.125, e = ez.out(prog(t, tc, tc + 0.45));
      let a = t < 11 ? e * leave : back * 0.78;
      if (a <= 0.005) return;
      const blur = t < 11 ? (1 - e) * 7 : (1 - back) * 5;
      const dy = t < 11 ? (1 - e) * 18 : (1 - back) * 10;
      // 千里 / 共 were set earlier in the film — they arrive gilded, then cool to ivory
      const echo = ci === 1 && i <= 2 && t < 11 ? Math.exp(-2.2 * Math.max(0, t - tc - 0.2)) : 0;
      ctx.save();
      if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.fillStyle = rgba(mixc(PAL.ivory, PAL.gold, echo), a);
      glyph(ctx, ch, c.x, y0 + i * pitch + dy, px, lerp(300, 500, e), 'serif');
      ctx.restore();
    });
  });
  // attribution
  const aa = t < 11 ? ez.out(prog(t, 9.0, 9.5)) * leave : 0;
  if (aa > 0) {
    ctx.fillStyle = rgba(PAL.ivory, 0.55 * aa);
    line(ctx, '苏轼 · 水调歌头', L.cx, 1238, 20, { w: 400, fam: 'serif', track: 0.55, align: 'center' });
    ctx.fillStyle = rgba(PAL.ivory, 0.32 * aa);
    line(ctx, 'SU SHI · 1076', L.cx, 1272, 11, { w: 500, track: 0.4, align: 'center', p: prog(t, 9.1, 9.6), seed: 51 });
  }
}

const STACC = [['中', 'ZHŌNG'], ['秋', 'QIŪ'], ['快', 'KUÀI'], ['乐', 'LÈ']];
const STACC_Y = 1000, STACC_PX = 860;
function typeStacc(ctx, t) {
  if (t < T.stacc || t >= T.collapse) return;
  const i = Math.min(3, Math.floor((t - T.stacc) / 0.5)), u = t - (T.stacc + i * 0.5);
  const s = lerp(1.13, 1, ez.out(clamp(u / 0.45))) * (1 - 0.035 * u);   // lands, then keeps breathing in
  const a = clamp(u / 0.034);
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.translate(L.cx, STACC_Y); ctx.scale(s, s);
  ctx.fillStyle = rgba(PAL.ivory, a);
  glyph(ctx, STACC[i][0], 0, 0, STACC_PX, 900);
  ctx.restore();
  ctx.fillStyle = rgba(PAL.ivory, 0.75 * a);
  line(ctx, STACC[i][1], L.cx, 1560, 22, { w: 500, track: 0.7, align: 'center', p: prog(u, 0, 0.18), seed: 60 + i });
  ctx.fillStyle = rgba(PAL.ivory, 0.4 * a);
  line(ctx, `0${i + 1} / 04`, L.cx, 1600, 11, { w: 500, track: 0.4, align: 'center' });
}

const FIN = { px: 172, track: 0.14, y: 1338 };
function finPos(i) { return L.cx + (i - 1.5) * FIN.px * (1 + FIN.track); }
function typeFinale(ctx, t) {
  if (t < T.collapse) return;
  // The giant 乐 was a close-up all along: the whole line pulls back as one rigid
  // body (log-space zoom), so 中 秋 快 sweep in from the left and lock into place.
  const u = ez.out(prog(t, T.collapse, T.collapse + 0.8));
  const s = Math.exp(lerp(Math.log(STACC_PX / FIN.px), 0, u));
  const ax = finPos(3), ay = FIN.y, bx = lerp(L.cx, ax, u), by = lerp(STACC_Y, ay, u);
  const diff = 1 - sstep(0.15, 0.7, u);
  for (let i = 0; i < 4; i++) {
    const x = (finPos(i) - ax) * s + bx, y = (FIN.y - ay) * s + by;
    if (x < -FIN.px * s || x > W + FIN.px * s) continue;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    if (diff > 0.01) {
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = rgba(PAL.ivory, diff);
      glyph(ctx, STACC[i][0], 0, 0, FIN.px, 900);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba(PAL.ivory, 1 - diff);
    glyph(ctx, STACC[i][0], 0, 0, FIN.px, 900);
    ctx.restore();
  }
  typeLead(ctx, t);
  // HAPPY MID-AUTUMN FESTIVAL, flanked by hairlines
  const ea = ez.out(prog(t, 12.5, 13.0));
  if (ea > 0) {
    ctx.fillStyle = rgba(PAL.ivory, 0.55 * ea);
    const w = line(ctx, 'HAPPY MID-AUTUMN FESTIVAL', L.cx, 1470, 15, { w: 500, track: 0.62, align: 'center', p: prog(t, 12.5, 13.05), seed: 71 });
    const hl = ez.out(prog(t, 12.6, 13.2)) * 70;
    ctx.strokeStyle = rgba(PAL.ivory, 0.35 * ea); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L.cx - w / 2 - 22, 1465); ctx.lineTo(L.cx - w / 2 - 22 - hl, 1465);
    ctx.moveTo(L.cx + w / 2 + 22, 1465); ctx.lineTo(L.cx + w / 2 + 22 + hl, 1465);
    ctx.stroke();
  }
  drawSeal(ctx, t);
  drawShine(ctx, t);
}

// The sign-off streams in token by token, the way a model writes.
const LEAD = [['栋森', 600], ['网络', 600], ['科技', 600], [' 携 ', 300], ['Opus', 600], [' 5.5', 600], [' 祝', 300], ['大家', 300]];
function typeLead(ctx, t) {
  if (t < T.lead) return;
  const px = 30, y = 1206, tr = 0.14;
  const ws = LEAD.map(([s, w]) => textWidth(ctx, s, px, w, 'sans', tr) + tr * px);
  const total = ws.reduce((a, b) => a + b, 0);
  let x = L.cx - total / 2;
  let end = x;
  LEAD.forEach(([s, w], k) => {
    const tk = T.lead + k * 0.0625, a = ez.out(prog(t, tk, tk + 0.18));
    if (a > 0) {
      ctx.fillStyle = rgba(PAL.ivory, (w > 400 ? 0.95 : 0.7) * a);
      line(ctx, s, x, y + (1 - a) * 6, px, { w, fam: 'sans', track: tr });
      end = x + ws[k];
    }
    x += ws[k];
  });
  // cursor
  const done = T.lead + LEAD.length * 0.0625;
  const blink = t < done ? 1 : (Math.floor((t - done) / 0.25) % 2 === 0 ? 1 : 0);
  const ca = t < 13.5 ? blink : 0;
  if (ca && t >= T.lead) { ctx.fillStyle = rgba(PAL.gold, 0.9); ctx.fillRect(end + 4, y - 25, 3, 30); }
}

function drawSeal(ctx, t) {
  const u = t - T.seal;
  if (u < -0.16) return;
  const size = 96, x = L.cx, y = 1596;
  let s, a;
  if (u < 0) { const k = ez.in(prog(u, -0.16, 0)); s = lerp(1.7, 1, k); a = k * 0.85; }
  else { s = 1 - 0.05 * Math.exp(-14 * u) * Math.cos(u * 40); a = 1; }
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-0.045); ctx.scale(s, s);
  if (u >= 0 && u < 0.6) { // ink bloom at contact
    const k = u / 0.6;
    ctx.globalAlpha = 0.35 * (1 - k);
    ctx.filter = `blur(${(4 + 10 * k).toFixed(1)}px)`;
    ctx.drawImage(S.seal, -size * 0.62, -size * 0.62, size * 1.24, size * 1.24);
    ctx.filter = 'none';
  }
  ctx.globalAlpha = a;
  ctx.drawImage(S.seal, -size / 2, -size / 2, size, size);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawShine(ctx, t) {
  const u = prog(t, T.shine, T.shine + 0.8);
  if (u <= 0 || u >= 1) return;
  const f = S.fxc, top = FIN.y - 210;
  f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, W, 420);
  f.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) glyph(f, STACC[i][0], finPos(i), FIN.y - top, FIN.px, 900);
  f.globalCompositeOperation = 'source-in';
  const bx = lerp(-200, W + 200, ez.soft(u));
  const g = f.createLinearGradient(bx - 150, 0, bx + 150, 120);
  g.addColorStop(0, 'rgba(255,214,150,0)'); g.addColorStop(0.5, 'rgba(255,230,180,0.85)'); g.addColorStop(1, 'rgba(255,214,150,0)');
  f.fillStyle = g; f.fillRect(0, 0, W, 420);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(S.fx, 0, top);
  ctx.globalCompositeOperation = 'source-over';
}

// ── HUD ──────────────────────────────────────────────────────────────────────
const CHAPTERS = [[0, '01', '千里', 'DISTANCE'], [4, '02', '相连', 'CONNECTION'], [6, '03', '团圆', 'REUNION'], [8, '04', '婵娟', 'THE MOON'], [10, '05', '中秋', 'MID-AUTUMN']];
function drawHUD(ctx, t) {
  const a = ez.out(prog(t, 0.05, 0.7));
  const M = 60;
  // registration corners
  const arm = 22 * ez.out(prog(t, 0, 0.5));
  ctx.strokeStyle = rgba(PAL.ivory, 0.45 * a); ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[40, 40, 1, 1], [W - 40, 40, -1, 1], [40, H - 40, 1, -1], [W - 40, H - 40, -1, -1]]) {
    ctx.moveTo(x + sx * arm, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * arm);
  }
  ctx.stroke();
  // top: who & when
  ctx.fillStyle = rgba(PAL.ivory, 0.82 * a);
  line(ctx, '栋森网络科技', M, 92, 19, { w: 500, fam: 'sans', track: 0.3, p: prog(t, 0.08, 0.6), seed: 1 });
  line(ctx, '丙午 · 八月十五', W - M, 92, 19, { w: 500, fam: 'serif', track: 0.3, align: 'right', p: prog(t, 0.14, 0.66), seed: 2 });
  ctx.fillStyle = rgba(PAL.ivory, 0.42 * a);
  line(ctx, 'DONGSEN NETWORK', M, 118, 10.5, { w: 500, track: 0.32, p: prog(t, 0.12, 0.7), seed: 3 });
  line(ctx, 'MID-AUTUMN · 2026', W - M, 118, 10.5, { w: 500, track: 0.32, align: 'right', p: prog(t, 0.18, 0.76), seed: 4 });
  // bottom: chapter, model, timecode
  let ci = 0; for (let i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i][0]) ci = i;
  const [c0, no, cn, en] = CHAPTERS[ci], cp = prog(t, c0 + (ci ? 0 : 0.2), c0 + (ci ? 0 : 0.2) + 0.4);
  ctx.fillStyle = rgba(PAL.gold, 0.85 * a);
  const nw = line(ctx, no, M, 1858, 11, { w: 600, track: 0.2, p: cp, seed: 90 + ci });
  ctx.fillStyle = rgba(PAL.ivory, 0.85 * a);
  const cw = line(ctx, cn, M + nw + 16, 1860, 18, { w: 500, fam: 'sans', track: 0.25, p: cp, seed: 95 + ci });
  ctx.fillStyle = rgba(PAL.ivory, 0.42 * a);
  line(ctx, en, M + nw + 16 + cw + 14, 1858, 10.5, { w: 500, track: 0.3, p: cp, seed: 99 + ci });
  const fr = Math.min(S.frame, DUR * FPS - 1);
  const tc = `00:${String(Math.floor(fr / FPS)).padStart(2, '0')}:${String(fr % FPS).padStart(2, '0')}`;
  line(ctx, tc, W - M, 1858, 10.5, { w: 500, track: 0.2, align: 'right' });
  ctx.fillStyle = rgba(PAL.ivory, 0.85 * a);
  line(ctx, 'OPUS 5.5', W - M - 108, 1858, 12, { w: 600, track: 0.24, align: 'right', p: prog(t, 0.3, 0.9), seed: 5 });
  // the beat ruler: 30 beats, chapter heads taller
  const y = 1800, x0 = M, x1 = W - M, heads = [0, 8, 12, 16, 20, 24, 30];
  const rw = ez.out(prog(t, 0.1, 0.9));
  for (let b = 0; b <= 30; b++) {
    const x = lerp(x0, x1, b / 30);
    if (x > lerp(x0, x1, rw) + 0.5) break;
    const tb = b * 0.5, passed = t >= tb, hit = passed ? Math.exp(-8 * (t - tb)) : 0;
    const hh = heads.includes(b) ? 12 : 5;
    ctx.fillStyle = rgba(passed ? PAL.gold : PAL.ivory, (passed ? 0.5 + 0.5 * hit : 0.22) * a);
    ctx.fillRect(x - 0.5, y - hh - hit * 6, 1, hh + hit * 6);
  }
  const ph = lerp(x0, x1, clamp(t / DUR));
  ctx.fillStyle = rgba(PAL.ivory, 0.2 * a); ctx.fillRect(x0, y + 5, x1 - x0, 1);
  ctx.fillStyle = rgba(PAL.gold, 0.9 * a); ctx.fillRect(x0, y + 5, ph - x0, 1);
  ctx.beginPath(); ctx.arc(ph, y + 5.5, 2.5, 0, TAU); ctx.fill();
}

// ── post ─────────────────────────────────────────────────────────────────────
function drawFlash(ctx, t) {
  let f = 0;
  const u = t - T.drop;
  if (u >= 0 && u < 0.6) f += 0.5 * Math.exp(-12 * u);
  for (let i = 0; i < 4; i++) { const v = t - (T.stacc + 0.5 * i); if (v >= 0 && v < 0.2) f += 0.08 * Math.exp(-25 * v); }
  if (f > 0.002) { // a burst of light centred on the moon, not a flat wash
    const rg = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, 1300);
    rg.addColorStop(0, `rgba(255,242,220,${f.toFixed(4)})`);
    rg.addColorStop(0.3, `rgba(255,232,200,${(f * 0.45).toFixed(4)})`);
    rg.addColorStop(1, `rgba(255,222,190,${(f * 0.08).toFixed(4)})`);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (u >= 0 && u < 0.7) { // anamorphic streak
    const k = Math.exp(-5 * u), hgt = 3 + 26 * (1 - k);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255,220,170,0)'); g.addColorStop(0.5, `rgba(255,240,215,${(0.85 * k).toFixed(4)})`); g.addColorStop(1, 'rgba(255,220,170,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
    ctx.fillRect(0, L.cy - hgt / 2, W, hgt);
    ctx.globalCompositeOperation = 'source-over';
  }
}
function drawVignette(ctx, t) {
  const inh = ez.in(prog(t, T.inhale, T.drop)) * (t < T.drop);
  ctx.drawImage(S.vig, 0, 0);
  if (inh > 0) { // the room dims before the drop
    ctx.globalAlpha = 0.55 * inh; ctx.drawImage(S.vig, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(0,0,0,${(0.28 * inh).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }
}

// ── scene ────────────────────────────────────────────────────────────────────
function drawScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
  S.P = S.nodes.map(n => nodePos(n, t));
  const cam = camera(t), g = S.gA;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W / 4, H / 4);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  drawSky(ctx, t);
  applyCam(ctx, cam, 0.35); drawStars(ctx, t);
  applyCam(ctx, cam); applyCam(g, cam, 1, 0.25);
  drawSonar(ctx, g, t);
  drawMesh(ctx, g, t);
  drawArcs(ctx, g, t);
  drawChords(ctx, g, t);
  drawRingLock(ctx, g, t);
  drawNodes(ctx, g, t);
  drawHome(ctx, g, t);
  drawLabels(ctx, t);
  drawMoon(ctx, t);
  drawParticles(ctx, g, t);
  drawShock(ctx, g, t);
  // (bloom from the quarter-res emission buffer S.gA is added in resolve())
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  typeQianli(ctx, t);
  typeGong(ctx, t);
  typeTuanyuan(ctx, t);
  typeCouplet(ctx, t);
  typeStacc(ctx, t);
  typeFinale(ctx, t);

  applyCam(ctx, cam, 1.3); drawBokeh(ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawFlash(ctx, t);
  drawVignette(ctx, t);
  drawHUD(ctx, t);
}

// ── frame resolve: sub-frame motion blur + film grain ────────────────────────
const BLUR_WINDOWS = [[3.45, 3.95], [5.35, 6.2], [7.7, 8.75], [9.97, 12.75], [12.84, 13.2]];
function samplesAt(t) { return BLUR_WINDOWS.some(([a, b]) => t >= a && t <= b) ? 8 : 3; }

// Render one output frame into S.rgb: n sub-frames across a 180° shutter are
// averaged (true motion blur), the quarter-res emission buffer is blurred,
// upsampled and added as bloom, then mid-tone film grain is laid on top.
function renderFrame(frame, samples, toCanvas = true) {
  const t = frame / FPS;
  S.frame = frame;
  const n = samples ?? samplesAt(t), shutter = 0.5 / FPS;
  const acc = S.acc, bacc = S.bacc, b = S.gB;
  for (let k = 0; k < n; k++) {
    const ts = n === 1 ? t : t + ((k + 0.5) / n - 0.5) * shutter;
    drawScene(S.sctx, ts);
    const d = S.sctx.getImageData(0, 0, W, H).data;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = 'copy'; b.filter = 'blur(3px)'; b.drawImage(S.glowA, 0, 0); b.filter = 'none';
    b.globalCompositeOperation = 'lighter'; b.globalAlpha = 0.6; b.drawImage(S.glowA, 0, 0);
    b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
    const bd = b.getImageData(0, 0, BW, BH).data;
    if (k === 0) acc.set(d); else for (let i = 0; i < d.length; i++) acc[i] += d[i];
    if (k === 0) bacc.fill(0);
    for (let i = 0; i < bd.length; i += 4) {   // getImageData is un-premultiplied: weight by alpha
      const a = bd[i + 3] / 255;
      if (a === 0) continue;
      bacc[i] += bd[i] * a; bacc[i + 1] += bd[i + 1] * a; bacc[i + 2] += bd[i + 2] * a;
    }
  }
  const rgb = S.rgb, inv = 1 / n, GW = S.GW, GH = S.GH, gr = S.grain;
  const X0 = S.bx0, X1 = S.bx1, FX = S.bfx;
  const ox = (hash(frame, 1) * GW) | 0, oy = (hash(frame, 2) * GH) | 0;
  for (let y = 0; y < H; y++) {
    const row = (((y >> 1) + oy) % GH) * GW;
    const gy = (y + 0.5) / 4 - 0.5, y0 = clamp(Math.floor(gy), 0, BH - 1), fy = clamp(gy - y0) * inv, ry = (1 / n) - fy;
    const r0 = y0 * BW * 4, r1 = Math.min(BH - 1, y0 + 1) * BW * 4;
    let i = y * W * 4, j = y * W * 3;
    for (let x = 0; x < W; x++, i += 4, j += 3) {
      const fx = FX[x], a0 = r0 + X0[x], a1 = r0 + X1[x], c0 = r1 + X0[x], c1 = r1 + X1[x];
      const w00 = (1 - fx) * ry, w01 = fx * ry, w10 = (1 - fx) * fy, w11 = fx * fy;
      const r = acc[i] * inv + bacc[a0] * w00 + bacc[a1] * w01 + bacc[c0] * w10 + bacc[c1] * w11;
      const g = acc[i + 1] * inv + bacc[a0 + 1] * w00 + bacc[a1 + 1] * w01 + bacc[c0 + 1] * w10 + bacc[c1 + 1] * w11;
      const bl = acc[i + 2] * inv + bacc[a0 + 2] * w00 + bacc[a1 + 2] * w01 + bacc[c0 + 2] * w10 + bacc[c1 + 2] * w11;
      const l = clamp((r * 0.3 + g * 0.59 + bl * 0.11) / 255);
      const nz = gr[row + (((x >> 1) + ox) % GW)] * (2.2 + 5.5 * l * (1 - l));   // grain lives in the mid-tones
      rgb[j] = r + nz; rgb[j + 1] = g + nz; rgb[j + 2] = bl + nz;
    }
  }
  if (toCanvas) {
    const od = S.out.data;
    for (let p = 0, q = 0; p < od.length; p += 4, q += 3) { od[p] = rgb[q]; od[p + 1] = rgb[q + 1]; od[p + 2] = rgb[q + 2]; od[p + 3] = 255; }
    S.ctx.putImageData(S.out, 0, 0);
  }
  return rgb;
}

// ── events for the soundtrack ────────────────────────────────────────────────
function buildEvents() {
  const ev = [], pan = x => +clamp((x - L.cx) / 540, -1, 1).toFixed(3);
  ev.push({ t: T.home, type: 'ping', pan: 0 });
  for (const n of S.nodes) if (!n.home) ev.push({ t: +n.appear.toFixed(4), type: n.city ? 'cityPop' : 'pop', pan: pan(n.x0), d: Math.round(n.d) });
  ev.push({ t: T.qianli, type: 'qianli' }, { t: T.qianliOut, type: 'whooshOut' });
  S.cityNodes.forEach((c, k) => {
    ev.push({ t: +c.ta.toFixed(4), type: 'arc', pan: pan(c.x0), k });
    ev.push({ t: +c.tArrive.toFixed(4), type: 'arrive', pan: pan(c.x0), k });
  });
  ev.push({ t: T.gong, type: 'gong' }, { t: T.gongOut, type: 'zoomThrough' });
  for (const n of S.ring) ev.push({ t: +n.ce.toFixed(4), type: 'land', pan: +Math.cos(n.theta).toFixed(3), rank: n.rank });
  ev.push({ t: T.tuanyuan, type: 'tuanyuan' }, { t: T.inhale, type: 'inhale' }, { t: T.drop, type: 'drop' });
  [...COUPLET[0], ...COUPLET[1]].forEach((ch, i) => ev.push({ t: T.couplet + (i < 5 ? i : i + 0) * 0.125 + (i < 5 ? 0 : 0), type: 'couplet', i, ch }));
  for (let i = 0; i < 4; i++) ev.push({ t: T.stacc + 0.5 * i, type: 'stacc', i });
  ev.push({ t: T.collapse, type: 'collapse' });
  LEAD.forEach((_, k) => ev.push({ t: T.lead + k * 0.0625, type: 'token', k }));
  ev.push({ t: T.seal, type: 'seal' }, { t: T.shine, type: 'shine' });
  S.events = ev.sort((a, b) => a.t - b.t);
}

// ── boot ─────────────────────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
window.scene = {
  W, H, FPS, DUR, T,
  ready: build().then(() => {
    window.scene.events = S.events;
    window.scene.ringN = S.ringN;
    if (params.has('render')) { document.body.classList.add('render'); return; }
    if (params.has('t')) { renderFrame(Math.round(parseFloat(params.get('t')) * FPS), +params.get('s') || undefined); return; }
    // live preview: plays in real time (no motion blur or grain); click to restart with the score
    const audio = new Audio('audio/score.wav');
    let t0 = null;
    const tick = now => {
      if (t0 === null) t0 = now;
      const t = ((now - t0) / 1000) % DUR;
      S.frame = Math.floor(t * FPS);
      drawScene(S.ctx, t);
      const b = S.gB;   // bloom, composited on the canvas (the offline path does this in renderFrame)
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'copy';
      b.filter = 'blur(3px)'; b.drawImage(S.glowA, 0, 0); b.filter = 'none';
      S.ctx.setTransform(1, 0, 0, 1, 0, 0); S.ctx.globalCompositeOperation = 'lighter';
      S.ctx.drawImage(S.glowB, 0, 0, W, H);
      S.ctx.globalAlpha = 0.6; S.ctx.drawImage(S.glowA, 0, 0, W, H);
      S.ctx.globalAlpha = 1; S.ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(tick);
    };
    document.body.addEventListener('click', () => { t0 = null; audio.currentTime = 0; audio.play().catch(() => {}); });
    requestAnimationFrame(tick);
  }),
  renderFrame,
  // render a frame and hand the raw RGB to the local render server (render.cjs)
  async sendFrame(frame, samples, name) {
    const rgb = renderFrame(frame, samples, false);
    const res = await fetch(`/frame?name=${encodeURIComponent(name)}`, { method: 'POST', body: rgb });
    if (!res.ok) throw new Error(`frame upload failed: ${res.status}`);
  },
  drawAt(t) { S.frame = Math.round(t * FPS); drawScene(S.ctx, t); },
};
