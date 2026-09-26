// ─────────────────────────────────────────────────────────────────────────────
//  小米澎程 N90 Max — "把家，带去远方"   15 s @ 128 BPM (8 bars)
//  A journey line runs through the film: sunrise horizon → the route
//  (teal = electric 464 km, orange = range-extended to 1705 km) → the seat
//  rail of the reconfigurable cabin → the water line → the signature underline.
//  Photography comes from photos/photos.json (official xiaomiev.com imagery).
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const T = {
  range: bt(4.5), drop: bt(8), space: cut(10), photoIn: bt(14), cap: cut(16), mont: cut(20), build: cut(24), end: cut(28),
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
  ['detail1', '蝴蝶谷蓝', '车身配色 · COLOR'], ['detail2', '火山灰', '车身配色 · COLOR'], ['detail3', '酒红', '车身配色 · COLOR'],
  ['detail4', '0–100 km/h 5.9 s', '双电机四驱 · DUAL-MOTOR AWD'], ['detail5', '零重力座椅', 'ZERO-GRAVITY SEATS'], ['detail6', '9 L 压缩机冰箱', '移动岛台 · MOBILE ISLAND'],
  ['detail7', '山海之间，随时露营', 'OUTDOOR LIFE'], ['detail8', '2+2+3 大七座', '最大储物空间 1831 L'],
];
const LAYOUTS = ['2+2+3 大七座', '二排零重力', '全平大床', '移动岛台'];
// end-card billing block: [label, name, font] per column, labels in the film's '中文 · ENGLISH' style
const CREDIT = [['出品 · PRODUCED BY', '栋森网络科技', 'zh'], ['AI 创作 · CREATED WITH', 'Claude Opus 5.5', 'en']];
const NOTE = '概念练手 · 非官方';                                 // small print for the whole film: a concept piece, not an official Xiaomi film
window.ALL_TEXT = CREDIT.map(k => k[0] + k[1]).join('') + NOTE + '把家带去远方一千七百零五公里说走就走大七座十一种空间随心而变四驱越野无惧山海小米澎程湃每综合续航纯电增程布局舱内纵向储物最大涉水深度双电机四驱上市售价万元起'
  + '乘坐蜻蜓灯光环尾中控屏英寸零重力椅移动岛台冰箱风阻系数智能细节模式床二排全平岛台压缩机照射距离蝴蝶谷蓝火山灰酒红车身配色间随时露营之，。·—：' + MONT.map(m => m[1] + m[2]).join('') + LAYOUTS.join('')
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
// Words that rise out of a mask.  Each phrase starts on its VO syllable and the
// rest of the phrase follows quickly, so a line is always complete before the cut.
function phraseTimes(id, idx, step = 0.06) {
  const out = []; let start = null, first = 0, prev = 0;
  idx.forEach((k, i) => {
    if (k < 0) { out.push(prev + 0.05); start = null; return; }        // punctuation closes a phrase
    const tv = vo(id, k);
    if (start === null) { start = tv; first = k; }
    const tt = Math.min(tv, start + step * (k - first));
    out.push(tt); prev = tt;
  });
  return out;
}
function voLine(c, str, x, y, id, idx, o = {}) {
  const { size = 100, weight = 600, color = C.white, align = 'left', fam = FONT.zh, tracking = 2, tOut = 99, lift = 1.0, clipY = null } = o;
  const out = E.inCubic(inv(tOut, tOut + 0.3, T_NOW));
  if (out >= 1) return;
  const times = phraseTimes(id, idx);
  c.save(); c.globalAlpha *= 1 - out;
  c.beginPath(); c.rect(0, y - size * 1.05, W, size * 1.35); c.clip();
  if (clipY) { c.beginPath(); c.rect(0, clipY[0], W, clipY[1] - clipY[0]); c.clip(); }
  kText(c, str, x, y - out * 40, {
    weight, size, color, align, fam, tracking,
    anim: (i) => {
      const ti = times[i] - 0.05;
      const p = inv(ti, ti + 0.3 * lift, T_NOW);
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

// ───────────── camera over a photograph (normalised image point (u,v) → screen (sx,sy)) ─────────────
function cam(key, u, v, z, sx = 960, sy = 540, cover = true) {
  const img = ph(key); if (!img) return null;
  const base = Math.max(W / img.naturalWidth, H / img.naturalHeight), s = base * z;
  const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
  let x = sx - u * iw, y = sy - v * ih;
  if (cover) { x = Math.min(0, Math.max(W - iw, x)); y = Math.min(0, Math.max(H - ih, y)); }
  return { img, s, x, y, iw, ih };
}
function drawCam(c, r) { if (r) c.drawImage(r.img, r.x, r.y, r.iw, r.ih); else { c.fillStyle = '#1B1F24'; c.fillRect(0, 0, W, H); } }
function camPt(r, u, v) { return [r.x + u * r.iw, r.y + v * r.ih]; }
function pill(c, txt, x, y, a, o = {}) {
  if (a <= 0) return;
  const { size = 26, dot = C.teal, bg = 'rgba(10,12,14,0.55)' } = o;
  c.save(); c.globalAlpha = clamp(a); setFont(c, 600, size, FONT.zh, 2); const tw = c.measureText(txt).width;
  c.fillStyle = bg; c.beginPath(); rrect(c, x, y - size * 1.4, tw + size * 2.2, size * 1.95, size); c.fill();
  c.fillStyle = dot; c.beginPath(); c.arc(x + size * 0.95, y - size * 0.42, size * 0.23, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(txt, x + size * 1.6, y - size * 0.4);
  c.restore();
}

// ───────────── HUD ─────────────
const CHAP = [[0, '远方'], [T.range, '续航'], [T.space, '空间'], [T.cap, '越野'], [T.mont, '细节'], [T.build, '澎程']];
let HUD_INK = '255,255,255';
function hud(t, a = 1) {
  const c = L.c, fin = ease(0.5, 1.1, t) * a * (1 - ease(T.end - 0.2, T.end, t));
  if (fin <= 0) return;
  const ink = (al) => `rgba(${HUD_INK},${al})`;
  c.save(); c.globalAlpha = fin;
  label(c, 'XIAOMI SKYNOMAD', 72, 74, { size: 15, weight: 600, track: 6, color: ink(0.85) });
  label(c, '小米澎程', 72, 100, { size: 16, weight: 500, fam: FONT.zh, track: 4, color: ink(0.7) });
  label(c, 'N90 MAX', W - 72, 74, { size: 15, weight: 600, track: 6, align: 'right', color: ink(0.85) });
  label(c, '2026', W - 72, 100, { size: 15, weight: 500, track: 4, align: 'right', color: ink(0.6) });
  // the progress row sits on grass, water or black in every scene, so it is always white;
  // a thin scrim keeps it (and the small print) readable on the head-lit asphalt in 02
  shade(c, 0, H - 130, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.42)']]);
  const low = (al) => `rgba(255,255,255,${al})`;
  const x0 = 72, x1 = W - 72, y = H - 58;
  c.fillStyle = low(0.25); c.fillRect(x0, y, x1 - x0, 2);
  c.fillStyle = C.teal; c.fillRect(x0, y, (x1 - x0) * clamp(t / 15), 2);
  CHAP.forEach(([t0, name], i) => {
    const x = x0 + (x1 - x0) * t0 / 15, on = t >= t0 && (i === CHAP.length - 1 || t < CHAP[i + 1][0]);
    c.fillStyle = on ? low(1) : low(0.45); c.fillRect(x, y - 5, 2, 12);
    label(c, `0${i + 1} ${name}`, x + 8, y - 12, { size: 13, weight: on ? 600 : 400, fam: FONT.zh, track: 2, color: on ? low(1) : low(0.5) });
  });
  c.restore();
}
// small print under the progress row, bottom right, from the first second to the last frame
function note(t, onLight) {
  const a = ease(0.5, 1.1, t);
  if (a <= 0) return;
  const c = L.c; c.save(); c.globalAlpha = a;
  if (!onLight) { c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 10; }
  label(c, NOTE, W - 72, H - 24, { size: 15, weight: 500, fam: FONT.zh, track: 3, align: 'right', color: onLight ? 'rgba(10,11,13,0.6)' : 'rgba(255,255,255,0.75)' });
  c.restore();
}

// ───────────── 01 远方 — the horizon opens into the grassland at dawn ─────────────
const INTRO = { u0: 0.505, v0: 0.80, z0: 1.65, u1: 0.5, v1: 0.6, z1: 1.1, hv: 0.815 };
function sceneIntro(t) {
  L.bg('#000');
  const c = L.c, e = L.e;
  const k = E.outCubic(inv(0.42, 2.4, t));
  const r = cam('intro', lerp(INTRO.u0, INTRO.u1, k), lerp(INTRO.v0, INTRO.v1, k), lerp(INTRO.z0, INTRO.z1, k));
  const r0 = cam('intro', INTRO.u0, INTRO.v0, INTRO.z0);
  const hy = r0 ? camPt(r0, 0, INTRO.hv)[1] : 560;           // the photo's horizon at the first frame
  const p = E.inOutQuart(inv(0.42, 1.2, t)), top = hy * (1 - p), bot = hy + (H - hy) * p;
  if (p > 0) {
    c.save(); c.beginPath(); c.rect(0, top, W, bot - top); c.clip();
    drawCam(c, r);
    c.restore();
    const sun = e.createRadialGradient(r ? camPt(r, 0.52, INTRO.hv)[0] : 960, r ? camPt(r, 0.52, INTRO.hv)[1] : hy, 10, 960, hy, 700);
    sun.addColorStop(0, `rgba(255,150,70,${0.22 * (1 - inv(1.2, 2.4, t))})`); sun.addColorStop(1, 'rgba(255,150,70,0)');
    e.save(); e.beginPath(); e.rect(0, top, W, bot - top); e.clip(); e.fillStyle = sun; e.fillRect(0, 0, W, H); e.restore();
  }
  const lw = E.outExpo(inv(0.04, 0.6, t)) * W, fade = 1 - inv(0.95, 1.25, t);
  if (lw > 0 && fade > 0) {
    for (const y of p > 0 ? [top, bot] : [hy]) {
      const gg = c.createLinearGradient(960 - lw / 2, 0, 960 + lw / 2, 0);
      gg.addColorStop(0, 'rgba(255,122,47,0)'); gg.addColorStop(0.3, C.sun); gg.addColorStop(0.5, '#FFF4E8'); gg.addColorStop(0.7, C.teal); gg.addColorStop(1, 'rgba(95,182,170,0)');
      c.save(); c.globalAlpha = fade; c.fillStyle = gg; c.fillRect(960 - lw / 2, y - 1.5, lw, 3); c.restore();
      e.save(); e.globalAlpha = fade; e.fillStyle = gg; e.fillRect(960 - lw / 2, y - 7, lw, 14); e.restore();
    }
    if (p < 0.3) {
      const g = e.createRadialGradient(960, hy, 5, 960, hy, 420);
      g.addColorStop(0, `rgba(255,170,90,${0.5 * fade * (1 - p / 0.3)})`); g.addColorStop(1, 'rgba(255,170,90,0)');
      e.fillStyle = g; e.fillRect(0, 0, W, H);
    }
  }
  // title in ink over the bright dawn sky
  const ttl = (col, clipY) => voLine(c, '把家，带去远方', 140, 330, 'vo1', [0, 1, -2, 2, 3, 4, 5], { size: 108, weight: 600, tracking: 6, color: col, tOut: T.range - 0.05, clipY });
  ttl('#FFFFFF', [0, top]); ttl(C.ink, [top, bot]); ttl('#FFFFFF', [bot, H]);
  label(c, scramble('HOME, ANYWHERE', inv(vo('vo1', 2), vo('vo1', 2) + 0.6, t), false, 3), 146, 394,
    { size: 24, weight: 700, track: 12, color: top < 380 ? C.tealDeep : C.tealHi, a: 1 - inv(T.range - 0.05, T.range + 0.2, t) });
}

// ───────────── 02 续航 — route along the bridge, then 说走就走 ─────────────
const ROUTE_UV = [[-0.02, 0.806], [0.12, 0.753], [0.26, 0.701], [0.4, 0.650], [0.55, 0.594], [0.7, 0.540], [0.82, 0.497], [0.95, 0.452]];
function sceneRange(t) {
  L.bg('#000');
  const c = L.c, e = L.e;
  const drop = t >= T.drop;
  if (!drop) {
    const r = cam('road', 0.6, 0.52, 1.06 + 0.07 * E.inOutQuad(inv(T.range - 0.2, T.drop, t)));
    drawCam(c, r);
    shade(c, 0, 0, W * 0.75, H, [[0, 'rgba(0,0,0,0.55)'], [0.5, 'rgba(0,0,0,0.12)'], [1, 'rgba(0,0,0,0)']]);
    shade(c, 0, 0, 0, H, [[0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.6)']]);
    if (r) {
      const P = new Poly(bez(ROUTE_UV.map(([u, v]) => camPt(r, u, v - 0.012)).reduce((a, p, i) => { if (i === 0) return [p]; const q = a.length ? a[a.length - 1] : p; a.push(p); return a; }, []), 1));
      const p = E.inOutCubic(inv(T.range + 0.08, T.drop, t)), split = 464 / 1705;
      c.save(); c.setLineDash([2, 10]); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; c.beginPath(); P.trace(c, 0, 1); c.stroke(); c.restore();
      glowLine(P, 0, Math.min(p, split), C.tealHi, 'rgba(95,182,170,0.95)', 5, 18);
      if (p > split) glowLine(P, split, p, C.sunHi, 'rgba(255,122,47,0.95)', 5, 18);
      const head = P.at(P.L * p);
      if (p > 0 && p < 1) { e.fillStyle = '#FFFFFF'; e.beginPath(); e.arc(head[0], head[1], 18, 0, TAU); e.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(head[0], head[1], 6, 0, TAU); c.fill(); }
      const mk = (frac, txt, sub, col, t0, side = 1, stem = 86) => {
        const a = ease(t0, t0 + 0.2, t); if (a <= 0) return;
        const m = P.at(P.L * frac);
        c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(m[0], m[1], 9 + 14 * (1 - a), 0, TAU); c.stroke();
        c.fillStyle = col; c.beginPath(); c.arc(m[0], m[1], 5, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(m[0], m[1] - 14); c.lineTo(m[0], m[1] - stem); c.stroke(); c.restore();
        const ax = side > 0 ? m[0] + 12 : m[0] - 12, al = side > 0 ? 'left' : 'right';
        label(c, txt, ax, m[1] - stem - 6, { size: 32, weight: 900, fam: FONT.heavy, track: 1, color: '#fff', a, align: al });
        label(c, sub, ax, m[1] - stem - 42, { size: 18, weight: 600, fam: FONT.zh, track: 2, color: col, a, align: al });
      };
      const tSplit = T.range + 0.08 + (T.drop - T.range - 0.08) * 0.42;
      mk(split, '464 km', 'CLTC 纯电续航', C.tealHi, tSplit, 1, 190);
      mk(0.999, '1705 km', 'CLTC 综合续航', C.sunHi, T.drop - 0.12, -1);
    }
  } else {                                                       // 说走就走: night drive, punch-in along the road
    const k = inv(T.drop, T.space, t);
    const r = cam('drop', 0.62, 0.55, 1.3 - 0.16 * E.outExpo(inv(0, 0.35, k)) + 0.12 * k);
    drawCam(c, r);
    shade(c, 0, 0, W * 0.7, H, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]);
    c.save();
    const dx = -0.82, dy = 0.57;
    for (let i = 0; i < 60; i++) {
      const ox = hash(i * 1.37) * W * 1.4 - W * 0.2, oy = hash(i * 3.1) * H * 1.4 - H * 0.2, sp = 2600 + 3000 * hash(i * 7.7);
      const d = ((t - T.drop) * sp + hash(i) * 3000) % 3000, len = 80 + 260 * hash(i * 2.1);
      const x = ox - dx * d * 0.4, y = oy - dy * d * 0.4;
      c.strokeStyle = `rgba(255,255,255,${(0.1 + 0.2 * hash(i * 5.3)) * (1 - k * 0.5)})`; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx * len, y + dy * len); c.stroke();
    }
    c.restore();
    voLine(c, '说走就走', 140, 330, 'vo2', [8, 9, 10, 11], { size: 120, weight: 700, tracking: 10, tOut: T.space - 0.1 });
  }
  // odometer (both halves)
  const val = 1705 * E.inOutCubic(inv(T.range + 0.08, T.drop, t));
  const punch = 1 + 0.08 * Math.exp(-(t - T.drop) * 9) * (drop ? 1 : 0);
  const ox = 140, oy = 960;
  c.save(); c.translate(ox, oy); c.scale(punch, punch); c.translate(-ox, -oy);
  label(c, 'CLTC 综合续航', 146, oy - 250, { size: 30, weight: 600, fam: FONT.zh, track: 4, color: 'rgba(255,255,255,0.9)', a: ease(T.range, T.range + 0.3, t) });
  const wv = odometer(c, Math.round(val * 10) / 10, ox, oy, { size: 250 });
  label(c, 'km', ox + wv + 18, oy, { size: 80, weight: 900, fam: FONT.heavy, track: 0, color: C.sunHi });
  c.restore();
}

// ───────────── 03 空间 — top-view seat layouts → the cutaway photograph ─────────────
const SEAT = { s: 1200 / 5285, cx: 1090, cy: 560 };
function carTop(c, e, a) {                              // top-view body outline, front to the right (mirrored when drawn)
  const Lp = 5285 * SEAT.s, Wp = 1998 * SEAT.s, x0 = SEAT.cx - Lp / 2, y0 = SEAT.cy - Wp / 2;
  c.save(); c.globalAlpha = a; c.strokeStyle = C.tealHi; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(x0 + 120, y0); c.lineTo(x0 + Lp - 200, y0); c.bezierCurveTo(x0 + Lp - 40, y0 + 4, x0 + Lp, y0 + 70, x0 + Lp, y0 + Wp / 2);
  c.bezierCurveTo(x0 + Lp, y0 + Wp - 70, x0 + Lp - 40, y0 + Wp - 4, x0 + Lp - 200, y0 + Wp); c.lineTo(x0 + 120, y0 + Wp);
  c.bezierCurveTo(x0 + 20, y0 + Wp - 4, x0, y0 + Wp - 60, x0, y0 + Wp / 2); c.bezierCurveTo(x0, y0 + 60, x0 + 20, y0 + 4, x0 + 120, y0); c.stroke();
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(155,220,210,0.55)';
  c.beginPath(); c.moveTo(x0 + Lp - 330, y0 + 30); c.quadraticCurveTo(x0 + Lp - 260, y0 + Wp / 2, x0 + Lp - 330, y0 + Wp - 30);
  c.moveTo(x0 + 70, y0 + 40); c.quadraticCurveTo(x0 + 40, y0 + Wp / 2, x0 + 70, y0 + Wp - 40);
  c.stroke();
  c.setLineDash([6, 6]);
  for (const wx of [x0 + 210, x0 + Lp - 330]) for (const wy of [y0 - 6, y0 + Wp - 26]) { c.strokeRect(wx, wy, 150, 32); }
  c.setLineDash([]);
  c.fillStyle = C.tealHi; c.fillRect(x0 + Lp - 312, y0 - 18, 34, 14); c.fillRect(x0 + Lp - 312, y0 + Wp + 4, 34, 14);
  c.restore();
  e.save(); e.globalAlpha = a * 0.5; e.strokeStyle = C.teal; e.lineWidth = 8; e.strokeRect(x0 + 10, y0 + 10, Lp - 20, Wp - 20); e.restore();
  return { x0, y0, Lp, Wp };
}
const SEATS0 = [
  { x: 1400, y: 490 }, { x: 1400, y: 630 },
  { x: 1180, y: 490 }, { x: 1180, y: 630 },
  { x: 940, y: 470, n: 1 }, { x: 940, y: 560, n: 1 }, { x: 940, y: 650, n: 1 },
];
function seatLayout(k) {
  return SEATS0.map((s, i) => {
    const r = { x: s.x, y: s.y, w: s.n ? 92 : 104, h: s.n ? 78 : 100, rec: 0, flat: 0 };
    if (k === 1) { if (i === 2 || i === 3) { r.x -= 70; r.w = 170; r.rec = 1; } if (i >= 4) r.flat = 1; }
    if (k === 2) { if (i < 2) r.x += 40; if (i >= 2) { r.flat = 1; } }
    if (k === 3) { if (i === 2 || i === 3) r.x -= 30; }
    return r;
  });
}
function layoutIndex(t) { let k = 0; for (let i = 0; i < 4; i++) if (t >= T.space + i * BEAT) k = i; return k; }
function drawSeats(c, e, t) {
  const k = layoutIndex(t), tk = T.space + k * BEAT;
  const from = seatLayout(Math.max(0, k - 1)), to = seatLayout(k), p = k === 0 ? 1 : spring(t - tk, 3.2, 0.62);
  const S = from.map((f, i) => { const g = to[i], o = {}; for (const key in g) o[key] = lerp(f[key], g[key], p); return o; });
  const bed = k === 2 ? clamp(p) : (k === 3 ? 1 - clamp(p) : 0);
  if (bed > 0.01) {
    c.save(); c.globalAlpha = bed; c.fillStyle = 'rgba(95,182,170,0.18)'; c.strokeStyle = C.tealHi; c.lineWidth = 2;
    c.beginPath(); rrect(c, 880, 432, 390, 256, 22); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); rrect(c, 1190, 452, 58, 90, 14); c.fill(); c.beginPath(); rrect(c, 1190, 578, 58, 90, 14); c.fill();
    c.restore();
  }
  S.forEach((s, i) => {
    const a = 1 - s.flat * 0.75;
    c.save(); c.globalAlpha *= a * (1 - bed * (i >= 2 ? 0.85 : 0));
    c.fillStyle = s.flat > 0.5 ? 'rgba(95,182,170,0.12)' : 'rgba(255,255,255,0.10)'; c.strokeStyle = s.flat > 0.5 ? 'rgba(155,220,210,0.6)' : '#FFFFFF'; c.lineWidth = 2;
    c.beginPath(); rrect(c, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 16); c.fill(); c.stroke();
    const bw = 20 + 26 * s.rec;
    c.beginPath(); rrect(c, s.x - s.w / 2 - bw + 6, s.y - s.h / 2 + 4, bw, s.h - 8, 8); c.stroke();
    if (s.rec > 0.05) { c.globalAlpha *= s.rec; c.beginPath(); rrect(c, s.x + s.w / 2 - 6, s.y - s.h / 2 + 14, 40 * s.rec, s.h - 28, 8); c.stroke(); }
    c.restore();
  });
  const isl = k === 3 ? clamp(p) : 0, ix = lerp(1400, 1180, isl), iy = 560;
  c.save(); c.strokeStyle = k === 3 ? C.sunHi : 'rgba(255,255,255,0.6)'; c.lineWidth = 2;
  c.beginPath(); rrect(c, ix - 40, iy - 20, 80, 40, 10); c.stroke();
  c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(1120, iy); c.lineTo(1450, iy); c.stroke(); c.setLineDash([]);
  if (isl > 0) { e.fillStyle = C.sun; e.globalAlpha = isl * 0.6; e.fillRect(ix - 44, iy - 24, 88, 48); e.globalAlpha = 1; }
  c.restore();
  return { k, isl, ix, iy };
}
const CUT = { u: 0.545, v: 0.65, carLen: 0.72 };                  // car in the cutaway photo (12.jpg)
function sceneSpace(t) {
  L.bg('#07080A');
  const c = L.c, e = L.e, u = t - T.space;
  const rev = E.inOutCubic(inv(T.photoIn + 0.08, T.photoIn + 0.6, t));   // mask grows to full frame
  const fadeIn = ease(T.photoIn - 0.06, T.photoIn + 0.12, t);
  grid(c, { alpha: 0.8, offX: -u * 30, minor: 0.025, major: 0.05, cross: true });
  // the diagram (mirrored: nose to the left, like the photograph)
  const dia = 1 - ease(T.photoIn + 0.05, T.photoIn + 0.3, t);
  let seats = { k: 0, isl: 0, ix: 1400, iy: 560 };
  if (dia > 0) {
    L.save(); L.alpha(dia); L.translate(2 * SEAT.cx, 0); L.scale(-1, 1);
    const box = carTop(c, e, ease(T.space - 0.05, T.space + 0.25, t));
    seats = drawSeats(c, e, t);
    L.restore();
    if (seats.isl > 0) { c.save(); c.globalAlpha = seats.isl * dia; setFont(c, 700, 20, FONT.en); c.fillStyle = C.sunHi; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('9 L', 2 * SEAT.cx - seats.ix, seats.iy + 1); c.restore(); }
    const dp = ease(T.space + 0.2, T.space + 0.6, t);
    if (dp > 0) {
      const y = box.y0 + box.Wp + 46, xa = 2 * SEAT.cx - 1460, xb = 2 * SEAT.cx - 880;
      c.save(); c.globalAlpha = dp * dia; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(lerp((xa + xb) / 2, xa, dp), y); c.lineTo(lerp((xa + xb) / 2, xb, dp), y); c.moveTo(xa, y - 8); c.lineTo(xa, y + 8); c.moveTo(xb, y - 8); c.lineTo(xb, y + 8); c.stroke();
      c.restore();
      label(c, '舱内乘坐空间 2760 mm', (xa + xb) / 2, y + 34, { size: 18, weight: 500, fam: FONT.zh, align: 'center', track: 2, a: dp * dia });
    }
  }
  // left column: layout counter + name
  if (dia > 0.01) {
    c.save(); c.globalAlpha = dia;
    const cnt = 1 + 10 * E.inOutQuad(inv(T.space, T.photoIn, t));
    odometer(c, cnt, 140, 560, { size: 200, digits: 2 });
    label(c, '种空间布局', 150, 620, { size: 40, weight: 600, fam: FONT.zh, track: 4, color: '#fff' });
    label(c, 'RECONFIGURABLE CABIN', 152, 660, { size: 15, weight: 600, track: 4, color: C.tealHi });
    const k = seats.k, since = t - (T.space + k * BEAT);
    c.fillStyle = C.teal; c.fillRect(150, 712, 46 * ease(0, 0.2, since, E.outCubic), 3);
    label(c, scramble(LAYOUTS[k], inv(0, 0.18, since), true, k), 150, 760, { size: 34, weight: 600, fam: FONT.zh, track: 3, color: '#fff' });
    label(c, '最大储物空间 1831 L', 150, 810, { size: 20, weight: 500, fam: FONT.zh, track: 2, color: 'rgba(255,255,255,0.65)', a: ease(T.space + 0.4, T.space + 0.7, t) });
    c.restore();
  }
  // match cut: the cutaway photograph lands on the diagram, then opens to full frame
  if (fadeIn > 0) {
    const img = ph('cutaway');
    const zMatch = img ? (1200 / CUT.carLen) / (img.naturalWidth * Math.max(W / img.naturalWidth, H / img.naturalHeight)) : 1;
    const q = E.inOutCubic(inv(T.photoIn + 0.08, T.photoIn + 0.7, t)), drift = 0.03 * inv(T.photoIn, T.cap, t);
    const r = cam('cutaway', lerp(CUT.u, 0.52, q), lerp(CUT.v, 0.6, q), lerp(zMatch, 1.04 + drift, q), lerp(SEAT.cx, 960, q), lerp(SEAT.cy, 540, q), false);
    const bw = lerp(1240, W + 40, rev), bh = lerp(470, H + 40, rev), bx = lerp(SEAT.cx, 960, rev) - bw / 2, by = lerp(SEAT.cy, 540, rev) - bh / 2;
    c.save(); c.globalAlpha = fadeIn; c.beginPath(); rrect(c, bx, by, bw, bh, lerp(90, 0, rev)); c.clip();
    drawCam(c, r);
    shade(c, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.35)'], [0.35, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
    c.restore();
    e.save(); e.globalAlpha = fadeIn; e.fillStyle = '#000'; e.fillRect(bx, by, bw, bh); e.restore();
    if (rev < 1) { c.save(); c.strokeStyle = `rgba(155,220,210,${0.9 * (1 - rev)})`; c.lineWidth = 2; c.beginPath(); rrect(c, bx, by, bw, bh, lerp(90, 0, rev)); c.stroke(); c.restore(); }
    [['零重力座椅', 0.3], ['2+2+3 大七座', 0.42], ['移动岛台 · 9 L 冰箱', 0.54]].forEach(([txt, d], i) =>
      pill(c, txt, 140, 820 + i * 66, ease(T.photoIn + d, T.photoIn + d + 0.18, t, E.outBack)));
  }
  voLine(c, '大七座，十一种空间，随心而变', 140, 290, 'vo3', [0, 1, 2, -3, 3, 4, 5, 6, 7, -8, 8, 9, 10, 11], { size: 86, weight: 700, tracking: 4, tOut: T.cap - 0.12 });
}

// ───────────── 04 越野 — the water rises to 750 mm on the car itself ─────────────
const PROF = { ground: 0.705, roof: 0.40, nose: 0.19 };
function sceneCap(t) {
  L.bg('#000');
  const c = L.c, e = L.e, u = t - T.cap;
  const r = cam('profile', 0.5, 0.56, 1.1 + 0.08 * E.outQuad(inv(0, 1.9, u)));
  drawCam(c, r);
  shade(c, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.35)'], [0.3, 'rgba(0,0,0,0)'], [0.8, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]);
  if (!r) return;
  const gY = camPt(r, 0, PROF.ground)[1], roofY = camPt(r, 0, PROF.roof)[1];
  const lvl = 750 * E.outCubic(inv(T.cap + 0.12, T.cap + 1.05, t));
  const wy = gY - (gY - roofY) * lvl / 1825;
  const wyDraw = lerp(H + 20, wy, clamp(lvl / 750 * 1.0));
  const wave = (x) => wyDraw + Math.sin(x * 0.011 + u * 7) * 3 + Math.sin(x * 0.027 - u * 5) * 1.5;
  c.save(); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 12) c.lineTo(x, wave(x)); c.lineTo(W, H); c.closePath();
  const wg = c.createLinearGradient(0, wyDraw, 0, H); wg.addColorStop(0, 'rgba(95,182,170,0.34)'); wg.addColorStop(1, 'rgba(30,80,78,0.62)');
  c.fillStyle = wg; c.fill(); c.restore();
  c.save(); c.strokeStyle = C.tealHi; c.lineWidth = 2.5; c.beginPath(); for (let x = 0; x <= W; x += 12) x ? c.lineTo(x, wave(x)) : c.moveTo(x, wave(x)); c.stroke(); c.restore();
  e.save(); e.strokeStyle = C.teal; e.lineWidth = 12; e.beginPath(); for (let x = 0; x <= W; x += 24) x ? e.lineTo(x, wave(x)) : e.moveTo(x, wave(x)); e.stroke(); e.restore();
  // dimension on the car's nose: ground → water line
  const dx = camPt(r, PROF.nose, 0)[0] - 46, da = ease(T.cap + 0.2, T.cap + 0.4, t);
  if (da > 0) {
    c.save(); c.globalAlpha = da; c.strokeStyle = '#fff'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(dx, gY); c.lineTo(dx, wyDraw); c.moveTo(dx - 10, gY); c.lineTo(dx + 10, gY); c.moveTo(dx - 10, wyDraw); c.lineTo(dx + 10, wyDraw); c.stroke(); c.restore();
    label(c, `${Math.round(lvl)} mm`, dx - 16, (gY + wyDraw) / 2 + 8, { size: 22, weight: 700, fam: FONT.heavy, align: 'right', track: 1, color: '#fff', a: da });
  }
  // number block (top-right, over the dark ridgeline)
  const a = ease(T.cap + 0.1, T.cap + 0.35, t);
  c.save(); c.globalAlpha = a;
  label(c, '最大涉水深度', 1300, 170, { size: 26, weight: 600, fam: FONT.zh, track: 3, color: 'rgba(255,255,255,0.92)' });
  const wv = odometer(c, lvl, 1300, 330, { size: 150, digits: 3 });
  label(c, 'mm', 1300 + wv + 12, 330, { size: 52, weight: 900, fam: FONT.heavy, track: 0, color: C.tealHi });
  c.restore();
  [['双电机四驱', 0.12], ['0–100 km/h 5.9 s', 0.36]].forEach(([txt, d], i) =>
    pill(c, txt, 140, 470 + i * 70, ease(T.cap + d, T.cap + d + 0.22, t, E.outBack)));
  voLine(c, '四驱越野，无惧山海', 140, 300, 'vo4', [0, 1, 2, 3, -4, 4, 5, 6, 7], { size: 108, weight: 700, tracking: 6, tOut: T.mont - 0.08 });
}

// ───────────── 05 细节 — eight cuts on the eighth notes ─────────────
function sceneMont(t) {
  L.bg('#000');
  const c = L.c, u = t - T.mont, step = BEAT / 2;
  const k = Math.min(7, Math.floor(u / step)), lu = u - k * step, p = inv(0, step * 0.55, lu);
  const [key, name, sub] = MONT[k], prev = MONT[Math.max(0, k - 1)][0];
  const F = MONT_FOCUS;
  const draw = (kk, z = 1, dx = 0, dy = 0) => { const f = F[kk] || [0.5, 0.5]; const r = cam(kk, f[0], f[1], z * 1.06, 960 + dx, 540 + dy); drawCam(c, r); };
  const style = k % 4;
  if (k === 0) { draw(key, 1.22 - 0.16 * E.outExpo(p)); }
  else if (k < 3) {                                           // colour swaps: same car, new paint — a hard cut with a push
    draw(key, 1.1 - 0.06 * E.outExpo(p), (1 - E.outExpo(p)) * 60, 0);
  } else if (style === 3) {                                   // split halves
    draw(prev, 1.02);
    c.save(); c.beginPath(); c.rect(0, 0, W / 2, H); c.clip(); c.translate(0, (1 - E.outExpo(p)) * -H); draw(key); c.restore();
    c.save(); c.beginPath(); c.rect(W / 2, 0, W / 2, H); c.clip(); c.translate(0, (1 - E.outExpo(p)) * H); draw(key); c.restore();
  } else if (style === 0) {                                   // iris
    draw(prev, 1.04);
    c.save(); c.beginPath(); c.arc(960, 540, E.outExpo(p) * 1150, 0, TAU); c.clip(); draw(key, 1.15 - 0.1 * E.outExpo(p)); c.restore();
  } else if (style === 1) {                                   // blinds
    draw(prev, 1.02);
    for (let b = 0; b < 6; b++) { const q = E.outExpo(inv(b * 0.08, b * 0.08 + 0.6, p)); c.save(); c.beginPath(); c.rect(0, b * H / 6, W * q, H / 6 + 1); c.clip(); draw(key); c.restore(); }
  } else {                                                    // diagonal push
    draw(prev, 1.02, -E.outExpo(p) * 200, 0);
    c.save(); c.beginPath(); const x = lerp(W + 600, -600, E.outExpo(p)); c.moveTo(x, 0); c.lineTo(W + 700, 0); c.lineTo(W + 700, H); c.lineTo(x - 500, H); c.closePath(); c.clip(); draw(key, 1.08 - 0.04 * p); c.restore();
  }
  shade(c, 0, 0, 0, H, [[0.55, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.75)']]);
  const cp = E.outExpo(inv(0.02, 0.2, lu));
  c.save(); c.beginPath(); c.rect(120, 820, 1400, 150); c.clip(); c.translate(0, (1 - cp) * 90);
  label(c, name, 140, 900, { size: 52, weight: 700, fam: FONT.zh, track: 3, color: '#fff' });
  label(c, sub, 144, 944, { size: 20, weight: 600, fam: FONT.zh, track: 5, color: C.tealHi });
  c.restore();
  label(c, `${String(k + 1).padStart(2, '0')} / 08`, W - 140, 900, { size: 22, weight: 600, track: 4, align: 'right', color: 'rgba(255,255,255,0.85)' });
  const fl = Math.exp(-lu * 30) * (k > 0 ? 0.3 : 0);
  if (fl > 0.01) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(0, 0, W, H); }
}
const MONT_FOCUS = { detail1: [0.5, 0.55], detail2: [0.5, 0.55], detail3: [0.55, 0.5], detail4: [0.62, 0.5], detail5: [0.4, 0.5], detail6: [0.55, 0.45], detail7: [0.55, 0.55], detail8: [0.6, 0.55] };

// ───────────── 06 澎程 — dusk, the name arrives ─────────────
function sceneBuild(t) {
  L.bg('#000');
  const c = L.c, u = t - T.build;
  drawCam(c, cam('side', 0.5, 0.62, 1.06 + 0.05 * E.outQuad(inv(0, 2, u))));
  c.fillStyle = 'rgba(0,0,0,0.32)'; c.fillRect(0, 0, W, H);
  shade(c, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.45)'], [0.5, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.55)']]);
  c.save(); c.globalAlpha = 0.28 * ease(0, 0.4, u); setFont(c, 700, 560, FONT.zh, 20); c.strokeStyle = '#fff'; c.lineWidth = 2; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.strokeText('澎程', 960 - 60 * u, 420); c.restore();
  voLine(c, '小米澎程', 960, 560, 'vo5', [0, 1, 2, 3], { size: 150, weight: 700, tracking: 18, align: 'center', tOut: T.end - 0.25 });
  const p = E.inOutCubic(inv(T.build + 0.1, T.end, t));
  glowLine([[160, 640], [1760, 640]], 0.5 - p / 2, 0.5 + p / 2, '#FFFFFF', 'rgba(95,182,170,1)', 3, 14);
}

// ───────────── 07 END CARD — light, ink type beside the hero ─────────────
function sceneEnd(t) {
  L.bg('#F2F2F0');
  const c = L.c, e = L.e, u = t - T.end;
  drawCam(c, cam('hero', 0.56, 0.5, 1.1 - 0.05 * E.outCubic(inv(0, 1.8, u))));
  shade(c, 0, 0, W, 0, [[0, 'rgba(242,242,240,0.92)'], [0.38, 'rgba(242,242,240,0.55)'], [0.62, 'rgba(242,242,240,0)']]);
  shade(c, 0, H - 280, 0, H, [[0, 'rgba(242,242,240,0)'], [1, 'rgba(242,242,240,0.75)']]);   // fog over the reflection, keeps the credit legible
  const r = (d, dur = 0.45) => E.glide(inv(d, d + dur, u));
  c.save(); const a1 = r(0.02); c.globalAlpha = a1; c.translate(0, (1 - a1) * 30);
  setFont(c, 700, 100, FONT.zh, 8); c.fillStyle = C.ink; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('小米澎程', 140, 470);
  setFont(c, 900, 100, FONT.heavy, 2); c.fillText('N90 Max', 140, 590);
  c.restore();
  const lp = r(0.1, 0.5);
  c.fillStyle = C.teal; c.fillRect(140, 628, 520 * lp, 5);
  voLine(c, '澎湃每一程', 140, 730, 'vo6', [0, 1, 2, 3, 4], { size: 62, weight: 600, tracking: 10, color: C.tealDeep });
  const a3 = r(0.55);
  label(c, '上市售价', 144, 820, { size: 20, weight: 500, fam: FONT.zh, track: 3, color: 'rgba(10,11,13,0.6)', a: a3 });
  c.save(); c.globalAlpha = a3; c.translate(0, (1 - a3) * 20);
  setFont(c, 900, 64, FONT.heavy, 0); c.fillStyle = C.ink; c.fillText('26.99', 140, 900);
  const w2 = textW(c, '26.99', 900, 64, FONT.heavy, 0);
  setFont(c, 600, 30, FONT.zh, 2); c.fillText('万元起', 140 + w2 + 14, 898);
  c.restore();
  label(c, 'xiaomiev.com', 144, 958, { size: 20, weight: 600, track: 3, color: 'rgba(10,11,13,0.55)', a: r(0.7) });
  label(c, 'XIAOMI SKYNOMAD', 72, 74, { size: 15, weight: 600, track: 6, color: 'rgba(10,11,13,0.8)', a: r(0.3) });
  // billing block, bottom right: two columns (label over name) split by a teal hairline
  const xr = 1848, yL = 958, yN = 996;               // label row shares the xiaomiev.com baseline
  const lab = { size: 13, weight: 500, fam: FONT.zh, track: 3, color: 'rgba(10,11,13,0.5)' };
  const cols = CREDIT.map(([l, n, f]) => {
    const fam = FONT[f], trk = f === 'zh' ? 3 : 1;
    return { l, n, fam, trk, w: Math.max(textW(c, l, lab.weight, lab.size, lab.fam, lab.track), textW(c, n, 600, 24, fam, trk)) };
  });
  const gap = 64, x2 = xr - cols[1].w, x1 = x2 - gap - cols[0].w;
  cols.forEach((k, i) => {
    const a = r(0.4 + 0.15 * i, 0.5); if (a <= 0) return;
    const x = i ? x2 : x1;
    c.save(); c.globalAlpha = a; c.translate(0, (1 - a) * 12);
    label(c, k.l, x, yL, lab);
    setFont(c, 600, 24, k.fam, k.trk); c.fillStyle = 'rgba(10,11,13,0.9)'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(k.n, x, yN);
    c.restore();
  });
  const dv = E.outCubic(r(0.5, 0.45)), xd = x2 - gap / 2, ym = (yL - 12 + yN + 4) / 2, hh = (yN + 4 - (yL - 12)) / 2 * dv;
  if (dv > 0) { c.fillStyle = C.teal; c.fillRect(xd - 1, ym - hh, 2, hh * 2); }
}

// ───────────── master timeline ─────────────
function drawFrame(t) {
  drawScenes(t);
  note(t, t >= T.end - 0.02);
}
function drawScenes(t) {
  T_NOW = t;
  const c = L.c, e = L.e;
  const pS = T.range - 0.1, pE = T.range + 0.14;
  const cS = T.cap - 0.02, eS = T.end - 0.02;
  if (t < pS) { sceneIntro(t); HUD_INK = '10,11,13'; hud(t); return; }
  if (t < pE) {
    const p = E.inOutQuint(inv(pS, pE, t));
    L.save(); L.translate(-p * W * 0.6, 0); sceneIntro(t); L.restore();
    L.save(); L.clipRect(W * (1 - p), 0, W * p + 2, H); L.translate(W * (1 - p) * 0.5, 0); sceneRange(t); L.restore();
    c.fillStyle = '#fff'; c.fillRect(W * (1 - p) - 1.5, 0, 3, H); e.fillStyle = C.teal; e.fillRect(W * (1 - p) - 8, 0, 16, H);
    HUD_INK = p < 0.5 ? '10,11,13' : '255,255,255'; hud(t); return;
  }
  if (t < T.space) {
    sceneRange(t);
    if (t > T.space - 0.12) { const p = inv(T.space - 0.12, T.space, t); c.fillStyle = `rgba(7,8,10,${E.inQuad(p)})`; c.fillRect(0, 0, W, H); }
    HUD_INK = '255,255,255'; hud(t); return;
  }
  if (t < cS) { sceneSpace(t); HUD_INK = '255,255,255'; hud(t); return; }
  if (t < T.mont) { sceneCap(t); HUD_INK = '255,255,255'; hud(t); return; }
  if (t < T.build) { sceneMont(t); HUD_INK = '255,255,255'; hud(t); return; }
  if (t < eS) { sceneBuild(t); HUD_INK = '255,255,255'; hud(t); return; }
  sceneEnd(t);
}

function fxAt(t) {
  const hit = (t0, k = 10) => t >= t0 ? Math.exp(-(t - t0) * k) : 0;
  const ca = 0.0008 + 0.005 * hit(T.drop, 8) + 0.004 * hit(T.space, 9) + 0.005 * hit(T.cap, 9) + 0.004 * hit(T.mont, 9) + 0.005 * hit(T.end, 7);
  const flash = 0.3 * hit(T.drop, 14) + 0.2 * hit(T.cap, 16) + 0.75 * hit(T.end, 8) + 0.12 * hit(T.space, 16);
  const light = t >= T.end;
  return { ca, flash, vig: light ? 0.12 : 0.36, grain: light ? 0.018 : 0.03, bloom: light ? 0.5 : 1.0 };
}
function samplesAt(t) {
  const within = (a, b) => t >= a && t <= b;
  if (within(T.range - 0.25, T.range + 0.15) || within(T.drop - 0.1, T.space + 0.1) || within(T.mont, T.build)) return 10;
  if (within(T.photoIn - 0.1, T.photoIn + 0.75) || within(T.end - 0.1, T.end + 0.4)) return 9;
  return 6;
}
