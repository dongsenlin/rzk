// ─────────────────────────────────────────────────────────────────────────────
//  渡 — 紧那罗与阿羞, a narrated short painted on silk.  The timeline comes from
//  build/vo/manifest.json (window.VO): the narration lines with per-character
//  times, where the song sits, and the film's length.  Shots are cut on the
//  narration: every cut time below is written against a line or a character.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const LABM = Q.get('lab');
const U = Math.min(W, H) / 1080;
const SX = f => W * f, SY = f => H * f;
const pick = (h, v) => VERT ? v : h;
const rnd = (i, k, seed = 0) => hash2(i * 1.618 + seed * 7.13, k * 2.414 + seed * 0.31);
const snap = x => (Math.round(x * FPS - 0.5) + 0.5) / FPS;     // cuts fall between shutter windows
const SPR = {};

// ── the narration ──
const VL = id => VOM.lines.find(l => l.id === id) || { start: 0, end: 0, chars: [{ t: 0 }], text: '' };
const TS = id => VL(id).start, TE = id => VL(id).end;
const CH = (id, k) => { const c = VL(id).chars; return c[Math.max(0, Math.min(k, c.length - 1))].t; };
// ── the song (times inside the clip) ──
const LYR = [
  { text: '惹得天怒地也恼', t: [0.66, 0.90, 1.50, 1.92, 2.52, 2.94, 3.24] },
  { text: '人间再无红颜笑', t: [4.20, 4.38, 5.10, 5.58, 5.88, 6.42, 6.54] },
  { text: '留一半相思上大道', t: [8.04, 8.64, 9.06, 9.78, 10.08, 11.04, 11.70, 11.94] },
  { text: '怕什么天道轮回', t: [14.10, 14.70, 15.00, 15.78, 16.08, 17.10, 17.40] },
  { text: '什么魄散魂飞', t: [18.12, 18.45, 19.25, 19.65, 20.30, 20.76] },
  { text: '若没有你那才叫可悲', t: [22.26, 22.68, 22.98, 23.28, 23.88, 24.60, 25.02, 25.74, 26.04] },
];
const SONG_CUT = [0, 4.05, 7.95, 13.95, 18.05, 22.15, 27.70];
const SG = x => SONG_AT + x;                                   // song time → film time

window.ALL_TEXT = VOM.lines.map(l => l.text).join('') + LYR.map(l => l.text).join('')
  + '渡紧那罗阿羞出品栋森网络科技创作概念练手非官方音乐演唱恩几翻唱版权归原作者及方所有故事改编自电视剧西游记后传旁白配音偷打笑六根不净';

window.PREPARE = async () => {
  await PREPARE_MURAL();
  SPR.cloudG = cloudSprite(120, { seed: 3 });
  SPR.cloudB = cloudSprite(100, { seed: 7, bands: [C.azure, C.azureLt, C.white] });
  SPR.cloudW = cloudSprite(110, { seed: 12, bands: [C.malaDk, C.mala, C.white], tail: 2.8 });
  SPR.cloudDk = cloudSprite(130, { seed: 21, bands: ['#1E2638', '#2F3B55', '#4A5670'], line: '#0D0B0A', tail: 3 });
  SPR.haloK = haloSprite(230, { seed: 4 });
  SPR.flowers = [flowerSprite(22, { seed: 2 }), flowerSprite(18, { seed: 5, col: C.white, inner: C.red }), flowerSprite(20, { seed: 8, col: C.mala, inner: C.white }), flowerSprite(16, { seed: 11, col: C.redHi })];
  SPR.petalW = flowerSprite(14, { seed: 13, col: '#F6F1E8', inner: '#F0D9A0' });
};

// ───────────── shared painting helpers ─────────────
// dark ink laid over the silk for night shots (the weave still shows through)
function inkOver(c, K, col = '#14161F', a = 0.86) { const [x0, y0, x1, y1] = camRect(K); c.save(); c.globalAlpha *= a; c.fillStyle = col; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.restore(); }
function frame(K, draw, o = {}) {
  L.save(); camApply(K); silkBg(K); draw(L.c, L.e, K); weavePass(K, o.weave ?? 0.85); L.restore();
}
// a bronze oil lamp standing at (x, y) (the foot), scale s; lit 0..1; flame breathes with t
function drawLamp(c, e, x, y, s, t, lit = 1, o = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const bronze = '#7A5A2E', dark = '#3A2A14', hi = '#C9A45E';
  const part = (d, col, seed) => { pigment(c, d, col, { seed, edge: 0.6, edgeW: 4, edgeCol: dark, mottle: 0.1, grain: 0.08, shade: (tt, sc) => { const b = bboxOf(d); const g = tt.createLinearGradient(b[0], 0, b[2], 0); g.addColorStop(0, 'rgba(255,230,170,0.35)'); g.addColorStop(0.4, 'rgba(255,230,170,0)'); g.addColorStop(1, 'rgba(20,10,0,0.35)'); tt.fillStyle = g; tt.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); } }); mline(c, d, { w: 1.6, color: dark, seed: seed + 1 }); };
  part('M-60 0 C-58 -14 -30 -22 0 -22 C30 -22 58 -14 60 0 Z', bronze, 1);
  part('M-10 -22 C-12 -60 -8 -100 -14 -140 L14 -140 C8 -100 12 -60 10 -22 Z', bronze, 3);
  part('M-26 -140 C-30 -150 -20 -156 0 -156 C20 -156 30 -150 26 -140 Z', bronze, 5);
  part('M-70 -168 C-66 -150 -40 -142 0 -142 C40 -142 66 -150 70 -168 C40 -160 -40 -160 -70 -168 Z', bronze, 7);
  c.fillStyle = '#2A1C0C'; c.beginPath(); c.ellipse(0, -166, 64, 6, 0, 0, TAU); c.fill();
  mline(c, 'M40 -168 C44 -176 46 -182 44 -188', { w: 3, color: '#3A2A14', seed: 9 });                 // the wick
  c.restore();
  if (lit > 0) {
    const fx = x + 44 * s, fy = y - 188 * s, fs = s * (o.flame ?? 1) * lit;
    c.save(); flameTongue(c, fx, fy + 4 * s, 26 * fs, 70 * fs, t * 1.2, 5, { bands: ['#E8742A', '#FFB54A', '#FFF1C0'], line: 'rgba(120,40,10,0.6)', lw: 1.5 * s, sway: 0.25 }); c.restore();
    glowDot(e, fx, fy - 26 * fs, 260 * s * lit, 'rgba(255,190,110,A)', 0.8 * lit);
    glowDot(e, fx, fy - 26 * fs, 60 * s * lit, 'rgba(255,240,200,A)', 0.9 * lit);
  }
}
// warm light pooled around a point, in screen space: multiply dark around, screen a glow inside
function lampLight(c, x, y, r, a = 1, warm = [255, 214, 150]) {
  c.save(); c.setTransform(c.__s, 0, 0, c.__s, 0, 0);
  const g = c.createRadialGradient(x, y, r * 0.05, x, y, r);
  g.addColorStop(0, rgba(255, 250, 236, 1)); g.addColorStop(0.35, rgba(warm[0], warm[1] * 0.96, warm[2] * 0.9, 1)); g.addColorStop(1, rgba(40, 26, 20, 1));
  c.globalCompositeOperation = 'multiply'; c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.restore();
}

// ── subtitles for the narration: fade in on the line, stay until it ends ──
function splitLine(str) {
  const s = str.replace(/[“”]/g, '').replace(/——$/, '');
  if (s.length <= (VERT ? 15 : 24)) return [s];
  const mid = s.length / 2; let best = -1, bd = 1e9;
  for (let i = 1; i < s.length - 1; i++) if ('，。：；'.includes(s[i]) && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); best = i; }
  if (best < 0) best = Math.round(mid);
  return [s.slice(0, best + 1), s.slice(best + 1)];
}
function subtitles(c, t) {
  for (const ln of VOM.lines) {
    const a = inv(ln.start - 0.12, ln.start + 0.1, t) * (1 - inv(ln.end + 0.15, ln.end + 0.4, t));
    if (a <= 0) continue;
    const rows = splitLine(ln.text), fs = pick(34, 40) * U, lh = fs * 1.5, y0 = SY(pick(0.9, 0.84)) - (rows.length - 1) * lh;
    c.save(); c.globalAlpha = a * 0.5; const g = c.createLinearGradient(0, y0 - lh * 1.4, 0, H); g.addColorStop(0, 'rgba(12,8,6,0)'); g.addColorStop(0.45, 'rgba(12,8,6,0.75)'); g.addColorStop(1, 'rgba(12,8,6,0.85)'); c.fillStyle = g; c.fillRect(0, y0 - lh * 1.4, W, H); c.restore();
    c.save(); c.globalAlpha = a; c.font = `400 ${fs}px ${FONT.serif}`; c.letterSpacing = `${pick(3, 2) * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 14 * U; c.fillStyle = '#F6F0E4';
    rows.forEach((r, i) => c.fillText(r, SX(0.5), y0 + i * lh));
    c.restore();
  }
}
// ── song lyrics: a pale silk cartouche, the characters written in as they are sung ──
function cartouche(c, li, t, o = {}) {
  const line = LYR[li], chars = Array.from(line.text), n = chars.length, s = t - SONG_AT;
  const fs = (o.size || pick(58, 64)) * U, lead = fs * 1.1, pad = fs * 0.5, bw = fs * 1.55, bh = pad * 2 + lead * (n - 1) + fs;
  const x = o.x ?? (o.side === 'r' ? SX(pick(0.94, 0.93)) - bw : SX(pick(0.06, 0.07))), y = o.y ?? pick(Math.max(SY(0.08), (H - bh) / 2 - SY(0.08)), SY(0.07));
  const appear = inv(line.t[0] - 0.55, line.t[0] - 0.12, s), out = o.out ?? 1;
  if (appear <= 0 || out <= 0) return;
  c.save(); c.globalAlpha *= out;
  c.save(); c.beginPath(); c.rect(x - 12 * U, y - 12 * U, bw + 24 * U, (bh + 24 * U) * E.outCubic(appear)); c.clip();
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18 * U; c.fillStyle = 'rgba(0,0,0,0.001)'; c.fillRect(x, y, bw, bh); c.shadowBlur = 0;
  pigment(c, `M${x} ${y} h${bw} v${bh} h${-bw} Z`, '#EFE4CA', { seed: 7 + li, edge: 0.5, edgeW: 5, edgeCol: '#B39468', mottle: 0.15, grain: 0.12, bbox: [x, y, x + bw, y + bh] });
  c.strokeStyle = '#8E2A1C'; c.lineWidth = 2.4 * U; c.strokeRect(x + 7 * U, y + 7 * U, bw - 14 * U, bh - 14 * U);
  c.strokeStyle = 'rgba(36,26,22,0.7)'; c.lineWidth = 1.1 * U; c.strokeRect(x + 13 * U, y + 13 * U, bw - 26 * U, bh - 26 * U);
  c.restore();
  c.font = `400 ${fs}px ${FONT.kai}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#211714';
  chars.forEach((ch, i) => {
    const t0 = line.t[i] - 0.05, p = inv(t0, t0 + 0.26, s); if (p <= 0) return;
    const cx = x + bw / 2, cy = y + pad + fs / 2 + i * lead;
    c.save(); c.beginPath(); c.rect(cx - fs, cy - fs * 0.62, fs * 2, fs * 1.24 * E.outCubic(p)); c.clip(); c.fillText(ch, cx, cy); c.restore();
  });
  c.restore();
}

// ── 紧那罗 / 无天: the profile rig, tilt, white↔black by rising ink ──
function haloAt(tilt) { const [px, py] = KN_PIV, x = 740 - px, y = 440 - py; return [px + x * Math.cos(tilt) - y * Math.sin(tilt), py + x * Math.sin(tilt) + y * Math.cos(tilt)]; }
function kinFigure(c, tilt, ink, o = {}) {                   // ink 0 = white robe, 1 = black robe
  if (ink <= 0.001) return drawKin(c, tilt, 0);
  if (ink >= 0.999) return drawKin(c, tilt, 1);
  drawKin(c, tilt, ink, { mask: inkMask(ink, o.seed || 3) });
}

// ───────────── the shots ─────────────
// 00 · 序 — 无天 in the dark; the black drains away and he is 紧那罗 in white (L01–L02)
function shPrologue(t) {
  const c = L.c, e = L.e;
  const back = E.inOutCubic(inv(TS('L02') + 0.3, CH('L02', 9) + 0.2, t));     // "一身白衣" … "紧那罗"
  const eyes = inv(CH('L01', 9) - 0.2, CH('L01', 9) + 0.2, t) * (1 - back);      // "法力无边"
  const p = E.inOutQuad(inv(0, TE('L02'), t));
  const K = VERT ? { x: 700, y: lerp(640, 620, p), z: W / lerp(1000, 860, p) } : { x: lerp(760, 720, p), y: lerp(640, 600, p), z: H / lerp(1080, 960, p) };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#0E0D12', 0.9 * (1 - back) + 0.05);
    if (back > 0) { const [hx, hy] = haloAt(-0.1); drawSprite(c, SPR.haloK, hx, hy, 1, { rot: t * 0.1, alpha: back }); e.save(); e.globalAlpha = 0.25 * back; e.drawImage(SPR.haloK.cv, hx - SPR.haloK.w / 2, hy - SPR.haloK.h / 2); e.restore(); }
    if (back < 1) darkMandorla(c, e, 760, 620, t, (1 - back) * E.outCubic(inv(0.6, 2.6, t)));
    kinFigure(c, -0.1, 1 - back, { seed: 5 });
    if (eyes > 0) { const [ex, ey] = kinEye(-0.1); glowDot(e, ex, ey, 70, 'rgba(255,50,30,A)', eyes); }
    motes(c, e, t, 26, 3, [300, 200, 1300, 1300], { a: 0.4 + back * 0.4, speed: 0.04 });
  });
  lampLight(c, SX(pick(0.45, 0.5)), SY(0.4), Math.hypot(W, H) * lerp(0.45, 0.7, back), lerp(0.9, 0.55, back));
  darkPass(c, 1 - E.outCubic(inv(0.2, 1.2, t)));
  return {};
}
// 01 · title
function shTitle(t) {
  const c = L.c, e = L.e, t0 = TE('L02') + 0.15, u = t - t0;
  const K = { x: 960, y: 540, z: Math.min(W / 1920, H / 1080) * 1.0 };
  frame(K, (c, e, K) => { scatterFlowers(c, t, 10, 31, [200, -100, 1720, 1200], { a: 0.6, scale: 1.2 }); });
  lampLight(c, SX(0.5), SY(0.45), Math.hypot(W, H) * 0.6, 0.5);
  const ts = pick(260, 300) * U, tx = SX(0.5), ty = SY(pick(0.4, 0.4));
  titleDu(c, e, tx, ty, ts, inv(0.05, 0.55, u), { col: '#8E2A1C', glow: 0.6 });
  seal(c, tx + ts * 0.42, ty + ts * 0.16, 54 * U, '栋森', inv(0.5, 0.65, u), 1 + (1 - E.outBack(inv(0.5, 0.66, u))) * 0.5);
  const st = inv(0.6, 1.0, u);
  if (st > 0) { c.save(); c.globalAlpha = st; c.font = `400 ${32 * U}px ${FONT.serif}`; c.letterSpacing = `${12 * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#3A2A22'; c.fillText('紧那罗 · 阿羞', tx, ty + ts * 0.78); c.restore(); }
  credits(c, inv(0.8, 1.2, u), SY(pick(0.86, 0.84)), '#3A2A22');
  return {};
}
function credits(c, a, y0, col = 'rgba(244,237,224,0.92)') {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col;
  c.font = `400 ${pick(22, 26) * U}px ${FONT.serif}`; c.letterSpacing = `${2 * U}px`;
  if (VERT) { c.fillText('出品 · PRODUCED BY　栋森网络科技', SX(0.5), y0); c.fillText('AI 创作 · CREATED WITH　Claude Opus 5.5', SX(0.5), y0 + 40 * U); }
  else c.fillText('出品 · PRODUCED BY　栋森网络科技　｜　AI 创作 · CREATED WITH　Claude Opus 5.5', SX(0.5), y0);
  c.font = `400 ${pick(19, 22) * U}px ${FONT.serif}`; c.globalAlpha = a * 0.75; c.fillText('概念练手 · 非官方', SX(0.5), y0 + pick(38, 82) * U);
  c.restore();
}

// 02 · 一 — from 灵山 down the long stair, south to 西牛贺洲 (L03)
function makeStair() {
  const k = 0.5, X0 = -500, Y0 = 200, Wd = 3000, Hd = 4300, cv = mk(Wd * k, Hd * k), c = cv.getContext('2d'); c.scale(k, k); c.translate(-X0, -Y0);
  const pts = S3PATH.p, pathXAt = y => { let best = pts[0]; for (const p of pts) if (Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p; return best[0]; };
  let seed = 800;
  for (let y = 1000; y <= 4500; y += 200) {
    const f = clamp((y - 1000) / 3300), w = lerp(260, 820, f), h = w * lerp(0.95, 0.75, f), px = pathXAt(y), gap = pathW(y) * 0.8 + w * 0.42;
    for (let x = X0 + ((y / 200) % 2) * w * 0.3; x < X0 + Wd + w; x += w * 0.62) {
      if (Math.abs(x - px) < gap) continue;
      peak(c, x + (rnd(seed, 1) - 0.5) * w * 0.2, y + (rnd(seed, 2) - 0.5) * 40, w, h * (0.8 + 0.4 * rnd(seed, 3)), seed, rnd(seed, 4) < 0.4); seed++;
    }
  }
  const R = resample(S3PATH.p, 4);
  c.beginPath(); R.forEach((p, i) => { const hw = pathW(p.y) / 2; i ? c.lineTo(p.x + p.nx * hw, p.y + p.ny * hw) : c.moveTo(p.x + p.nx * hw, p.y + p.ny * hw); });
  for (let i = R.length - 1; i >= 0; i--) { const p = R[i], hw = pathW(p.y) / 2; c.lineTo(p.x - p.nx * hw, p.y - p.ny * hw); }
  c.closePath(); c.fillStyle = '#EFE6D2'; c.fill(); c.strokeStyle = '#3A2E26'; c.lineWidth = 2.2; c.stroke();
  c.strokeStyle = 'rgba(90,70,50,0.45)'; c.lineWidth = 1.5;
  for (let i = 0; i < R.length; i += Math.max(3, Math.round(pathW(R[i].y) / 12))) { const p = R[i], hw = pathW(p.y) / 2; c.beginPath(); c.moveTo(p.x + p.nx * hw, p.y + p.ny * hw); c.lineTo(p.x - p.nx * hw, p.y - p.ny * hw); c.stroke(); }
  palace(c, 1000, 780, 1);
  return { cv, k, X0, Y0, Wd, Hd };
}
let STAIR = null;
function stairPanel(c, e, t, o = {}) {
  if (!STAIR) STAIR = makeStair();
  c.drawImage(STAIR.cv, STAIR.X0, STAIR.Y0, STAIR.Wd, STAIR.Hd);
  e.save(); e.globalAlpha = 0.45; const g = e.createRadialGradient(1000, 700, 60, 1000, 700, 700); g.addColorStop(0, 'rgba(255,214,140,0.9)'); g.addColorStop(1, 'rgba(255,190,110,0)'); e.fillStyle = g; e.fillRect(300, 0, 1400, 1400); e.restore();
  rays(c, e, 1000, 640, -Math.PI * 0.95, -Math.PI * 0.05, 12, 1200, 0.6, t);
  [[500, 1100, 1.6, 0], [1500, 1000, 1.4, 1], [300, 1900, 1.8, 0], [1700, 2400, 1.7, 1], [600, 3000, 2.0, 0], [1600, 3500, 1.9, 1]].forEach(([x, y, k2, f], i) => drawSprite(c, i % 2 ? SPR.cloudB : SPR.cloudW, x + Math.sin(t * 0.3 + i) * 40 + (f ? -1 : 1) * (t % 60) * 20, y, k2, { flip: !!f, alpha: 0.95 }));
}
function shDescent(t) {
  const c = L.c, e = L.e, t0 = TS('L03') - 0.25, t1 = TS('L04') - 0.25, p = clamp((t - t0) / (t1 - t0));
  const walk = lerp(0.02, 0.13, p), P = S3PATH.at(walk * S3PATH.L), pan = E.inOutCubic(inv(0.0, 0.75, p));
  const K = VERT ? { x: lerp(1000, P[0], pan), y: lerp(900, P[1] - 250, pan), z: W / lerp(1500, 1050, pan) } : { x: lerp(1000, P[0] + 80, pan), y: lerp(880, P[1] - 200, pan), z: H / lerp(1750, 1150, pan) };
  frame(K, (c, e, K) => {
    stairPanel(c, e, t);
    const sc = lerp(0.62, 0.7, p), bob = Math.abs(Math.sin(t * 4.6)) * 5;
    c.save(); c.translate(P[0], P[1] - bob); c.scale(-sc, sc); c.drawImage(fig('walker'), -150, -616); c.restore();
    const [hx, hy] = [P[0] + 0 * sc, P[1] - bob - 530 * sc]; glowDot(e, hx, hy, 60 * sc, 'rgba(255,220,150,A)', 0.5);
    scatterFlowers(c, t, 14, 13, [K.x - 1200, K.y - 1200, K.x + 1200, K.y + 1200], { scale: 1.3, speed: 0.05 });
  });
  lampLight(c, SX(0.5), SY(0.35), Math.hypot(W, H) * 0.75, 0.35);
  return {};
}

// 03 · 三难 — the high priest, and three portraits that light up one by one (L04)
function medallion(c, e, x, y, r, a, drawIn, o = {}) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= Math.min(1, a); const k = 0.85 + 0.15 * E.outBack(clamp(a));
  c.translate(x, y); c.scale(k, k);
  c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
  c.fillStyle = '#E9DCBF'; c.fillRect(-r, -r, 2 * r, 2 * r); drawIn(c); c.restore();
  c.lineWidth = r * 0.07; c.strokeStyle = '#8E2A1C'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.lineWidth = r * 0.02; c.strokeStyle = '#C9A45E'; c.beginPath(); c.arc(0, 0, r * 1.07, 0, TAU); c.stroke();
  if (o.label) { c.font = `400 ${r * 0.34}px ${FONT.kai}`; c.fillStyle = '#F4EDE0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#8E2A1C'; c.beginPath(); c.arc(0, r * 0.92, r * 0.24, 0, TAU); c.fill(); c.fillStyle = '#F6EFE2'; c.fillText(o.label, 0, r * 0.93); }
  c.restore();
}
function shTrials(t) {
  const c = L.c, e = L.e, t0 = TS('L04') - 0.25;
  const m1 = inv(CH('L04', 11) - 0.2, CH('L04', 11) + 0.25, t), m2 = inv(CH('L04', 19) - 0.2, CH('L04', 19) + 0.25, t), m3 = inv(CH('L04', 26) - 0.2, CH('L04', 26) + 0.25, t);
  const veil = E.inOutCubic(inv(CH('L04', 29), CH('L04', 34) + 0.3, t)), push = E.inOutCubic(inv(CH('L04', 29) - 0.3, TE('L04') + 0.3, t));
  const pos = VERT ? [[380, 820], [760, 1080], [1140, 820]] : [[980, 560], [1340, 560], [1700, 560]], R0 = VERT ? 170 : 150;
  const [ax3, ay3] = pos[2];
  const K0 = VERT ? { x: 760, y: 900, z: W / 1520 } : { x: 1100, y: 600, z: H / 1250 };
  const K = { x: lerp(K0.x, ax3, push), y: lerp(K0.y, ay3, push), z: lerp(K0.z, VERT ? W / 420 : H / 380, push) };
  frame(K, (c, e, K) => {
    // the temple steps and the priest, lit from below by torches
    inkOver(c, K, '#2A1C16', 0.35);
    const pr = VERT ? { x: 150, y: 1050, k: 0.62 } : { x: 60, y: 170, k: 0.72 };
    c.save(); c.translate(pr.x + 1400 * pr.k, pr.y); c.scale(-pr.k, pr.k); c.drawImage(fig('priest'), 0, 0); c.restore();
    medallion(c, e, pos[0][0], pos[0][1], R0, m1, cc => { cc.drawImage(fig('aliu'), -R0 * 1.1, -R0 * 0.95, R0 * 2.2, R0 * 2.2); }, { label: '偷' });
    medallion(c, e, pos[1][0], pos[1][1], R0, m2, cc => { cc.drawImage(fig('adao'), -R0 * 1.1, -R0 * 0.95, R0 * 2.2, R0 * 2.2); }, { label: '打' });
    medallion(c, e, pos[2][0], pos[2][1], R0, m3, cc => {
      const s = R0 * 2.6 / 300;                        // her eyes, then the veil drops
      cc.drawImage(fig('ax_red_cool'), 540, 420, 300, 300, -R0 * 1.3, -R0 * 1.25, R0 * 2.6, R0 * 2.6);
      const vy = lerp(-R0 * 0.25, R0 * 1.6, veil);
      cc.save(); cc.globalAlpha = 0.9 * (1 - veil * 0.6); cc.fillStyle = '#B5302A'; cc.beginPath(); cc.moveTo(-R0 * 1.2, vy); cc.quadraticCurveTo(0, vy + R0 * 0.18, R0 * 1.2, vy - R0 * 0.1); cc.lineTo(R0 * 1.2, R0 * 1.3); cc.lineTo(-R0 * 1.2, R0 * 1.3); cc.closePath(); cc.fill();
      for (let i = 0; i < 9; i++) goldDot(cc, lerp(-R0, R0, i / 8), vy + R0 * 0.06 + Math.sin(i) * 3, R0 * 0.025);
      cc.restore();
    }, { label: '笑' });
  });
  lampLight(c, SX(pick(0.35, 0.3)), SY(pick(0.7, 0.75)), Math.hypot(W, H) * 0.8, 0.45 * (1 - push));
  return {};
}

// ── props for her rooms ──
const LANT = {};
function lanternSprite(blur) {                                // the lantern painted once per blur level (canvas blur per frame is slow)
  if (LANT[blur]) return LANT[blur];
  const cv = mk(240, 400), c = cv.getContext('2d'); c.translate(120, 190); if (blur) c.filter = `blur(${blur}px)`;
  c.strokeStyle = '#3A2410'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -140); c.lineTo(0, -70); c.stroke();
  const g = c.createRadialGradient(-14, -10, 6, 0, 0, 70); g.addColorStop(0, '#FF8A5A'); g.addColorStop(0.6, '#C8342C'); g.addColorStop(1, '#6E1715');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 56, 70, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(80,20,10,0.5)'; c.lineWidth = 2; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(0, 0, Math.abs(k) * 12 + 2, 70, 0, 0, TAU); c.stroke(); }
  c.fillStyle = '#C9A45E'; c.fillRect(-26, -76, 52, 10); c.fillRect(-26, 66, 52, 10);
  c.strokeStyle = '#C8342C'; c.lineWidth = 2; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * 4, 76); c.lineTo(k * 5, 120 + Math.sin(k) * 3); c.stroke(); }
  return (LANT[blur] = cv);
}
function lantern(c, e, x, y, s, t, seed, blur = 0) {
  c.save(); c.translate(x, y + Math.sin(t * 1.3 + seed) * 4 * s); c.rotate(Math.sin(t * 0.9 + seed) * 0.04); c.scale(s, s); c.drawImage(lanternSprite(blur), -120, -190); c.restore();
  glowDot(e, x, y, 150 * s, 'rgba(255,120,60,A)', 0.55); glowDot(e, x, y, 40 * s, 'rgba(255,210,150,A)', 0.8);
}
function gauze(c, x0, x1, y0, y1, t, seed, col = 'rgba(180,40,36,0.42)') {
  c.save(); c.fillStyle = col; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y0);
  for (let k = 0; k <= 20; k++) { const u = k / 20, x = lerp(x1, x0, u); c.lineTo(x + Math.sin(t * 0.8 + u * 9 + seed) * 18, y1 + Math.sin(t * 1.1 + u * 7 + seed) * 22); }
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(120,20,16,0.35)'; c.lineWidth = 3;
  for (let k = 1; k < 8; k++) { const x = lerp(x0, x1, k / 8); c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + Math.sin(t * 0.8 + k + seed) * 20, (y0 + y1) / 2, x + Math.sin(t * 0.8 + k * 1.3 + seed) * 18, y1); c.stroke(); }
  c.restore();
}
let ONLOOK = null;
function onlookers(c, a, t, K) {                          // dark, blurred heads at the edge of the frame, all turned to her
  if (a <= 0) return;
  if (!ONLOOK) {
    ONLOOK = mk(420, 440); const o = ONLOOK.getContext('2d'); o.translate(210, 250); o.filter = 'blur(9px)'; o.fillStyle = '#120C0A';
    o.beginPath(); o.ellipse(0, -150, 62, 74, 0, 0, TAU); o.fill();
    o.beginPath(); o.moveTo(-160, 120); o.bezierCurveTo(-140, -20, -80, -70, 0, -76); o.bezierCurveTo(80, -70, 140, -20, 160, 120); o.lineTo(160, 180); o.lineTo(-160, 180); o.closePath(); o.fill();
  }
  c.save(); c.globalAlpha = a * 0.9;
  for (const [x, y, s, f] of [[140, 1330, 1.3, 1], [330, 1420, 1.1, 1], [1260, 1330, 1.25, -1], [1080, 1440, 1.0, -1]]) {
    c.save(); c.translate(x, y + Math.sin(t + x) * 6); c.scale(s * f, s); c.drawImage(ONLOOK, -210, -250); c.restore();
  }
  c.restore();
}
function heartGlow(c, e, x, y, a, t) {
  if (a <= 0) return;
  glowDot(e, x, y, 180 * a, 'rgba(255,220,160,A)', 0.8 * a); glowDot(e, x, y, 50, 'rgba(255,250,230,A)', a);
  c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(Math.sin(t) * 0.05);
  for (let i = 0; i < 6; i++) { c.save(); c.rotate(i / 6 * TAU); c.translate(0, -16); petalShape(c, 14, 26); c.fillStyle = 'rgba(255,244,220,0.85)'; c.fill(); c.restore(); }
  c.restore();
}
// water washing the pigment away: a noisy disc growing from (cx, cy) in portrait space
let WASHM = null;
function washMask(p, cx, cy, seed = 5) {
  const S = 700; if (!WASHM) WASHM = mk(S, S);
  const m = WASHM.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, S, S); if (p <= 0) return WASHM;
  m.filter = 'blur(9px)'; m.fillStyle = '#000'; m.beginPath();
  const r = lerp(0, 1150, p) / 2;
  for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU, k = 1 + 0.35 * (fbm2(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 5, 4, seed) - 0.5) * 2; const x = cx / 2 + Math.cos(a) * r * k, y = cy / 2 + Math.sin(a) * r * k; i ? m.lineTo(x, y) : m.moveTo(x, y); }
  m.closePath(); m.fill(); m.filter = 'none';
  return WASHM;
}
let AXT = null; const axTmp = () => (AXT = AXT || mk(1400, 1400));
function drawMasked(c, img, mask) { const T = axTmp(), t = T.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, 1400, 1400); t.drawImage(img, 0, 0); t.globalCompositeOperation = 'destination-in'; t.drawImage(mask, 0, 0, 1400, 1400); c.drawImage(T, 0, 0); }
function prayingHands(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-0.08);
  const skin = '#F1D8C2', line = '#9C5444';
  pigment(c, 'M-70 60 C-60 20 -40 0 -20 -6 L20 -6 C40 0 60 20 70 60 Z', '#EEE9DF', { seed: 901, edge: 0.5, edgeW: 4, edgeCol: '#9EA3AC' });
  const d = 'M-18 0 C-26 -40 -26 -96 -10 -140 C-4 -154 6 -154 12 -140 C26 -96 24 -40 16 0 Z';
  pigment(c, d, skin, { seed: 902, edgeW: 4, edgeCol: '#D9A48C', shade: (t, sc) => { sEdge(t, sc, d, '#D9A48C', 10, 0.5); sLine(t, sc, 'M0 -10 L2 -146', '#FFF7EE', 5, 0.6, 3); } });
  mlines(c, [d, 'M1 -6 C2 -60 2 -110 1 -150', 'M-16 -60 C-8 -64 0 -64 8 -60', 'M-18 -90 C-8 -94 4 -94 12 -90'], { w: 1.3, color: line, seed: 903, alpha: 0.8 });
  mline(c, 'M-70 60 C-60 20 -40 0 -20 -6 L20 -6 C40 0 60 20 70 60', { w: 1.4, color: '#6A6460', seed: 904 });
  c.restore();
}

// 04 · 二 — 阿羞: the most beautiful woman in the city; only he sees her heart (L05)
function houseRoom(c, e, t, K) {
  inkOver(c, K, '#3A1812', 0.55);
  lantern(c, e, 180, 260, 1.1, t, 1, 5); lantern(c, e, 1230, 220, 1.3, t, 2, 7); lantern(c, e, 420, 120, 0.8, t, 3, 9); lantern(c, e, 1010, 90, 0.7, t, 4, 10);
  gauze(c, -200, 330, -200, 1500, t, 1); gauze(c, 1080, 1600, -200, 1500, t, 2);
}
function shHouse(t) {
  const c = L.c, e = L.e;
  const tHim = snap(CH('L05', 16) - 0.15), tBack = snap(CH('L05', 19) - 0.15);
  if (t >= tHim && t < tBack) {                            // 只有他 — he sits across from her, facing her
    const u = t - tHim;
    const K = VERT ? { x: 720, y: 640, z: W / 1100 } : { x: 700, y: 620, z: H / lerp(1100, 1040, u / 2) };
    frame(K, (c, e, K) => {
      inkOver(c, K, '#3A1812', 0.5); lantern(c, e, 1180, 200, 1.1, t, 5, 8);
      const [hx, hy] = haloAt(-0.05);
      c.save(); c.translate(1400, 0); c.scale(-1, 1); drawSprite(c, SPR.haloK, hx, hy, 0.95, { rot: t * 0.1, alpha: 0.9 }); kinFigure(c, -0.05, 0); c.restore();
    });
    lampLight(c, SX(0.55), SY(0.35), Math.hypot(W, H) * 0.7, 0.5);
    return {};
  }
  const t0 = t < tHim ? TS('L05') - 0.25 : tBack, u = t - t0;
  const look = inv(CH('L05', 10) - 0.2, CH('L05', 15), t) * (t < tHim ? 1 : 0);
  const heart = t >= tBack ? E.outCubic(inv(CH('L05', 22) - 0.3, CH('L05', 24) + 0.2, t)) : 0;
  const K = t < tHim
    ? (VERT ? { x: 710, y: lerp(760, 680, E.inOutQuad(u / 5)), z: W / lerp(1200, 980, E.inOutQuad(u / 5)) } : { x: 700, y: lerp(720, 640, E.inOutQuad(u / 5)), z: H / lerp(1250, 1000, E.inOutQuad(u / 5)) })
    : (VERT ? { x: 720, y: 720, z: W / 1050 } : { x: 710, y: 700, z: H / lerp(1080, 1020, u / 3) });
  frame(K, (c, e, K) => {
    houseRoom(c, e, t, K);
    c.drawImage(fig('ax_red_cool'), 0, 0);
    heartGlow(c, e, 740, 900, heart, t);
    onlookers(c, look, t, K);
    scatterFlowers(c, t, 10, 41, [100, -100, 1300, 1500], { a: 0.55, speed: 0.04 });
  });
  lampLight(c, SX(0.5), SY(0.38), Math.hypot(W, H) * 0.72, 0.45);
  return {};
}

// 05 · 灯 — he lights a lamp for her; her soul trembles (L06)
function shLamp(t) {
  const c = L.c, e = L.e;
  const tFace = snap(CH('L06', 8) - 0.2), lit = E.outCubic(inv(CH('L06', 3) - 0.1, CH('L06', 3) + 0.5, t));
  if (t < tFace) {                                         // the lamp on the low table; a spark from his side; it catches
    const u = t - (TS('L06') - 0.25);
    const K = VERT ? { x: 60, y: -170, z: W / lerp(620, 540, u / 3) } : { x: 40, y: -160, z: H / lerp(520, 460, u / 3) };
    frame(K, (c, e, K) => {
      inkOver(c, K, '#140E0C', 0.88);
      pigment(c, 'M-600 10 L700 10 L700 140 L-600 140 Z', '#4A2A1A', { seed: 911, edge: 0.5, edgeW: 8, edgeCol: '#1A0E08', bbox: [-600, 10, 700, 140] });   // the table
      const sleeve = E.inOutCubic(inv(TS('L06') - 0.1, CH('L06', 3) - 0.1, t)) * (1 - E.inCubic(inv(CH('L06', 5), CH('L06', 7), t)));
      if (sleeve > 0) { c.save(); c.translate(lerp(-700, -250, sleeve), -210); pigment(c, 'M-300 -60 C-100 -80 20 -50 60 -10 C80 10 70 40 40 50 C-60 60 -200 60 -300 60 Z', '#EEE9DF', { seed: 912, edge: 0.5, edgeW: 5, edgeCol: '#9EA3AC', bbox: [-300, -80, 80, 60] }); mline(c, 'M60 -10 L150 20', { w: 3, color: '#7A5A2E', seed: 913 }); if (lit < 0.2) { glowDot(e, 150, 20, 30, 'rgba(255,200,120,A)', 0.9); c.fillStyle = '#FFD890'; c.beginPath(); c.arc(150, 20, 4, 0, TAU); c.fill(); } c.restore(); }
      drawLamp(c, e, 0, 10, 1, t, lit);
    });
    lampLight(c, SX(0.52), SY(0.3), Math.hypot(W, H) * lerp(0.2, 0.55, lit), 0.9);
    return {};
  }
  const u = t - tFace, tremble = inv(CH('L06', 20) - 0.2, CH('L06', 23) + 0.3, t) * (1 - inv(TE('L06'), TE('L06') + 0.5, t));
  const sh = tremble * 2.2, jx = Math.sin(t * 43) * sh, jy = Math.cos(t * 37) * sh;
  const K = VERT ? { x: 700 + jx, y: 600 + jy, z: W / lerp(820, 740, u / 5) } : { x: 690 + jx, y: 590 + jy, z: H / lerp(760, 680, u / 5) };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#1A0E0A', 0.6);
    c.drawImage(fig('ax_red_tear'), 0, 0);
    motes(c, e, t, 36, 7, [400, 300, 1100, 1000], { a: 0.5 + tremble * 0.5, speed: 0.06, r: 1.3 });
  });
  const [lx, ly] = toScreen(K, 380, 1040);
  lampLight(c, lx, ly, Math.hypot(W, H) * 0.85, 0.75, [255, 200, 130]);
  glowDot(L.e, lx, ly, 500 * K.z, 'rgba(255,170,90,A)', 0.35);
  return {};
}

// 06 · 誓 — she washes away the rouge and the gold, and vows before the lamp (L07)
function shVow(t) {
  const c = L.c, e = L.e;
  const w0 = CH('L07', 1) - 0.2, w1 = CH('L07', 4) + 0.6, wash = E.inOutQuad(inv(w0, w1, t));
  const tWide = snap(CH('L07', 5) - 0.15), tClose = snap(CH('L07', 10) - 0.15);
  if (t < tWide) {                                          // 洗尽铅华: water washes the red and gold away; the white beneath
    const u = t - (TS('L07') - 0.25);
    const K = VERT ? { x: 700, y: 640, z: W / 900 } : { x: 700, y: 620, z: H / lerp(900, 860, u / 3) };
    frame(K, (c, e, K) => {
      inkOver(c, K, '#1A0E0A', 0.55);
      c.drawImage(fig('ax_red_tear'), 0, 0);
      drawMasked(c, fig('ax_white_closed'), washMask(wash, 700, 700, 7));
      for (let i = 0; i < 26; i++) {                        // ornaments slipping away
        const st = w0 + rnd(i, 1, 3) * 1.2, q = t - st; if (q < 0 || q > 1.6) continue;
        const x = 620 + rnd(i, 2, 3) * 320, y = 240 + rnd(i, 3, 3) * 180 + 0.5 * 900 * q * q;
        c.globalAlpha = 1 - q / 1.6; goldDot(c, x + Math.sin(q * 5 + i) * 10, y, 4 + rnd(i, 4, 3) * 4); c.globalAlpha = 1;
      }
    });
    lampLight(c, SX(0.35), SY(0.75), Math.hypot(W, H) * 0.8, 0.6, [255, 205, 140]);
    return {};
  }
  if (t < tClose) {                                         // 在灯前立誓: she kneels, hands together, the lamp before her
    const u = t - tWide;
    const K = VERT ? { x: 640, y: 820, z: W / 1100 } : { x: 620, y: 760, z: H / lerp(1250, 1180, u / 2) };
    frame(K, (c, e, K) => {
      inkOver(c, K, '#140C0A', 0.7);
      c.drawImage(fig('ax_white_closed'), 0, 0);
      prayingHands(c, 720, 1010, 1.25);
      drawLamp(c, e, 260, 1320, 1.6, t, 1);
    });
    const [lx, ly] = toScreen(K, 330, 1020);
    lampLight(c, lx, ly, Math.hypot(W, H) * 0.8, 0.8, [255, 205, 140]);
    return {};
  }
  const u = t - tClose;                                     // 此生此身…: her face, eyes closed, perfectly still
  const K = VERT ? { x: 690, y: 600, z: W / lerp(700, 640, u / 4) } : { x: 680, y: 590, z: H / lerp(640, 580, u / 4) };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#140C0A', 0.6);
    c.drawImage(fig('ax_white_closed'), 0, 0);
    motes(c, e, t, 20, 9, [450, 300, 1000, 900], { a: 0.4, speed: 0.03, r: 1.2 });
  });
  const [lx, ly] = toScreen(K, 330, 1000);
  lampLight(c, lx, ly, Math.hypot(W, H) * 0.9, 0.75, [255, 210, 150]);
  return {};
}

// ── act three props ──
const BARS = {};
function bars(c, x0, x1, y0, y1, n, blur, col = '#1A100C') {   // painted once into a sprite, then placed
  const key = [x0, x1, y0, y1, n, blur, col].join(), m = 80;
  if (!BARS[key]) {
    const cv = mk(Math.ceil(x1 - x0 + 2 * m), Math.ceil(y1 - y0 + 2 * m)), b = cv.getContext('2d'); b.translate(m - x0, m - y0);
    if (blur) b.filter = `blur(${blur}px)`; b.fillStyle = col;
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, (i + 0.5) / n); b.fillRect(x - 22, y0, 44, y1 - y0); }
    b.fillRect(x0 - 40, y0 + (y1 - y0) * 0.12, x1 - x0 + 80, 36); b.fillRect(x0 - 40, y1 - (y1 - y0) * 0.12, x1 - x0 + 80, 36);
    BARS[key] = cv;
  }
  c.drawImage(BARS[key], x0 - m, y0 - m);
}
function chain(c, pts, t, a = 1, drop = 0) {             // links along a polyline; drop > 0 makes them fall
  if (a <= 0) return;
  const P = new Poly(pts), n = Math.floor(P.L / 26);
  for (let i = 0; i < n; i++) {
    const [x, y] = P.at(i * 26), fall = drop > 0 ? 0.5 * 1400 * drop * drop * (0.6 + rnd(i, 1, 2) * 0.8) : 0;
    c.save(); c.globalAlpha = a * (1 - clamp(drop * 1.2)); c.translate(x + (rnd(i, 2, 2) - 0.5) * 60 * drop, y + fall); c.rotate(i % 2 ? 0 : Math.PI / 2 + drop * rnd(i, 3, 2) * 6);
    c.strokeStyle = '#2A2420'; c.lineWidth = 9; c.beginPath(); c.ellipse(0, 0, 18, 11, 0, 0, TAU); c.stroke();
    c.strokeStyle = '#8A8078'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 18, 11, 0, 0, TAU); c.stroke(); c.restore();
  }
}
function torch(c, e, x, y, s, t, seed) {
  c.save(); c.translate(x, y); c.scale(s, s);
  pigment(c, 'M-12 0 L12 0 L8 220 L-8 220 Z', '#3A2410', { seed: 931 + seed, edge: 0.5, edgeW: 3, bbox: [-12, 0, 12, 220] });
  pigment(c, 'M-26 -10 C-24 -26 24 -26 26 -10 L18 10 L-18 10 Z', '#2A1A0C', { seed: 932 + seed, edge: 0.5, edgeW: 3 });
  flameTongue(c, 0, -14, 52, 130, t * 1.3, seed, { bands: ['#C8342C', '#F07A2A', '#FFD27A'], line: 'rgba(80,20,8,0.6)', lw: 2 });
  c.restore();
  glowDot(e, x, y - 70 * s, 320 * s, 'rgba(255,140,60,A)', 0.6); glowDot(e, x, y - 60 * s, 70 * s, 'rgba(255,220,150,A)', 0.8);
}
function smoke(c, x, y, t, t0, a = 1) {                   // a thread of smoke after a flame goes out
  const u = t - t0; if (u < 0 || u > 3) return;
  c.save(); c.strokeStyle = `rgba(210,200,190,${(0.55 * (1 - u / 3) * a).toFixed(3)})`; c.lineWidth = 3; c.lineCap = 'round'; c.filter = 'blur(1.5px)';
  c.beginPath(); for (let k = 0; k <= 30; k++) { const q = k / 30, yy = y - q * 260 * Math.min(1, u * 1.5), xx = x + Math.sin(q * 7 - u * 2) * 18 * q; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); c.restore();
}

// 07 · 死牢 — the priest breaks his word; 紧那罗 in chains waiting for dawn (L08)
function shPrison(t) {
  const c = L.c, e = L.e, tCell = snap(CH('L08', 8) - 0.15);
  if (t < tCell) {
    const u = t - (TS('L08') - 0.25);
    const K = VERT ? { x: 560, y: 560, z: W / 1100 } : { x: 620, y: 560, z: H / lerp(1150, 1000, u / 2.5) };
    frame(K, (c, e, K) => {
      inkOver(c, K, '#1A0A08', 0.8);
      c.save(); c.translate(1400 * 0.9 + 20, 60); c.scale(-0.9, 0.9); c.drawImage(fig('priest'), 0, 0); c.restore();
      torch(c, e, 1120, 820, 1.5, t, 1);
    });
    lampLight(c, SX(0.7), SY(0.55), Math.hypot(W, H) * 0.7, 0.85, [255, 150, 90]);
    return { flash: 0.12 * Math.exp(-Math.max(0, t - (TS('L08') - 0.2)) * 5) };
  }
  const u = t - tCell;
  const K = VERT ? { x: 700, y: 760, z: W / lerp(1200, 1080, u / 4) } : { x: 720, y: 760, z: H / lerp(1300, 1150, u / 4) };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#0C0E14', 0.9);
    // a beam of moonlight from a high window
    c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.35; const g = c.createLinearGradient(260, -100, 700, 900); g.addColorStop(0, 'rgba(180,200,240,0.9)'); g.addColorStop(1, 'rgba(180,200,240,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(220, -120); c.lineTo(420, -120); c.lineTo(1000, 1100); c.lineTo(640, 1100); c.closePath(); c.fill(); c.restore();
    const [hx, hy] = haloAt(0.12); drawSprite(c, SPR.haloK, hx, hy, 0.95, { alpha: 0.25 });
    kinFigure(c, 0.12, 0);
    chain(c, [[560, 1020], [700, 1060], [860, 1040], [990, 1000]], t, 1);
    chain(c, [[560, 1160], [720, 1200], [880, 1180], [1020, 1140]], t, 1);
    bars(c, -300, 1700, -200, 1600, 9, 3);
  });
  lampLight(c, SX(0.45), SY(0.35), Math.hypot(W, H) * 0.6, 0.6, [200, 210, 255]);
  return {};
}

// 08 · 门 — that night she carries the lamp to the high priest's door (L09)
function shDoor(t) {
  const c = L.c, e = L.e, t0 = TS('L09') - 0.25, u = t - t0;
  const reach = E.inOutQuad(inv(t0, CH('L09', 10), t)), enter = E.inOutQuad(inv(CH('L09', 12), CH('L09', 16), t));
  const close = E.inOutCubic(inv(CH('L09', 16), TE('L09') + 0.2, t));
  const K = VERT ? { x: 700, y: 800, z: W / lerp(1300, 1150, u / 5.5) } : { x: 700, y: 760, z: H / lerp(1500, 1350, u / 5.5) };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#0A0C14', 0.9);
    pigment(c, 'M-600 1150 H2000 V1800 H-600 Z', '#2A2A30', { seed: 941, edge: 0, mottle: 0.3, bbox: [-600, 1150, 2000, 1800] });   // the street
    c.drawImage(fig('door'), 250, -250, 900, 1400);
    // the doors part: a slit of red light that closes again
    const gap = Math.sin(Math.PI * clamp(inv(CH('L09', 12), TE('L09') + 0.2, t))) * 130 * (1 - close * 0.2);
    if (gap > 1) { c.save(); c.fillStyle = '#FF7A4A'; c.fillRect(700 - gap / 2, -160, gap, 1310); c.restore(); glowDot(e, 700, 600, 500, 'rgba(255,90,40,A)', 0.8 * gap / 130); }
    torch(c, e, 170, 820, 1.3, t, 2); torch(c, e, 1230, 820, 1.3, t, 3);
    // her, small, walking up to the door with the lamp; she steps into the light and is gone
    const fx = lerp(700, 700, reach), fy = lerp(1560, 1180, reach), fs = lerp(0.95, 0.66, reach), a = 1 - enter;
    if (a > 0) { c.save(); c.globalAlpha = a; c.translate(fx - 160 * fs, fy - 640 * fs); c.scale(fs, fs); c.drawImage(fig('axBack'), 0, 0); c.restore(); glowDot(e, fx + 110 * fs, fy - 380 * fs, 160 * fs, 'rgba(255,200,120,A)', 0.8 * a); }
  });
  lampLight(c, SX(0.5), SY(0.5), Math.hypot(W, H) * 0.75, 0.5, [255, 170, 110]);
  darkPass(c, 0.55 * inv(TE('L09') - 0.1, TE('L09') + 0.5, t));
  return {};
}

// 09 · 破誓 — the red flower falls and breaks; the chains fall from him (L10)
function shBroken(t) {
  const c = L.c, e = L.e, tChain = snap(CH('L10', 4) - 0.15);
  if (t < tChain) {
    const u = t - (TS('L10') - 0.35), hit = CH('L10', 3) + 0.05, fall = E.inQuad(inv(TS('L10') - 0.3, hit, t)), br = t - hit;
    const K = { x: 700, y: 700, z: Math.min(W, H) / 900 };
    frame(K, (c, e, K) => {
      inkOver(c, K, '#0C0A0E', 0.92);
      const fy = lerp(260, 900, fall);
      if (br < 0) drawSprite(c, SPR.flowers[0], 700 + Math.sin(u * 3) * 20, fy, 3.2, { rot: u * 1.5 });
      else for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3, d = 90 * E.outCubic(clamp(br / 0.8)); c.save(); c.globalAlpha = 1 - clamp(br / 2.5) * 0.4; c.translate(700 + Math.cos(a) * d, 900 + Math.sin(a) * d * 0.4); c.rotate(a + br); petalShape(c, 40, 64); c.fillStyle = '#B5302A'; c.fill(); c.strokeStyle = '#4A1210'; c.lineWidth = 2; c.stroke(); c.restore(); }
      glowDot(e, 700, fy, 180, 'rgba(200,40,30,A)', 0.35);
    });
    lampLight(c, SX(0.5), SY(0.6), Math.hypot(W, H) * 0.45, 0.75, [255, 170, 150]);
    return {};
  }
  const u = t - tChain, drop = inv(CH('L10', 5), CH('L10', 5) + 1.2, t), dawn = E.inOutQuad(inv(CH('L10', 7), TE('L10') + 0.4, t));
  const K = VERT ? { x: 760, y: 1100, z: W / 900 } : { x: 780, y: 1080, z: H / 760 };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#0C0E14', 0.9 * (1 - dawn * 0.6));
    kinFigure(c, 0.12, 0);
    chain(c, [[560, 1020], [700, 1060], [860, 1040], [990, 1000]], t, 1, drop);
    chain(c, [[560, 1160], [720, 1200], [880, 1180], [1020, 1140]], t, 1, Math.max(0, drop - 0.1));
    rays(c, e, 1500, 400, Math.PI * 0.8, Math.PI * 1.2, 8, 1400, dawn, t, [255, 226, 170]);
  });
  lampLight(c, SX(0.8), SY(0.3), Math.hypot(W, H) * lerp(0.5, 0.9, dawn), lerp(0.7, 0.35, dawn), [255, 226, 180]);
  return {};
}

// 10 · 天明 — he walks out into the dawn; she sits before the lamp (L11)
function shDawn(t) {
  const c = L.c, e = L.e, tHer = snap(CH('L11', 6) - 0.2);
  if (t < tHer) {
    const u = t - (TS('L11') - 0.25);
    const K = VERT ? { x: 720, y: 640, z: W / 1100 } : { x: 700, y: 640, z: H / lerp(1150, 1080, u / 2) };
    frame(K, (c, e, K) => {
      rays(c, e, -100, 200, -0.3, 0.5, 10, 2000, 0.9, t, [255, 230, 180]);
      const [hx, hy] = haloAt(-0.18); drawSprite(c, SPR.haloK, hx, hy, 0.95, { rot: t * 0.1 });
      kinFigure(c, -0.18, 0);
      motes(c, e, t, 30, 13, [200, 100, 1300, 1200], { a: 0.7 });
    });
    lampLight(c, SX(0.25), SY(0.3), Math.hypot(W, H) * 0.9, 0.3, [255, 236, 200]);
    return {};
  }
  const u = t - tHer;
  const K = VERT ? { x: 680, y: 800, z: W / 1050 } : { x: 640, y: 760, z: H / lerp(1200, 1120, u / 3) };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#140C0A', 0.72);
    c.drawImage(fig('ax_white_tear'), 0, 0);
    drawLamp(c, e, 250, 1330, 1.6, t, 1, { flame: 0.9 });
  });
  const [lx, ly] = toScreen(K, 320, 1030);
  lampLight(c, lx, ly, Math.hypot(W, H) * 0.8, 0.8, [255, 205, 140]);
  return {};
}

// 11 · 灯灭 — "这颗心，从来干净": the flame gutters and goes out (L12)
function shLampOut(t) {
  const c = L.c, e = L.e, t0 = TS('L12') - 0.25, u = t - t0, tOut = TE('L12') + 0.35;
  const fl = 1 - E.inQuad(inv(CH('L12', 8), tOut, t)), out = t >= tOut;
  const K = VERT ? { x: 640, y: 780, z: W / lerp(1000, 860, u / 5) } : { x: 600, y: 760, z: H / lerp(1050, 900, u / 5) };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#140C0A', 0.72);
    c.drawImage(fig('ax_white_closed'), 0, 0);
    drawLamp(c, e, 250, 1330, 1.6, t, out ? 0 : Math.max(0.05, fl), { flame: 0.6 + 0.4 * fl + Math.sin(t * 17) * 0.08 * (1 - fl) });
    smoke(c, 250 + 44 * 1.6, 1330 - 188 * 1.6, t, tOut, 1);
    if (out) drawSprite(c, SPR.petalW, 700 + Math.sin(t * 2) * 40, lerp(300, 1300, clamp((t - tOut) / 2.5)), 2.2, { rot: t });
  });
  const [lx, ly] = toScreen(K, 320, 1030);
  lampLight(c, lx, ly, Math.hypot(W, H) * lerp(0.25, 0.8, out ? 0 : fl), 0.85, [255, 205, 140]);
  darkPass(c, out ? 0.75 + 0.25 * inv(tOut, SONG_AT - 0.05, t) : 0);
  return {};
}

// ───────────── the song ─────────────
// 12 · 惹得天怒地也恼 — close on her face at rest on his white sleeve, her hair spread over it; his tear falls on her cheek.
//      At 天 (lightning) he lifts his face to heaven, her hair hanging from his arms; at 地也恼 the silk itself tears.
let SD1 = null;
const PIETA = { cx: 700, cy: 560, rot: 0.5 };                 // her head: pivot and tilt (falls back to the right, face up to the light)
function pietaSleeve(c) {                                     // his white sleeve under her head, running off to the right, in shadow away from her face
  const d = spl([[852, 520], [960, 452], [1140, 410], [1360, 396], [1620, 420], [1640, 900], [1400, 950], [1200, 1010], [1040, 990], [930, 900], [868, 760]], true);
  const F = ['M930 560 C1080 520 1260 500 1480 520', 'M960 700 C1120 660 1300 650 1500 690', 'M990 850 C1140 820 1300 820 1460 860', 'M1060 470 C1200 440 1380 430 1560 450'];
  pigment(c, d, '#CFCBC3', { seed: 911, edge: 0.55, edgeW: 16, edgeCol: '#5E6472', mottle: 0.1, grain: 0.05,
    shade: (t, sc) => { F.forEach(f => sLine(t, sc, f, '#5E6474', 34, 0.45, 26)); sSpot(t, 940, 560, 220, '#FFFFFF', 0.4); sSpot(t, 1500, 800, 380, '#2A303C', 0.7); } });
  mlines(c, F.slice(0, 3), { w: 1.3, color: '#4E5460', alpha: 0.5, seed: 915 });
  mline(c, d, { w: 2, color: '#40464F', alpha: 0.7, seed: 916 });
}
function pietaHair(c, t) {                                    // one long river of hair from the back of her head, down across his sleeve
  const R = rng(77), sw = Math.sin(t * 0.8) * 3;
  const mass = spl([[918, 468], [990, 540], [1066, 660], [1118, 800], [1140 + sw, 930], [1122 + sw, 1060], [1040 + sw, 1080], [1012, 960], [972, 850], [912, 752], [836, 690], [790, 660]], true);
  pigment(c, mass, '#16131B', { seed: 921, edge: 0.3, mottle: 0.06, grain: 0.05, shade: (t2, sc) => { sLine(t2, sc, 'M930 520 C1010 600 1070 720 1096 860', '#4E4B64', 22, 0.5, 16); sLine(t2, sc, 'M880 700 C960 780 1020 900 1050 1020', '#34324A', 16, 0.4, 12); } });
  for (let i = 0; i < 40; i++) {
    const u = i / 39, x0 = lerp(916, 800, u) + (R() - 0.5) * 8, y0 = lerp(470, 668, u) + (R() - 0.5) * 8;
    const x3 = lerp(1150, 1030, u) + (R() - 0.5) * 40 + sw, y3 = lerp(1000, 1090, u) + R() * 60;
    const b1 = (R() - 0.3) * 50, b2 = (R() - 0.5) * 40;
    mline(c, `M${x0.toFixed(1)} ${y0.toFixed(1)} C${(lerp(x0, x3, 0.3) + 60 + b1).toFixed(1)} ${lerp(y0, y3, 0.25).toFixed(1)} ${(lerp(x0, x3, 0.7) + b2).toFixed(1)} ${lerp(y0, y3, 0.7).toFixed(1)} ${x3.toFixed(1)} ${y3.toFixed(1)}`,
      { w: 0.8 + R() * 1.5, color: R() < 0.35 ? '#5E5A74' : '#0B0A0E', alpha: 0.5 + R() * 0.4, seed: 930 + i, taper: [0.1, 0.85], breaks: 0.08 });
  }
  for (let i = 0; i < 5; i++) { const x0 = 1000 + i * 30, y0 = 900 + i * 20; mline(c, `M${x0} ${y0} C${x0 + 60} ${y0 + 60} ${x0 + 40 + sw * 2} ${y0 + 140} ${x0 + 90 + sw * 2} ${y0 + 210}`, { w: 0.9, color: '#0B0A0E', alpha: 0.55, seed: 980 + i, taper: [0.1, 0.9] }); }   // stray ends
}
function shSong1(t) {
  const c = L.c, e = L.e, s = t - SONG_AT, CUT = 1.46;
  if (s < CUT) {
    const p = s / CUT, drop = inv(0.42, 0.86, s), land = inv(0.86, 1.3, s);
    const K = VERT ? { x: 760, y: 600, z: W / lerp(820, 760, p) } : { x: 800, y: 590, z: H / lerp(700, 650, p) };
    frame(K, (c, e, K) => {
      inkOver(c, K, '#12141E', 0.8);
      pietaSleeve(c); pietaHair(c, t);
      for (let i = 0; i < 6; i++) { const ph = (s * 0.05 + rnd(i, 2, 61)) % 1; drawSprite(c, SPR.petalW, lerp(1000, 1500, rnd(i, 3, 61)) + Math.sin(s + i) * 30, lerp(200, 1000, ph), 0.9 + rnd(i, 4, 61) * 0.5, { rot: s * 0.5 + i, alpha: 0.75 * Math.sin(ph * Math.PI) }); }
      c.save(); c.translate(PIETA.cx, PIETA.cy); c.rotate(PIETA.rot); c.translate(-PIETA.cx, -PIETA.cy); c.drawImage(fig('ax_white_closed'), 0, 0); c.restore();
      // his tear: falls, lands on her cheek, runs
      const [tx, ty] = [716, 612];
      if (drop > 0 && drop < 1) { const y = lerp(ty - 420, ty, drop * drop); c.save(); const g = c.createRadialGradient(tx, y, 0, tx, y, 7); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(220,235,255,0.2)'); c.fillStyle = g; c.beginPath(); c.ellipse(tx, y, 4, 6.5, 0, 0, TAU); c.fill(); c.restore(); glowDot(e, tx, y, 26, 'rgba(210,225,255,A)', 0.6); }
      if (land > 0) { c.save(); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + 10, ty + 30 * land, tx + 26 * land, ty + 56 * land); c.stroke(); c.restore(); glowDot(e, tx, ty, 40, 'rgba(230,240,255,A)', 0.9 * (1 - land)); }
    });
    lampLight(c, SX(0.42), SY(0.3), Math.hypot(W, H) * 0.55, 0.7, [205, 218, 255]);
    cartouche(c, 0, t, { side: 'l' });
    return { flash: s > CUT - 0.06 ? 0.4 : 0, flashCol: '#F4F0FF' };
  }
  if (!SD1) SD1 = [].concat(crackGen(71, 700, 1500, -1.3, 900, { depth: 2, t0: 2.5, speed: 2400, w: 5 }), crackGen(73, 200, 1500, -1.0, 800, { depth: 2, t0: 2.92, speed: 2400, w: 4.5 }), crackGen(79, 1250, 1500, -1.9, 800, { depth: 2, t0: 3.22, speed: 2400, w: 4.5 }));
  const shake = [2.52, 2.94, 3.24].reduce((m, t0) => m + (s > t0 ? Math.exp(-(s - t0) * 7) * 14 : 0), 0);
  const u = (s - CUT) / (4.05 - CUT), lift = E.outCubic(inv(CUT, CUT + 0.8, s));
  const K0 = VERT ? { x: 700, y: 820, z: W / lerp(1060, 980, u) } : { x: 720, y: 800, z: H / lerp(1180, 1080, u) };
  const K = { ...K0, x: K0.x + Math.sin(t * 83) * shake, y: K0.y + Math.cos(t * 61) * shake };
  const l1 = s > 1.46 ? Math.exp(-(s - 1.46) * 9) : 0, l2 = s > 1.88 ? Math.exp(-(s - 1.88) * 9) : 0;
  frame(K, (c, e, K) => {
    inkOver(c, K, '#12141E', 0.88);
    [[200, 150, 1.3], [900, 60, 1.1], [1400, 200, 1.4]].forEach(([x, y, k], i) => drawSprite(c, SPR.cloudDk, x + s * (i % 2 ? -20 : 20), y, k, { flip: i % 2 === 1, alpha: 0.9 }));
    boltAt(c, e, 300, -200, 700, 600, 17, l1 * 1.4); boltAt(c, e, 1500, -200, 1100, 700, 29, l2 * 1.4);
    kinFigure(c, lerp(-0.1, 0.2, lift), 0);
    // the ground under the bust is dark here: let the robe fall into the night
    const g = c.createLinearGradient(0, 1180, 0, 1400); g.addColorStop(0, 'rgba(18,20,30,0)'); g.addColorStop(1, 'rgba(18,20,30,0.95)'); c.fillStyle = g; c.fillRect(-400, 1180, 2400, 400);
    crackDraw(c, SD1, s, { col: 'rgba(10,8,8,0.9)', lip: 'rgba(255,240,220,0.5)' });
  });
  lampLight(c, SX(0.55), SY(0.4), Math.hypot(W, H) * 0.7, 0.55, [210, 220, 255]);
  cartouche(c, 0, t, { side: 'l' });
  return { flash: Math.max(l1, l2) * 0.5, flashCol: '#F4F0FF' };
}
// 13 · 人间再无红颜笑 — her smile, warm; from 再无 it cracks and flakes away to the bare silk
let SD2 = null;
function shSong2(t) {
  const c = L.c, e = L.e, s = t - SONG_AT;
  if (!SD2) SD2 = { flakes: flakeGen(17, [360, 120, 1200, 1400], 26), cracks: crackGen(23, 800, 380, 2.2, 360, { depth: 2, t0: 5.1, speed: 1100, w: 2.4 }).concat(crackGen(29, 600, 820, -0.6, 300, { depth: 2, t0: 5.3, speed: 1000, w: 2.1 })) };
  const u = s - SONG_CUT[1], fade = E.inOutQuad(inv(5.5, 7.8, s));
  const K = VERT ? { x: 700, y: lerp(640, 600, u / 4), z: W / lerp(860, 760, u / 4) } : { x: 690, y: lerp(620, 590, u / 4), z: H / lerp(860, 760, u / 4) };
  frame(K, (c, e, K) => {
    scatterFlowers(c, t, 18, 4, [100, -100, 1300, 1500], { a: 1 - fade * 0.7 });
    flakeFigure(c, e, fig('ax_white_smile'), sketchOf('ax_white_smile'), 0, 0, 1, SD2.flakes, s, p => 5.62 + (1 - p.cy / 1400) * 1.9 + p.r * 0.35, { fade, dur: 0.9, g: 1100 });
    crackDraw(c, SD2.cracks, s, { a: 1 - inv(7.4, 7.9, s) * 0.5 });
  });
  lampLight(c, SX(0.55), SY(0.35), Math.hypot(W, H) * 0.8, lerp(0.3, 0.55, fade), [255, 226, 180]);
  glowDot(L.e, SX(0.5), SY(0.4), Math.hypot(W, H) * 0.35, 'rgba(255,214,160,A)', 0.25 * (1 - fade));
  cartouche(c, 1, t, { side: 'l' });
  return {};
}
// 14 · 留一半相思上大道 — he carries her up the endless stair to 灵山
function shSong3(t) {
  const c = L.c, e = L.e, s = t - SONG_AT, u = s - SONG_CUT[2], D = SONG_CUT[3] - SONG_CUT[2];
  const walk = lerp(0.03, 0.19, clamp(u / D)), P = S3PATH.at(walk * S3PATH.L), sc = lerp(0.66, 0.46, walk / 0.19);
  const rise = E.inOutCubic(inv(10.6, 13.4, s));
  const K = VERT ? { x: lerp(P[0], 1000, rise), y: lerp(P[1] - 360, 900, rise), z: W / lerp(1150, 1500, rise) } : { x: lerp(P[0] + 100, 1000, rise), y: lerp(P[1] - 260, 900, rise), z: H / lerp(1500, 1750, rise) };
  frame(K, (c, e, K) => {
    stairPanel(c, e, t);
    const bob = Math.abs(Math.sin(t * 5.2)) * 6;
    c.save(); c.translate(P[0], P[1] - bob); c.scale(sc, sc); c.drawImage(fig('carryW'), -270, -600); c.restore();
    scatterFlowers(c, t, 16, 13, [K.x - 1200, K.y - 1200, K.x + 1200, K.y + 1200], { scale: 1.3, speed: 0.06 });
  });
  lampLight(c, SX(0.5), SY(lerp(0.4, 0.2, rise)), Math.hypot(W, H) * 0.8, 0.35, [255, 246, 226]);
  cartouche(c, 2, t, { side: 'r' });
  return {};
}
// 15 · 怕什么天道轮回 — the colossal 世尊, the wheel turning; four gold words come down on them
function verdict(c, e, x, y, size, t, times, o = {}) {     // o.ink: cinnabar on the wall · otherwise gold over a darkened frame
  const chars = Array.from('六根不净');
  chars.forEach((ch, i) => {
    const p = inv(times[i], times[i] + 0.18, t); if (p <= 0) return;
    const gap = o.ink ? 1.3 : 1.12, k = 1 + (1 - E.outCubic(p)) * 1.6, cx = o.vertical ? x : x + (i - 1.5) * size * gap, cy = o.vertical ? y + (i - 1.5) * size * gap : y;
    c.save(); c.globalAlpha = Math.min(1, p * 1.4) * (o.a ?? 1); c.translate(cx, cy); c.scale(k, k);
    c.font = `400 ${size}px ${FONT.kai}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (o.ink) {                                              // a cinnabar seal stamped on the wall, the word cut out in white
      const r = size * 0.56;
      c.shadowColor = 'rgba(40,10,4,0.4)'; c.shadowBlur = size * 0.12; c.shadowOffsetY = size * 0.03;
      c.fillStyle = '#A3221A'; c.beginPath(); c.roundRect(-r, -r, 2 * r, 2 * r, r * 0.1); c.fill();
      c.shadowColor = 'transparent'; c.strokeStyle = '#F3E6CF'; c.lineWidth = size * 0.035; c.beginPath(); c.roundRect(-r * 0.84, -r * 0.84, r * 1.68, r * 1.68, r * 0.06); c.stroke();
      c.fillStyle = '#F6EAD4'; c.font = `400 ${size * 0.86}px ${FONT.kai}`; c.fillText(ch, 0, size * 0.03);
      c.beginPath(); c.rect(-r - 2, -r - 2, 2 * r + 4, 2 * r + 4); c.clip(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha *= 0.25; tile(c, TEX.wear, [-r, -r, r, r], 0.5);   // worn stamp
    } else {
      c.shadowColor = 'rgba(0,0,0,0.95)'; c.shadowBlur = size * 0.22; c.fillStyle = '#E8C06A'; c.fillText(ch, 0, 0); c.fillText(ch, 0, 0);
      c.shadowBlur = 0; c.shadowColor = 'transparent'; c.fillStyle = 'rgba(255,246,216,0.6)'; c.fillText(ch, -size * 0.015, -size * 0.015);
    }
    c.restore();
    if (e && !o.ink) { e.save(); e.globalAlpha = 0.35 * p * (o.a ?? 1); e.font = `400 ${size}px ${FONT.kai}`; e.textAlign = 'center'; e.textBaseline = 'middle'; e.fillStyle = '#FFD890'; e.fillText(ch, cx, cy); e.restore(); }
  });
}
function shSong4(t) {
  const c = L.c, e = L.e, s = t - SONG_AT, u = s - SONG_CUT[3], D = SONG_CUT[4] - SONG_CUT[3];
  const spin = s * 0.12 + Math.max(0, s - 17.0) ** 2 * 0.9;
  const K = VERT ? { x: 800, y: lerp(1080, 1000, E.inOutQuad(u / D)), z: H / lerp(2350, 2150, E.inOutQuad(u / D)) } : { x: 800, y: lerp(1010, 960, E.inOutQuad(u / D)), z: H / lerp(2150, 1950, E.inOutQuad(u / D)) };
  frame(K, (c, e, K) => {
    scatterFlowers(c, t, 22, 9, [-200, -300, 1800, 2000], { scale: 1.6 });
    wheelOfWay(c, e, 800, 900, spin, 1 + 0.25 * inv(17.0, 17.6, s));
    c.drawImage(fig('buddha'), 0, 0);
    drawSprite(c, SPR.haloK, 800, 540, 1.05, { rot: -spin * 0.5 });
    c.drawImage(fig('buddha'), 690, 290, 220, 440, 690, 290, 220, 440);
    c.drawImage(fig('kneelW'), 430, 1640, 385, 242);
    rays(c, e, 800, 484, -Math.PI * 0.95, -Math.PI * 0.05, 16, 1500, 0.8 + 0.4 * inv(17.0, 17.5, s), t);
  });
  lampLight(c, SX(0.5), SY(0.4), Math.hypot(W, H) * 0.8, 0.4, [255, 236, 190]);
  const [vx, vy] = VERT ? [SX(0.11), SY(0.5)] : [SX(0.16), SY(0.47)];
  verdict(c, null, vx, vy, pick(100, 92) * U, s, [15.78, 16.08, 16.5, 16.9], { vertical: true, ink: true });
  cartouche(c, 3, t, { side: 'r' });
  return { flash: [15.78, 16.08, 16.5, 16.9].reduce((m, x) => m + (s > x ? Math.exp(-(s - x) * 9) * 0.25 : 0), 0) };
}
// 16 · 什么魄散魂飞 — the halo shatters; ink climbs the white robe to black; the eyes kindle; the dark fire
let SD5 = null;
function shSong5(t) {
  const c = L.c, e = L.e, s = t - SONG_AT, u = s - SONG_CUT[4];
  if (!SD5) SD5 = { halo: flakeGen(31, [0, 0, SPR.haloK.w, SPR.haloK.h], 34) };
  const tilt = -0.36 + 0.05 * E.outCubic(inv(20.3, 21.2, s));
  const shake = s > 20.76 ? Math.exp(-(s - 20.76) * 4) * 14 : s > 19.25 ? Math.exp(-(s - 19.25) * 5) * 8 : 0;
  const K0 = VERT ? { x: 740, y: 720, z: W / lerp(960, 880, u / 4) } : { x: 760, y: 620, z: H / lerp(960, 880, u / 4) };
  const K = { ...K0, x: K0.x + Math.sin(t * 71) * shake, y: K0.y + Math.cos(t * 57) * shake };
  const ink = E.inOutQuad(inv(19.4, 20.5, s)), fl = E.outBack(clamp(inv(20.7, 21.1, s)), 1.3), dark = E.inOutQuad(inv(19.3, 20.6, s));
  frame(K, (c, e, K) => {
    inkOver(c, K, '#0E0C10', lerp(0.35, 0.85, dark));
    if (fl > 0) darkMandorla(c, e, 780, 620, t, fl);
    const [hx, hy] = haloAt(tilt);
    burstSprite(c, e, SPR.haloK, hx, hy, 1, SD5.halo, 19.25, s, { v: 900, g: 700, dur: 1.2 });
    kinFigure(c, tilt, ink, { seed: 9 });
    const eg = E.outCubic(inv(20.25, 20.6, s));
    if (eg > 0) { const [ex, ey] = kinEye(tilt); glowDot(e, ex, ey, 70, 'rgba(255,50,30,A)', eg); }
    if (s < 19.4) rays(c, e, -200, -300, 0.35, 1.05, 9, 1900, 0.9 * (1 - inv(19.1, 19.4, s)), t);
    motes(c, e, t, 50, 5, [200, 100, 1300, 1300], { a: 0.6 + dark * 0.4, speed: 0.05 + dark * 0.2 });
  });
  lampLight(c, SX(pick(0.35, 0.4)), SY(0.3), Math.hypot(W, H) * 0.7, lerp(0.4, 0.75, dark), [255, lerp(236, 170, dark), lerp(200, 150, dark)]);
  cartouche(c, 4, t, { side: 'r' });
  const fx = s < 19.25 ? 0 : s < 20.7 ? Math.exp(-(s - 19.25) * 7) * 0.7 : Math.exp(-(s - 20.76) * 6) * 0.35;
  return { flash: fx, flashCol: s > 20.7 ? '#5A0E08' : '#FFF4DA' };
}
// 17 · 若没有你那才叫可悲 — 无天 in the dark over the dead lamp; she comes back once, warm, and is gone
function shSong6(t) {
  const c = L.c, e = L.e, s = t - SONG_AT, u = s - SONG_CUT[5];
  const ghost = inv(23.6, 24.6, s) * (1 - inv(26.2, 27.4, s));
  const K = VERT ? { x: 720, y: 760, z: W / lerp(1100, 1000, u / 5.5) } : { x: 760, y: 700, z: H / lerp(1200, 1080, u / 5.5) };
  frame(K, (c, e, K) => {
    inkOver(c, K, '#0A0A10', 0.9);
    if (ghost > 0) { const [gx, gy] = VERT ? [-300, -60] : [-420, 40]; c.save(); c.globalAlpha = ghost * 0.85; c.translate(gx, gy); c.drawImage(fig('ax_white_smile'), 0, 0); c.restore(); glowDot(e, 720 + gx, 520 + gy, 520, 'rgba(255,214,160,A)', ghost * 0.5); }
    darkMandorla(c, e, 780, 620, t, 0.85);
    kinFigure(c, 0.16, 1);
    drawLamp(c, e, 520, 1340, 1.5, t, 0);
  });
  lampLight(c, SX(pick(0.35, 0.45)), SY(0.4), Math.hypot(W, H) * 0.7, 0.55, [255, 200, 170]);
  cartouche(c, 5, t, { side: 'r' });
  darkPass(c, E.inQuad(inv(27.2, 27.7, s)));
  return {};
}

// ───────────── epilogue ─────────────
// 18 · "六根不净" — the Buddha's face, impassive; the four words written in gold (L13)
function shVerdict(t) {
  const c = L.c, e = L.e, u = t - (TS('L13') - 0.3);
  const K = VERT ? { x: 800, y: 540, z: W / lerp(620, 560, u / 8) } : { x: 800, y: 540, z: H / lerp(560, 500, u / 8) };
  frame(K, (c, e, K) => { inkOver(c, K, '#1A1208', 0.3); drawSprite(c, SPR.haloK, 800, 520, 1.4, { rot: t * 0.05, alpha: 0.9 }); c.drawImage(fig('buddha'), 0, 0); });
  lampLight(c, SX(0.5), SY(0.35), Math.hypot(W, H) * 0.6, 0.6, [255, 226, 170]);
  const times = [20, 21, 22, 23].map(k => CH('L13', k));
  const [vx, vy] = VERT ? [SX(0.5), SY(0.5)] : [SX(0.5), SY(0.46)];
  darkPass(c, 0.55 * E.inOutQuad(inv(times[0] - 0.35, times[0] + 0.1, t)));     // the face goes cold and dim; the four words stand over it
  verdict(c, L.e, vx, vy, pick(150, 150) * U, t, times);
  return { flash: times.reduce((m, x) => m + (t > x ? Math.exp(-(t - x) * 9) * 0.18 : 0), 0) };
}
// 19 · 魔罗 — a vast shadow rises behind him; the last of the white goes black (L14)
const MARA = [];
function maraShade(red) {                                     // his silhouette filled flat and softened: 0 smoke-black, 1 ember red (the rim glow)
  if (!MARA[red]) {
    const cv = mk(1400, 1400), t = cv.getContext('2d'); drawKin(t, -0.1, 1); t.globalCompositeOperation = 'source-in'; t.fillStyle = red ? '#A0200E' : '#140807'; t.fillRect(0, 0, 1400, 1400);
    const out = mk(1400, 1400), o = out.getContext('2d'); o.filter = `blur(${red ? 12.5 : 3.5}px)`; o.drawImage(cv, 0, 0); MARA[red] = out;
  }
  return MARA[red];
}
function shMara(t) {
  const c = L.c, e = L.e, tRobe = snap(CH('L14', 9) - 0.2);
  if (t < tRobe) {
    const u = t - (TS('L14') - 0.25), rise = E.inOutCubic(inv(CH('L14', 5), CH('L14', 8) + 0.6, t));
    const K = VERT ? { x: 760, y: 700, z: W / 1400 } : { x: 760, y: 560, z: H / lerp(1500, 1400, u / 3) };
    frame(K, (c, e, K) => {
      inkOver(c, K, '#08080C', 0.92);
      // 魔罗: his own shape, vast, a smoke-black silhouette with a red rim, ember eyes
      const my = lerp(1650, 740, rise);
      c.save(); c.globalAlpha = 0.7 * rise; c.translate(760, my); c.scale(2.42, 2.42); c.translate(-700, -700); c.drawImage(maraShade(1), 0, 0); c.restore();
      c.save(); c.globalAlpha = 0.96 * rise; c.translate(760, my); c.scale(2.3, 2.3); c.translate(-700, -700); c.drawImage(maraShade(0), 0, 0); c.restore();
      if (rise > 0.5) { const [ex, ey] = kinEye(-0.1); const X = 760 + (ex - 700) * 2.3, Y = my + (ey - 700) * 2.3, a = (rise - 0.5) * 2; glowDot(e, X, Y, 150, 'rgba(255,40,20,A)', a * 0.8); c.fillStyle = `rgba(255,90,50,${a})`; c.beginPath(); c.ellipse(X, Y, 16, 7, -0.1, 0, TAU); c.fill(); }
      darkMandorla(c, e, 780, 720, t, 0.9);
      c.save(); c.translate(0, 100); kinFigure(c, -0.1, 1); c.restore();
    });
    lampLight(c, SX(0.5), SY(0.45), Math.hypot(W, H) * 0.7, 0.6, [255, 160, 140]);
    return {};
  }
  const ink = E.inOutQuad(inv(CH('L14', 9) - 0.1, TE('L14') + 0.2, t));    // 白衣成了黑袍: close on the robe as the ink takes it
  const K = VERT ? { x: 800, y: 1080, z: W / 700 } : { x: 800, y: 1060, z: H / 560 };
  frame(K, (c, e, K) => { inkOver(c, K, '#0A0A0E', 0.9); kinFigure(c, -0.1, lerp(0.45, 1, ink), { seed: 21 }); });
  lampLight(c, SX(0.5), SY(0.4), Math.hypot(W, H) * 0.7, 0.55, [230, 220, 230]);
  return {};
}
// 20 · 只有无天 — his face in the dark; at 无天 the eyes open, red; black (L15)
function shEnd(t) {
  const c = L.c, e = L.e, u = t - (TS('L15') - 0.25), eyes = E.outCubic(inv(CH('L15', 9) - 0.1, CH('L15', 12) + 0.2, t));
  const K = VERT ? { x: 640, y: 540, z: W / lerp(640, 520, u / 6) } : { x: 640, y: 530, z: H / lerp(560, 440, u / 6) };
  frame(K, (c, e, K) => { inkOver(c, K, '#060608', 0.95); darkMandorla(c, e, 780, 620, t, 0.9); kinFigure(c, 0.04, 1); if (eyes > 0) { const [ex, ey] = kinEye(0.04); glowDot(e, ex, ey, 90, 'rgba(255,40,20,A)', eyes); c.fillStyle = `rgba(255,70,40,${eyes})`; c.beginPath(); c.ellipse(ex, ey, 8, 4.5, 0.04, 0, TAU); c.fill(); } });
  lampLight(c, SX(0.45), SY(0.45), Math.hypot(W, H) * 0.55, 0.75, [255, 150, 130]);
  darkPass(c, E.inQuad(inv(TE('L15') + 0.2, TE('L15') + 0.7, t)));
  return {};
}
// 21 · end card
function shEndCard(t) {
  const c = L.c, e = L.e, t0 = TE('L15') + 0.7, a = E.outCubic(inv(t0, t0 + 0.8, t));
  const K = { x: 960, y: 540, z: Math.min(W / 1920, H / 1080) };
  frame(K, (c, e, K) => { scatterFlowers(c, t, 8, 51, [200, -100, 1720, 1200], { a: 0.4 }); });
  lampLight(c, SX(0.5), SY(0.4), Math.hypot(W, H) * 0.6, 0.55);
  darkPass(c, 1 - a);
  const ts = pick(170, 210) * U, tx = SX(0.5), ty = SY(pick(0.24, 0.26));
  titleDu(c, e, tx, ty, ts, a, { col: '#8E2A1C', glow: 0.5 });
  seal(c, tx + ts * 0.42, ty + ts * 0.15, 44 * U, '栋森', a);
  c.save(); c.globalAlpha = a; c.textBaseline = 'middle';
  const fs = pick(25, 27) * U, lh = fs * 1.7, mx = SX(0.5), y0 = ty + ts * 0.9, kx = mx - pick(250, 210) * U, vx = mx - pick(226, 186) * U;
  [['音乐', '《大天蓬》· 演唱 恩几（翻唱）'], ['故事', '改编自电视剧《西游记后传》（2000）'], ['旁白', 'AI 配音']].forEach(([k2, v], i) => {
    c.font = `600 ${fs}px ${FONT.serif}`; c.textAlign = 'right'; c.fillStyle = '#5A3A2A'; c.fillText(k2, kx, y0 + i * lh);
    c.font = `400 ${fs}px ${FONT.serif}`; c.textAlign = 'left'; c.fillStyle = '#2E2220'; c.fillText(v, vx, y0 + i * lh);
  });
  c.textAlign = 'center'; c.font = `400 ${fs * 0.78}px ${FONT.serif}`; c.fillStyle = '#6A5A4A'; c.fillText('版权归原作者及版权方所有', mx, y0 + 3 * lh);
  c.restore();
  credits(c, a, y0 + 4 * lh + fs * 0.3, '#3A2A22');
  return {};
}

// ───────────── the cover (frame 0) ─────────────
function shCover() {
  const c = L.c, e = L.e;
  if (!VERT) {
    const K = { x: 700, y: 640, z: H / 1180 };
    L.save(); camApply(K); silkBg(K);
    houseRoom(c, e, 3, K);
    c.save(); c.translate(-560, 60); c.translate(1400 * 0.9, 0); c.scale(-0.9, 0.9); const [hx, hy] = haloAt(-0.05); drawSprite(c, SPR.haloK, hx, hy, 0.95, { alpha: 0.9 }); kinFigure(c, -0.05, 0); c.restore();
    c.drawImage(fig('ax_red_cool'), 380, 0);
    weavePass(K); L.restore();
    lampLight(c, SX(0.62), SY(0.4), Math.hypot(W, H) * 0.75, 0.45);
    const ts = 250 * U, tx = SX(0.5), ty = SY(0.2);
    titleDu(c, e, tx, ty, ts, 1, { col: '#8E2A1C', glow: 0.6 }); seal(c, tx + ts * 0.42, ty + ts * 0.15, 50 * U, '栋森', 1);
    c.save(); c.font = `400 ${28 * U}px ${FONT.serif}`; c.letterSpacing = `${10 * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10 * U; c.fillStyle = '#F6EFE2'; c.fillText('紧那罗 · 阿羞', tx, ty + ts * 0.72); c.restore();
    credits(c, 1, SY(0.9));
    return;
  }
  const K = { x: 700, y: 900, z: W / 1400 };
  L.save(); camApply(K); silkBg(K);
  houseRoom(c, e, 3, K);
  c.drawImage(fig('ax_red_cool'), 0, 200);
  weavePass(K); L.restore();
  lampLight(c, SX(0.5), SY(0.45), Math.hypot(W, H) * 0.7, 0.45);
  const ts = 260 * U, tx = SX(0.5), ty = SY(0.12);
  titleDu(c, e, tx, ty, ts, 1, { col: '#8E2A1C', glow: 0.6 }); seal(c, tx + ts * 0.42, ty + ts * 0.15, 50 * U, '栋森', 1);
  c.save(); c.font = `400 ${30 * U}px ${FONT.serif}`; c.letterSpacing = `${10 * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10 * U; c.fillStyle = '#F6EFE2'; c.fillText('紧那罗 · 阿羞', tx, ty + ts * 0.72); c.restore();
  credits(c, 1, SY(0.88));
}

// ───────────── master timeline ─────────────
const SHOTS = [
  [0, shPrologue],
  [snap(TE('L02') + 0.15), shTitle],
  [snap(TS('L03') - 0.25), shDescent],
  [snap(TS('L04') - 0.25), shTrials],
  [snap(TS('L05') - 0.25), shHouse],
  [snap(TS('L06') - 0.25), shLamp],
  [snap(TS('L07') - 0.25), shVow],
  [snap(TS('L08') - 0.25), shPrison],
  [snap(TS('L09') - 0.25), shDoor],
  [snap(TS('L10') - 0.35), shBroken],
  [snap(TS('L11') - 0.25), shDawn],
  [snap(TS('L12') - 0.25), shLampOut],
  [snap(SG(0)), shSong1], [snap(SG(SONG_CUT[1])), shSong2], [snap(SG(SONG_CUT[2])), shSong3],
  [snap(SG(SONG_CUT[3])), shSong4], [snap(SG(SONG_CUT[4])), shSong5], [snap(SG(SONG_CUT[5])), shSong6],
  [snap(TS('L13') - 0.3), shVerdict],
  [snap(TS('L14') - 0.25), shMara],
  [snap(TS('L15') - 0.25), shEnd],
  [snap(TE('L15') + 0.7), shEndCard],
];
const IS_COVER = t => t < 0.5 / FPS;
let FX = {};
function drawFrame(t) {
  if (LABM) return drawLab(t);
  if (IS_COVER(t)) { shCover(); FX = {}; return; }
  let k = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i][0]) k = i;
  FX = SHOTS[k][1](t) || {};
  subtitles(L.c, t);
}
function fxAt(t) { return { ca: 0.0004, flash: Math.min(0.9, FX.flash || 0), flashCol: FX.flashCol, vig: 0.28, grain: 0.022, bloom: 0.7 }; }
function samplesAt(t) { return LABM ? 1 : 2; }

// ───────────── lab boards ─────────────
function portraitBoard(name, focus) {
  const c = L.c, [fx, fy, span] = focus || [700, 700, 1400];
  const K = { x: fx, y: fy, z: H / span };
  L.save(); camApply(K); silkBg(K); c.drawImage(fig(name), 0, 0); weavePass(K, 0.9); L.restore();
}
function drawLab(t) {
  const [n, z] = LABM.split(':');
  if (n.startsWith('ax')) return portraitBoard(n, z === 'face' ? [700, 540, 460] : null);
  if (n === 'kin') { const K = { x: 700, y: 700, z: H / 1400 }; L.save(); camApply(K); silkBg(K); kinFigure(L.c, -0.1, parseFloat(z || '0')); weavePass(K); L.restore(); return; }
  if (n === 'lamp') { const K = { x: 0, y: -150, z: H / 500 }; L.save(); camApply(K); silkBg(K); drawLamp(L.c, L.e, 0, 0, 1, t, 1); weavePass(K); L.restore(); return; }
}
