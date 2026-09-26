// ─────────────────────────────────────────────────────────────────────────────
//  小米澎程 N90 Max — "把家，带去远方"   15 s @ 128 BPM (8 bars)
//  A journey line runs through the film: sunrise horizon → the route
//  (teal = electric 464 km, orange = range-extended to 1705 km) → the seat
//  rail of the reconfigurable cabin → the water line → the signature underline.
//  Photography comes from photos/photos.json (official xiaomiev.com imagery).
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const T = {
  range: cut(4), drop: bt(8), space: cut(10), photoIn: bt(14), cap: cut(16), mont: cut(20), build: cut(24), end: cut(28),
};

// VO syllable times (build/vo/manifest.json overrides these)
const VO_DEFAULT = {
  vo1: [0.50, 0.70, 1.05, 1.25, 1.45, 1.65],
  vo2: [2.05, 2.22, 2.39, 2.56, 2.73, 2.90, 3.07, 3.24, 3.62, 3.80, 3.98, 4.16],
  vo3: [4.75, 4.93, 5.11, 5.45, 5.62, 5.79, 5.96, 6.13, 6.45, 6.63, 6.81, 6.99],
  vo4: [7.62, 7.80, 7.98, 8.16, 8.50, 8.68, 8.86, 9.04],
  vo5: [11.55, 11.75, 11.95, 12.15],
  vo6: [13.20, 13.40, 13.60, 13.80, 14.00],
};
const VOT = (() => {
  const m = {}; for (const k in VO_DEFAULT) m[k] = VO_DEFAULT[k].slice();
  if (window.VO && window.VO.lines) for (const l of window.VO.lines) m[l.id] = l.chars.map(c => c.t);
  return m;
})();
const vo = (id, i) => { const a = VOT[id]; return a[Math.max(0, Math.min(i, a.length - 1))]; };

const MONT = [
  ['detail1', '蜻蜓大灯', '远光照射距离 624 m'], ['detail2', '光环尾灯', 'HALO TAILLIGHTS'], ['detail3', '16.1 英寸中控屏', 'XIAOMI HYPEROS'],
  ['detail4', '零重力座椅', 'ZERO-GRAVITY SEATS'], ['detail5', '移动岛台 · 9 L 冰箱', 'MOBILE ISLAND'], ['detail6', '风阻系数 0.255 Cd', 'AERODYNAMICS'],
  ['detail7', '双电机四驱', '0–100 km/h 5.9 s'], ['detail8', '2+2+3 大七座', '2760 mm 舱内纵向空间'],
];
const LAYOUTS = ['2+2+3 大七座', '二排零重力', '全平大床', '移动岛台'];
window.ALL_TEXT = '把家带去远方一千七百零五公里说走就走大七座十一种空间随心而变四驱越野无惧山海小米澎程湃每综合续航纯电增程布局舱内纵向储物最大涉水深度双电机四驱上市售价万元起'
  + '蜻蜓灯光环尾中控屏英寸零重力椅移动岛台冰箱风阻系数智能细节模式床二排全平岛台压缩机照射距离，。·—：' + MONT.map(m => m[1] + m[2]).join('') + LAYOUTS.join('')
  + 'XIAOMI SKYNOMAD N90 MAX HOME, ANYWHERE CLTC km mm L Cd xiaomiev.com HyperOS';

// ───────────── photo helpers ─────────────
const ph = k => (window.PH || {})[k];
function photo(c, key, x, y, w, h, o = {}) {
  const img = ph(key) || ph(o.fallback || 'hero');
  if (!img) { c.fillStyle = '#1B1F24'; c.fillRect(x, y, w, h); return; }
  const m = img.meta || {};
  const zoom = (o.zoom || 1) * (m.zoom || 1);
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
  const fx = o.fx ?? m.fx ?? 0.5, fy = o.fy ?? m.fy ?? 0.5;
  c.drawImage(img, x + (w - iw) * fx + (o.dx || 0), y + (h - ih) * fy + (o.dy || 0), iw, ih);
}
function shade(c, x0, y0, x1, y1, stops) {           // linear gradient overlay, stops = [[pos, rgba], ...]
  const g = c.createLinearGradient(x0, y0, x1, y1); for (const [p, col] of stops) g.addColorStop(p, col);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function glowLine(pts, a, b, col, glow, lw = 3, gw = 12) {
  const c = L.c, e = L.e, P = pts instanceof Poly ? pts : new Poly(pts);
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); P.trace(c, a, b); c.stroke(); c.restore();
  e.save(); e.strokeStyle = glow; e.lineWidth = gw; e.lineCap = 'round'; e.beginPath(); P.trace(e, a, b); e.stroke(); e.restore();
  return P;
}
function label(c, txt, x, y, o = {}) {
  const { size = 22, weight = 500, fam = FONT.en, color = 'rgba(255,255,255,0.8)', track = 4, align = 'left', a = 1 } = o;
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; setFont(c, weight, size, fam, track); c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic';
  c.fillText(txt, x, y); c.restore();
}
// Words that rise out of a mask, one glyph per VO syllable.
function voLine(c, str, x, y, id, idx, o = {}) {
  const { size = 100, weight = 600, color = C.white, align = 'left', fam = FONT.zh, tracking = 2, tOut = 99, lift = 1.0 } = o;
  const out = E.inCubic(inv(tOut, tOut + 0.3, T_NOW));
  if (out >= 1) return;
  c.save(); c.globalAlpha *= 1 - out;
  c.beginPath(); c.rect(0, y - size * 1.05, W, size * 1.35); c.clip();
  kText(c, str, x, y - out * 40, {
    weight, size, color, align, fam, tracking,
    anim: (i) => {
      const k = idx[i]; const ti = k < 0 ? vo(id, -k - 1) + 0.12 : vo(id, k) - 0.05;
      const p = inv(ti, ti + 0.34 * lift, T_NOW);
      return { dy: (1 - E.outExpo(p)) * size * 1.05, a: p > 0 ? 1 : 0 };
    },
  });
  c.restore();
}
let T_NOW = 0;

// odometer-style number (each digit a rolling wheel)
function odometer(c, value, x, y, o = {}) {
  const { size = 240, digits = 4, color = C.white, fam = FONT.heavy, weight = 900 } = o;
  setFont(c, weight, size, fam, 0);
  const dw = c.measureText('0').width * 0.98;
  c.save(); c.beginPath(); c.rect(x - 10, y - size * 0.86, dw * digits + 20, size * 0.98); c.clip();
  c.fillStyle = color; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  for (let k = 0; k < digits; k++) {
    const place = Math.pow(10, digits - 1 - k);
    const v = value / place, d = Math.floor(v) % 10, f = place === 1 ? v - Math.floor(v) : Math.max(0, (v - Math.floor(v) - 0.9) * 10);
    const lead = value < place && k < digits - 1;
    if (lead) continue;
    const dx = x + k * dw;
    c.fillText(String(d), dx, y - f * size * 0.92);
    c.fillText(String((d + 1) % 10), dx, y + (1 - f) * size * 0.92);
  }
  c.restore();
  return dw * digits;
}

function grid(c, { alpha = 1, offX = 0, offY = 0, rgb = '255,255,255', minor = 0.03, major = 0.065, step = 48, cross = true }) {
  if (alpha <= 0) return;
  c.save(); c.lineWidth = 1;
  const ox = ((offX % step) + step) % step, oy = ((offY % step) + step) % step;
  for (let i = -1, x = ox - step; x < W + step; x += step, i++) {
    const idx = Math.round((x - offX) / step);
    c.strokeStyle = `rgba(${rgb},${(idx % 5 === 0 ? major : minor) * alpha})`;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
  }
  for (let y = oy - step; y < H + step; y += step) {
    const idx = Math.round((y - offY) / step);
    c.strokeStyle = `rgba(${rgb},${(idx % 5 === 0 ? major : minor) * alpha})`;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  if (cross) {
    c.strokeStyle = `rgba(${rgb},${0.22 * alpha})`; c.lineWidth = 1.2;
    const s5 = step * 5, ox5 = ((offX % s5) + s5) % s5, oy5 = ((offY % s5) + s5) % s5;
    c.beginPath();
    for (let x = ox5 - s5; x < W + s5; x += s5) for (let y = oy5 - s5; y < H + s5; y += s5) {
      c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.moveTo(x, y - 5); c.lineTo(x, y + 5);
    }
    c.stroke();
  }
  c.restore();
}

// ───────────── HUD ─────────────
const CHAP = [[0, '远方'], [T.range, '续航'], [T.space, '空间'], [T.cap, '越野'], [T.mont, '细节'], [T.build, '澎程']];
function hud(t, a = 1) {
  const c = L.c, fin = ease(0.5, 1.1, t) * a * (1 - ease(T.end - 0.2, T.end, t));
  if (fin <= 0) return;
  c.save(); c.globalAlpha = fin;
  label(c, 'XIAOMI SKYNOMAD', 72, 74, { size: 15, weight: 600, track: 6 });
  label(c, '小米澎程', 72, 100, { size: 16, weight: 500, fam: FONT.zh, track: 4, color: 'rgba(255,255,255,0.7)' });
  label(c, 'N90 MAX', W - 72, 74, { size: 15, weight: 600, track: 6, align: 'right' });
  label(c, '2026', W - 72, 100, { size: 15, weight: 500, track: 4, align: 'right', color: 'rgba(255,255,255,0.6)' });
  // journey progress bar
  const x0 = 72, x1 = W - 72, y = H - 58;
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x0, y, x1 - x0, 2);
  c.fillStyle = C.teal; c.fillRect(x0, y, (x1 - x0) * clamp(t / 15), 2);
  CHAP.forEach(([t0, name], i) => {
    const x = x0 + (x1 - x0) * t0 / 15, on = t >= t0 && (i === CHAP.length - 1 || t < CHAP[i + 1][0]);
    c.fillStyle = on ? C.white : 'rgba(255,255,255,0.45)'; c.fillRect(x, y - 5, 2, 12);
    label(c, `0${i + 1} ${name}`, x + 8, y - 12, { size: 13, weight: on ? 600 : 400, fam: FONT.zh, track: 2, color: on ? '#fff' : 'rgba(255,255,255,0.5)' });
  });
  c.restore();
}

// ───────────── 01 远方 — horizon opens into the hero shot ─────────────
function sceneIntro(t) {
  L.bg('#000');
  const c = L.c, e = L.e;
  const gap = E.inOutQuart(inv(0.42, 1.15, t)) * (H + 20);
  const lw = E.outExpo(inv(0.04, 0.6, t)) * W;
  if (gap > 0) {
    c.save(); c.beginPath(); c.rect(0, 540 - gap / 2, W, gap); c.clip();
    photo(c, 'hero', 0, 0, W, H, { zoom: 1.24 - 0.14 * E.outCubic(inv(0.4, 2.6, t)) });
    shade(c, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
    shade(c, 0, 0, W * 0.7, 0, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);
    c.restore();
    // warm light leak drifting across
    const lx = lerp(-300, 900, inv(0.4, 2.2, t));
    const g = e.createRadialGradient(lx, 160, 10, lx, 160, 900);
    g.addColorStop(0, `rgba(255,140,60,${0.35 * (1 - inv(1.4, 2.2, t))})`); g.addColorStop(1, 'rgba(255,140,60,0)');
    e.fillStyle = g; e.fillRect(0, 0, W, H);
  }
  // the horizon line (it becomes the letterbox edges)
  if (lw > 0 && gap < H) {
    const fade = 1 - inv(0.9, 1.2, t);
    for (const y of gap > 0 ? [540 - gap / 2, 540 + gap / 2] : [540]) {
      const gg = c.createLinearGradient(960 - lw / 2, 0, 960 + lw / 2, 0);
      gg.addColorStop(0, 'rgba(255,122,47,0)'); gg.addColorStop(0.3, C.sun); gg.addColorStop(0.5, '#FFF4E8'); gg.addColorStop(0.7, C.teal); gg.addColorStop(1, 'rgba(95,182,170,0)');
      c.save(); c.globalAlpha = fade; c.fillStyle = gg; c.fillRect(960 - lw / 2, y - 1.5, lw, 3); c.restore();
      e.save(); e.globalAlpha = fade; e.fillStyle = gg; e.fillRect(960 - lw / 2, y - 7, lw, 14); e.restore();
    }
    const sun = e.createRadialGradient(960, 540, 5, 960, 540, 420);
    sun.addColorStop(0, `rgba(255,170,90,${0.5 * fade * (1 - inv(0.5, 1.2, t))})`); sun.addColorStop(1, 'rgba(255,170,90,0)');
    e.fillStyle = sun; e.fillRect(0, 0, W, H);
  }
  // title with the VO
  voLine(c, '把家，带去远方', 140, 700, 'vo1', [0, 1, -2, 2, 3, 4, 5], { size: 112, weight: 600, tracking: 6, tOut: T.range - 0.2 });
  label(c, scramble('HOME, ANYWHERE', inv(vo('vo1', 2), vo('vo1', 2) + 0.6, t), false, 3), 146, 760,
    { size: 24, weight: 600, track: 12, color: C.tealHi, a: 1 - inv(T.range - 0.2, T.range + 0.1, t) });
}

// ───────────── 02 续航 — the route: 464 km electric, 1705 km in total ─────────────
const ROUTE = bez([[-60, 860], [260, 800, 420, 700, 700, 740], [980, 780, 1080, 880, 1320, 820], [1560, 760, 1660, 600, 1990, 640]], 40);
function sceneRange(t) {
  L.bg('#000');
  const c = L.c, e = L.e, u = t - T.range;
  const zoom = 1.08 + 0.05 * u + 0.35 * E.inQuad(inv(T.drop, T.space, t));
  photo(c, 'road', 0, 0, W, H, { zoom, fallback: 'hero' });
  shade(c, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.35)'], [0.55, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.75)']]);
  shade(c, 0, 0, W, 0, [[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0)']]);
  // route: teal while electric (464 / 1705), orange once the range extender takes over
  const P = new Poly(ROUTE), p = E.inOutCubic(inv(T.range + 0.08, T.drop, t)), split = 464 / 1705;
  const q = P.L;
  c.save(); c.setLineDash([2, 10]); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); P.trace(c, 0, 1); c.stroke(); c.restore();
  glowLine(P, 0, Math.min(p, split), C.tealHi, 'rgba(95,182,170,0.9)', 5, 16);
  if (p > split) glowLine(P, split, p, C.sunHi, 'rgba(255,122,47,0.9)', 5, 16);
  const head = P.at(q * p);
  if (p > 0 && p < 1) { e.fillStyle = '#FFFFFF'; e.beginPath(); e.arc(head[0], head[1], 16, 0, TAU); e.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(head[0], head[1], 6, 0, TAU); c.fill(); }
  // markers
  const mk = (frac, txt, sub, col, t0) => {
    const a = ease(t0, t0 + 0.2, t); if (a <= 0) return;
    const m = P.at(q * frac);
    c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(m[0], m[1], 9 + 14 * (1 - a), 0, TAU); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(m[0], m[1], 5, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(m[0], m[1] - 14); c.lineTo(m[0], m[1] - 70); c.stroke(); c.restore();
    label(c, txt, m[0] + 10, m[1] - 76, { size: 30, weight: 700, fam: FONT.heavy, track: 1, color: '#fff', a });
    label(c, sub, m[0] + 10, m[1] - 110, { size: 17, weight: 500, fam: FONT.zh, track: 2, color: col, a });
  };
  const tSplit = T.range + 0.08 + (T.drop - T.range - 0.08) * 0.43;
  mk(split, '464 km', 'CLTC 纯电续航', C.tealHi, tSplit);
  mk(0.999, '1705 km', 'CLTC 综合续航', C.sunHi, T.drop - 0.05);
  // odometer
  const val = 1705 * E.inOutCubic(inv(T.range + 0.08, T.drop, t));
  const punch = 1 + 0.08 * Math.exp(-(t - T.drop) * 9) * (t > T.drop ? 1 : 0);
  const ox = 140, oy = 960;
  c.save(); c.translate(ox, oy); c.scale(punch, punch); c.translate(-ox, -oy);
  label(c, 'CLTC 综合续航', 146, oy - 250, { size: 30, weight: 500, fam: FONT.zh, track: 4, color: 'rgba(255,255,255,0.85)', a: ease(T.range, T.range + 0.3, t) });
  const wv = odometer(c, Math.round(val * 10) / 10, ox, oy, { size: 250 });
  label(c, 'km', ox + wv + 18, oy, { size: 80, weight: 700, fam: FONT.heavy, track: 0, color: C.sunHi });
  c.restore();
  if (t > T.drop) {                                        // "说走就走" burst: zoom-streaks from the vanishing point
    const k = inv(T.drop, T.space, t);
    c.save();
    for (let i = 0; i < 70; i++) {
      const a = hash(i * 1.37) * TAU, r0 = 120 + ((hash(i * 3.1) + k * 2.2) % 1) * 1100, len = 60 + 240 * k;
      const cx = 1320 + Math.cos(a) * r0, cy = 560 + Math.sin(a) * r0 * 0.6;
      c.strokeStyle = `rgba(255,255,255,${0.15 + 0.25 * hash(i)})`; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.6); c.stroke();
    }
    c.restore();
  }
}

// ───────────── 03 空间 — top-view seat layouts, then the cabin photograph ─────────────
const SEAT = { s: 1200 / 5285, cx: 1090, cy: 560 };
function carTop(c, e, a) {                              // top-view body outline, front to the right
  const Lp = 5285 * SEAT.s, Wp = 1998 * SEAT.s, x0 = SEAT.cx - Lp / 2, y0 = SEAT.cy - Wp / 2;
  c.save(); c.globalAlpha = a; c.strokeStyle = C.tealHi; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(x0 + 120, y0); c.lineTo(x0 + Lp - 200, y0); c.bezierCurveTo(x0 + Lp - 40, y0 + 4, x0 + Lp, y0 + 70, x0 + Lp, y0 + Wp / 2);
  c.bezierCurveTo(x0 + Lp, y0 + Wp - 70, x0 + Lp - 40, y0 + Wp - 4, x0 + Lp - 200, y0 + Wp); c.lineTo(x0 + 120, y0 + Wp);
  c.bezierCurveTo(x0 + 20, y0 + Wp - 4, x0, y0 + Wp - 60, x0, y0 + Wp / 2); c.bezierCurveTo(x0, y0 + 60, x0 + 20, y0 + 4, x0 + 120, y0); c.stroke();
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(155,220,210,0.55)';
  c.beginPath(); c.moveTo(x0 + Lp - 330, y0 + 30); c.quadraticCurveTo(x0 + Lp - 260, y0 + Wp / 2, x0 + Lp - 330, y0 + Wp - 30);   // windscreen
  c.moveTo(x0 + 70, y0 + 40); c.quadraticCurveTo(x0 + 40, y0 + Wp / 2, x0 + 70, y0 + Wp - 40);                                   // tailgate
  c.stroke();
  c.setLineDash([6, 6]);
  for (const wx of [x0 + 210, x0 + Lp - 330]) for (const wy of [y0 - 6, y0 + Wp - 26]) { c.strokeRect(wx, wy, 150, 32); }
  c.setLineDash([]);
  c.fillStyle = C.tealHi; c.fillRect(x0 + Lp - 312, y0 - 18, 34, 14); c.fillRect(x0 + Lp - 312, y0 + Wp + 4, 34, 14);                // mirrors
  c.restore();
  e.save(); e.globalAlpha = a * 0.5; e.strokeStyle = C.teal; e.lineWidth = 8; e.strokeRect(x0 + 10, y0 + 10, Lp - 20, Wp - 20); e.restore();
  return { x0, y0, Lp, Wp };
}
// seat state: x, y, w (cushion length), h, rec (recline 0..1), flat (0..1)
const SEATS0 = [
  { x: 1400, y: 490 }, { x: 1400, y: 630 },                       // row 1
  { x: 1180, y: 490 }, { x: 1180, y: 630 },                       // row 2 captain chairs
  { x: 940, y: 470, n: 1 }, { x: 940, y: 560, n: 1 }, { x: 940, y: 650, n: 1 },   // row 3 bench
];
function seatLayout(k) {                                          // target seat states per layout
  return SEATS0.map((s, i) => {
    const r = { x: s.x, y: s.y, w: s.n ? 92 : 104, h: s.n ? 78 : 100, rec: 0, flat: 0 };
    if (k === 1) { if (i === 2 || i === 3) { r.x -= 70; r.w = 170; r.rec = 1; } if (i >= 4) r.flat = 1; }
    if (k === 2) { if (i < 2) r.x += 40; if (i >= 2) { r.flat = 1; } }
    if (k === 3) { if (i === 2 || i === 3) r.x -= 30; }
    return r;
  });
}
function drawSeats(c, e, t) {
  const tk = [T.space, T.space + BEAT, T.space + 2 * BEAT, T.space + 3 * BEAT];
  let k = 0; for (let i = 0; i < 4; i++) if (t >= tk[i]) k = i;
  const from = seatLayout(Math.max(0, k - 1)), to = seatLayout(k), p = k === 0 ? 1 : spring(t - tk[k], 3.2, 0.62);
  const S = from.map((f, i) => { const g = to[i], o = {}; for (const key in g) o[key] = lerp(f[key], g[key], p); return o; });
  // bed (layout 2) — rows 2 & 3 become one mattress
  const bed = k === 2 ? clamp(p) : (k === 3 ? 1 - clamp(p) : 0);
  if (bed > 0.01) {
    c.save(); c.globalAlpha = bed; c.fillStyle = 'rgba(95,182,170,0.18)'; c.strokeStyle = C.tealHi; c.lineWidth = 2;
    c.beginPath(); rrect(c, 880, 432, 390, 256, 22); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); rrect(c, 1190, 452, 58, 90, 14); c.fill(); c.beginPath(); rrect(c, 1190, 578, 58, 90, 14); c.fill();
    c.restore();
  }
  S.forEach((s, i) => {
    const a = 1 - s.flat * 0.75;
    c.save(); c.globalAlpha = a * (1 - bed * (i >= 2 ? 0.85 : 0));
    c.fillStyle = s.flat > 0.5 ? 'rgba(95,182,170,0.12)' : 'rgba(255,255,255,0.10)'; c.strokeStyle = s.flat > 0.5 ? 'rgba(155,220,210,0.6)' : '#FFFFFF'; c.lineWidth = 2;
    c.beginPath(); rrect(c, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 16); c.fill(); c.stroke();
    // backrest
    const bw = 20 + 26 * s.rec;
    c.beginPath(); rrect(c, s.x - s.w / 2 - bw + 6, s.y - s.h / 2 + 4, bw, s.h - 8, 8); c.stroke();
    if (s.rec > 0.05) { c.globalAlpha *= s.rec; c.beginPath(); rrect(c, s.x + s.w / 2 - 6, s.y - s.h / 2 + 14, 40 * s.rec, s.h - 28, 8); c.stroke(); }
    c.restore();
  });
  // mobile island with fridge (layout 3)
  const isl = k === 3 ? clamp(p) : 0, ix = lerp(1400, 1180, isl), iy = 560;
  c.save(); c.strokeStyle = k === 3 ? C.sunHi : 'rgba(255,255,255,0.6)'; c.lineWidth = 2;
  c.beginPath(); rrect(c, ix - 40, iy - 20, 80, 40, 10); c.stroke();
  c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(1120, iy); c.lineTo(1450, iy); c.stroke(); c.setLineDash([]);  // rail
  if (isl > 0) { c.fillStyle = C.sunHi; c.globalAlpha = isl; setFont(c, 600, 20, FONT.en); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('9 L', ix, iy + 1);
    e.fillStyle = C.sun; e.globalAlpha = isl * 0.6; e.fillRect(ix - 44, iy - 24, 88, 48); }
  c.restore();
  return k;
}
function sceneSpace(t) {
  L.bg('#07080A');
  const c = L.c, e = L.e, u = t - T.space;
  grid(c, { alpha: 0.8, offX: -u * 30, minor: 0.025, major: 0.05, cross: true });
  const zoomIn = E.inOutCubic(inv(T.photoIn - 0.05, T.photoIn + 0.55, t));
  L.save(); L.translate(SEAT.cx, SEAT.cy); L.scale(1 + 2.2 * zoomIn); L.translate(-SEAT.cx, -SEAT.cy);
  const box = carTop(c, e, ease(T.space - 0.05, T.space + 0.25, t));
  const k = drawSeats(c, e, t);
  // 2760 mm cabin dimension
  const dp = ease(T.space + 0.2, T.space + 0.6, t);
  if (dp > 0) {
    const y = box.y0 + box.Wp + 46, xa = 880, xb = 1460;
    c.save(); c.globalAlpha = dp * (1 - zoomIn); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(lerp(1170, xa, dp), y); c.lineTo(lerp(1170, xb, dp), y); c.moveTo(xa, y - 8); c.lineTo(xa, y + 8); c.moveTo(xb, y - 8); c.lineTo(xb, y + 8); c.stroke();
    c.restore();
    label(c, '舱内纵向空间 2760 mm', 1170, y + 34, { size: 18, weight: 500, fam: FONT.zh, align: 'center', track: 2, a: dp * (1 - zoomIn) });
  }
  L.restore();
  // left column: layout counter + name
  const out = 1 - zoomIn;
  if (out > 0.01) {
    c.save(); c.globalAlpha = out;
    const cnt = 1 + 10 * E.inOutQuad(inv(T.space, T.photoIn, t));
    const wv = odometer(c, cnt, 140, 560, { size: 200, digits: 2 });
    label(c, '种空间布局', 150, 620, { size: 40, weight: 600, fam: FONT.zh, track: 4, color: '#fff' });
    label(c, 'RECONFIGURABLE CABIN', 152, 660, { size: 18, weight: 600, track: 8, color: C.tealHi });
    const nm = LAYOUTS[k], since = t - (T.space + k * BEAT);
    c.fillStyle = C.teal; c.fillRect(150, 712, 46 * ease(0, 0.2, since, E.outCubic), 3);
    label(c, scramble(nm, inv(0, 0.18, since), true, k), 150, 760, { size: 34, weight: 600, fam: FONT.zh, track: 3, color: '#fff' });
    label(c, '最大储物空间 1831 L', 150, 810, { size: 20, weight: 500, fam: FONT.zh, track: 2, color: 'rgba(255,255,255,0.65)', a: ease(T.space + 0.4, T.space + 0.7, t) });
    c.restore();
  }
  // cabin photograph grows out of the car outline
  if (zoomIn > 0) {
    const r = E.inOutCubic(inv(T.photoIn + 0.05, T.photoIn + 0.5, t));
    const w = lerp(500, W + 40, r), h = lerp(300, H + 40, r), x = SEAT.cx - w / 2 + (960 - SEAT.cx) * r, y = SEAT.cy - h / 2 + (540 - SEAT.cy) * r;
    c.save(); c.beginPath(); rrect(c, x, y, w, h, lerp(40, 0, r)); c.clip();
    photo(c, 'interior', 0, 0, W, H, { zoom: 1.18 - 0.1 * E.outCubic(inv(T.photoIn, T.cap, t)) });
    shade(c, 0, 0, 0, H, [[0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.7)']]);
    c.restore();
    e.save(); e.fillStyle = '#000'; e.fillRect(x, y, w, h); e.restore();
    const chips = [['零重力座椅', 0.25], ['2+2+3 大七座', 0.37], ['移动岛台 · 9 L 冰箱', 0.49]];
    chips.forEach(([txt, d], i) => {
      const a = ease(T.photoIn + d, T.photoIn + d + 0.18, t, E.outBack);
      if (a <= 0) return;
      c.save(); c.globalAlpha = clamp(a); setFont(c, 600, 26, FONT.zh, 2); const tw = c.measureText(txt).width;
      const bx = 140 + i * 0, by = 780 + i * 64;
      c.fillStyle = 'rgba(10,12,14,0.55)'; c.beginPath(); rrect(c, bx, by - 36, tw + 56, 50, 25); c.fill();
      c.fillStyle = C.teal; c.beginPath(); c.arc(bx + 24, by - 11, 6, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(txt, bx + 42, by - 10);
      c.restore();
    });
  }
  voLine(c, '随心而变', 140, 300, 'vo3', [8, 9, 10, 11], { size: 96, weight: 700, tracking: 6, tOut: T.cap - 0.15 });
}

// ───────────── 04 越野 — the water line rises to 750 mm ─────────────
function sceneCap(t) {
  L.bg('#000');
  const c = L.c, e = L.e, u = t - T.cap;
  c.save(); c.translate(960, 540); c.rotate(0.012 * E.outCubic(inv(0, 1.8, u))); c.translate(-960, -540);
  photo(c, 'offroad', 0, 0, W, H, { zoom: 1.12 + 0.1 * E.outQuad(inv(0, 1.9, u)), fallback: 'hero' });
  c.restore();
  shade(c, 0, 0, W, 0, [[0, 'rgba(0,0,0,0.6)'], [0.5, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.45)']]);
  // gauge (right) + rising water across the frame
  const lvl = 750 * E.outCubic(inv(T.cap + 0.15, T.cap + 1.1, t));
  const gx = 1700, gy0 = 900, gy1 = 300, mm = y => lerp(gy0, gy1, y / 800);
  const wy = mm(lvl);
  const wg = c.createLinearGradient(0, wy, 0, H); wg.addColorStop(0, 'rgba(95,182,170,0.30)'); wg.addColorStop(1, 'rgba(46,107,102,0.55)');
  c.fillStyle = wg; c.fillRect(0, wy, W, H - wy);
  const wave = (x) => wy + Math.sin(x * 0.012 + u * 7) * 3;
  c.save(); c.strokeStyle = C.tealHi; c.lineWidth = 2.5; c.beginPath(); for (let x = 0; x <= W; x += 12) x ? c.lineTo(x, wave(x)) : c.moveTo(x, wave(x)); c.stroke(); c.restore();
  e.save(); e.strokeStyle = C.teal; e.lineWidth = 12; e.beginPath(); for (let x = 0; x <= W; x += 24) x ? e.lineTo(x, wave(x)) : e.moveTo(x, wave(x)); e.stroke(); e.restore();
  c.save(); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(gx, gy0); c.lineTo(gx, gy1);
  for (let v = 0; v <= 800; v += 50) { const y = mm(v), len = v % 200 === 0 ? 22 : 10; c.moveTo(gx, y); c.lineTo(gx - len, y); }
  c.stroke(); c.restore();
  for (let v = 0; v <= 800; v += 200) label(c, String(v), gx + 14, mm(v) + 6, { size: 16, weight: 500, color: 'rgba(255,255,255,0.7)', track: 1 });
  c.fillStyle = C.tealHi; c.fillRect(gx - 5, wy, 10, gy0 - wy);
  // numbers
  const a = ease(T.cap + 0.1, T.cap + 0.35, t);
  c.save(); c.globalAlpha = a;
  label(c, '最大涉水深度', 1320, 596, { size: 26, weight: 500, fam: FONT.zh, track: 3, color: 'rgba(255,255,255,0.9)' });
  const wv = odometer(c, lvl, 1320, 760, { size: 160, digits: 3 });
  label(c, 'mm', 1320 + wv + 12, 760, { size: 54, weight: 700, fam: FONT.heavy, track: 0, color: C.tealHi });
  c.restore();
  // chips (8ths)
  [['双电机四驱', 0.1], ['0–100 km/h 5.9 s', 0.35]].forEach(([txt, d], i) => {
    const p = ease(T.cap + d, T.cap + d + 0.22, t, E.outExpo);
    if (p <= 0) return;
    c.save(); c.globalAlpha = p; c.translate((1 - p) * -60, 0);
    setFont(c, 600, 30, FONT.zh, 2); const tw = c.measureText(txt).width;
    c.fillStyle = C.teal; c.fillRect(140, 640 + i * 70, 4, 40);
    c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(txt, 160, 661 + i * 70);
    c.restore();
  });
  voLine(c, '无惧山海', 140, 520, 'vo4', [4, 5, 6, 7], { size: 128, weight: 700, tracking: 8, tOut: T.mont - 0.12 });
}

// ───────────── 05 细节 — eight cuts on the eighth notes ─────────────
function sceneMont(t) {
  L.bg('#000');
  const c = L.c, e = L.e, u = t - T.mont, step = BEAT / 2;
  const k = Math.min(7, Math.floor(u / step)), lu = u - k * step, p = inv(0, step * 0.55, lu);
  const [key, name, sub] = MONT[k], prev = MONT[Math.max(0, k - 1)][0];
  const draw = (kk, z = 1, dx = 0, dy = 0) => photo(c, kk, dx, dy, W, H, { zoom: z * 1.08, fallback: 'hero' });
  const style = k % 4;
  if (k === 0) { draw(key, 1.25 - 0.17 * E.outExpo(p)); }
  else if (style === 1) {                                     // split halves slide in opposite ways
    draw(prev, 1.02);
    c.save(); c.beginPath(); c.rect(0, 0, W / 2, H); c.clip(); c.translate(0, (1 - E.outExpo(p)) * -H); draw(key); c.restore();
    c.save(); c.beginPath(); c.rect(W / 2, 0, W / 2, H); c.clip(); c.translate(0, (1 - E.outExpo(p)) * H); draw(key); c.restore();
  } else if (style === 2) {                                   // iris
    draw(prev, 1.04);
    c.save(); c.beginPath(); c.arc(960, 540, E.outExpo(p) * 1150, 0, TAU); c.clip(); draw(key, 1.15 - 0.1 * E.outExpo(p)); c.restore();
  } else if (style === 3) {                                   // blinds
    draw(prev, 1.02);
    for (let b = 0; b < 6; b++) { const q = E.outExpo(inv(b * 0.08, b * 0.08 + 0.6, p)); c.save(); c.beginPath(); c.rect(0, b * H / 6, W * q, H / 6 + 1); c.clip(); draw(key); c.restore(); }
  } else {                                                    // diagonal push
    draw(prev, 1.02, -E.outExpo(p) * 200, 0);
    c.save(); c.beginPath(); const x = lerp(W + 600, -600, E.outExpo(p)); c.moveTo(x, 0); c.lineTo(W + 700, 0); c.lineTo(W + 700, H); c.lineTo(x - 500, H); c.closePath(); c.clip(); draw(key, 1.08 - 0.04 * p); c.restore();
  }
  shade(c, 0, 0, 0, H, [[0.55, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.72)']]);
  // caption
  const cp = E.outExpo(inv(0.02, 0.2, lu));
  c.save(); c.beginPath(); c.rect(120, 820, 1400, 150); c.clip();
  c.translate(0, (1 - cp) * 90);
  label(c, name, 140, 900, { size: 52, weight: 700, fam: FONT.zh, track: 3, color: '#fff' });
  label(c, sub, 144, 944, { size: 20, weight: 600, track: 6, color: C.tealHi });
  c.restore();
  label(c, `${String(k + 1).padStart(2, '0')} / 08`, W - 140, 900, { size: 22, weight: 600, track: 4, align: 'right', color: 'rgba(255,255,255,0.8)' });
  // flash frame on every cut
  const fl = Math.exp(-lu * 30) * (k > 0 ? 0.35 : 0);
  if (fl > 0.01) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(0, 0, W, H); }
}

// ───────────── 06 澎程 — slow down, the name arrives ─────────────
function sceneBuild(t) {
  L.bg('#000');
  const c = L.c, e = L.e, u = t - T.build;
  photo(c, 'side', 0, 0, W, H, { zoom: 1.1 - 0.05 * E.outQuad(inv(0, 2, u)), fallback: 'hero' });
  shade(c, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.55)'], [0.45, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.8)']]);
  // giant outlined 澎程 drifting
  c.save(); c.globalAlpha = 0.22 * ease(0, 0.4, u); setFont(c, 700, 560, FONT.zh, 20); c.strokeStyle = '#fff'; c.lineWidth = 2; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.strokeText('澎程', 960 - 60 * u, 470); c.restore();
  voLine(c, '小米澎程', 960, 640, 'vo5', [0, 1, 2, 3], { size: 150, weight: 700, tracking: 18, align: 'center', tOut: T.end - 0.25 });
  // the journey line returns and charges up
  const p = E.inOutCubic(inv(T.build + 0.1, T.end, t));
  const P = [[160, 760], [1760, 760]];
  glowLine(P, 0.5 - p / 2, 0.5 + p / 2, '#FFFFFF', 'rgba(95,182,170,1)', 3, 14);
}

// ───────────── 07 END CARD ─────────────
function sceneEnd(t) {
  L.bg('#000');
  const c = L.c, e = L.e, u = t - T.end;
  photo(c, 'hero', 0, 0, W, H, { zoom: 1.06 - 0.04 * E.outCubic(inv(0, 1.8, u)) });
  shade(c, 0, 0, W, 0, [[0, 'rgba(0,0,0,0.78)'], [0.55, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.1)']]);
  shade(c, 0, 0, 0, H, [[0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.6)']]);
  const r = (d, dur = 0.45) => E.glide(inv(d, d + dur, u));
  // title
  c.save(); const a1 = r(0.02); c.globalAlpha = a1; c.translate(0, (1 - a1) * 30);
  setFont(c, 700, 104, FONT.zh, 8); c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('小米澎程', 140, 520);
  const w1 = textW(c, '小米澎程', 700, 104, FONT.zh, 8);
  setFont(c, 900, 104, FONT.heavy, 2); c.fillText('N90 Max', 140 + w1 + 36, 520);
  c.restore();
  // signature underline (the journey line)
  const lp = r(0.1, 0.5);
  c.fillStyle = C.teal; c.fillRect(140, 556, 560 * lp, 4); e.fillStyle = C.teal; e.fillRect(140, 550, 560 * lp, 14);
  voLine(c, '澎湃每一程', 140, 660, 'vo6', [0, 1, 2, 3, 4], { size: 64, weight: 600, tracking: 10, color: C.tealHi });
  const a3 = r(0.55);
  label(c, '上市售价', 144, 760, { size: 20, weight: 500, fam: FONT.zh, track: 3, color: 'rgba(255,255,255,0.7)', a: a3 });
  c.save(); c.globalAlpha = a3; c.translate(0, (1 - a3) * 20);
  setFont(c, 900, 64, FONT.heavy, 0); c.fillStyle = '#fff'; c.fillText('26.99', 140, 840);
  const w2 = textW(c, '26.99', 900, 64, FONT.heavy, 0);
  setFont(c, 600, 30, FONT.zh, 2); c.fillText('万元起', 140 + w2 + 14, 838);
  c.restore();
  label(c, 'xiaomiev.com', 144, 900, { size: 20, weight: 500, track: 3, color: 'rgba(255,255,255,0.6)', a: r(0.7) });
  label(c, 'XIAOMI SKYNOMAD', 72, 74, { size: 15, weight: 600, track: 6, a: r(0.3) });
}

// ───────────── master timeline ─────────────
function drawFrame(t) {
  T_NOW = t;
  const c = L.c, e = L.e;
  const pS = T.range - 0.2, pE = T.range + 0.08;                    // push: hero → road
  const cS = T.cap - 0.02, eS = T.end - 0.02;
  if (t < pS) { sceneIntro(t); hud(t); return; }
  if (t < pE) {
    const p = E.inOutQuint(inv(pS, pE, t));
    L.save(); L.translate(-p * W * 0.6, 0); sceneIntro(t); L.restore();
    L.save(); L.clipRect(W * (1 - p), 0, W * p + 2, H); L.translate(W * (1 - p) * 0.5, 0); sceneRange(t); L.restore();
    c.fillStyle = '#fff'; c.fillRect(W * (1 - p) - 1.5, 0, 3, H); e.fillStyle = C.teal; e.fillRect(W * (1 - p) - 8, 0, 16, H);
    hud(t); return;
  }
  if (t < T.space) {
    if (t > T.space - 0.12) {                                        // zoom-through to black
      const p = inv(T.space - 0.12, T.space, t);
      sceneRange(t); c.fillStyle = `rgba(7,8,10,${E.inQuad(p)})`; c.fillRect(0, 0, W, H); hud(t); return;
    }
    sceneRange(t); hud(t); return;
  }
  if (t < cS) { sceneSpace(t); hud(t); return; }
  if (t < T.mont) { sceneCap(t); hud(t); return; }
  if (t < T.build) { sceneMont(t); hud(t); return; }
  if (t < eS) { sceneBuild(t); hud(t); return; }
  sceneEnd(t);
}

function fxAt(t) {
  const hit = (t0, k = 10) => t >= t0 ? Math.exp(-(t - t0) * k) : 0;
  const ca = 0.0008 + 0.005 * hit(T.drop, 8) + 0.004 * hit(T.space, 9) + 0.005 * hit(T.cap, 9) + 0.004 * hit(T.mont, 9) + 0.006 * hit(T.end, 7);
  const flash = 0.28 * hit(T.drop, 14) + 0.2 * hit(T.cap, 16) + 0.55 * hit(T.end, 9) + 0.12 * hit(T.space, 16);
  return { ca, flash, vig: 0.38, grain: 0.03, bloom: 1.0 };
}
function samplesAt(t) {
  const within = (a, b) => t >= a && t <= b;
  if (within(T.range - 0.25, T.range + 0.15) || within(T.drop - 0.1, T.space + 0.1) || within(T.mont, T.build)) return 10;
  if (within(T.photoIn - 0.1, T.photoIn + 0.6) || within(T.end - 0.1, T.end + 0.3)) return 9;
  return 6;
}
