// ─────────────────────────────────────────────────────────────────────────────
//  渡 — 紧那罗与阿羞 MV.  A cave wall painted in the Dunhuang manner comes alive.
//  Global time t: PRE-second story opening, then the song on its own clock
//  s = t − PRE (0–SONG), then the end card.  Every effect is a pure function
//  of time, so any frame renders on its own.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
window.ALL_TEXT = '渡紧那罗阿羞惹得天怒地也恼人间再无红颜笑留一半相思上大道怕什么轮回魄散魂飞若没有你那才叫可悲'
  + '世尊座下护法奉命南传祭司设三难偷儿恶霸妓女从此世上出品栋森网络科技创作概念练手非官方音乐演唱恩几翻唱版权归原作者及方所有故事改编自电视剧西游记后传';
const LABM = Q.get('lab');
const U = Math.min(W, H) / 1080;                      // 1 at the short side of the frame
const SX = f => W * f, SY = f => H * f;
const pick = (h, v) => VERT ? v : h;
const rnd = (i, k, seed = 0) => hash2(i * 1.618 + seed * 7.13, k * 2.414 + seed * 0.31);

// sung characters, song time (SenseVoice alignment of the chorus; 么 散 魂 from vocal onsets)
const LYR = [
  { text: '惹得天怒地也恼', t: [0.66, 0.90, 1.50, 1.92, 2.52, 2.94, 3.24] },
  { text: '人间再无红颜笑', t: [4.20, 4.38, 5.10, 5.58, 5.88, 6.42, 6.54] },
  { text: '留一半相思上大道', t: [8.04, 8.64, 9.06, 9.78, 10.08, 11.04, 11.70, 11.94] },
  { text: '怕什么天道轮回', t: [14.10, 14.70, 15.00, 15.78, 16.08, 17.10, 17.40] },
  { text: '什么魄散魂飞', t: [18.12, 18.45, 19.25, 19.65, 20.30, 20.76] },
  { text: '若没有你那才叫可悲', t: [22.26, 22.68, 22.98, 23.28, 23.88, 24.60, 25.02, 25.74, 26.04] },
];
const snap = x => (Math.round(x * FPS - 0.5) + 0.5) / FPS;     // cuts fall between shutter windows
const CUT = { s2: snap(4.05), s3: snap(7.95), s4: snap(13.95), s5: snap(18.05), s6: snap(22.15), end: snap(27.70) };

const SPR = {};
window.PREPARE = async () => {
  await PREPARE_MURAL(); PREPARE_FIGURES();
  SPR.cloudG = cloudSprite(120, { seed: 3 });
  SPR.cloudB = cloudSprite(100, { seed: 7, bands: [C.azure, C.azureLt, C.white] });
  SPR.cloudR = cloudSprite(90, { seed: 9, bands: [C.red, C.redHi, C.white] });
  SPR.cloudW = cloudSprite(110, { seed: 12, bands: [C.malaDk, C.mala, C.white], tail: 2.8 });
  SPR.haloK = haloSprite(230, { seed: 4 });
  SPR.cloudDk = cloudSprite(130, { seed: 21, bands: ['#1E2638', '#2F3B55', '#4A5670'], line: '#0D0B0A', tail: 3 });
  SPR.flowers = [flowerSprite(22, { seed: 2 }), flowerSprite(18, { seed: 5, col: C.white, inner: C.red }), flowerSprite(20, { seed: 8, col: C.mala, inner: C.white }), flowerSprite(16, { seed: 11, col: C.redHi })];
};

// ───────────── shared ─────────────
// flowers scattered from above (散花), in wall space, drifting and turning
function scatterFlowers(c, s, n, seed, box, o = {}) {
  const [x0, y0, x1, y1] = box;
  for (let i = 0; i < n; i++) {
    const sp = o.speed ?? 0.09, ph = (s * sp * (0.7 + 0.6 * rnd(i, 1, seed)) + rnd(i, 2, seed)) % 1;
    const x = lerp(x0, x1, rnd(i, 3, seed)) + Math.sin(s * 0.9 + i * 1.7) * 40, y = lerp(y0, y1, ph);
    const a = Math.min(1, Math.sin(ph * Math.PI) * 2) * (o.a ?? 1);
    drawSprite(c, SPR.flowers[i % 4], x, y, (0.7 + 0.6 * rnd(i, 4, seed)) * (o.scale || 1), { rot: s * (0.6 + rnd(i, 5, seed)) + i, alpha: a });
  }
}
// 榜题: a pale cartouche with a double border; the sung characters are written into it one by one
function cartouche(c, e, li, s, o = {}) {
  const line = LYR[li], chars = Array.from(line.text), n = chars.length;
  const fs = (o.size || pick(62, 66)) * U, lead = fs * 1.1, pad = fs * 0.5;
  const bw = fs * 1.55, bh = pad * 2 + lead * (n - 1) + fs;
  const x = o.x, y = o.y, out = o.out ?? 1;
  const appear = inv(line.t[0] - 0.55, line.t[0] - 0.12, s);
  if (appear <= 0 || out <= 0) return;
  c.save(); c.globalAlpha *= out;
  c.save(); c.beginPath(); c.rect(x - 12 * U, y - 12 * U, bw + 24 * U, (bh + 24 * U) * E.outCubic(appear)); c.clip();
  c.shadowColor = 'rgba(20,12,8,0.45)'; c.shadowBlur = 18 * U; c.fillStyle = 'rgba(0,0,0,0.001)'; c.fillRect(x, y, bw, bh); c.shadowBlur = 0;
  pigment(c, `M${x} ${y} h${bw} v${bh} h${-bw} Z`, '#EADFC2', { seed: 7 + li, edge: 0.55, edgeW: 5, edgeCol: '#B39468', mottle: 0.22, grain: 0.22, wear: 0.25, bbox: [x, y, x + bw, y + bh] });
  c.strokeStyle = C.redDeep; c.lineWidth = 2.6 * U; c.strokeRect(x + 7 * U, y + 7 * U, bw - 14 * U, bh - 14 * U);
  c.strokeStyle = 'rgba(36,26,22,0.8)'; c.lineWidth = 1.2 * U; c.strokeRect(x + 13 * U, y + 13 * U, bw - 26 * U, bh - 26 * U);
  c.restore();
  c.font = `400 ${fs}px ${FONT.kai}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = o.ink || '#211714';
  chars.forEach((ch, i) => {
    const t0 = line.t[i] - 0.05, p = inv(t0, t0 + 0.26, s); if (p <= 0) return;
    const cx = x + bw / 2, cy = y + pad + fs / 2 + i * lead;
    c.save(); c.beginPath(); c.rect(cx - fs, cy - fs * 0.62, fs * 2, fs * 1.24 * E.outCubic(p)); c.clip();
    c.globalAlpha *= 0.95; c.fillText(ch, cx, cy); c.restore();
  });
  c.restore();
}
const cartPos = (li, side = 'l') => {
  const n = Array.from(LYR[li].text).length, fs = pick(62, 66) * U, bh = fs + fs * 1.1 * (n - 1) + fs;
  if (VERT) return { x: side === 'l' ? SX(0.07) : SX(0.93) - fs * 1.55, y: SY(0.07) };
  return { x: side === 'l' ? SX(0.06) : SX(0.94) - fs * 1.55, y: Math.max(SY(0.08), (H - bh) / 2 - SY(0.06)) };
};

// ───────────── 01 · 惹得天怒地也恼 — the high priest condemns him to the pyre; lightning, and the wall itself cracks ─────────────
let S1 = null;
function makeS1() {
  // static night panel over wall x −500…3100, y −300…1900 (cached at 0.6)
  const k = 0.6, X0 = -500, Y0 = -300, cv = mk(3600 * k, 2200 * k), c = cv.getContext('2d'); c.scale(k, k); c.translate(-X0, -Y0);
  pigment(c, 'M-500 -300 H3100 V1240 H-500 Z', '#1F2433', { seed: 601, edge: 0, mottle: 0.35, grain: 0.2, wear: 0.35, bbox: [-500, -300, 3100, 1240] });
  [[300, 220, 1.4], [900, 150, 1.1], [1500, 260, 1.5], [2150, 170, 1.2], [650, 520, 1.0], [1950, 560, 1.1]].forEach(([x, y, sc], i) => drawSprite(c, SPR.cloudDk, x, y, sc, { flip: i % 2 === 1, alpha: 0.95 }));
  // a city on the horizon: domes, stupas and gates in dark ochre
  const R = rng(61);
  for (let i = 0; i < 34; i++) {
    const x = -500 + i * 106 + R() * 40, w = 70 + R() * 90, h = 90 + R() * 170, y = 1240;
    const d = R() < 0.35 ? `M${x} ${y} L${x} ${y - h * 0.6} C${x} ${y - h * 0.95} ${x + w} ${y - h * 0.95} ${x + w} ${y - h * 0.6} L${x + w} ${y} Z` : `M${x} ${y} L${x} ${y - h * 0.7} L${x + w / 2} ${y - h} L${x + w} ${y - h * 0.7} L${x + w} ${y} Z`;
    pigment(c, d, i % 3 ? '#4A3528' : '#5A4030', { seed: 620 + i, edge: 0.4, edgeW: 3, mottle: 0.2 }); mline(c, d, { w: 2, color: '#120C0A', seed: 650 + i, alpha: 0.8 });
  }
  pigment(c, 'M-500 1240 H3100 V1900 H-500 Z', '#5A3E2A', { seed: 602, edge: 0, mottle: 0.3, grain: 0.2, bbox: [-500, 1240, 3100, 1900] });
  return { cv, k, X0, Y0 };
}
function logsPile(c, x0, y0, x1, y1, seed) {
  const R = rng(seed);
  for (let row = 0; row < 6; row++) {
    const y = lerp(y1, y0, row / 5), n = 7 - Math.floor(row / 2), inset = row * (x1 - x0) * 0.05;
    for (let i = 0; i < n; i++) {
      const cx = lerp(x0 + inset, x1 - inset, (i + 0.5) / n) + (R() - 0.5) * 20, len = (x1 - x0) / n * 1.35, ang = (R() - 0.5) * 0.5 + (row % 2 ? 0.25 : -0.25), r = 22 + R() * 8;
      c.save(); c.translate(cx, y); c.rotate(ang);
      const d = `M${-len / 2} ${-r} H${len / 2} A${r * 0.5} ${r} 0 0 1 ${len / 2} ${r} H${-len / 2} Z`;
      pigment(c, d, R() < 0.5 ? '#6A4426' : '#7A5230', { seed: seed + row * 10 + i, edge: 0.5, edgeW: 5, edgeCol: '#2E1A0E', mottle: 0.2, bbox: [-len / 2, -r, len / 2 + r, r] });
      mline(c, d, { w: 2, color: '#1A0F08', seed: seed + 100 + row * 10 + i });
      c.fillStyle = '#B08650'; c.beginPath(); c.ellipse(len / 2, 0, r * 0.45, r * 0.9, 0, 0, TAU); c.fill(); c.strokeStyle = '#3A2410'; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.ellipse(len / 2, 0, r * 0.2, r * 0.45, 0, 0, TAU); c.stroke();
      c.restore();
    }
  }
}
function crowd(c, e, s, x0, x1, y, n, seed, fireUp) {
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, (i + 0.5) / n) + (rnd(i, 1, seed) - 0.5) * 50, sc = 0.8 + 0.4 * rnd(i, 2, seed), yy = y + rnd(i, 3, seed) * 60, bob = Math.sin(s * 3 + i) * 4;
    c.save(); c.translate(x, yy + bob); c.scale(sc, sc);
    c.fillStyle = '#1A120E'; c.beginPath(); c.arc(0, -150, 30, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-60, 60); c.bezierCurveTo(-58, -40, -44, -110, 0, -118); c.bezierCurveTo(44, -110, 58, -40, 60, 60); c.closePath(); c.fill();
    if (rnd(i, 4, seed) < 0.55) {                                   // a raised torch
      const tx = (rnd(i, 5, seed) - 0.5) * 60; c.strokeStyle = '#2A1A10'; c.lineWidth = 9; c.beginPath(); c.moveTo(tx * 0.5, -60); c.lineTo(tx, -250); c.stroke();
      flameTongue(c, tx, -250, 34, 80 * (0.9 + 0.3 * fireUp), s, i + seed, { lw: 2 });
    }
    c.restore();
    if (e && rnd(i, 4, seed) < 0.55) { const tx = x + (rnd(i, 5, seed) - 0.5) * 60 * sc; glowDot(e, tx, yy + bob - 280 * sc, 70 * sc, 'rgba(255,150,60,A)', 0.3); }
  }
}
function boltAt(c, e, x0, y0, x1, y1, seed, a) {
  if (a <= 0) return;
  const pts = boltPts(x0, y0, x1, y1, seed, 0.2, 6);
  c.save(); c.globalAlpha *= Math.min(1, a);
  brush(c, pts, { w: 12, color: '#FFF4DA', taper: [0.02, 0.5], dry: 0.2, seed, press: 0.5 });
  const R = rng(seed + 3);
  for (let b = 0; b < 3; b++) { const i = Math.floor(pts.length * (0.25 + R() * 0.5)), [bx, by] = pts[i]; brush(c, boltPts(bx, by, bx + (R() - 0.5) * 500, by + (200 + R() * 300), seed + b + 9, 0.25, 5), { w: 5, color: '#FFEFD0', taper: [0.02, 0.7], dry: 0.3, seed: seed + b }); }
  c.restore();
  e.save(); e.globalAlpha = Math.min(1, a); e.strokeStyle = 'rgba(255,236,200,0.95)'; e.lineWidth = 34; e.lineJoin = 'round'; e.beginPath(); pts.forEach(([x, y], i) => i ? e.lineTo(x, y) : e.moveTo(x, y)); e.stroke(); e.restore();
}
function sceneS1(s) {
  const c = L.c, e = L.e;
  if (!S1) S1 = { bg: makeS1(), cracks: [].concat(crackGen(71, 1300, 1560, -1.35, 900, { depth: 2, t0: 2.5, speed: 2400, w: 5 }), crackGen(73, 700, 1560, -1.9, 800, { depth: 2, t0: 2.92, speed: 2400, w: 4.5 }), crackGen(79, 2200, 1560, -1.1, 800, { depth: 2, t0: 3.22, speed: 2400, w: 4.5 })) };
  const push = E.inOutQuad(clamp(s / 4.05));
  const shake = [2.52, 2.94, 3.24].reduce((m, t0) => m + (s > t0 ? Math.exp(-(s - t0) * 7) * 16 : 0), 0);
  const K0 = VERT ? { x: lerp(1560, 1700, push), y: lerp(800, 760, push), z: W / lerp(1150, 1000, push) } : { x: lerp(1180, 1330, push), y: lerp(830, 780, push), z: H / lerp(1700, 1420, push) };
  const K = { ...K0, x: K0.x + Math.sin(s * 83) * shake, y: K0.y + Math.cos(s * 61) * shake };
  const fire = 0.45 + 0.35 * inv(0.0, 1.5, s) + 0.5 * inv(2.5, 3.3, s);
  L.save(); camApply(K); wallBg(K);
  c.drawImage(S1.bg.cv, S1.bg.X0, S1.bg.Y0, 3600, 2200);
  // lightning at 天 and 怒
  const l1 = s > 1.46 ? Math.exp(-(s - 1.46) * 9) : 0, l2 = s > 1.88 ? Math.exp(-(s - 1.88) * 9) : 0;
  boltAt(c, e, 900, -100, 1500, 700, 17, l1 * 1.4); boltAt(c, e, 2300, -100, 1900, 800, 29, l2 * 1.4);
  // the priest on his platform (mirrored so he faces the pyre), pointing
  const pr = VERT ? { x: 820, y: 60, k: 0.62 } : { x: -170, y: 170, k: 0.82 };
  c.save(); c.translate(pr.x + 1400 * pr.k, pr.y); c.scale(-pr.k, pr.k); c.drawImage(fig('priest'), 0, 0); c.restore();
  const railY = pr.y + 1400 * pr.k - 190;
  pigment(c, `M${pr.x - 40} ${railY} H${pr.x + 1250 * pr.k} V${railY + 190} H${pr.x - 40} Z`, C.red, { seed: 611, edge: 0.5, edgeW: 6, bbox: [pr.x - 40, railY, pr.x + 1250 * pr.k, railY + 190] });
  for (let i = 0; i < 7; i++) { const x = pr.x - 20 + i * (1250 * pr.k + 20) / 6; pigment(c, `M${x - 10} ${railY - 30} h20 v220 h-20 Z`, C.mala, { seed: 612 + i, edge: 0.5, edgeW: 3, bbox: [x - 10, railY - 30, x + 10, railY + 190] }); }
  mline(c, `M${pr.x - 40} ${railY} H${pr.x + 1250 * pr.k}`, { w: 3, color: C.ink, seed: 619 });
  // stake, him, ropes, logs, fire
  pigment(c, 'M1786 230 h34 v1130 h-34 Z', '#5A3A22', { seed: 613, edge: 0.6, edgeW: 5, bbox: [1786, 230, 1820, 1360] }); mline(c, 'M1786 230 v1130 M1820 230 v1130', { w: 2, color: '#1A0F08', seed: 614 });
  c.save(); c.translate(1236, 150); c.scale(0.72, 0.72); drawKin(c, -0.04); c.restore();
  mlines(c, ['M1650 900 C1740 918 1860 918 1960 900', 'M1640 980 C1740 1000 1870 1000 1970 980', 'M1632 1060 C1740 1080 1870 1080 1976 1060'], { w: 7, color: '#C8A46A', seed: 615 });
  mlines(c, ['M1650 900 C1740 918 1860 918 1960 900', 'M1640 980 C1740 1000 1870 1000 1970 980', 'M1632 1060 C1740 1080 1870 1080 1976 1060'], { w: 1.4, color: '#3A2410', seed: 616 });
  logsPile(c, 1330, 1080, 2170, 1390, 630);
  flameRow(c, e, [[1340, 1110], [1600, 1070], [1900, 1070], [2160, 1110]], s * 1.3, { n: 12, w: 90, h: 200 * fire, seed: 3, glow: 0.16, jitter: 0.7 });
  flameRow(c, e, [[1380, 1250], [1760, 1230], [2120, 1250]], s * 1.5 + 2, { n: 9, w: 80, h: 160 * fire, seed: 7, glow: 0.12, jitter: 0.8 });
  for (let i = 0; i < 40; i++) {                                    // embers
    const ph = (s * 0.5 + rnd(i, 1, 81)) % 1, x = lerp(1380, 2120, rnd(i, 2, 81)) + Math.sin(s * 2 + i) * 40, y = 1100 - ph * 900 * fire;
    c.fillStyle = `rgba(255,190,90,${(1 - ph) * 0.9})`; c.beginPath(); c.arc(x, y, 3 + 3 * rnd(i, 3, 81), 0, TAU); c.fill(); glowDot(e, x, y, 10, 'rgba(255,160,60,A)', 0.6 * (1 - ph));
  }
  crowd(c, e, s, -100, 2700, 1560, 16, 5, fire);
  crackDraw(c, S1.cracks, s, { a: 1 });
  [[1300, 2.52], [700, 2.94], [2200, 3.24]].forEach(([x, t0], i) => dust(c, e, x, 1100, s - t0, 40, 90 + i, { spread: 400, g: 700 }));
  surfacePass(K, 0.85); L.restore();
  lampPass(c, { x: SX(pick(0.62, 0.55)), y: SY(0.62), dark: 0.55, core: [255, 214, 160] });
  cartouche(c, e, 0, s, cartPos(0, 'r'));
  return { flash: Math.max(l1, l2) * 0.5, flashCol: '#F4F0FF' };
}

// ───────────── 02 · 人间再无红颜笑 — her portrait; from 再无 the paint cracks and falls away ─────────────
let AX_FLAKES = null, AX_CRACKS = null;
function sceneS2(s) {
  const c = L.c, e = L.e, u = s - CUT.s2, D = CUT.s3 - CUT.s2;
  const img = fig('axiu'), sk = sketchOf('axiu');
  if (!AX_FLAKES) {
    AX_FLAKES = flakeGen(17, [360, 90, 1200, 1400], 27);
    AX_CRACKS = crackGen(23, 800, 380, 2.2, 360, { depth: 2, t0: 5.1, speed: 1100, w: 2.6 }).concat(crackGen(29, 600, 800, -0.6, 300, { depth: 2, t0: 5.3, speed: 1000, w: 2.2 }));
  }
  const push = E.inOutQuad(clamp(u / D));
  const K = VERT ? { x: 720, y: lerp(700, 640, push), z: W / lerp(1080, 900, push) } : { x: lerp(690, 700, push), y: lerp(640, 600, push), z: H / lerp(1080, 880, push) };
  L.save(); camApply(K); wallBg(K);
  // painted around her: clouds, drifting slowly on the wall
  drawSprite(c, SPR.cloudW, 180 + u * 6, 330, 1.15, { alpha: 0.95 });
  drawSprite(c, SPR.cloudB, 1260 - u * 5, 560, 1.0, { flip: true, alpha: 0.95 });
  drawSprite(c, SPR.cloudR, 250 + u * 4, 1040, 0.9, { alpha: 0.9 });
  drawSprite(c, SPR.cloudG, 1230 - u * 4, 1180, 1.0, { flip: true, alpha: 0.9 });
  // the figure, flaking from the hem upwards; her smile goes last
  const start = p => 5.62 + (1 - p.cy / 1400) * 1.9 + p.r * 0.35;
  const fade = E.inOutQuad(inv(5.5, 7.8, s));
  scatterFlowers(c, s + 20, 16, 4, [60, -80, 1340, 1500], { a: 1 - fade * 0.7 });
  flakeFigure(c, e, img, sk, 0, 0, 1, AX_FLAKES, s, start, { fade, dur: 0.9, g: 1100 });
  crackDraw(c, AX_CRACKS, s, { a: 1 - inv(7.4, 7.9, s) * 0.5 });
  surfacePass(K, 0.9);
  L.restore();
  lampPass(c, { x: pick(SX(0.5), SX(0.55)), y: pick(SY(0.42), SY(0.4)), dark: lerp(0.62, 0.78, fade), r: Math.hypot(W, H) * 0.6 });
  cartouche(c, e, 1, s, cartPos(1, 'l'));
  return {};
}

// ───────────── 04 · 怕什么天道轮回 — he lifts his head to the light; the wheel of 世尊 turns ─────────────
const S4CUT = snap(15.62);
function kinCam(u, dur, zoom0, zoom1) {
  const p = E.inOutQuad(clamp(u / dur));
  return VERT ? { x: lerp(740, 720, p), y: lerp(760, 700, p), z: W / lerp(zoom0 * 0.9, zoom1 * 0.9, p) } : { x: lerp(760, 740, p), y: lerp(640, 600, p), z: H / lerp(zoom0, zoom1, p) };
}
function haloAt(tilt) { const [px, py] = KN_PIV, x = 740 - px, y = 440 - py; return [px + x * Math.cos(tilt) - y * Math.sin(tilt), py + x * Math.sin(tilt) + y * Math.cos(tilt)]; }
function sceneS4(s) {
  const c = L.c, e = L.e;
  if (s < S4CUT) {                                         // close: he raises his head
    const u = s - CUT.s4, tilt = lerp(-0.06, -0.36, E.inOutCubic(inv(0.1, 1.2, u)));
    const K = kinCam(u, S4CUT - CUT.s4, 1060, 960);
    L.save(); camApply(K); wallBg(K);
    drawSprite(c, SPR.cloudB, 180 + u * 8, 300, 1.2, { alpha: 0.9 }); drawSprite(c, SPR.cloudW, 1250 - u * 6, 1050, 1.1, { flip: true, alpha: 0.9 });
    const [hx, hy] = haloAt(tilt); drawSprite(c, SPR.haloK, hx, hy, 1, { rot: s * 0.15 });
    drawKin(c, tilt);
    rays(c, e, -200, -300, 0.35, 1.05, 9, 1900, 0.9 * inv(0.3, 1.2, u), s);
    motes(c, e, s, 40, 3, [200, 100, 1200, 1200], { a: 0.8 });
    surfacePass(K, 0.85); L.restore();
    lampPass(c, { x: SX(pick(0.3, 0.35)), y: SY(0.25), dark: 0.6 });
    cartouche(c, e, 3, s, cartPos(3, 'r'));
    return {};
  }
  // wide: the colossal 世尊, the wheel turning faster at 轮回; the two of them small before the throne
  const u = s - S4CUT, D = CUT.s5 - S4CUT, spin = s * 0.12 + Math.max(0, s - 17.0) ** 2 * 0.9;
  const K = VERT ? { x: 800, y: lerp(1080, 1000, E.inOutQuad(u / D)), z: H / lerp(2350, 2150, E.inOutQuad(u / D)) } : { x: 800, y: lerp(1010, 960, E.inOutQuad(u / D)), z: H / lerp(2150, 1950, E.inOutQuad(u / D)) };
  L.save(); camApply(K); wallBg(K);
  drawSprite(c, SPR.cloudW, 120 + u * 10, 1500, 1.5, { alpha: 0.95 }); drawSprite(c, SPR.cloudB, 1500 - u * 10, 1560, 1.4, { flip: true, alpha: 0.95 });
  scatterFlowers(c, s, 22, 9, [-200, -300, 1800, 2000], { scale: 1.6 });
  wheelOfWay(c, e, 800, 900, spin, 1 + 0.25 * inv(17.0, 17.6, s));
  c.drawImage(fig('buddha'), 0, 0);
  drawSprite(c, SPR.haloK, 800, 540, 1.05, { rot: -spin * 0.5 });
  c.drawImage(fig('buddha'), 690, 290, 220, 440, 690, 290, 220, 440);     // the head again over its own halo
  c.drawImage(fig('kneel'), 430, 1640, 385, 242);
  rays(c, e, 800, 484, -Math.PI * 0.95, -Math.PI * 0.05, 16, 1500, 0.8 + 0.4 * inv(17.0, 17.5, s), s);
  surfacePass(K, 0.85); L.restore();
  lampPass(c, { x: SX(0.5), y: SY(0.4), dark: 0.5 });
  cartouche(c, e, 3, s, cartPos(3, 'r'));
  return { flash: 0.35 * Math.exp(-Math.max(0, s - 17.1) * 6) * (s > 17.1 ? 1 : 0) };
}
// the great mandorla: rings of flame, petals and small seated buddhas, each turning at its own pace
function wheelOfWay(c, e, cx, cy, spin, glow) {
  c.save();
  haloRings(c, cx, cy, [[0, 380, C.mala], [380, 450, C.white], [450, 560, C.azure], [560, 610, C.red], [610, 700, C.white]], { lw: 3 });
  ringMotif(c, cx, cy, 415, 30, spin * 1.5, cc => { petalShape(cc, 22, 40); cc.fillStyle = C.red; cc.fill(); cc.strokeStyle = C.line; cc.lineWidth = 2; cc.stroke(); });
  ringMotif(c, cx, cy, 505, 16, -spin, (cc, i) => { cc.fillStyle = C.gold; cc.beginPath(); cc.arc(0, 0, 26, 0, TAU); cc.fill(); cc.fillStyle = C.red; cc.beginPath(); cc.ellipse(0, 6, 18, 14, 0, 0, TAU); cc.fill(); cc.fillStyle = '#EBC98C'; cc.beginPath(); cc.arc(0, -12, 10, 0, TAU); cc.fill(); cc.strokeStyle = C.line; cc.lineWidth = 1.6; cc.stroke(); });
  ringMotif(c, cx, cy, 655, 44, spin * 0.7, cc => { cc.fillStyle = C.azure; cc.beginPath(); cc.arc(0, 0, 12, 0, TAU); cc.fill(); cc.fillStyle = C.gold; cc.beginPath(); cc.arc(0, 0, 5, 0, TAU); cc.fill(); });
  c.restore();
  flameRow(c, e, arcPts(cx, cy, 720, 0, TAU, 200), spin * 3, { n: 46, w: 70, h: 150, seed: 11, glow: 0.35 * glow, sway: 0.4 });
  e.save(); e.globalAlpha = 0.25 * glow; const g = e.createRadialGradient(cx, cy, 200, cx, cy, 760); g.addColorStop(0, 'rgba(255,210,140,0.0)'); g.addColorStop(0.8, 'rgba(255,190,110,0.8)'); g.addColorStop(1, 'rgba(255,160,80,0)'); e.fillStyle = g; e.fillRect(cx - 800, cy - 800, 1600, 1600); e.restore();
}

// ───────────── 05 · 什么魄散魂飞 — the halo shatters, the paint darkens from the cracks, the dark flames rise ─────────────
let S5 = null;
function sceneS5(s) {
  const c = L.c, e = L.e, u = s - CUT.s5, D = CUT.s6 - CUT.s5;
  if (!S5) S5 = {
    halo: flakeGen(31, [0, 0, SPR.haloK.w, SPR.haloK.h], 34),
    cracks: [].concat(crackGen(41, 700, 300, 1.9, 520, { depth: 2, t0: 19.2, speed: 1400, w: 3 }), crackGen(43, 760, 560, 1.2, 700, { depth: 2, t0: 19.35, speed: 1300, w: 3 }), crackGen(47, 640, 900, 0.6, 600, { depth: 2, t0: 19.5, speed: 1200, w: 2.6 }), crackGen(53, 900, 780, 2.6, 500, { depth: 1, t0: 19.6, speed: 1100, w: 2.4 })),
    flakes: flakeGen(59, [560, 760, 1020, 1400], 30),
  };
  const tilt = -0.36 + 0.05 * E.outCubic(inv(20.3, 21.2, s));
  const shake = s > 20.76 ? Math.exp(-(s - 20.76) * 4) * 14 : s > 19.25 ? Math.exp(-(s - 19.25) * 5) * 8 : 0;
  const K0 = kinCam(u, D, 960, 880); const K = { ...K0, x: K0.x + Math.sin(s * 71) * shake, y: K0.y + Math.cos(s * 57) * shake };
  const dark = E.inOutQuad(inv(19.3, 20.6, s)), fl = E.outBack(clamp(inv(20.7, 21.1, s)), 1.3);
  L.save(); camApply(K); wallBg(K);
  drawSprite(c, SPR.cloudDk, 200 + u * 20, 300, 1.2, { alpha: dark }); drawSprite(c, SPR.cloudDk, 1250 - u * 16, 1080, 1.1, { flip: true, alpha: dark });
  if (fl > 0) darkMandorla(c, e, 780, 620, s, fl);
  const [hx, hy] = haloAt(tilt);
  burstSprite(c, e, SPR.haloK, hx, hy, 1, S5.halo, 19.25, s, { v: 900, g: 700, dur: 1.2 });
  if (s < 19.25) { e.save(); e.globalAlpha = 0.4 * inv(18.3, 19.2, s); e.drawImage(SPR.haloK.cv, hx - SPR.haloK.w / 2, hy - SPR.haloK.h / 2); e.restore(); }
  const mask = spreadMask(S5.cracks, s, 260);
  drawKin(c, tilt, dark >= 1 ? 1 : 0.5, { mask: dark >= 1 ? null : mask });
  crackDraw(c, S5.cracks, s, { a: 1 - 0.4 * dark });
  // a few flakes pop off the robe and fall as the dark takes it
  for (const p of S5.flakes) { const st = 19.7 + p.r * 1.4; if (s < st || s > st + 0.8 || p.r2 > 0.35) continue; const q = s - st; c.save(); c.globalAlpha = 1 - q / 0.8; c.fillStyle = mixHex('#8E3B24', '#1B1412', dark); c.translate(p.cx + (p.r3 - 0.5) * 80 * q, p.cy + 500 * q * q); c.rotate(q * 4 * (p.r3 - 0.5)); c.translate(-p.cx, -p.cy); c.beginPath(); p.poly.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); c.restore(); }
  // the eyes kindle at 魂
  const eg = E.outCubic(inv(20.25, 20.6, s));
  if (eg > 0) { const [ex, ey] = kinEye(tilt); c.fillStyle = `rgba(255,70,40,${0.9 * eg})`; c.beginPath(); c.ellipse(ex, ey, 9, 5, tilt, 0, TAU); c.fill(); glowDot(e, ex, ey, 60, 'rgba(255,60,30,A)', eg); }
  if (s < 19.4) rays(c, e, -200, -300, 0.35, 1.05, 9, 1900, 0.9 * (1 - inv(19.1, 19.4, s)), s);
  motes(c, e, s, 50, 5, [200, 100, 1300, 1300], { a: 0.6 + dark * 0.4, speed: 0.05 + dark * 0.2 });
  surfacePass(K, 0.85); L.restore();
  lampPass(c, { x: SX(pick(0.35, 0.4)), y: SY(0.3), dark: lerp(0.62, 0.8, dark), core: [255, lerp(244, 200, dark), lerp(222, 170, dark)] });
  cartouche(c, e, 4, s, cartPos(4, 'r'));
  const fx = s < 19.25 ? 0 : s < 20.7 ? Math.exp(-(s - 19.25) * 7) * 0.7 : Math.exp(-(s - 20.76) * 6) * 0.35;
  return { flash: fx, flashCol: s > 20.7 ? '#5A0E08' : '#FFF4DA' };
}
function glowDot(e, x, y, r, col, a) { const g = e.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); e.fillStyle = g; e.fillRect(x - r, y - r, 2 * r, 2 * r); }
// black-and-red flame mandorla (无天)
function darkMandorla(c, e, cx, cy, s, g) {
  const bands = ['#120C0B', '#3E120E', '#86241A'];
  c.save(); c.globalAlpha *= Math.min(1, g); c.fillStyle = 'rgba(18,12,11,0.55)'; c.beginPath(); c.ellipse(cx, cy + 60, 470 * g, 560 * g, 0, 0, TAU); c.fill(); c.restore();
  flameRow(c, null, arcPts(cx, cy + 60, 500 * g, Math.PI * 0.96, Math.PI * 2.04, 200), s * 1.6, { n: 38, w: 64 * g, h: 190 * g, seed: 5, bands, line: '#050303', sway: 0.55 });
  flameRow(c, null, arcPts(cx, cy + 60, 360 * g, Math.PI * 1.02, Math.PI * 1.98, 140), s * 1.9 + 3, { n: 24, w: 56 * g, h: 150 * g, seed: 9, bands, line: '#050303', sway: 0.65 });
  e.save(); e.globalAlpha = 0.28 * Math.min(1, g); const gr = e.createRadialGradient(cx, cy, 200, cx, cy, 720); gr.addColorStop(0, 'rgba(200,30,14,0)'); gr.addColorStop(0.75, 'rgba(200,30,14,0.55)'); gr.addColorStop(1, 'rgba(120,10,0,0)'); e.fillStyle = gr; e.fillRect(cx - 720, cy - 720, 1440, 1440); e.restore();
}

// ───────────── 03 · 留一半相思上大道 — he carries her up the endless stair to 灵山 ─────────────
const S3P = [[1000, 4200], [780, 3760], [1240, 3220], [840, 2680], [1170, 2140], [910, 1640], [1040, 1180], [1000, 960]];
function catmull(pts, n = 16) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  out.push(pts[pts.length - 1]); return out;
}
const S3PATH = new Poly(catmull(S3P));
const pathW = y => lerp(46, 150, clamp((y - 960) / 3240));
function peak(c, x, y, w, h, seed, blue) {
  const R = rng(seed), lean = (R() - 0.5) * 0.3 * w;
  const d = `M${x - w / 2} ${y} C${x - w * 0.42} ${y - h * 0.55} ${x - w * 0.2 + lean} ${y - h * 1.02} ${x + lean} ${y - h} C${x + w * 0.22 + lean} ${y - h * 0.98} ${x + w * 0.44} ${y - h * 0.5} ${x + w / 2} ${y} Z`;
  const [top, bot, dk] = blue ? [C.azureLt, C.azure, C.azureDk] : [C.malaLt, C.mala, C.malaDk];
  pigment(c, d, bot, { seed, edge: 0.55, edgeW: Math.max(5, w * 0.025), edgeCol: dk, mottle: 0.22, bbox: [x - w / 2 - 20, y - h - 20, x + w / 2 + 20, y],
    shade: (t, sc) => { const g = t.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, alphaHex(top, 0.95)); g.addColorStop(0.55, alphaHex(top, 0.1)); g.addColorStop(1, alphaHex('#E9DCC0', 0.55)); t.fillStyle = g; t.fillRect(x - w, y - h - 20, w * 2, h + 20); } });
  mline(c, d, { w: Math.max(1.8, w * 0.006), color: C.ink, seed: seed + 1 });
  for (let i = 1; i <= 2; i++) { const f = 0.3 * i; mline(c, `M${x - w * (0.5 - f * 0.4)} ${y - h * 0.08} C${x - w * (0.4 - f * 0.3)} ${y - h * (0.5 - f * 0.1)} ${x - w * 0.12 + lean} ${y - h * (0.95 - f * 0.5)} ${x + lean * (1 - f)} ${y - h * (1 - f * 0.7)}`, { w: Math.max(1.2, w * 0.004), color: dk, seed: seed + 2 + i, alpha: 0.7 }); }
  if (R() < 0.6) for (let i = 0; i < 3; i++) { const tx = x + lean * 0.8 + (i - 1) * w * 0.07, ty = y - h * (0.97 - Math.abs(i - 1) * 0.08); c.fillStyle = C.malaDk; c.beginPath(); c.ellipse(tx, ty - w * 0.03, w * 0.022, w * 0.04, 0, 0, TAU); c.fill(); c.strokeStyle = C.ink; c.lineWidth = 1.2; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, ty + w * 0.03); c.stroke(); }
}
function palace(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const part = (d, col, seed, o = {}) => { pigment(c, d, col, { seed, edge: 0.5, edgeW: 4, ...o }); mline(c, d, { w: 2, color: C.ink, seed: seed + 1 }); };
  part('M-420 140 H420 V220 H-420 Z', C.white, 701);
  for (let i = -3; i <= 3; i++) { const cx = i * 110; pigment(c, `M${cx - 10} -40 h20 v180 h-20 Z`, C.red, { seed: 710 + i, edge: 0.5, edgeW: 3, bbox: [cx - 10, -40, cx + 10, 140] }); }
  for (let i = -3; i < 3; i++) { const cx = i * 110 + 55; part(`M${cx - 44} 0 h88 v110 h-88 Z`, i % 2 ? C.mala : C.white, 720 + i); }
  part('M-380 -60 H380 V-36 H-380 Z', C.gold, 730);
  part('M-500 -50 C-440 -60 -400 -80 -360 -130 L360 -130 C400 -80 440 -60 500 -50 C420 -40 260 -40 0 -40 C-260 -40 -420 -40 -500 -50 Z', C.azureDk, 732);
  part('M-230 -140 H230 V-126 H-230 Z', C.red, 734);
  for (let i = -1; i <= 1; i++) part(`M${i * 150 - 12} -210 h24 v72 h-24 Z`, C.red, 736 + i);
  part('M-330 -200 C-290 -210 -260 -230 -230 -270 L230 -270 C260 -230 290 -210 330 -200 C260 -190 140 -190 0 -190 C-140 -190 -260 -190 -330 -200 Z', C.azureDk, 740);
  goldFill(c, 'M-10 -270 C-10 -300 0 -320 0 -320 C0 -320 10 -300 10 -270 Z', { seed: 742 });
  ['M-360 -130 C-380 -150 -370 -170 -350 -170', 'M360 -130 C380 -150 370 -170 350 -170', 'M-230 -270 C-250 -290 -240 -310 -220 -310', 'M230 -270 C250 -290 240 -310 220 -310'].forEach((d, i) => mline(c, d, { w: 5, color: C.gold, seed: 744 + i }));
  c.restore();
}
function makeS3() {
  const k = 0.5, X0 = -500, Y0 = 200, Wd = 3000, Hd = 4300, cv = mk(Wd * k, Hd * k), c = cv.getContext('2d'); c.scale(k, k); c.translate(-X0, -Y0);
  const pts = S3PATH.p, pathXAt = y => { let best = pts[0]; for (const p of pts) if (Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p; return best[0]; };
  let seed = 800;
  for (let y = 1000; y <= 4500; y += 200) {                      // far rows first, near rows last
    const f = clamp((y - 1000) / 3300), w = lerp(260, 820, f), h = w * lerp(0.95, 0.75, f), px = pathXAt(y), gap = pathW(y) * 0.8 + w * 0.42;
    for (let x = X0 + ((y / 200) % 2) * w * 0.3; x < X0 + Wd + w; x += w * 0.62) {
      if (Math.abs(x - px) < gap) continue;
      peak(c, x + (rnd(seed, 1) - 0.5) * w * 0.2, y + (rnd(seed, 2) - 0.5) * 40, w, h * (0.8 + 0.4 * rnd(seed, 3)), seed, rnd(seed, 4) < 0.4); seed++;
    }
  }
  // the stair: pale stone band with its treads
  const R = resample(S3PATH.p, 4);
  c.beginPath(); R.forEach((p, i) => { const hw = pathW(p.y) / 2; i ? c.lineTo(p.x + p.nx * hw, p.y + p.ny * hw) : c.moveTo(p.x + p.nx * hw, p.y + p.ny * hw); });
  for (let i = R.length - 1; i >= 0; i--) { const p = R[i], hw = pathW(p.y) / 2; c.lineTo(p.x - p.nx * hw, p.y - p.ny * hw); }
  c.closePath();
  c.fillStyle = '#E8DDC4'; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 2.4; c.stroke();
  c.strokeStyle = 'rgba(90,70,50,0.55)'; c.lineWidth = 1.6;
  for (let i = 0; i < R.length; i += Math.max(3, Math.round(pathW(R[i].y) / 12))) { const p = R[i], hw = pathW(p.y) / 2; c.beginPath(); c.moveTo(p.x + p.nx * hw, p.y + p.ny * hw); c.lineTo(p.x - p.nx * hw, p.y - p.ny * hw); c.stroke(); }
  palace(c, 1000, 780, 1);
  return { cv, k, X0, Y0, Wd, Hd };
}
let S3 = null;
function sceneS3(s) {
  const c = L.c, e = L.e, u = s - CUT.s3, D = CUT.s4 - CUT.s3;
  if (!S3) S3 = makeS3();
  const walk = lerp(0.03, 0.19, clamp(u / D)), P = S3PATH.at(walk * S3PATH.L), sc = lerp(0.66, 0.46, walk / 0.19);
  const rise = E.inOutCubic(inv(10.6, 13.4, s));
  const K = VERT ? { x: lerp(P[0], 1000, rise), y: lerp(P[1] - 360, 900, rise), z: W / lerp(1150, 1500, rise) } : { x: lerp(P[0] + 100, 1000, rise), y: lerp(P[1] - 260, 900, rise), z: H / lerp(1500, 1750, rise) };
  L.save(); camApply(K); wallBg(K);
  c.drawImage(S3.cv, S3.X0, S3.Y0, S3.Wd, S3.Hd);
  // the palace glows; clouds drift across the stair
  e.save(); e.globalAlpha = 0.5; const g = e.createRadialGradient(1000, 700, 60, 1000, 700, 700); g.addColorStop(0, 'rgba(255,214,140,0.9)'); g.addColorStop(1, 'rgba(255,190,110,0)'); e.fillStyle = g; e.fillRect(300, 0, 1400, 1400); e.restore();
  rays(c, e, 1000, 640, -Math.PI * 0.95, -Math.PI * 0.05, 12, 1200, 0.6, s);
  [[500, 1100, 1.6, 0], [1500, 1000, 1.4, 1], [300, 1900, 1.8, 0], [1700, 2400, 1.7, 1], [600, 3000, 2.0, 0], [1600, 3500, 1.9, 1]].forEach(([x, y, k2, f], i) => drawSprite(c, i % 2 ? SPR.cloudB : SPR.cloudW, x + Math.sin(s * 0.3 + i) * 40 + (f ? -1 : 1) * u * 25, y, k2, { flip: !!f, alpha: 0.95 }));
  // the two of them, climbing (a gentle step bob)
  const bob = Math.abs(Math.sin(s * 5.2)) * 6;
  c.save(); c.translate(P[0], P[1] - bob); c.scale(sc, sc); c.drawImage(fig('carry'), -270, -600); c.restore();
  glowDot(e, P[0] - 60 * sc, P[1] - 330 * sc, 26 * sc, 'rgba(255,60,40,A)', 0.5 + 0.3 * Math.sin(s * 3));
  scatterFlowers(c, s, 16, 13, [K.x - 1200, K.y - 1200, K.x + 1200, K.y + 1200], { scale: 1.3, speed: 0.06 });
  surfacePass(K, 0.85); L.restore();
  lampPass(c, { x: SX(0.5), y: SY(lerp(0.4, 0.2, rise)), dark: 0.42, core: [255, 250, 238] });
  cartouche(c, e, 2, s, cartPos(2, 'l'));
  return {};
}

// ───────────── 06 · 若没有你那才叫可悲 — 无天 alone under the moon; then her, as she was ─────────────
const S6CUT = snap(24.45);
function makeS6() {
  const k = 0.6, X0 = -600, Y0 = -1000, Wd = 3000, Hd = 2900, cv = mk(Wd * k, Hd * k), c = cv.getContext('2d'); c.scale(k, k); c.translate(-X0, -Y0);
  pigment(c, `M${X0} ${Y0} h${Wd} v${Hd} h${-Wd} Z`, '#1A2030', { seed: 901, edge: 0, mottle: 0.3, grain: 0.2, wear: 0.3, bbox: [X0, Y0, X0 + Wd, Y0 + Hd] });
  pigment(c, circleD(560, 420, 250), C.moon, { seed: 902, edge: 0.4, edgeW: 12, edgeCol: '#C9C2AE', mottle: 0.15, shade: (t, sc) => { sSpot(t, 520, 380, 120, '#FFFFFF', 0.5); sSpot(t, 640, 500, 60, '#B8B09A', 0.3); } });
  mline(c, circleD(560, 420, 250), { w: 2.4, color: '#6A6456', seed: 903 });
  for (let i = 0; i < 12; i++) peak(c, -300 + i * 220 + (i % 2) * 60, 1500 + (i % 3) * 40, 420, 300 + (i % 4) * 40, 910 + i, i % 2 === 0);
  c.save(); c.globalAlpha = 0.55; c.fillStyle = '#0E121C'; c.fillRect(X0, 1100, Wd, 900); c.restore();
  const cliff = 'M880 1700 C900 1500 940 1300 980 1180 C1000 1120 1060 1090 1140 1086 C1240 1082 1340 1090 1420 1110 C1480 1150 1520 1300 1560 1700 Z';
  pigment(c, cliff, '#2A3A36', { seed: 920, edge: 0.6, edgeW: 10, edgeCol: '#0C1412', mottle: 0.25, shade: (t, sc) => sLine(t, sc, 'M1000 1180 C1100 1110 1300 1110 1420 1120', '#5C7068', 30, 0.5) });
  mline(c, cliff, { w: 2.6, color: '#050706', seed: 921 });
  mlines(c, ['M1000 1260 C1060 1400 1080 1540 1090 1700', 'M1240 1100 C1260 1300 1290 1500 1300 1700', 'M1400 1140 C1440 1340 1470 1520 1490 1700'], { w: 1.8, color: '#0C1412', seed: 922, alpha: 0.8 });
  return { cv, k, X0, Y0, Wd, Hd };
}
let S6 = null;
function sceneS6(s) {
  const c = L.c, e = L.e;
  if (s < S6CUT) {
    if (!S6) S6 = makeS6();
    const u = s - CUT.s6, p = E.inOutQuad(clamp(u / (S6CUT - CUT.s6)));
    const K = VERT ? { x: lerp(1000, 1180, p), y: lerp(700, 760, p), z: W / lerp(1100, 860, p) } : { x: lerp(820, 1000, p), y: lerp(760, 760, p), z: H / lerp(1500, 1180, p) };
    L.save(); camApply(K); wallBg(K);
    c.drawImage(S6.cv, S6.X0, S6.Y0, S6.Wd, S6.Hd);
    glowDot(e, 560, 420, 520, 'rgba(210,220,255,A)', 0.35);
    [[200, 700, 1.3], [1600, 520, 1.5], [900, 250, 1.1]].forEach(([x, y, k2], i) => drawSprite(c, SPR.cloudDk, x + u * (i % 2 ? -30 : 30), y, k2, { flip: i % 2 === 1, alpha: 0.9 }));
    const fx = 1180, fy = 1100, fs = 0.9;
    // faint dark fire about his feet, the thread at his wrist burning red
    e.save(); e.globalAlpha = 0.25; const gg = e.createRadialGradient(fx, fy - 250, 50, fx, fy - 250, 420); gg.addColorStop(0, 'rgba(150,20,10,0.8)'); gg.addColorStop(1, 'rgba(90,0,0,0)'); e.fillStyle = gg; e.fillRect(fx - 420, fy - 670, 840, 840); e.restore();
    c.save(); c.translate(fx - 160 * fs, fy - 616 * fs); c.scale(fs, fs); c.drawImage(fig('wutianBack'), 0, 0); c.restore();
    const tx = fx - 160 * fs + 275 * fs, ty = fy - 616 * fs + 400 * fs, pul = 0.6 + 0.4 * Math.sin(s * 4);
    c.fillStyle = 'rgba(255,80,60,0.95)'; c.beginPath(); c.arc(tx, ty, 4, 0, TAU); c.fill(); glowDot(e, tx, ty, 34, 'rgba(255,50,30,A)', 0.55 * pul);
    motes(c, e, s, 30, 21, [fx - 600, fy - 900, fx + 600, fy + 200], { a: 0.35, speed: 0.03 });
    surfacePass(K, 0.85); L.restore();
    lampPass(c, { x: SX(pick(0.4, 0.5)), y: SY(0.35), dark: 0.6, core: [226, 232, 255] });
    cartouche(c, e, 5, s, cartPos(5, pick('l', 'r')));
    return {};
  }
  // her, as she was: warm light, flowers falling; the last caption; the wall goes dark
  const u = s - S6CUT, D = CUT.end - S6CUT, p = E.inOutQuad(clamp(u / D));
  const K = VERT ? { x: 700, y: lerp(640, 580, p), z: W / lerp(1000, 820, p) } : { x: lerp(720, 700, p), y: lerp(600, 560, p), z: H / lerp(1000, 800, p) };
  L.save(); camApply(K); wallBg(K);
  drawSprite(c, SPR.cloudR, 200 + u * 10, 360, 1.2); drawSprite(c, SPR.cloudW, 1250 - u * 8, 620, 1.1, { flip: true }); drawSprite(c, SPR.cloudG, 260 + u * 6, 1100, 1.0);
  scatterFlowers(c, s + 40, 22, 17, [0, -100, 1400, 1500], { scale: 1.1 });
  c.drawImage(fig('axiu'), 0, 0);
  e.save(); e.globalAlpha = 0.18 + 0.1 * Math.sin(s * 2); const g = e.createRadialGradient(700, 520, 50, 700, 520, 600); g.addColorStop(0, 'rgba(255,220,170,0.9)'); g.addColorStop(1, 'rgba(255,200,140,0)'); e.fillStyle = g; e.fillRect(0, -100, 1400, 1300); e.restore();
  surfacePass(K, 0.85); L.restore();
  lampPass(c, { x: SX(0.5), y: SY(0.4), dark: 0.5, core: [255, 238, 214] });
  cartouche(c, e, 5, s, cartPos(5, pick('l', 'r')));
  caption(c, '从此，世上再无紧那罗', inv(26.15, 26.7, s) * (1 - inv(27.3, 27.62, s)));
  darkPass(c, E.inQuad(inv(27.3, 27.7, s)));
  return {};
}
// documentary caption: white serif, spaced, low in the frame
function caption(c, str, a, y) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.font = `400 ${pick(34, 38) * U}px ${FONT.serif}`; c.letterSpacing = `${pick(8, 6) * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 16 * U; c.fillStyle = '#F4EDE0'; c.fillText(str, SX(0.5), y ?? SY(pick(0.87, 0.86))); c.restore();
}

// ───────────── 00 · opening — a lamp in the dark of the cave finds the two of them on the wall ─────────────
// the panel: 紧那罗 on the left (mirrored to face right), 阿羞 on the right, the title between them
const OPEN = { kin: [0, 0, 1], axiu: [1250, 0, 1], title: [1380, 470] };
function openPanel(c, e, t, o = {}) {
  drawSprite(c, SPR.cloudW, 300 + t * 6, 220, 1.2); drawSprite(c, SPR.cloudB, 2350 - t * 6, 260, 1.1, { flip: true });
  drawSprite(c, SPR.cloudR, 1330 + t * 4, 90, 0.8);
  scatterFlowers(c, t + 7, 18, 23, [0, -100, 2700, 1500], { scale: 1.1 });
  const [kx, ky, ks] = o.kin || OPEN.kin, [ax, ay, as] = o.axiu || OPEN.axiu;
  const [hx, hy] = haloAt(-0.06); drawSprite(c, SPR.haloK, kx + (1400 - hx) * ks, ky + hy * ks, ks * 0.95, { rot: t * 0.1 });
  c.save(); c.translate(kx + 1400 * ks, ky); c.scale(-ks, ks); drawKin(c, -0.06); c.restore();
  c.save(); c.translate(ax, ay); c.scale(as, as); c.drawImage(fig('axiu'), 0, 0); c.restore();
}
function titleDu(c, e, x, y, size, p, o = {}) {
  if (p <= 0) return;
  c.save(); c.font = `400 ${size}px ${FONT.xing}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.beginPath(); c.rect(x - size, y - size * 0.62, size * 2, size * 1.24 * E.outCubic(clamp(p))); c.clip();
  c.globalAlpha *= Math.min(1, p * 1.5);
  c.fillStyle = 'rgba(40,20,14,0.35)'; c.fillText('渡', x + size * 0.02, y + size * 0.03);
  c.fillStyle = o.col || '#8E2A1C'; c.fillText('渡', x, y);
  c.restore();
  if (e && o.glow) { e.save(); e.globalAlpha = 0.3 * clamp(p) * o.glow; e.font = c.font = `400 ${size}px ${FONT.xing}`; e.textAlign = 'center'; e.textBaseline = 'middle'; e.fillStyle = '#FFC878'; e.fillText('渡', x, y); e.restore(); }
}
function seal(c, x, y, sz, txt, a, k = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x + sz / 2, y + sz / 2); c.scale(k, k);
  c.fillStyle = C.verm; c.beginPath(); c.moveTo(-sz / 2, -sz / 2 + 2); c.lineTo(sz / 2 - 1, -sz / 2); c.lineTo(sz / 2, sz / 2 - 2); c.lineTo(-sz / 2 + 2, sz / 2); c.closePath(); c.fill();
  c.fillStyle = '#F7EDE3'; c.font = `400 ${sz * 0.4}px ${FONT.kai}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const ch = Array.from(txt); if (ch.length === 2) { c.fillText(ch[0], 0, -sz * 0.2); c.fillText(ch[1], 0, sz * 0.22); } else c.fillText(txt, 0, 0);
  c.fillStyle = 'rgba(247,237,227,0.55)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc((rnd(i, 1, 9) - 0.5) * sz * 0.95, (rnd(i, 2, 9) - 0.5) * sz * 0.95, 0.6 + rnd(i, 3, 9) * 1.6, 0, TAU); c.fill(); }
  c.restore();
}
function creditLines(c, a, y0) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a * 0.55; const bh = pick(120, 190) * U, g = c.createLinearGradient(0, y0 - bh * 0.45, 0, y0 + bh);
  g.addColorStop(0, 'rgba(18,12,10,0)'); g.addColorStop(0.35, 'rgba(18,12,10,0.8)'); g.addColorStop(1, 'rgba(18,12,10,0.9)'); c.fillStyle = g; c.fillRect(0, y0 - bh * 0.45, W, H - (y0 - bh * 0.45)); c.restore();
  c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 10 * U; c.fillStyle = 'rgba(244,237,224,0.92)';
  c.font = `400 ${pick(24, 27) * U}px ${FONT.serif}`; c.letterSpacing = `${2 * U}px`;
  if (VERT) { c.fillText('出品 · PRODUCED BY　栋森网络科技', SX(0.5), y0); c.fillText('AI 创作 · CREATED WITH　Claude Opus 5.5', SX(0.5), y0 + 40 * U); }
  else c.fillText('出品 · PRODUCED BY　栋森网络科技　｜　AI 创作 · CREATED WITH　Claude Opus 5.5', SX(0.5), y0);
  c.font = `400 ${pick(20, 23) * U}px ${FONT.serif}`; c.fillStyle = 'rgba(244,237,224,0.72)'; c.fillText('概念练手 · 非官方', SX(0.5), y0 + pick(40, 84) * U);
  c.restore();
}
// screen position of a wall point under camera K
const toScreen = (K, x, y) => [W / 2 + (x - K.x) * K.z, H / 2 + (y - K.y) * K.z];
function sceneOpen(t) {
  const c = L.c, e = L.e;
  const kinF = [840, 560], axF = [1250 + 690, 540];
  const pan = E.inOutCubic(inv(2.5, 3.5, t)), wide = E.inOutCubic(inv(4.0, 5.2, t));
  const K = VERT
    ? { x: lerp(lerp(760, 1880, pan), 1330, wide), y: lerp(640, 700, wide), z: W / lerp(1250, 2750, wide) }
    : { x: lerp(lerp(900, 1720, pan), 1325, wide), y: lerp(600, 640, wide), z: H / lerp(1150, 1520, wide) };
  L.save(); camApply(K); wallBg(K);
  openPanel(c, e, t);
  const tp = inv(4.35, 4.9, t);
  titleDu(c, e, OPEN.title[0], OPEN.title[1], 330, tp, { glow: 1 });
  surfacePass(K, 0.9); L.restore();
  // the lamp: finds him, then her, then opens onto the wall
  const [sx1, sy1] = toScreen(K, ...kinF), [sx2, sy2] = toScreen(K, ...axF), [sx3, sy3] = toScreen(K, OPEN.title[0], 640);
  const lx = lerp(lerp(sx1, sx2, pan), sx3, wide), ly = lerp(lerp(sy1, sy2, pan), sy3, wide);
  const flick = Math.sin(t * 13) * 0.015 + Math.sin(t * 7.3) * 0.02;
  lampPass(c, { x: lx, y: ly, r: Math.hypot(W, H) * lerp(0.36, 0.7, wide), dark: lerp(0.9, 0.6, wide), core: [255, 226, 176], flick });
  darkPass(c, 1 - E.outCubic(inv(0.3, 1.0, t)));
  // captions
  caption(c, '世尊座下大护法紧那罗，奉命南下传法', inv(0.9, 1.3, t) * (1 - inv(2.45, 2.75, t)));
  caption(c, '大祭司设三难：偷儿、恶霸、妓女阿羞', inv(2.85, 3.25, t) * (1 - inv(4.05, 4.35, t)));
  // title block: subtitle, seal, credits
  const [tx, ty] = toScreen(K, OPEN.title[0], OPEN.title[1]);
  const st = inv(4.8, 5.2, t) * (1 - inv(5.55, 5.85, t));
  if (st > 0) {
    c.save(); c.globalAlpha = st; c.font = `400 ${pick(30, 30) * U}px ${FONT.serif}`; c.letterSpacing = `${10 * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 12 * U; c.fillStyle = '#F4EDE0'; c.fillText('紧那罗 · 阿羞', tx, ty + 330 * K.z * 0.72); c.restore();
    seal(c, tx + 330 * K.z * 0.45, ty + 330 * K.z * 0.2, 54 * U, '栋森', st, 1 + (1 - E.outBack(inv(4.95, 5.12, t))) * 0.5);
  }
  creditLines(c, inv(4.95, 5.3, t) * (1 - inv(5.55, 5.85, t)), SY(pick(0.86, 0.84)));
  darkPass(c, E.inQuad(inv(5.62, 5.95, t)));
}

// ───────────── the cover (frame 0) ─────────────
function sceneCover() {
  const c = L.c, e = L.e;
  if (!VERT) {
    const K = { x: 1325, y: 650, z: H / 1480 };
    L.save(); camApply(K); wallBg(K); openPanel(c, e, 1.5); titleDu(c, e, OPEN.title[0], OPEN.title[1] - 20, 360, 1, { glow: 1 }); surfacePass(K, 0.9); L.restore();
    lampPass(c, { x: SX(0.5), y: SY(0.45), dark: 0.55, core: [255, 232, 190] });
    const [tx, ty] = toScreen(K, OPEN.title[0], OPEN.title[1] - 20);
    c.save(); c.font = `400 ${30 * U}px ${FONT.serif}`; c.letterSpacing = `${10 * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 12 * U; c.fillStyle = '#F4EDE0'; c.fillText('紧那罗 · 阿羞', tx, ty + 250 * U); c.restore();
    seal(c, tx + 120 * U, ty + 40 * U, 54 * U, '栋森', 1);
    creditLines(c, 1, SY(0.87));
    c.save(); c.font = `400 ${20 * U}px ${FONT.serif}`; c.fillStyle = 'rgba(244,237,224,0.8)'; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 8 * U; c.fillText('音乐《大天蓬》· 恩几 翻唱', SX(0.5), SY(0.06)); c.restore();
    return;
  }
  const K = { x: 700, y: 1180, z: W / 1500 };
  L.save(); camApply(K); wallBg(K);
  drawSprite(c, SPR.cloudW, 250, 150, 1.2); drawSprite(c, SPR.cloudB, 1200, 1250, 1.0, { flip: true }); drawSprite(c, SPR.cloudR, 240, 2150, 1.0);
  scatterFlowers(c, 9, 20, 23, [0, 0, 1400, 2400], { scale: 1.1 });
  { const [hx, hy] = haloAt(-0.06); drawSprite(c, SPR.haloK, (1400 - hx) * 0.8, -40 + hy * 0.8, 0.76); }
  c.save(); c.translate(0 + 1400 * 0.8, -40); c.scale(-0.8, 0.8); drawKin(c, -0.06); c.restore();
  c.save(); c.translate(60, 1000); c.scale(0.95, 0.95); c.drawImage(fig('axiu'), 0, 0); c.restore();
  titleDu(c, e, 1130, 930, 380, 1, { glow: 1 });
  surfacePass(K, 0.9); L.restore();
  lampPass(c, { x: SX(0.5), y: SY(0.45), dark: 0.55, core: [255, 232, 190] });
  const [tx, ty] = toScreen(K, 1130, 930);
  c.save(); c.font = `400 ${30 * U}px ${FONT.serif}`; c.letterSpacing = `${8 * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 12 * U; c.fillStyle = '#F4EDE0'; c.fillText('紧那罗 · 阿羞', tx, ty + 200 * U); c.restore();
  seal(c, tx + 105 * U, ty + 30 * U, 54 * U, '栋森', 1);
  creditLines(c, 1, SY(0.9));
  c.save(); c.font = `400 ${22 * U}px ${FONT.serif}`; c.fillStyle = 'rgba(244,237,224,0.8)'; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 8 * U; c.fillText('音乐《大天蓬》· 恩几 翻唱', SX(0.5), SY(0.035)); c.restore();
}

// ───────────── end card ─────────────
function sceneEnd(s) {
  const c = L.c, e = L.e, u = s - CUT.end, a = E.outCubic(inv(0.1, 0.9, u));
  const K = { x: 960, y: 540, z: 1 };
  L.save(); camApply(K); wallBg(K); surfacePass(K, 0.9); L.restore();
  lampPass(c, { x: SX(0.5), y: SY(0.4), dark: 0.8, core: [255, 222, 170], r: Math.hypot(W, H) * 0.5, flick: Math.sin(s * 11) * 0.02 });
  darkPass(c, 1 - a);
  const ts = pick(190, 230) * U, tx = SX(0.5), ty = SY(pick(0.28, 0.3));
  titleDu(c, e, tx, ty, ts, a, { col: '#9C3322', glow: 0.8 });
  seal(c, tx + ts * 0.42, ty + ts * 0.15, 46 * U, '栋森', a);
  c.save(); c.globalAlpha = a; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 10 * U;
  const fs = pick(26, 28) * U, y0 = ty + ts * 0.8, lh = fs * 1.75, mx = SX(0.5);
  [['音乐', '《大天蓬》· 演唱 恩几（翻唱）'], ['故事', '改编自电视剧《西游记后传》（2000）']].forEach(([k2, v], i) => {
    c.font = `600 ${fs}px ${FONT.serif}`; c.textAlign = 'right'; c.fillStyle = '#E9DDC4'; c.fillText(k2, mx - pick(250, 200) * U, y0 + i * lh);
    c.font = `400 ${fs}px ${FONT.serif}`; c.textAlign = 'left'; c.fillStyle = '#F4EDE0'; c.fillText(v, mx - pick(226, 176) * U, y0 + i * lh);
  });
  c.textAlign = 'center'; c.font = `400 ${fs * 0.78}px ${FONT.serif}`; c.fillStyle = 'rgba(233,221,196,0.8)'; c.fillText('版权归原作者及版权方所有', mx, y0 + 2 * lh);
  c.restore();
  creditLines(c, a, y0 + 3 * lh + fs * 0.4);
  return {};
}

// ───────────── master timeline ─────────────
const IS_COVER = t => t < 0.5 / FPS;
let FX = {};
const SCENES = [[0, sceneS1], [CUT.s2, sceneS2], [CUT.s3, sceneS3], [CUT.s4, sceneS4], [CUT.s5, sceneS5], [CUT.s6, sceneS6], [CUT.end, sceneEnd]];
function drawFrame(t) {
  if (LABM) return drawLab(t);
  if (IS_COVER(t)) { sceneCover(); FX = {}; return; }
  if (t < PRE) { sceneOpen(t); FX = {}; return; }
  const s = t - PRE;
  let k = 0; for (let i = 0; i < SCENES.length; i++) if (s >= SCENES[i][0]) k = i;
  FX = SCENES[k][1](s) || {};
}
function fxAt(t) {
  if (IS_COVER(t)) return { ca: 0.0005, flash: 0, vig: 0.25, grain: 0.02, bloom: 0.7 };
  return { ca: 0.0006, flash: Math.min(0.9, FX.flash || 0), flashCol: FX.flashCol, vig: 0.3, grain: 0.035, bloom: 0.8 };
}
function samplesAt(t) {
  if (LABM || IS_COVER(t)) return 1;
  const s = t - PRE;
  if (t >= PRE && ((s > 1.4 && s < 3.8) || (s > 5.5 && s < 7.9) || (s > 17.0 && s < 22.0))) return 4;
  return 2;
}

// ───────────── lab boards for reviewing the paintings ─────────────
let KIT_CRACKS = null, KIT_FLAKES = null;
function figBoard(name, size, focus) {
  const c = L.c, [fx, fy, span] = focus || [size[0] / 2, size[1] / 2, size[1]];
  const K = { x: fx, y: fy, z: H / span };
  L.save(); camApply(K); wallBg(K); c.drawImage(fig(name), 0, 0); surfacePass(K, 0.9); L.restore();
  lampPass(c, { dark: 0.45 });
}
function drawLab(t) {
  const c = L.c, e = L.e;
  if (LABM === 'axiu') return figBoard('axiu', [1400, 1400]);
  if (LABM === 'axiuface') return figBoard('axiu', [1400, 1400], [700, 520, 520]);
  if (LABM === 'axiusk') { FIG.axiuSk = sketchOf('axiu'); return figBoard('axiuSk', [1400, 1400]); }
  if (LABM === 'kin') return figBoard('kin', [1400, 1400]);
  if (LABM === 'kinup') return figBoard('kinUp', [1400, 1400]);
  if (LABM === 'kinface') return figBoard('kinUp', [1400, 1400], [680, 540, 560]);
  if (LABM === 'kindark') return figBoard('kinUpDark', [1400, 1400]);
  if (LABM === 'buddha') return figBoard('buddha', [1600, 1900]);
  if (LABM === 'buddhaface') return figBoard('buddha', [1600, 1900], [800, 540, 500]);
  if (LABM === 'kneel') return figBoard('kneel', [700, 440]);
  if (LABM === 'priest') return figBoard('priest', [1400, 1400]);
  if (LABM === 'carry') return figBoard('carry', [520, 620]);
  if (LABM === 'wutian') return figBoard('wutianBack', [300, 600]);
}
