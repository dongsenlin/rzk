// ─────────────────────────────────────────────────────────────────────────────
//  大天蓬 MV — timeline and scenes.  Global time t: PRE-second story opening,
//  then the song on its own clock s = t − PRE (0–SONG), then the end card.
//  Every effect is a pure function of time, so any frame renders on its own.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
window.ALL_TEXT = '大天蓬美人不是凡胎生应是仙器灵长成惹得怒地也恼人间再无红颜笑留一半相思上道怕什么轮回魄散魂飞若没有你那才叫可悲'
  + '出品栋森网络科技创作概念练手非官方音乐演唱恩几翻唱版权归原作者及方所有六曜五星配妆子丑寅卯辰巳午未申酉戌亥一二三四五六南门';
const LABM = Q.get('lab');
const U = Math.min(W, H) / 1080;                      // 1 at the short side of the frame
const SX = f => W * f, SY = f => H * f;
const pick = (h, v) => VERT ? v : h;

// sung characters, song time (SenseVoice alignment; 么 散 魂 from vocal onsets)
const LYR = [
  { text: '惹得天怒地也恼', t: [0.66, 0.90, 1.50, 1.92, 2.52, 2.94, 3.24] },
  { text: '人间再无红颜笑', t: [4.20, 4.38, 5.10, 5.58, 5.88, 6.42, 6.54] },
  { text: '留一半相思上大道', t: [8.04, 8.64, 9.06, 9.78, 10.08, 11.04, 11.70, 11.94] },
  { text: '怕什么天道轮回', t: [14.10, 14.70, 15.00, 15.78, 16.08, 17.10, 17.40] },
  { text: '什么魄散魂飞', t: [18.12, 18.45, 19.25, 19.65, 20.30, 20.76] },
  { text: '若没有你那才叫可悲', t: [22.26, 22.68, 22.98, 23.28, 23.88, 24.60, 25.02, 25.74, 26.04] },
];
const snap = x => (Math.round(x * FPS - 0.5) + 0.5) / FPS;     // cuts fall between shutter windows
const CUT = { s3: snap(4.05), s4: snap(7.95), s5: snap(13.95), s6: snap(18.05), s7: snap(22.15), end: snap(27.70) };

window.PREPARE = async () => {
  PREPARE_INK(); PREPARE_FIGURES();
  TEX.cloudDark = tint(TEX.cloud, '#0E0E10'); TEX.cloudGrey = tint(TEX.cloud, '#5A5A60'); TEX.cloudLight = tint(TEX.cloud, '#D8D6CE');
  TEX.mtn = [0, 1, 2, 3].map(k => makeRidge(k));
  FIG.himPts = samplePts(FIG.himBack, 9); FIG.embPts = samplePts(FIG.embrace, 9);
};
function tint(tex, col) { const cv = mk(tex.width, tex.height), c = cv.getContext('2d'); c.drawImage(tex, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height); return cv; }
function samplePts(cv, step) {                       // opaque pixels of a painting, for shattering and regathering
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, out = [];
  for (let y = 0; y < cv.height; y += step) for (let x = 0; x < cv.width; x += step) {
    const o = (y * cv.width + x) * 4; if (d[o + 3] > 150) out.push([x, y, `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`]);
  }
  return out;
}
// ink-wash mountain ridge, dark at the crest and fading into mist below (2400×900)
function makeRidge(k) {
  const w = 2400, h = 900, cv = mk(w, h), c = cv.getContext('2d');
  const base = [560, 470, 380, 300][k], amp = [120, 170, 230, 300][k], sc = [260, 330, 420, 520][k], seed = 70 + k * 9;
  const ys = []; for (let x = 0; x <= w; x += 6) ys.push([x, base - amp * Math.pow(fbm2(x / sc, 0.5, 4, seed), 1.6) * 1.8 + amp * 0.35]);
  const tone = [0.30, 0.45, 0.62, 0.8][k];
  c.beginPath(); c.moveTo(0, h); ys.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(w, h); c.closePath();
  const g = c.createLinearGradient(0, base - amp, 0, base + 260);
  g.addColorStop(0, `rgba(30,28,26,${tone})`); g.addColorStop(0.45, `rgba(60,58,54,${tone * 0.55})`); g.addColorStop(1, 'rgba(90,88,84,0)');
  c.fillStyle = g; c.fill();
  c.save(); c.clip(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.35; c.fillStyle = c.createPattern(TEX.mottle, 'repeat'); c.fillRect(0, 0, w, h); c.restore();
  brush(c, ys.map(([x, y]) => [x, y + 2]), { w: 7 - k, color: '#1A1816', alpha: tone * 0.9, taper: [0, 0], dry: 0.55, seed: seed + 3, press: 0.6 });
  return cv;
}

// ───────────── shared painting helpers ─────────────
const rnd = (i, k, seed = 0) => hash2(i * 1.618 + seed * 7.13, k * 2.414 + seed * 0.31);
function clouds(c, tex, s, sp, a, z = 1.2, oy = 0) {
  const tw = tex.width * z * U * 1.6, th = tex.height * z * U * 1.6, ox = -((s * sp * U) % tw);
  c.save(); c.globalAlpha *= a;
  for (let x = ox - tw; x < W + tw; x += tw) for (let y = -th + oy; y < H + th; y += th) c.drawImage(tex, x, y, tw, th);
  c.restore();
}
function nightSky(c, s, o = {}) {
  L.bg(C.night); coverTex(c, TEX.night, -s * 6 * U, 0, 1.15);
  clouds(c, TEX.cloudGrey, s, o.sp || 18, o.grey ?? 0.35, 1.3);
  clouds(c, TEX.cloudDark, s + 40, (o.sp || 18) * 1.7, o.dark ?? 0.5, 0.9);
}
function paperBg(c, s) { L.bg(C.paper); coverTex(c, TEX.paper, -s * 3 * U, 0, 1.08); }
function glowDot(e, x, y, r, col, a) { const g = e.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); e.fillStyle = g; e.fillRect(x - r, y - r, 2 * r, 2 * r); }
// drifting gold leaf
function goldDrift(c, e, s, n, seed, box, o = {}) {
  const [x0, y0, x1, y1] = box;
  for (let i = 0; i < n; i++) {
    const life = 5 + rnd(i, 1, seed) * 5, ph = (s / life + rnd(i, 2, seed)) % 1;
    const x = lerp(x0, x1, rnd(i, 3, seed)) + Math.sin(s * 0.8 + i) * 40 * U + (o.wind || 0) * ph * U, y = lerp(y0, y1, (rnd(i, 4, seed) + ph * (o.fall ?? 0.35)) % 1);
    const a = Math.sin(ph * Math.PI) * (o.a ?? 1);
    const b = goldLeaf(c, x, y, (5 + rnd(i, 5, seed) * 9) * U, s * (0.6 + rnd(i, 6, seed)) + i, s * (1.5 + rnd(i, 7, seed) * 2) + i, seed * 100 + i, { alpha: a });
    if (e && b > 0.85) { e.save(); e.globalAlpha = a * 0.8; glowDot(e, x, y, 16 * U, 'rgba(255,215,140,A)', 0.8); e.restore(); }
  }
}
// petals: vermilion, tumbling
function petals(c, s, n, seed, box, o = {}) {
  const [x0, y0, x1, y1] = box;
  for (let i = 0; i < n; i++) {
    const ph = (s * (o.speed ?? 0.12) + rnd(i, 1, seed)) % 1, x = lerp(x0, x1, (rnd(i, 2, seed) + ph * (o.drift ?? -0.3) + 1) % 1) + Math.sin(s * 1.3 + i) * 30 * U;
    const y = lerp(y0, y1, (rnd(i, 3, seed) + ph) % 1), r = (7 + rnd(i, 4, seed) * 8) * U, a = Math.sin(ph * Math.PI) * (o.a ?? 1);
    c.save(); c.translate(x, y); c.rotate(s * 1.7 + i); c.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(s * 2.3 + i)));
    c.globalAlpha *= a; c.fillStyle = rnd(i, 5, seed) < 0.3 ? C.vermHi : C.verm; c.beginPath(); c.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); c.fill(); c.restore();
  }
}
// fine water-wave lines (ref 1)
function waveLines(c, s, box, o = {}) {
  const [x0, y0, x1, y1] = box, n = o.n || 34;
  c.save(); c.strokeStyle = o.color || 'rgba(96,92,86,0.32)'; c.lineWidth = (o.w || 1.3) * U;
  for (let k = 0; k < n; k++) {
    const yb = lerp(y0, y1, k / (n - 1)), amp = (10 + 22 * rnd(k, 1, 5)) * U, f = 0.004 / U * (0.7 + rnd(k, 2, 5)), ph = s * (0.35 + 0.3 * rnd(k, 3, 5)) + k;
    c.beginPath(); let pen = false;
    for (let x = x0; x <= x1; x += 8 * U) {
      const gap = vnoise(x / (140 * U), k * 3.1, 9) < 0.28;
      const y = yb + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 - ph * 1.3) * amp * 0.35;
      if (gap) { pen = false; continue; } pen ? c.lineTo(x, y) : c.moveTo(x, y); pen = true;
    }
    c.stroke();
  }
  c.restore();
}
// lightning bolt with glow
function lightning(c, e, x0, y0, x1, y1, seed, a) {
  if (a <= 0) return;
  const pts = boltPts(x0, y0, x1, y1, seed, 0.2, 6);
  c.save(); c.globalAlpha *= Math.min(1, a);
  brush(c, pts, { w: 7 * U, color: '#F4F3FF', taper: [0.02, 0.5], dry: 0.3, seed, press: 0.6 });
  const R = rng(seed + 3);
  for (let b = 0; b < 3; b++) { const i = Math.floor(pts.length * (0.25 + R() * 0.5)), [bx, by] = pts[i]; brush(c, boltPts(bx, by, bx + (R() - 0.5) * 300 * U, by + (120 + R() * 200) * U, seed + b + 9, 0.25, 5), { w: 3 * U, color: '#E9E8F5', taper: [0.02, 0.7], dry: 0.4, seed: seed + b }); }
  c.restore();
  e.save(); e.globalAlpha = Math.min(1, a); e.strokeStyle = 'rgba(200,210,255,0.9)'; e.lineWidth = 18 * U; e.lineJoin = 'round'; e.beginPath(); pts.forEach(([x, y], i) => i ? e.lineTo(x, y) : e.moveTo(x, y)); e.stroke(); e.restore();
}
// irregular expanding ink bloom used as a transition mask
function bloomClip(cx, cy, r, seed) {
  L.clipPath(c => {
    for (let b = 0; b < 5; b++) {
      const bx = cx + (rnd(b, 1, seed) - 0.5) * r * 0.5, by = cy + (rnd(b, 2, seed) - 0.5) * r * 0.5, br = r * (0.55 + 0.45 * rnd(b, 3, seed));
      for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, k = 1 + 0.28 * (vnoise(Math.cos(a) * 2 + b * 7, Math.sin(a) * 2, seed) - 0.5) * 2; const x = bx + Math.cos(a) * br * k, y = by + Math.sin(a) * br * k; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.closePath();
    }
  });
}

// ───────────── vertical calligraphy lyrics ─────────────
function lyricCol(c, e, li, s, o = {}) {
  const line = LYR[li], chars = Array.from(line.text), size = (o.size || pick(86, 92)) * U, step = size * 1.1;
  const x = o.x, y0 = o.y ?? pick(SY(0.13), SY(0.1)), col = o.color || '#F2EFE8', out = o.out ?? 1;
  if (out <= 0) return;
  c.save(); c.globalAlpha *= out;
  const sp = inv(line.t[0] - 0.4, line.t[0], s);              // chapter seal above the column
  if (sp > 0) { c.save(); c.globalAlpha *= sp; c.fillStyle = C.verm; c.fillRect(x - size * 0.22, y0 - size * 1.05, size * 0.44, size * 0.44); c.fillStyle = '#F6E9DC'; c.font = `400 ${size * 0.3}px ${FONT.brush}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('一二三四五六'[li], x, y0 - size * 0.83); c.restore(); }
  c.font = `400 ${size}px ${FONT.brush}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col;
  chars.forEach((ch, i) => {
    const t0 = line.t[i] - 0.06, p = inv(t0, t0 + 0.3, s); if (p <= 0) return;
    const cy = y0 + i * step, sc = o.scatter ? o.scatter(i) : null;
    c.save();
    if (sc) { c.translate(sc.dx, sc.dy); c.globalAlpha *= sc.a; c.translate(x, cy); c.rotate(sc.r); c.translate(-x, -cy); }
    c.beginPath(); c.rect(x - size, cy - size * 0.62, size * 2, size * 1.24 * E.outCubic(p)); c.clip();
    if (o.halo) { c.shadowColor = o.halo; c.shadowBlur = 18 * U; }
    const ga = c.globalAlpha; c.globalAlpha = ga * 0.35; c.filter = `blur(${3 * U}px)`; c.fillText(ch, x, cy + 2 * U);
    c.filter = 'none'; c.globalAlpha = ga; c.fillText(ch, x, cy);
    c.restore();
    if (o.glow && e) { e.save(); e.globalAlpha = 0.35 * p * out * (sc ? sc.a : 1); e.font = c.font; e.textAlign = 'center'; e.textBaseline = 'middle'; e.fillStyle = o.glow; e.fillText(ch, x + (sc ? sc.dx : 0), cy + (sc ? sc.dy : 0)); e.restore(); }
  });
  c.restore();
}

// ───────────── small figures (in-scene, by path) ─────────────
function pairSil(c, x, y, h, s, flash) {
  const ink = '#0D0C0C';
  const him = `M${-0.06 * h} ${-0.84 * h} a${0.07 * h} ${0.075 * h} 0 1 1 ${0.12 * h} 0 a${0.07 * h} ${0.075 * h} 0 1 1 ${-0.12 * h} 0 Z`;
  const hx = 0.42 * h;
  const herBody = `M${hx - 0.1 * h} ${-0.66 * h} C${hx - 0.16 * h} ${-0.4 * h} ${hx - 0.2 * h} ${-0.1 * h} ${hx - 0.26 * h} 0 L${hx + 0.3 * h + Math.sin(s * 2) * 0.03 * h} ${-0.02 * h} C${hx + 0.22 * h} ${-0.2 * h} ${hx + 0.14 * h} ${-0.45 * h} ${hx + 0.1 * h} ${-0.66 * h} Z`;
  const herSleeve = `M${hx + 0.08 * h} ${-0.6 * h} C${hx + 0.3 * h} ${-0.55 * h + Math.sin(s * 3) * 0.02 * h} ${hx + 0.46 * h} ${-0.5 * h} ${hx + 0.6 * h} ${-0.42 * h + Math.sin(s * 3.4) * 0.03 * h} C${hx + 0.44 * h} ${-0.4 * h} ${hx + 0.24 * h} ${-0.42 * h} ${hx + 0.06 * h} ${-0.46 * h} Z`;
  const herHead = `M${hx - 0.058 * h} ${-0.74 * h} a${0.058 * h} ${0.064 * h} 0 1 1 ${0.116 * h} 0 a${0.058 * h} ${0.064 * h} 0 1 1 ${-0.116 * h} 0 Z M${hx - 0.04 * h} ${-0.82 * h} a${0.04 * h} ${0.036 * h} 0 1 1 ${0.08 * h} 0 a${0.04 * h} ${0.036 * h} 0 1 1 ${-0.08 * h} 0 Z`;
  const hisBody = `M${-0.16 * h} ${-0.74 * h} C${-0.2 * h} ${-0.5 * h} ${-0.24 * h} ${-0.2 * h} ${-0.3 * h} 0 L${0.26 * h} 0 C${0.2 * h} ${-0.2 * h} ${0.17 * h} ${-0.5 * h} ${0.16 * h} ${-0.74 * h} C${0.08 * h} ${-0.78 * h} ${-0.08 * h} ${-0.78 * h} ${-0.16 * h} ${-0.74 * h} Z`;
  const bun = `M${-0.035 * h} ${-0.94 * h} a${0.035 * h} ${0.035 * h} 0 1 1 ${0.07 * h} 0 a${0.035 * h} ${0.035 * h} 0 1 1 ${-0.07 * h} 0 Z`;
  c.save(); c.translate(x, y);
  if (flash > 0) {                                        // lightning rim: the silhouettes lit from above
    c.save(); c.globalAlpha *= Math.min(1, flash); c.fillStyle = '#F2F2FA'; c.translate(0, -3 * U);
    [herBody, herSleeve, herHead, hisBody, bun, him].forEach(d => c.fill(new Path2D(d))); c.restore();
  }
  c.fillStyle = ink;
  [herBody, herSleeve, herHead].forEach(d => c.fill(new Path2D(d)));
  const rs = []; for (let i = 0; i <= 24; i++) { const u = i / 24; rs.push([hx + 0.02 * h + u * 0.8 * h, -0.84 * h + Math.sin(u * 7 - s * 5) * 0.05 * h * u + u * 0.1 * h]); }
  ribbonDraw(c, rs, { w: 0.03 * h, twist: s * 2, twistF: 1.6, taperEnd: 0.7 });
  c.fillStyle = ink; [hisBody, bun, him].forEach(d => c.fill(new Path2D(d)));
  c.fillStyle = C.gold; c.fillRect(-0.04 * h, -0.925 * h, 0.08 * h, 0.018 * h);
  c.fillStyle = '#3A2E18'; c.beginPath(); c.ellipse(-0.14 * h, -0.72 * h, 0.07 * h, 0.035 * h, -0.3, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0.14 * h, -0.72 * h, 0.07 * h, 0.035 * h, 0.3, 0, TAU); c.fill();
  c.restore();
  drawRake(c, x + 0.24 * h, y + 0.02 * h, x + 0.24 * h, y - 1.28 * h, { head: 0.3 * h, tine: 0.17 * h, stars: 1, seed: 7 });
}
function walker(c, x, y, h, s) {
  const ph = s * 5.2, bob = Math.abs(Math.sin(ph)) * 0.02 * h, ink = '#141312';
  const ex = 0.62 * h, ey = -1.18 * h;
  drawRake(c, x - 0.3 * h, y - bob + 0.02 * h, x + ex, y - bob + ey, { head: 0.36 * h, tine: 0.2 * h, stars: 0, seed: 11 });
  c.save(); c.translate(x, y - bob);
  const rs = []; for (let i = 0; i <= 22; i++) { const u = i / 22; rs.push([ex - 0.08 * h - u * 0.9 * h, ey + 0.1 * h + Math.sin(u * 6 - s * 6) * 0.07 * h * u + u * 0.25 * h]); }
  ribbonDraw(c, rs, { w: 0.05 * h, twist: s * 2.4, twistF: 1.3, taperEnd: 0.65 });
  const l1 = Math.sin(ph) * 0.08 * h;
  c.fillStyle = ink;
  c.fill(new Path2D(`M${-0.13 * h} ${-0.7 * h} C${-0.16 * h} ${-0.45 * h} ${-0.2 * h} ${-0.2 * h} ${-0.2 * h + l1 * 0.3} 0 L${0.2 * h - l1 * 0.3} 0 C${0.18 * h} ${-0.2 * h} ${0.15 * h} ${-0.45 * h} ${0.13 * h} ${-0.7 * h} C${0.06 * h} ${-0.75 * h} ${-0.06 * h} ${-0.75 * h} ${-0.13 * h} ${-0.7 * h} Z`));
  c.beginPath(); c.ellipse(0, -0.81 * h, 0.065 * h, 0.075 * h, 0, 0, TAU); c.fill();
  c.beginPath(); c.arc(0, -0.905 * h, 0.035 * h, 0, TAU); c.fill();
  c.restore();
}

// ───────────── the wheel of heaven's way ─────────────
const TRIGRAMS = ['111', '011', '101', '001', '110', '010', '100', '000'];
function wheel(c, e, cx, cy, r, rot, a, crack = 0) {
  if (a <= 0) return;
  for (const [ctx, isE] of [[c, false], [e, true]]) {
    ctx.save(); ctx.globalAlpha *= a * (isE ? 0.55 : 1); ctx.translate(cx, cy);
    ctx.strokeStyle = isE ? 'rgba(255,205,120,1)' : C.gold; ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = (isE ? 4 : 2) * U;
    for (const [k, rr] of [[0, 1], [1, 0.93], [2, 0.74], [3, 0.66], [4, 0.46], [5, 0.4], [6, 0.16]]) {
      const segs = 1 + Math.floor(crack * 9); ctx.save(); ctx.rotate(rot * [1, 1, -0.6, -0.6, 1.4, 1.4, -2][k]);
      for (let sgi = 0; sgi < segs; sgi++) { const a0 = sgi / segs * TAU + 0.05 * crack, a1 = (sgi + 1) / segs * TAU - 0.05 * crack; const off = crack * 30 * U * rnd(sgi, k, 3); ctx.beginPath(); ctx.arc(Math.cos((a0 + a1) / 2) * off, Math.sin((a0 + a1) / 2) * off, rr * r, a0, a1); ctx.stroke(); }
      ctx.restore();
    }
    if (!isE) {
      ctx.save(); ctx.rotate(rot);                       // 28 lunar mansions: ticks and star dots between the outer rings
      for (let i = 0; i < 28; i++) { const a0 = i / 28 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a0) * r * 0.93, Math.sin(a0) * r * 0.93); ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); ctx.stroke();
        for (let j = 0; j < 3; j++) { const aa = a0 + (j + 1) / 4 * TAU / 28, rr = r * (0.945 + 0.04 * rnd(i, j, 4)); ctx.beginPath(); ctx.arc(Math.cos(aa) * rr, Math.sin(aa) * rr, 2.2 * U, 0, TAU); ctx.fill(); } }
      ctx.restore();
      ctx.save(); ctx.rotate(-rot * 0.6);                  // eight trigrams
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i / 8 * TAU); ctx.translate(0, -r * 0.83);
        for (let j = 0; j < 3; j++) { const yy = (j - 1) * 13 * U, wd = 46 * U; if (TRIGRAMS[i][j] === '1') ctx.fillRect(-wd / 2, yy - 3 * U, wd, 6 * U); else { ctx.fillRect(-wd / 2, yy - 3 * U, wd * 0.42, 6 * U); ctx.fillRect(wd * 0.08, yy - 3 * U, wd * 0.42, 6 * U); } }
        ctx.restore(); }
      ctx.restore();
      ctx.save(); ctx.rotate(rot * 1.4); ctx.font = `400 ${30 * U}px ${FONT.serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      Array.from('子丑寅卯辰巳午未申酉戌亥').forEach((ch, i) => { ctx.save(); ctx.rotate(i / 12 * TAU); ctx.fillText(ch, 0, -r * 0.56); ctx.restore(); });
      ctx.restore();
    }
    ctx.restore();
  }
  const g = e.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1); g.addColorStop(0, `rgba(255,200,120,${0.25 * a})`); g.addColorStop(1, 'rgba(255,200,120,0)'); e.fillStyle = g; e.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4);
}

// ───────────── the heavenly gate ─────────────
function heavenGate(c, e, cx, by, u, s, lit) {
  c.save(); c.translate(cx, by); c.scale(u, u);
  const ink = '#16151A', tier = (y, w, hgt) => `M${-w / 2 - 40} ${y} C${-w / 2 - 10} ${y - 6} ${-w / 2 + 30} ${y - hgt * 0.3} ${-w * 0.2} ${y - hgt * 0.75} L${w * 0.2} ${y - hgt * 0.75} C${w / 2 - 30} ${y - hgt * 0.3} ${w / 2 + 10} ${y - 6} ${w / 2 + 40} ${y} C${w / 2 + 50} ${y - 16} ${w / 2 + 58} ${y - 26} ${w / 2 + 64} ${y - 34} C${w / 2 + 40} ${y - 18} ${w / 2 + 10} ${y + 4} ${w / 2 - 10} ${y + 16} L${-w / 2 + 10} ${y + 16} C${-w / 2 - 10} ${y + 4} ${-w / 2 - 40} ${y - 18} ${-w / 2 - 64} ${y - 34} C${-w / 2 - 58} ${y - 26} ${-w / 2 - 50} ${y - 16} ${-w / 2 - 40} ${y} Z`;
  c.fillStyle = ink;
  c.fillRect(-420, -40, 840, 60); c.fillRect(-380, -80, 760, 44);             // platform
  for (const px of [-300, -130, 130, 300]) c.fillRect(px - 26, -420, 52, 360);  // pillars
  c.fillRect(-340, -440, 680, 50);                                             // lintel
  c.fill(new Path2D(tier(-470, 820, 150))); c.fillRect(-250, -640, 500, 60); c.fill(new Path2D(tier(-640, 600, 130)));
  c.fillRect(-150, -790, 300, 50); c.fill(new Path2D(tier(-790, 380, 110)));
  c.globalAlpha = 0.9; c.strokeStyle = C.gold; c.lineWidth = 3;
  [[-470, 820], [-640, 600], [-790, 380]].forEach(([y, w]) => { c.beginPath(); c.moveTo(-w / 2 - 50, y - 26); c.quadraticCurveTo(0, y - 20, w / 2 + 50, y - 26); c.stroke(); });
  c.fillStyle = C.gold; c.fillRect(-90, -560, 180, 70); c.fillStyle = ink; c.font = `400 44px ${FONT.brush}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('南天门', 0, -524);
  c.restore();
  if (lit > 0) { e.save(); e.globalAlpha = Math.min(1, lit); glowDot(e, cx, by - 520 * u, 420 * u, 'rgba(255,215,150,A)', 0.35); e.restore(); }
}

// ───────────── scenes ─────────────
function vText(c, str, x, y, size) {                  // vertical text; latin runs are rotated like book spines
  let yy = y; const parts = str.split(/([A-Za-z0-9 .]+)/).filter(Boolean);
  for (const p of parts) {
    if (/^[A-Za-z0-9 .]+$/.test(p)) { const w = c.measureText(p.trim()).width; if (!p.trim()) { yy += size * 0.4; continue; } c.save(); c.translate(x, yy + w / 2); c.rotate(Math.PI / 2); c.fillText(p.trim(), 0, 0); c.restore(); yy += w + size * 0.3; }
    else for (const ch of p) { c.fillText(ch, x, yy); yy += size * 1.18; }
  }
}
function seal(c, x, y, sz, txt, a, k = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x + sz / 2, y + sz / 2); c.scale(k, k);
  c.fillStyle = C.verm; c.beginPath(); c.moveTo(-sz / 2, -sz / 2 + 2); c.lineTo(sz / 2 - 1, -sz / 2); c.lineTo(sz / 2, sz / 2 - 2); c.lineTo(-sz / 2 + 2, sz / 2); c.closePath(); c.fill();
  c.fillStyle = '#F7EDE3'; c.font = `400 ${sz * 0.4}px ${FONT.brush}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const ch = Array.from(txt); if (ch.length === 2) { c.fillText(ch[0], 0, -sz * 0.2); c.fillText(ch[1], 0, sz * 0.22); } else c.fillText(txt, 0, 0);
  c.fillStyle = 'rgba(247,237,227,0.55)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc((rnd(i, 1, 9) - 0.5) * sz * 0.95, (rnd(i, 2, 9) - 0.5) * sz * 0.95, 0.6 + rnd(i, 3, 9) * 1.6, 0, TAU); c.fill(); }
  c.restore();
}

// 00 · story opening: ink drop → the rake → six luminaries and five stars → the spirit is born → title
function sceneOpen(t) {
  const c = L.c, e = L.e;
  paperBg(c, t);
  const dp = inv(0.3, 0.55, t), cx = SX(0.5), cy = SY(pick(0.52, 0.55));
  if (dp > 0 && dp < 1) { c.fillStyle = C.ink; c.beginPath(); c.ellipse(cx, lerp(-20, cy, E.inQuad(dp)), 7 * U, 11 * U, 0, 0, TAU); c.fill(); }
  const br = E.outCubic(inv(0.5, 1.6, t)) * Math.hypot(W, H) * 0.8;
  if (br <= 0) return;
  L.save(); bloomClip(cx, cy, br, 3);
  nightSky(c, t, { grey: 0.25, dark: 0.4 });
  const ra = E.outCubic(inv(0.9, 2.0, t)), rx0 = SX(pick(0.2, 0.08)), rx1 = SX(pick(0.74, 0.86)), ry = SY(pick(0.8, 0.74));
  drawRake(c, rx0, ry + 8 * U, rx1, ry - 10 * U, { head: pick(260, 240) * U, tine: pick(150, 130) * U, alpha: ra, stars: inv(1.2, 2.3, t), glow: 1, e, seed: 21 });
  const sp = inv(1.9, 3.6, t);
  if (sp > 0) {
    for (let i = 0; i < 140; i++) {
      const life = 1.6 + rnd(i, 1, 8) * 1.4, ph = ((t - 1.9) / life + rnd(i, 2, 8)) % 1, u0 = rnd(i, 3, 8);
      const x = lerp(rx1 - 140 * U, rx1 + 40 * U, u0) + Math.sin(ph * 6 + i) * 60 * U * ph, y = ry - 20 * U - ph * SY(0.5) * (0.6 + 0.4 * rnd(i, 4, 8));
      splat(c, x, y, (3 + 10 * rnd(i, 5, 8)) * U * (1 - ph * 0.6), i + 40, { alpha: 0.75 * Math.sin(ph * Math.PI) * sp * (1 - inv(5.3, 5.9, t)), drops: 2, spray: 3 });
    }
    const gs = pick(H / 1400 * 0.95, W / 1400 * 1.1), ga = E.inOutQuad(inv(2.2, 3.6, t)) * (1 - inv(5.3, 5.9, t));
    const gx = pick(SX(0.56), SX(0.5)) - 700 * gs, gy = SY(pick(0.0, 0.05));
    c.save(); c.globalAlpha = ga * 0.9; c.beginPath(); c.rect(0, lerp(ry, -SY(0.2), E.outCubic(inv(2.0, 3.6, t))), W, H); c.clip(); c.drawImage(FIG.herGhost, gx, gy, 1400 * gs, 1400 * gs); c.restore();
    e.save(); e.globalAlpha = ga * 0.35; e.drawImage(FIG.herGhost, gx, gy, 1400 * gs, 1400 * gs); e.restore();
  }
  goldDrift(c, e, t, 26, 5, [0, 0, W, H], { a: inv(1.4, 2.4, t) });
  // epigraph, written column by column
  const ep = ['美人不是凡胎生', '应是仙器灵长成'], ex = pick([SX(0.2), SX(0.14)], [SX(0.2), SX(0.1)]), es = pick(58, 60) * U;
  c.save(); c.font = `400 ${es}px ${FONT.brush}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#EDEBE4'; c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 14 * U;
  ep.forEach((col, k) => Array.from(col).forEach((ch, i) => { const t0 = 2.0 + k * 0.75 + i * 0.1, p = inv(t0, t0 + 0.25, t) * (1 - inv(5.3, 5.8, t)); if (p <= 0) return;
    const yy = SY(pick(0.16, 0.12)) + i * es * 1.12; c.save(); c.globalAlpha = p; c.beginPath(); c.rect(ex[k] - es, yy - es * 0.6, es * 2, es * 1.2 * inv(t0, t0 + 0.25, t)); c.clip(); c.fillText(ch, ex[k], yy); c.restore(); }));
  c.restore();
  // title and inscriptions
  const tx = pick(SX(0.84), SX(0.8)), ty = SY(pick(0.08, 0.12)), ts = pick(170, 190) * U;
  c.save(); c.font = `400 ${ts}px ${FONT.xing}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  Array.from('大天蓬').forEach((ch, i) => { const t0 = 3.5 + i * 0.28, p = inv(t0, t0 + 0.35, t) * (1 - inv(5.4, 5.9, t)); if (p <= 0) return;
    const yy = ty + i * ts * 1.02 + ts * 0.5; c.save(); c.beginPath(); c.rect(tx - ts, yy - ts * 0.6, ts * 2, ts * 1.2 * inv(t0, t0 + 0.35, t)); c.clip();
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 20 * U; c.fillStyle = '#F4F1E8'; c.globalAlpha = p; c.fillText(ch, tx, yy); c.restore();
    e.save(); e.globalAlpha = 0.25 * p; e.font = c.font; e.textAlign = 'center'; e.textBaseline = 'middle'; e.fillStyle = '#FFE6B0'; e.fillText(ch, tx, yy); e.restore(); });
  c.restore();
  const sealP = inv(4.45, 4.6, t) * (1 - inv(5.4, 5.9, t));
  if (sealP > 0) { const sz = 64 * U; seal(c, tx - sz / 2 + ts * 0.46, ty + ts * 3.2, sz, '天蓬', sealP, 1 + (1 - E.outBack(inv(4.45, 4.6, t))) * 0.6); }
  const cr = inv(4.7, 5.2, t) * (1 - inv(5.45, 5.9, t));
  if (cr > 0) {
    c.save(); c.globalAlpha = cr; c.fillStyle = 'rgba(236,233,226,0.88)'; c.font = `400 ${22 * U}px ${FONT.serif}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 8 * U;
    vText(c, '栋森网络科技 出品', tx - ts * 0.72, ty + ts * 0.4, 22 * U);
    vText(c, 'AI 创作 · Claude Opus 5.5', tx - ts * 0.72 - 36 * U, ty + ts * 0.4, 22 * U);
    c.font = `400 ${20 * U}px ${FONT.serif}`; c.fillStyle = 'rgba(236,233,226,0.72)'; c.fillText('概念练手 · 非官方', SX(0.5), SY(0.95));
    c.restore();
  }
  L.restore();
}

// 01 · 惹得天怒地也恼 — the storm at the southern gate
function sceneS2(s) {
  const c = L.c, e = L.e;
  const f1 = s >= 1.5 ? Math.exp(-(s - 1.5) * 7) : 0, f2 = s >= 1.92 ? Math.exp(-(s - 1.92) * 6) : 0, flash = Math.max(f1, f2);
  const quake = s > 2.5 ? Math.exp(-(s - 2.5) * 2.2) * (1 + 0.6 * (s > 2.94) + 0.6 * (s > 3.24)) : 0;
  const shx = quake * 10 * U * Math.sin(s * 71), shy = quake * 8 * U * Math.cos(s * 57);
  const z = 1 + 0.06 * E.inOutQuad(inv(0, 4.1, s));
  L.save(); L.translate(W / 2 + shx, H / 2 + shy); L.scale(z); L.translate(-W / 2, -H / 2);
  nightSky(c, s, { grey: 0.4 + flash * 0.4, dark: 0.55, sp: 34 });
  heavenGate(c, e, SX(0.5), SY(pick(0.66, 0.6)), pick(0.62, 0.58) * U, s, 0.3 + flash);
  lightning(c, e, SX(pick(0.3, 0.25)), -20, SX(pick(0.42, 0.44)), SY(0.38), 101, f1 * 1.2);
  lightning(c, e, SX(pick(0.72, 0.78)), -20, SX(pick(0.6, 0.56)), SY(0.44), 202, f2 * 1.2);
  clouds(c, TEX.cloudLight, s + 9, 60, 0.14 + flash * 0.3, 1.1, SY(0.35));
  c.save(); const fg = c.createLinearGradient(0, SY(0.72), 0, H); fg.addColorStop(0, 'rgba(40,40,46,0)'); fg.addColorStop(0.4, 'rgba(24,24,28,0.85)'); fg.addColorStop(1, 'rgba(12,12,14,1)'); c.fillStyle = fg; c.fillRect(0, SY(0.72), W, H * 0.3); c.restore();
  const fis = inv(2.5, 3.6, s);
  if (fis > 0) for (let k = 0; k < 5; k++) { const pts = boltPts(SX(0.5 + (k - 2) * 0.12), SY(0.99), SX(0.5 + (k - 2) * 0.2 + (rnd(k, 1, 4) - 0.5) * 0.1), SY(0.8), 400 + k, 0.3, 5);
    brush(c, pts, { w: 5 * U, color: C.vermHi, alpha: fis, reveal: fis, taper: [0.05, 0.4], dry: 0.3, seed: 410 + k });
    e.save(); e.globalAlpha = fis * 0.8; e.strokeStyle = 'rgba(255,120,60,1)'; e.lineWidth = 14 * U; e.beginPath(); pts.slice(0, Math.max(2, Math.floor(pts.length * fis))).forEach(([x, y], i) => i ? e.lineTo(x, y) : e.moveTo(x, y)); e.stroke(); e.restore(); }
  pairSil(c, SX(pick(0.46, 0.42)), SY(pick(0.95, 0.9)), pick(0.34, 0.24) * H, s, flash);
  goldDrift(c, e, s, 34, 12, [0, 0, W, H], { wind: 300, fall: 0.2, a: 0.9 });
  L.restore();
  lyricCol(c, e, 0, s, { x: pick(SX(0.9), SX(0.88)), halo: 'rgba(0,0,0,0.8)', glow: '#FFE0A8', out: 1 - inv(CUT.s3 - 0.25, CUT.s3, s) });
  return { flash: flash * 0.55 };
}

// 02 · 人间再无红颜笑 — her, looking back; she dissolves into petals and white ink
let HER_TMP = null, HER_MASK = null;
function sceneS3(s) {
  const c = L.c, e = L.e, ls = s - CUT.s3;
  paperBg(c, s);
  waveLines(c, s, [-SX(0.05), SY(0.05), SX(1.05), SY(0.98)], { n: pick(30, 44) });
  const gs = pick(H / 1400 * 1.32, W / 1400 * 1.3) * (1 + 0.05 * E.inOutQuad(inv(0, 4, ls))), fx = pick(SX(0.56), SX(0.52)), fy = pick(SY(0.44), SY(0.36));
  const ox = fx - 618 * gs, oy = fy - 504 * gs;
  const dis = E.inCubic(inv(5.1, 7.9, s));
  if (!HER_TMP) HER_TMP = mk(1400, 1400);
  const t2 = HER_TMP.getContext('2d'); t2.setTransform(1, 0, 0, 1, 0, 0); t2.globalCompositeOperation = 'source-over'; t2.globalAlpha = 1; t2.clearRect(0, 0, 1400, 1400); t2.drawImage(FIG.her, 0, 0);
  const bun = [HER_HEAD.px + HER_HEAD.dx + (905 - HER_HEAD.px) * HER_HEAD.s, HER_HEAD.py + HER_HEAD.dy + (318 - HER_HEAD.py) * HER_HEAD.s];
  for (let k = 0; k < 2; k++) { const rs = []; for (let i = 0; i <= 30; i++) { const u = i / 30; rs.push([bun[0] + u * (380 + k * 60), bun[1] + u * (140 + k * 200) + Math.sin(u * 5 - s * 3.2 + k) * 40 * u]); } ribbonDraw(t2, rs, { w: 22 - k * 4, twist: s * 1.5 + k, twistF: 1.4, taperEnd: 0.5 }); }
  if (dis > 0) {                                             // soft erosion front sweeping from her back towards her face
    const front = 1420 - dis * 1180, m = HER_MASK || (HER_MASK = mk(350, 350)), mc = m.getContext('2d');
    mc.setTransform(1, 0, 0, 1, 0, 0); mc.filter = 'none'; mc.clearRect(0, 0, 350, 350);
    mc.filter = 'blur(5px)'; mc.fillStyle = '#000'; mc.scale(0.25, 0.25);
    mc.fillRect(front + 150, -50, 1600, 1500);
    for (let i = 0; i < 90; i++) { const x = front + (rnd(i, 1, 2) - 0.25) * 320, y = rnd(i, 3, 2) * 1400; blob(mc, x, y, 40 + 90 * rnd(i, 4, 2), i + 3, 0.45, 12); }
    mc.setTransform(1, 0, 0, 1, 0, 0); mc.filter = 'none';
    t2.globalCompositeOperation = 'destination-out'; t2.drawImage(m, 0, 0, 1400, 1400); t2.globalCompositeOperation = 'source-over';
  }
  c.drawImage(HER_TMP, ox, oy, 1400 * gs, 1400 * gs);
  if (dis > 0) for (let i = 0; i < 120; i++) {               // white ink peeling off the erosion front
    const ph = (ls * 0.35 + rnd(i, 1, 6)) % 1, x = ox + (1420 - dis * 1180 + (rnd(i, 2, 6) - 0.3) * 260) * gs - ph * 320 * U, y = oy + rnd(i, 3, 6) * 1300 * gs - ph * 160 * U;
    splat(c, x, y, (3 + 7 * rnd(i, 4, 6)) * U, i + 80, { color: '#FBFAF6', alpha: dis * Math.sin(ph * Math.PI), drops: 2, spray: 3 });
  }
  petals(c, s, 26 + Math.floor(dis * 30), 31, [-SX(0.1), -SY(0.1), SX(1.1), SY(1.1)], { a: 0.35 + dis * 0.6, drift: -0.5 });
  lyricCol(c, e, 1, s, { x: pick(SX(0.14), SX(0.12)), color: '#1A1716', halo: 'rgba(240,235,222,0.9)', out: 1 - inv(CUT.s4 - 0.25, CUT.s4, s) });
  return {};
}

// 03 · 留一半相思上大道 — he walks the road west alone
function sceneS4(s) {
  const c = L.c, e = L.e, ls = s - CUT.s4;
  const rise = E.inOutCubic(inv(11.0, 13.6, s)), pan = ls * 12 * U;
  paperBg(c, s);
  L.save(); L.translate(0, rise * SY(0.22));
  const sunX = SX(pick(0.66, 0.6)), sunY = SY(pick(0.36, 0.34));
  c.save(); c.fillStyle = 'rgba(196,78,52,0.55)'; c.beginPath(); c.arc(sunX, sunY, pick(70, 80) * U, 0, TAU); c.fill(); c.restore();
  e.save(); glowDot(e, sunX, sunY, 240 * U, 'rgba(255,140,90,A)', 0.35); e.restore();
  const mw = pick(W * 1.25, H * 1.0) * 1.1;
  TEX.mtn.slice().reverse().forEach((m, j) => { const k = 3 - j, par = [1.0, 0.7, 0.45, 0.25][k], mh = mw * 900 / 2400, y = SY(0.3) + [0.24, 0.16, 0.08, 0.0][k] * H;
    c.drawImage(m, -((pan * par) % (mw * 0.4)) - mw * 0.05, y, mw, mh); });
  clouds(c, TEX.cloudLight, s, 20, 0.25, 1.4, SY(0.3));
  L.restore();
  L.save(); L.translate(0, rise * SY(0.1));
  const road = []; for (let i = 0; i <= 40; i++) { const u = i / 40; road.push([lerp(SX(0.5), sunX, u) + Math.sin(u * 7) * SX(0.12) * (1 - u), lerp(SY(1.05), SY(pick(0.64, 0.6)), Math.pow(u, 0.7))]); }
  for (let i = 0; i < road.length - 1; i++) { const u = i / 40, w = lerp(pick(260, 200), 6, Math.pow(u, 0.6)) * U;
    c.fillStyle = `rgba(246,242,232,${0.9 - u * 0.5})`; c.beginPath(); c.ellipse(road[i][0], road[i][1], w, w * 0.18, 0, 0, TAU); c.fill(); }
  brush(c, road.map(([x, y], i) => [x - lerp(pick(250, 190), 6, Math.pow(i / 40, 0.6)) * U, y]), { w: 3 * U, color: '#3B3733', alpha: 0.6, taper: [0, 0.5], dry: 0.5, seed: 61 });
  brush(c, road.map(([x, y], i) => [x + lerp(pick(250, 190), 6, Math.pow(i / 40, 0.6)) * U, y]), { w: 3 * U, color: '#3B3733', alpha: 0.6, taper: [0, 0.5], dry: 0.5, seed: 62 });
  const wu = 0.16 + 0.22 * inv(0, 6, ls), wi = Math.floor(wu * 40), wf = wu * 40 - wi, wp = [lerp(road[wi][0], road[wi + 1][0], wf), lerp(road[wi][1], road[wi + 1][1], wf)], wh = lerp(pick(210, 180), 60, wu) * U;
  walker(c, wp[0], wp[1], wh, s);
  for (let b = 0; b < 5; b++) { const bx = SX(0.2 + b * 0.09) + ls * 30 * U, by = SY(0.2 + 0.03 * Math.sin(b * 2)) - rise * SY(0.05), fl = Math.sin(s * 8 + b) * 6 * U; brush(c, [[bx - 14 * U, by - fl], [bx, by + 3 * U], [bx + 14 * U, by - fl]], { w: 2.4 * U, color: '#2A2724', taper: [0.3, 0.3], dry: 0.2, seed: 70 + b }); }
  L.restore();
  lyricCol(c, e, 2, s, { x: pick(SX(0.88), SX(0.88)), color: '#1A1716', halo: 'rgba(240,235,222,0.9)', out: 1 - inv(CUT.s5 - 0.25, CUT.s5, s) });
  return {};
}

// 04 · 怕什么天道轮回 / 05 · 什么魄散魂飞 — the wheel, the raised rake, the spirit, the shattering
function himLayout() { const gs = pick(H / 1600 * 0.98, H / 1600 * 0.62), ox = SX(0.5) - 560 * gs, oy = H - 1560 * gs; return { gs, ox, oy, hx: ox + HIM_BACK.hand[0] * gs, hy: oy + HIM_BACK.hand[1] * gs }; }
function sceneWheel(s) {
  const c = L.c, e = L.e;
  const hit = (t0, k = 6) => s >= t0 ? Math.exp(-(s - t0) * k) : 0;
  const pulse = hit(14.10) + hit(15.78) * 0.6 + hit(17.10) * 0.8 + hit(17.40);
  const burst1 = s >= 19.25 ? inv(19.25, 20.2, s) : 0, burst2 = s >= 20.76 ? inv(20.76, 21.9, s) : 0;
  const z = 1 + 0.08 * E.inOutQuad(inv(CUT.s5, CUT.s7, s)) + 0.02 * pulse;
  L.save(); L.translate(W / 2, H / 2); L.scale(z); L.translate(-W / 2, -H / 2);
  nightSky(c, s, { grey: 0.3, dark: 0.5, sp: 26 });
  const wr = pick(SY(0.42), SX(0.46)), wcx = SX(0.5), wcy = pick(SY(0.3), SY(0.26));
  const spin = s * 0.25 + E.inOutCubic(inv(17.0, 17.9, s)) * 2.2 + E.inCubic(inv(18.0, 19.3, s)) * 4;
  wheel(c, e, wcx, wcy, wr * (1 + 0.03 * pulse), spin, E.outCubic(inv(CUT.s5 - 0.2, CUT.s5 + 0.8, s)) * (1 - burst2), burst1);
  const H2 = himLayout();
  if (burst2 <= 0) {
    drawRake(c, H2.hx, H2.hy + 740 * H2.gs, H2.hx, H2.hy - 470 * H2.gs, { head: 380 * H2.gs, tine: 230 * H2.gs, stars: 1, glow: 0.6 + pulse, e, seed: 31 });
    c.drawImage(FIG.himBack, H2.ox, H2.oy, 1200 * H2.gs, 1600 * H2.gs);
  } else {                                                  // on 飞 he and his rake break into flying ink
    const cx = H2.hx, cy = H2.hy, sz = 7 * U * (1 - burst2 * 0.5);
    c.save(); c.globalAlpha = 1 - burst2 * 0.9;
    FIG.himPts.forEach(([px, py, col], i) => {
      const x = H2.ox + px * H2.gs, y = H2.oy + py * H2.gs, a = Math.atan2(y - cy, x - cx) + (rnd(i, 1, 3) - 0.5) * 1.2, d = E.outCubic(burst2) * (200 + 900 * rnd(i, 2, 3)) * U;
      const sw = burst2 * 2 * (rnd(i, 3, 3) - 0.5);
      c.fillStyle = col; c.fillRect(x + Math.cos(a + sw) * d, y + Math.sin(a + sw) * d - burst2 * 120 * U, sz, sz);
    });
    c.restore();
  }
  const sp = inv(18.0, 18.7, s) * (1 - burst1 * 0.7);        // the spirit coils up the shaft like a water dragon
  if (sp > 0 || burst1 > 0) {
    const base = [H2.hx, H2.hy + 500 * H2.gs], top = [H2.hx, H2.hy - 600 * H2.gs];
    for (let i = 0; i < 220; i++) {
      const u = (rnd(i, 1, 5) + s * 0.25) % 1, ang = u * 14 + s * 4 + i * 0.1, rad = (60 + 50 * Math.sin(u * 5)) * U;
      let x = lerp(base[0], top[0], u) + Math.cos(ang) * rad, y = lerp(base[1], top[1], u) + Math.sin(ang) * rad * 0.25;
      if (burst1 > 0) { const a = rnd(i, 2, 5) * TAU, d = E.outCubic(burst1) * (300 + 700 * rnd(i, 3, 5)) * U; x += Math.cos(a) * d; y += Math.sin(a) * d; }
      const a2 = (sp + burst1 * 0.8) * (1 - burst2) * (0.4 + 0.6 * rnd(i, 4, 5));
      if (a2 > 0.01) splat(c, x, y, (3 + 9 * rnd(i, 5, 5)) * U, i + 500, { color: '#F7F7F4', alpha: Math.min(1, a2), drops: 2, spray: 2 });
    }
    const ga = inv(18.5, 19.0, s) * (1 - inv(19.25, 19.6, s)), gs2 = pick(H / 1400 * 0.6, W / 1400 * 0.75);
    if (ga > 0) { c.save(); c.globalAlpha = ga * 0.6; c.drawImage(FIG.herGhost, H2.hx - 640 * gs2, H2.hy - 560 * gs2, 1400 * gs2, 1400 * gs2); c.restore(); e.save(); e.globalAlpha = ga * 0.3; e.drawImage(FIG.herGhost, H2.hx - 640 * gs2, H2.hy - 560 * gs2, 1400 * gs2, 1400 * gs2); e.restore(); }
  }
  goldDrift(c, e, s, 40, 17, [0, 0, W, H], { wind: 160 + burst1 * 900, fall: 0.25 });
  if (burst2 > 0) for (let i = 0; i < 160; i++) { const a = rnd(i, 1, 13) * TAU, d = E.outCubic(burst2) * (100 + 1200 * rnd(i, 2, 13)) * U; goldLeaf(c, H2.hx + Math.cos(a) * d, H2.hy + Math.sin(a) * d, (6 + 10 * rnd(i, 3, 13)) * U, s * 3 + i, s * 5 + i, 700 + i, { alpha: 1 - burst2 * 0.8 }); }
  L.restore();
  if (s < CUT.s6) lyricCol(c, e, 3, s, { x: pick(SX(0.1), SX(0.12)), halo: 'rgba(0,0,0,0.85)', glow: '#FFD48A', color: '#F6E7C4', out: 1 - inv(CUT.s6 - 0.25, CUT.s6, s) });
  else lyricCol(c, e, 4, s, { x: pick(SX(0.1), SX(0.12)), halo: 'rgba(0,0,0,0.85)', glow: '#FFFFFF', out: 1,
    scatter: i => { const p = E.inCubic(inv(21.0, 22.1, s)); return { dx: p * (300 + 400 * rnd(i, 1, 21)) * U, dy: -p * (200 + 300 * rnd(i, 2, 21)) * U, r: p * (rnd(i, 3, 21) - 0.5) * 2, a: 1 - p }; } });
  return { flash: 0.3 * hit(14.10, 9) + 0.25 * hit(17.40, 9) + 0.5 * hit(19.25, 7) + 0.6 * hit(20.76, 6) };
}

// 06 · 若没有你那才叫可悲 — gathered again under the moon
function embLayout() { const gs = pick(H / 1400 * 1.06, W / 1400 * 1.36), ox = SX(0.5) - 700 * gs, oy = pick(SY(0.56), SY(0.52)) - 700 * gs; return { gs, ox, oy }; }
function moonAndLovers(c, e, s, gather, o = {}) {
  const Lr = embLayout(), mx = Lr.ox + 700 * Lr.gs, my = Lr.oy + 520 * Lr.gs, mr = 500 * Lr.gs;
  nightSky(c, s, { grey: 0.25, dark: 0.35, sp: 10 });
  const g = c.createRadialGradient(mx, my, mr * 0.2, mx, my, mr); g.addColorStop(0, '#F3F1E8'); g.addColorStop(0.97, '#E2DFD4'); g.addColorStop(1, 'rgba(226,223,212,0)');
  c.save(); c.globalAlpha = o.moonA ?? 1; c.fillStyle = g; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.globalAlpha *= 0.18; c.drawImage(TEX.cloudGrey, mx - mr, my - mr, mr * 2, mr * 2); c.restore();
  e.save(); e.globalAlpha = 0.45 * (o.moonA ?? 1); glowDot(e, mx, my, mr * 1.6, 'rgba(235,235,225,A)', 0.6); e.restore();
  clouds(c, TEX.cloudDark, s, 14, 0.35, 1.0, SY(0.2));
  if (gather >= 1) c.drawImage(FIG.embrace, Lr.ox, Lr.oy, 1400 * Lr.gs, 1400 * Lr.gs);
  else {
    const p = E.inOutCubic(gather);
    c.save(); c.globalAlpha = 0.3 + 0.7 * p;
    FIG.embPts.forEach(([px, py, col], i) => {
      const x = Lr.ox + px * Lr.gs, y = Lr.oy + py * Lr.gs, a = rnd(i, 1, 9) * TAU, d = (1 - p) * (300 + 1100 * rnd(i, 2, 9)) * U;
      c.fillStyle = col; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, (2 + 3 * (1 - p)) * U, 0, TAU); c.fill();
    });
    c.restore();
    if (p > 0.6) { c.save(); c.globalAlpha = E.inOutQuad(inv(0.6, 1, p)); c.drawImage(FIG.embrace, Lr.ox, Lr.oy, 1400 * Lr.gs, 1400 * Lr.gs); c.restore(); }
  }
  const th = o.thread ?? 1;                                  // red thread between their wrists, glowing
  if (th > 0) { const a0 = [Lr.ox + 700 * Lr.gs, Lr.oy + 960 * Lr.gs], rs = []; for (let i = 0; i <= 40; i++) { const u = i / 40; rs.push([a0[0] + Math.sin(u * TAU * 1.5 + s) * 160 * Lr.gs * (1 - u * 0.3) - u * 420 * Lr.gs, a0[1] + u * 360 * Lr.gs + Math.cos(u * 9 - s * 2) * 30 * Lr.gs]); }
    ribbonDraw(c, rs, { w: 16 * Lr.gs, twist: s, twistF: 2.5, taperEnd: 0.8, alpha: th });
    e.save(); e.globalAlpha = 0.5 * th; e.strokeStyle = 'rgba(255,90,70,1)'; e.lineWidth = 12 * Lr.gs; e.beginPath(); rs.forEach(([x, y], i) => i ? e.lineTo(x, y) : e.moveTo(x, y)); e.stroke(); e.restore(); }
  return Lr;
}
function sceneS7(s) {
  const c = L.c, e = L.e;
  const gather = inv(CUT.s7 - 0.05, CUT.s7 + 1.1, s), z = 1 + 0.06 * E.inOutQuad(inv(CUT.s7, CUT.end, s));
  L.save(); L.translate(W / 2, H / 2); L.scale(z); L.translate(-W / 2, -H / 2);
  moonAndLovers(c, e, s, gather, { thread: inv(23.2, 24.2, s) });
  goldDrift(c, e, s, 30, 23, [0, 0, W, H], { fall: 0.3, a: 0.9 });
  petals(c, s, 10, 41, [0, -SY(0.1), W, SY(1.1)], { a: inv(25.5, 26.5, s) * 0.8, speed: 0.08 });
  L.restore();
  lyricCol(c, e, 5, s, { x: pick(SX(0.9), SX(0.9)), halo: 'rgba(0,0,0,0.85)', glow: '#FFFFFF', size: pick(80, 84), out: 1 - inv(CUT.end - 0.2, CUT.end + 0.1, s) });
  return { flash: s < CUT.s7 + 0.3 ? 0.35 * (1 - inv(CUT.s7, CUT.s7 + 0.3, s)) : 0 };
}

// 07 · end card — title, seal and credits on paper, the lovers' moon behind
function endCard(c, e, s, a = 1) {
  paperBg(c, s);
  const mx = SX(0.5), my = pick(SY(0.3), SY(0.3)), mr = pick(SY(0.22), SX(0.36));
  c.save(); c.globalAlpha = 0.9 * a; c.strokeStyle = 'rgba(120,112,100,0.5)'; c.lineWidth = 2 * U; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.stroke();
  c.globalAlpha = 0.3 * a; c.drawImage(FIG.embrace, mx - 700 * mr / 500, my - 520 * mr / 500, 1400 * mr / 500, 1400 * mr / 500); c.restore();
  const ts = pick(130, 160) * U;
  c.save(); c.globalAlpha = a; c.font = `400 ${ts}px ${FONT.xing}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.ink; c.fillText('大天蓬', mx, my + mr + ts * 0.62); c.restore();
  seal(c, mx + ts * 1.7, my + mr + ts * 0.3, 50 * U, '天蓬', a);
  c.save(); c.globalAlpha = a; c.textBaseline = 'middle'; c.fillStyle = '#2B2723';
  const y0 = my + mr + ts * 1.4, fs = pick(26, 30) * U;
  [['音乐', '《大天蓬》'], ['演唱', '恩几（翻唱）']].forEach(([k, v], i) => { c.font = `600 ${fs}px ${FONT.serif}`; c.textAlign = 'right'; c.fillText(k, mx - 14 * U, y0 + i * fs * 1.6); c.font = `400 ${fs}px ${FONT.serif}`; c.textAlign = 'left'; c.fillText(v, mx + 14 * U, y0 + i * fs * 1.6); });
  c.textAlign = 'center'; c.font = `400 ${fs * 0.78}px ${FONT.serif}`; c.fillStyle = '#5A544C'; c.fillText('版权归原作者及版权方所有', mx, y0 + 2 * fs * 1.6);
  const bl = y0 + 3 * fs * 1.6 + fs * 0.3;
  c.font = `400 ${fs * 0.72}px ${FONT.serif}`; c.fillStyle = '#3A3530';
  if (VERT) { c.fillText('出品 · PRODUCED BY　栋森网络科技', mx, bl); c.fillText('AI 创作 · CREATED WITH　Claude Opus 5.5', mx, bl + fs * 1.2); }
  else c.fillText('出品 · PRODUCED BY　栋森网络科技　｜　AI 创作 · CREATED WITH　Claude Opus 5.5', mx, bl);
  c.fillStyle = '#6A635A'; c.font = `400 ${fs * 0.66}px ${FONT.serif}`; c.fillText('概念练手 · 非官方', mx, H - 44 * U);
  c.restore();
}
function sceneEnd(s) { endCard(L.c, L.e, s, E.outCubic(inv(CUT.end + 0.05, CUT.end + 0.9, s))); return {}; }

// the cover (frame 0): the lovers under the moon, title and credits
function sceneCover() {
  const c = L.c, e = L.e;
  moonAndLovers(c, e, 26, 1, { thread: 1 });
  const ts = pick(200, 220) * U, tx = pick(SX(0.84), SX(0.82)), ty = pick(SY(0.08), SY(0.06));
  c.save(); c.font = `400 ${ts}px ${FONT.xing}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#F6F2E8'; c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 24 * U;
  Array.from('大天蓬').forEach((ch, i) => c.fillText(ch, tx, ty + ts * 0.5 + i * ts * 1.0)); c.restore();
  seal(c, tx - 32 * U, ty + ts * 3.1, 64 * U, '天蓬', 1);
  c.save(); c.fillStyle = 'rgba(240,236,228,0.9)'; c.font = `400 ${24 * U}px ${FONT.serif}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 8 * U;
  vText(c, '栋森网络科技 出品', tx - ts * 0.72, ty + ts * 0.4, 24 * U); vText(c, 'AI 创作 · Claude Opus 5.5', tx - ts * 0.72 - 40 * U, ty + ts * 0.4, 24 * U);
  c.font = `400 ${22 * U}px ${FONT.serif}`; c.fillStyle = 'rgba(240,236,228,0.82)'; c.fillText('音乐《大天蓬》· 恩几 翻唱　|　概念练手 · 非官方', SX(0.5), H - 46 * U);
  c.restore();
}

// ───────────── master timeline ─────────────
const IS_COVER = t => t < 0.5 / FPS;
let FX = {};
const SCENES = [[0, sceneS2], [CUT.s3, sceneS3], [CUT.s4, sceneS4], [CUT.s5, sceneWheel], [CUT.s7, sceneS7], [CUT.end, sceneEnd]];
function drawFrame(t) {
  if (LABM) return drawLab(t);
  if (IS_COVER(t)) { sceneCover(); FX = {}; return; }
  if (t < PRE) { sceneOpen(t); FX = { flash: t > 5.8 ? inv(5.8, 6.0, t) * 0.85 : 0 }; return; }
  const s = t - PRE;
  let k = 0; for (let i = 0; i < SCENES.length; i++) if (s >= SCENES[i][0] - (i ? 0.25 : 0)) k = i;
  const [t0, fn] = SCENES[k];
  if (k > 0 && k !== 4 && s < t0 + 0.25) {                   // bloom the next scene out of the last (S7 gathers its own particles)
    FX = SCENES[k - 1][1](s) || {};
    const p = inv(t0 - 0.25, t0 + 0.25, s);
    L.save(); bloomClip(SX(0.5), SY(0.5), E.inCubic(p) * Math.hypot(W, H) * 0.75, 11 + k); const fx2 = fn(s) || {}; L.restore();
    FX = { flash: Math.max(FX.flash || 0, fx2.flash || 0) };
    return;
  }
  FX = fn(s) || {};
}
function fxAt(t) {
  if (IS_COVER(t)) return { ca: 0.0006, flash: 0, vig: 0.3, grain: 0.02, bloom: 0.7 };
  const s = t - PRE, light = (t >= PRE && s >= CUT.s3 && s < CUT.s5) || (t >= PRE && s >= CUT.end + 0.2) || (t < 0.9);
  return { ca: 0.0007, flash: Math.min(0.9, FX.flash || 0), vig: light ? 0.22 : 0.42, grain: light ? 0.035 : 0.045, bloom: light ? 0.5 : 1.0 };
}
function samplesAt(t) {
  if (LABM || IS_COVER(t)) return 1;
  const s = t - PRE;
  if (t >= PRE && ((s > 1.4 && s < 3.6) || (s > 19.1 && s < 22.4))) return 6;
  return 4;
}

// ───────────── lab boards for reviewing the paintings ─────────────
function drawLab(t) {
  const c = L.c;
  L.bg(C.paper); coverTex(c, TEX.paper);
  if (LABM === 'her') { const s = Math.min(W, H) / 1400; c.drawImage(FIG.her, W / 2 - 700 * s, H / 2 - 700 * s, 1400 * s, 1400 * s); }
  if (LABM === 'him') { L.bg(C.night); coverTex(c, TEX.night); const s = Math.min(W, H) / 1600 * 0.95, ox = W / 2 - 600 * s, oy = H - 1600 * s; c.save(); c.translate(ox, oy); c.scale(s, s); drawRake(c, 858, 900, 858, -300, { head: 380, tine: 230 }); c.drawImage(FIG.himBack, 0, 0); c.restore(); }
  if (LABM === 'embrace') moonAndLovers(c, L.e, 1, 1);
  if (LABM === 'ghost') { L.bg('#18181C'); coverTex(c, TEX.night); const s = Math.min(W, H) / 1400; c.drawImage(FIG.herGhost, W / 2 - 700 * s, H / 2 - 700 * s, 1400 * s, 1400 * s); }
}
