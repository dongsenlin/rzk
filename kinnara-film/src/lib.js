// ─────────────────────────────────────────────────────────────────────────────
//  Scene helpers carried over from the mural MV: scattered flowers, lightning,
//  the turning mandorla, dark flames, the mountain stair to 灵山 and its palace,
//  captions, the title brush-character, seals.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
function glowDot(e, x, y, r, col, a) { const g = e.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); e.fillStyle = g; e.fillRect(x - r, y - r, 2 * r, 2 * r); }
// black-and-red flame mandorla (无天)

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

function darkMandorla(c, e, cx, cy, s, g) {
  const bands = ['#120C0B', '#3E120E', '#86241A'];
  c.save(); c.globalAlpha *= Math.min(1, g); c.fillStyle = 'rgba(18,12,11,0.55)'; c.beginPath(); c.ellipse(cx, cy + 60, 470 * g, 560 * g, 0, 0, TAU); c.fill(); c.restore();
  flameRow(c, null, arcPts(cx, cy + 60, 500 * g, Math.PI * 0.96, Math.PI * 2.04, 200), s * 1.6, { n: 38, w: 64 * g, h: 190 * g, seed: 5, bands, line: '#050303', sway: 0.55 });
  flameRow(c, null, arcPts(cx, cy + 60, 360 * g, Math.PI * 1.02, Math.PI * 1.98, 140), s * 1.9 + 3, { n: 24, w: 56 * g, h: 150 * g, seed: 9, bands, line: '#050303', sway: 0.65 });
  e.save(); e.globalAlpha = 0.28 * Math.min(1, g); const gr = e.createRadialGradient(cx, cy, 200, cx, cy, 720); gr.addColorStop(0, 'rgba(200,30,14,0)'); gr.addColorStop(0.75, 'rgba(200,30,14,0.55)'); gr.addColorStop(1, 'rgba(120,10,0,0)'); e.fillStyle = gr; e.fillRect(cx - 720, cy - 720, 1440, 1440); e.restore();
}

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

const S3P = [[1000, 4200], [780, 3760], [1240, 3220], [840, 2680], [1170, 2140], [910, 1640], [1040, 1180], [1000, 960]];

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

function caption(c, str, a, y) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.font = `400 ${pick(34, 38) * U}px ${FONT.serif}`; c.letterSpacing = `${pick(8, 6) * U}px`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 16 * U; c.fillStyle = '#F4EDE0'; c.fillText(str, SX(0.5), y ?? SY(pick(0.87, 0.86))); c.restore();
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

const toScreen = (K, x, y) => [W / 2 + (x - K.x) * K.z, H / 2 + (y - K.y) * K.z];
