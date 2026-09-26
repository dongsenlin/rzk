// ─────────────────────────────────────────────────────────────────────────────
//  "改变世界，从一条线开始" — Tesla China careers, 15 s @ 128 BPM (8 bars)
//  One blue line runs through the film: it becomes a blueprint of Model Y,
//  a power line, lane lines, a scan line, a text cursor and finally opens
//  into the white end card.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// ───────────── edit points (seconds) ─────────────
const T = {
  launch: bt(1), carIn: bt(4), drop: bt(8),
  energy: cut(11), ai: cut(14), robot: cut(17), roles: cut(20), you: cut(24), end: cut(28),
};
const GY = 790;                                     // ground / first line

// voice-over character timings (build/vo/manifest.json is injected by render.js)
const VO_DEFAULT = {
  vo1: [0.52, 0.70, 0.94, 1.12, 1.72, 1.96, 2.20, 2.44, 2.74, 2.92],
  vo2a: [3.80, 4.16, 4.34, 4.64, 4.76], vo2b: [5.21, 5.57, 5.81, 6.05, 6.17],
  vo2c: [6.62, 6.80, 7.04, 7.22], vo2d: [8.03, 8.27, 8.45],
  vo3: [10.53, 10.89, 11.01, 11.25, 11.49, 12.09, 12.27, 12.57, 12.75],
  vo4: [13.26, 13.50, 13.80, 14.04, 14.22],
};
const VOT = (() => {
  const m = {};
  for (const k in VO_DEFAULT) m[k] = VO_DEFAULT[k].slice();
  if (window.VO && window.VO.lines) for (const l of window.VO.lines) m[l.id] = l.chars.map(c => c.t);
  return m;
})();
const vo = (id, i) => { const a = VOT[id]; return a[Math.min(i, a.length - 1)]; };

// ───────────── shared pieces ─────────────
function tc(t) {
  const f = Math.floor(t * FPS + 1e-6), s = Math.floor(f / FPS), ff = f % FPS;
  return `00:00:${String(s).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}
const CHAPTERS = [
  [0, '00', '序章', 'PROLOGUE'], [T.drop, '01', '可持续交通', 'TRANSPORT'], [T.energy, '02', '可再生能源', 'ENERGY'],
  [T.ai, '03', '人工智能', 'AI'], [T.robot, '04', '机器人', 'ROBOTICS'], [T.roles, '05', '开放职位', 'OPEN ROLES'],
  [T.you, '06', '你', 'YOU'], [T.end, '07', '加入我们', 'JOIN US'],
];
function hud(t, ink, alpha = 0.6) {
  const c = L.c, a = alpha * ease(0.22, 0.7, t);
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.fillStyle = ink; c.textBaseline = 'alphabetic';
  const sc = (s, t0, zh) => scramble(s, inv(t0, t0 + 0.55, t), zh, t0 * 10);
  c.textAlign = 'left';
  setFont(c, 500, 15, FONT.zh, 2); c.fillText(sc('特斯拉 · 工作机会', 0.25, true), 72, 70);
  setFont(c, 500, 12, FONT.mono, 3); c.fillText(sc('TESLA / CAREERS / 2026', 0.32), 72, 92);
  c.textAlign = 'right';
  setFont(c, 500, 15, FONT.zh, 2); c.fillText(sc('上海 · 中国', 0.30, true), W - 72, 70);
  setFont(c, 500, 12, FONT.mono, 3); c.fillText(sc('31.23°N 121.47°E', 0.38), W - 72, 92);
  // chapter + timecode
  let ch = CHAPTERS[0]; for (const k of CHAPTERS) if (t >= k[0]) ch = k;
  const since = t - ch[0];
  c.textAlign = 'left'; setFont(c, 500, 12, FONT.mono, 3);
  c.fillText(scramble(`${ch[1]} / ${ch[3]}`, inv(0, 0.3, since), false, ch[0]), 72, H - 64);
  c.textAlign = 'right'; c.fillText(tc(t), W - 72, H - 64);
  // corner ticks
  c.strokeStyle = ink; c.lineWidth = 1.5; c.globalAlpha = a * 0.8;
  const k = 14, m = 40;
  c.beginPath();
  c.moveTo(m, m + k); c.lineTo(m, m); c.lineTo(m + k, m);
  c.moveTo(W - m - k, m); c.lineTo(W - m, m); c.lineTo(W - m, m + k);
  c.moveTo(m, H - m - k); c.lineTo(m, H - m); c.lineTo(m + k, H - m);
  c.moveTo(W - m - k, H - m); c.lineTo(W - m, H - m); c.lineTo(W - m, H - m - k);
  c.stroke();
  c.restore();
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

// Chapter title block: number / Chinese title / English label.
function chapterTitle(t, t0, vid, num, zh, en, o = {}) {
  const { x = 150, y = 300, ink = C.white, sub = C.fog, accent = C.blueHi, size = 132, tOut = 99, dirOut = -1 } = o;
  const c = L.c;
  const outP = ease(tOut, tOut + 0.28, t, E.inCubic);
  if (t < t0 - 0.05 || outP >= 1) return;
  c.save();
  c.translate(dirOut * outP * 240, 0); c.globalAlpha = 1 - outP;
  // number
  setFont(c, 500, 16, FONT.mono, 4); c.fillStyle = sub; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillText(scramble(`${num} / 04`, inv(t0, t0 + 0.3, t), false, 3), x + 4, y - size - 26);
  // accent bar
  const bw = 56 * ease(t0, t0 + 0.35, t, E.outExpo);
  c.fillStyle = accent; c.fillRect(x + 4, y - size - 14, bw, 3);
  // Chinese: glyphs synced to the VO syllables, slam up out of a mask
  c.save(); c.beginPath(); c.rect(x - 40, y - size - 6, 1400, size * 1.32); c.clip();
  kText(c, zh, x, y, {
    weight: 700, size, color: ink, tracking: 4,
    anim: (i) => {
      const ti = vid ? vo(vid, i) - 0.06 : t0 + i * 0.05;
      const p = inv(ti, ti + 0.32, t);
      return { dy: (1 - E.outExpo(p)) * size * 1.05, a: p > 0 ? 1 : 0 };
    },
  });
  c.restore();
  // English
  setFont(c, 600, 22, FONT.en, 7); c.fillStyle = accent; c.textAlign = 'left';
  c.fillText(scramble(en, inv(t0 + 0.12, t0 + 0.6, t), false, 9), x + 4, y + 48);
  c.restore();
}

// ───────────── Model Y (焕新版) side elevation, millimetres ─────────────
const CAR = (() => {
  const LEN = 4797, XR = 1000, XF = 3890, RT = 360, RA = 418, ACY = 372, RIM = 245;
  const archEnds = (xc) => { const dy = 250 - ACY, dx = Math.sqrt(RA * RA - dy * dy); return [xc - dx, xc + dx]; };
  const [fa0, fa1] = archEnds(XF), [ra0, ra1] = archEnds(XR);
  const front = bez([
    [fa1, 250],
    [fa1 + 150, 238, 4560, 206, 4650, 206],
    [4730, 206, 4772, 232, 4787, 300],
    [4806, 390, 4801, 500, 4792, 566],
    [4782, 650, 4752, 718, 4690, 768],
    [4600, 828, 4300, 880, 3905, 948],
    [3800, 968, 3700, 1000, 3622, 1040],
    [3380, 1200, 2960, 1545, 2800, 1590],
    [2672, 1626, 2500, 1624, 2360, 1624],
  ]);
  const rear = bez([
    [ra0, 250],
    [450, 256, 250, 276, 150, 312],
    [62, 346, 22, 420, 13, 540],
    [6, 640, 10, 760, 26, 862],
    [42, 962, 82, 1080, 150, 1150],
    [170, 1168, 200, 1180, 236, 1186],
    [500, 1330, 800, 1452, 1150, 1541],
    [1500, 1606, 1900, 1624, 2360, 1624],
  ]);
  const arch = (xc) => {                    // from rear-bottom, over the top, to front-bottom
    const a0 = Math.atan2(250 - ACY, archEnds(xc)[0] - xc), a1 = Math.atan2(250 - ACY, archEnds(xc)[1] - xc);
    const pts = []; const A0 = a0 < 0 ? a0 + TAU : a0;
    for (let i = 0; i <= 48; i++) { const a = lerp(A0, a1, i / 48); pts.push([xc + Math.cos(a) * RA, ACY + Math.sin(a) * RA]); }
    return pts;
  };
  const sill = bez([[ra1, 250], [2000, 226, 2900, 226, fa0, 250]]);
  const dlo = bez([
    [3562, 1064], [2840, 1510],
    [2600, 1550, 2200, 1553, 1800, 1533],
    [1300, 1481, 950, 1391, 702, 1276],
    [642, 1246, 632, 1210, 682, 1192],
    [1100, 1140, 2400, 1090, 3562, 1064],
  ], 20);
  const details = [
    bez([[3468, 332], [3505, 600, 3540, 850, 3562, 1064]]),          // front door leading edge
    bez([[2462, 1088], [2456, 332]]),                                  // B line
    bez([[1422, 1124], [1470, 1000, 1500, 860, 1472, 760], [1450, 700, 1400, 668, 1338, 650]]),
    bez([[1452, 332], [2200, 322, 2900, 322, 3468, 332]]),             // door bottoms
    bez([[2464, 1088], [2472, 1546]]),                                 // B pillar
    bez([[1422, 1124], [1404, 1492]]),                                 // C
    bez([[3452, 1128], [3470, 1180, 3570, 1182, 3622, 1158], [3640, 1110, 3600, 1082, 3540, 1078], [3480, 1080, 3448, 1100, 3452, 1128]], 10), // mirror
  ];
  const head = bez([[4552, 812], [4650, 802, 4722, 782, 4768, 744]]);
  const tail = bez([[34, 1012], [110, 1022, 190, 1036, 262, 1050]]);
  const shoulder = bez([[4380, 880], [3400, 1010, 1800, 1050, 330, 1090]]);
  return { LEN, XR, XF, RT, RIM, ACY, front, rear, arch: [arch(XR), arch(XF)], sill, dlo, details, head, tail, shoulder };
})();

// mm → px mapping for the car
function carXf(ox, oy, s) { return p => [ox + p[0] * s, oy - p[1] * s]; }
function mapPts(pts, f) { return pts.map(f); }

// Draws the car. st: {draw:{wheel,arch,body,dlo,det,dim}, fill, head, spin, x, squat, glow, alpha}
function drawCar(t, st) {
  const s = 1280 / CAR.LEN, ox = 960 - 640 + (st.x || 0), oy = GY;
  const f = carXf(0, 0, s);
  const c = L.c, e = L.e;
  const D = st.draw;
  L.save();
  L.translate(ox, oy);
  const pitch = () => { if (st.squat) { L.translate(CAR.XR * s, -CAR.RT * s); L.rotate(-st.squat); L.translate(-CAR.XR * s, CAR.RT * s); } };
  L.save(); pitch();
  const body = new Poly(mapPts(CAR.rear, f));
  const bodyF = new Poly(mapPts(CAR.front, f));
  const archR = new Poly(mapPts(CAR.arch[0], f)), archF = new Poly(mapPts(CAR.arch[1], f));
  const sill = new Poly(mapPts(CAR.sill, f));
  const ink = st.ink || 'rgba(255,255,255,0.92)';

  // ── fill (behind strokes)
  if (st.fill > 0) {
    c.save(); c.globalAlpha = st.fill;
    c.beginPath();
    body.full(c);
    for (let i = bodyF.p.length - 1; i >= 0; i--) c.lineTo(bodyF.p[i][0], bodyF.p[i][1]);
    const af = archF.p.slice().reverse(); for (const p of af) c.lineTo(p[0], p[1]);
    const sl = sill.p.slice().reverse(); for (const p of sl) c.lineTo(p[0], p[1]);
    const ar = archR.p.slice().reverse(); for (const p of ar) c.lineTo(p[0], p[1]);
    c.closePath();
    const g = c.createLinearGradient(0, -1624 * s, 0, -200 * s);
    g.addColorStop(0, '#454C59'); g.addColorStop(0.42, '#262A32'); g.addColorStop(0.44, '#1B1E24'); g.addColorStop(1, '#0F1115');
    c.fillStyle = g; c.fill();
    // moving studio highlight
    if (st.spec !== undefined) {
      c.save(); c.clip();
      const sx = lerp(1500 * s * 3.2, -900, st.spec);
      const hg = c.createLinearGradient(sx - 220, 0, sx + 220, 0);
      hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.5, 'rgba(210,222,255,0.22)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hg; c.fillRect(-100, -1700 * s, 1500, 1600 * s);
      c.restore();
    }
    // glass
    const dl = mapPts(CAR.dlo, f);
    c.beginPath(); c.moveTo(dl[0][0], dl[0][1]); for (const p of dl) c.lineTo(p[0], p[1]); c.closePath();
    const gg = c.createLinearGradient(0, -1550 * s, 0, -1060 * s);
    gg.addColorStop(0, '#07080A'); gg.addColorStop(1, '#14171C');
    c.fillStyle = gg; c.fill();
    c.restore();
  }

  L.restore();
  // ── wheels (stay on the ground)
  for (const xw of [CAR.XR, CAR.XF]) {
    const cx = xw * s, cy = -CAR.RT * s, R = CAR.RT * s, r = CAR.RIM * s;
    const pw = D.wheel;
    if (pw <= 0) continue;
    c.save();
    if (st.fill > 0) {
      c.globalAlpha = st.fill;
      c.fillStyle = '#0B0C0F'; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      const rg = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      rg.addColorStop(0, '#5A606B'); rg.addColorStop(1, '#23262C');
      c.fillStyle = rg; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
      c.globalAlpha = 1;
    }
    c.strokeStyle = ink; c.lineWidth = 2;
    // tyre drawn from ground contact both ways
    const a = Math.PI / 2;
    c.beginPath(); c.arc(cx, cy, R, a, a + Math.PI * pw); c.stroke();
    c.beginPath(); c.arc(cx, cy, R, a, a - Math.PI * pw, true); c.stroke();
    const pr = inv(0.35, 1, pw);
    if (pr > 0) {
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * pr); c.stroke();
      c.beginPath(); c.arc(cx, cy, r * 0.2, 0, TAU * pr); c.stroke();
      // twin spokes
      c.save(); c.translate(cx, cy); c.rotate(st.spin || 0);
      c.globalAlpha = pr; c.lineWidth = 2.2; c.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        c.rotate(TAU / 5);
        for (const d of [-0.12, 0.12]) { c.beginPath(); c.moveTo(Math.cos(d * 1.6) * r * 0.22, Math.sin(d * 1.6) * r * 0.22); c.lineTo(Math.cos(d) * r * 0.93, Math.sin(d) * r * 0.93); c.stroke(); }
      }
      c.restore();
    }
    c.restore();
  }

  L.save(); pitch();
  // ── strokes
  c.save(); c.strokeStyle = ink; c.lineWidth = 2.2; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  if (D.arch > 0) { archR.trace(c, 0.5 - D.arch / 2, 0.5 + D.arch / 2); archF.trace(c, 0.5 - D.arch / 2, 0.5 + D.arch / 2); }
  if (D.body > 0) { body.trace(c, 0, D.body); bodyF.trace(c, 0, D.body); sill.trace(c, 0, D.body / 2); sill.trace(c, 1 - D.body / 2, 1); }
  c.stroke();
  if (D.dlo > 0) {
    c.lineWidth = 1.6; c.beginPath(); new Poly(mapPts(CAR.dlo, f)).trace(c, 0, D.dlo); c.stroke();
  }
  if (D.det > 0) {
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); CAR.details.forEach((d, i) => new Poly(mapPts(d, f)).trace(c, 0, clamp(D.det * 1.6 - i * 0.1))); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); new Poly(mapPts(CAR.shoulder, f)).trace(c, 0, D.det); c.stroke();
  }
  c.restore();
  // pen heads while drawing
  if (D.body > 0 && D.body < 1) {
    for (const P of [body, bodyF]) {
      const p = P.at(P.L * D.body);
      e.save(); e.fillStyle = C.blueHi; e.beginPath(); e.arc(p[0], p[1], 7, 0, TAU); e.fill(); e.restore();
      c.save(); c.fillStyle = '#fff'; c.beginPath(); c.arc(p[0], p[1], 2.6, 0, TAU); c.fill(); c.restore();
    }
  }

  // ── lights
  const hl = st.head || 0;
  if (hl > 0) {
    const hp = mapPts(CAR.head, f);
    for (const [ctx, col, lw, al] of [[c, '#FFFFFF', 3.2, hl], [e, '#9DB6FF', 10, hl], [e, '#FFFFFF', 3, hl]]) {
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); new Poly(hp).full(ctx); ctx.stroke(); ctx.restore();
    }
    const tp = mapPts(CAR.tail, f);
    for (const [ctx, col, lw, al] of [[c, '#FF5A4E', 2.6, hl * 0.9], [e, '#FF2A1A', 9, hl * 0.8]]) {
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); new Poly(tp).full(ctx); ctx.stroke(); ctx.restore();
    }
  }
  // soft blue under-glow on emissive (the line that built it)
  if (st.glow > 0) {
    e.save(); e.globalAlpha = st.glow; e.strokeStyle = C.blueGlow; e.lineWidth = 5; e.lineJoin = 'round';
    e.beginPath(); body.full(e); bodyF.full(e); e.stroke(); e.restore();
  }
  L.restore();
  L.restore();
  return { s, ox, oy };
}

// Engineering dimension line (p: 0..1 build, a: alpha)
function dimLine(c, x0, y0, x1, y1, label, p, a, o = {}) {
  if (p <= 0 || a <= 0) return;
  const { ext = null, ink = 'rgba(255,255,255,0.75)', lab = C.fog, vertical = false } = o;
  c.save(); c.globalAlpha = a; c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1.2;
  const pe = inv(0, 0.4, p), pl = E.outExpo(inv(0.2, 0.85, p));
  if (ext) { c.beginPath(); for (const [ax, ay, bx, by] of ext) { c.moveTo(ax, ay); c.lineTo(lerp(ax, bx, pe), lerp(ay, by, pe)); } c.stroke(); }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const ax = lerp(mx, x0, pl), ay = lerp(my, y0, pl), bx = lerp(mx, x1, pl), by = lerp(my, y1, pl);
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
  if (pl > 0.95) {
    const ang = Math.atan2(y1 - y0, x1 - x0), k = 9;
    for (const [px, py, d] of [[x0, y0, 1], [x1, y1, -1]]) {
      c.beginPath(); c.moveTo(px, py);
      c.lineTo(px + d * Math.cos(ang - 0.28) * k, py + d * Math.sin(ang - 0.28) * k);
      c.lineTo(px + d * Math.cos(ang + 0.28) * k, py + d * Math.sin(ang + 0.28) * k); c.closePath(); c.fill();
    }
  }
  const txt = scramble(label, inv(0.35, 1, p), false, x0);
  setFont(c, 500, 15, FONT.mono, 2); const tw = c.measureText(txt).width;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (vertical) {
    c.fillStyle = lab; c.textAlign = 'left'; c.fillText(txt, mx + 16, my);
  } else {
    // knock the line out behind the label
    c.save(); c.globalCompositeOperation = 'destination-out'; c.restore();
    c.fillStyle = o.bg || C.night; c.fillRect(mx - tw / 2 - 12, my - 11, tw + 24, 22);
    c.fillStyle = lab; c.fillText(txt, mx, my + 1);
  }
  c.restore();
}

// ───────────── 01 IGNITION → BLUEPRINT → LAUNCH (0 – 5.16 s) ─────────────
function speedAt(t) {                               // ground speed px/s (for grid, ticks, wheels)
  const a = ease(bt(7), T.drop, t, E.inQuad) * 180;
  const b = ease(T.drop, T.drop + 0.35, t, E.outCubic) * 2600;
  return a + b;
}
function travel(t) {                                // integral of speedAt (numeric, deterministic)
  const t0 = bt(7); if (t <= t0) return 0;
  let x = 0; const n = 60, dt = (t - t0) / n;
  for (let i = 0; i < n; i++) x += speedAt(t0 + (i + 0.5) * dt) * dt;
  return x;
}

function sceneLineCar(t) {
  L.bg(C.night);
  const c = L.c, e = L.e;
  const X0 = 160, X1 = W - 160;
  const run = travel(t);
  // camera: gentle push, shake on the drop
  const shake = Math.exp(-(t - T.drop) * 9) * (t > T.drop ? 1 : 0);
  L.save();
  L.translate(W / 2, H / 2);
  const push = 1 + 0.035 * ease(0, T.drop, t, E.inOutQuad);
  L.scale(push);
  L.translate(-W / 2 + noise1(t * 40) * 9 * shake, -H / 2 + noise1(t * 40 + 9) * 6 * shake);

  grid(c, { alpha: ease(0.0, 0.9, t), offX: -run * 0.6, cross: true });

  // ── the line: dot → launch → ruler
  const pDot = ease(0.12, 0.42, t, E.outBack);
  const pLine = ease(T.launch, T.launch + 0.62, t, E.outExpo);
  const headX = lerp(X0, X1, pLine);
  if (t < T.launch + 0.05) {
    const r = 5 * pDot;
    e.save(); e.fillStyle = C.blue; e.globalAlpha = pDot; e.beginPath(); e.arc(X0, GY, 26 * pDot, 0, TAU); e.fill(); e.restore();
    c.save(); c.fillStyle = '#fff'; c.beginPath(); c.arc(X0, GY, r, 0, TAU); c.fill();
    const ring = inv(0.18, 0.7, t);
    if (ring > 0 && ring < 1) { c.strokeStyle = `rgba(110,145,242,${1 - ring})`; c.lineWidth = 1.5; c.beginPath(); c.arc(X0, GY, 8 + 60 * E.outCubic(ring), 0, TAU); c.stroke(); }
    c.restore();
  }
  if (pLine > 0) {
    // after the car lands the line becomes the road edge and extends to the frame
    const ext = ease(T.drop - 0.3, T.drop + 0.2, t, E.inOutCubic);
    const xa = lerp(X0, -40, ext), xb = lerp(headX, W + 40, ext);
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(xa, GY); c.lineTo(xb, GY); c.stroke(); c.restore();
    e.save(); e.strokeStyle = C.blueGlow; e.lineWidth = 4; e.globalAlpha = 0.9 - 0.5 * pLine;
    e.beginPath(); e.moveTo(xa, GY); e.lineTo(xb, GY); e.stroke(); e.restore();
    // comet head
    if (pLine < 0.999) {
      const hg = e.createLinearGradient(headX - 380, 0, headX, 0);
      hg.addColorStop(0, 'rgba(62,106,225,0)'); hg.addColorStop(1, 'rgba(160,190,255,1)');
      e.save(); e.strokeStyle = hg; e.lineWidth = 7; e.beginPath(); e.moveTo(headX - 380, GY); e.lineTo(headX, GY); e.stroke();
      e.fillStyle = '#DDE6FF'; e.beginPath(); e.arc(headX, GY, 10, 0, TAU); e.fill(); e.restore();
    }
    // ruler ticks under the line (scroll with the ground)
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1;
    setFont(c, 500, 11, FONT.mono, 1); c.fillStyle = 'rgba(255,255,255,0.32)'; c.textAlign = 'center'; c.textBaseline = 'top';
    const step = 32, off = ((-run % step) + step) % step;
    c.beginPath();
    for (let x = xa + off - step; x < xb; x += step) {
      if (x < xa || x > headX - 6 + ext * 4000) continue;
      const idx = Math.round((x - off + run) / step);
      const len = idx % 10 === 0 ? 16 : idx % 5 === 0 ? 10 : 5;
      const born = inv(X0, X1, x) * 0.62 + T.launch;
      const ap = ext > 0 ? 1 : ease(born, born + 0.25, t);
      if (ap <= 0) continue;
      c.moveTo(x, GY + 6); c.lineTo(x, GY + 6 + len * ap);
      if (idx % 10 === 0 && ap > 0.5 && t < T.carIn + 0.2) c.fillText(String(Math.abs(idx) * 100), x, GY + 26);
    }
    c.stroke(); c.restore();
  }

  // ── headline, character by character with the VO
  const headOut = ease(bt(7.35), bt(7.95), t, E.inCubic);
  if (t > 0.4 && headOut < 1) {
    c.save(); c.globalAlpha = 1 - headOut; c.translate(0, -40 * headOut);
    const str = '改变世界，从一条线开始';
    const idx = [0, 1, 2, 3, -1, 4, 5, 6, 7, 8, 9];
    kText(c, str, W / 2, 232, {
      weight: 500, size: 66, color: C.white, align: 'center', tracking: 6,
      anim: (i) => {
        const k = idx[i] < 0 ? 3 : idx[i];
        const ti = vo('vo1', k) - 0.05 + (idx[i] < 0 ? 0.12 : 0);
        const p = inv(ti, ti + 0.34, t);
        return { dy: 26 * (1 - E.outExpo(p)), a: E.outCubic(p), s: 1 + 0.12 * (1 - E.outExpo(p)) };
      },
    });
    setFont(c, 500, 20, FONT.en, 5); c.fillStyle = C.fog; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(scramble('CHANGE THE WORLD — IT STARTS WITH A LINE', inv(vo('vo1', 4), vo('vo1', 4) + 0.9, t), false, 5), W / 2, 284);
    c.restore();
  }

  // ── blueprint build of Model Y
  const t4 = T.carIn;
  const carX = ease(T.drop, T.drop + 0.3, t, E.outExpo) * 150 + E.inQuart(inv(bt(10.35), T.energy + 0.02, t)) * 1900;
  const spin = run / (CAR.RT * 1280 / CAR.LEN);
  const draw = {
    wheel: ease(t4 + 0.05, t4 + 0.42, t, E.inOutCubic),
    arch: ease(t4 + 0.2, t4 + 0.5, t, E.inOutCubic),
    body: ease(t4 + 0.28, t4 + 0.98, t, E.inOutCubic),
    dlo: ease(t4 + 0.6, t4 + 1.0, t, E.inOutCubic),
    det: ease(t4 + 0.8, t4 + 1.15, t, E.outCubic),
  };
  // construction centre-lines (dash-dot) before the car
  const s = 1280 / CAR.LEN, cx0 = 960 - 640;
  const cl = ease(t4 - 0.05, t4 + 0.25, t, E.outExpo) * (1 - ease(bt(7), bt(7.5), t));
  if (cl > 0) {
    c.save(); c.strokeStyle = 'rgba(110,145,242,0.55)'; c.lineWidth = 1; c.setLineDash([18, 6, 3, 6]);
    c.beginPath();
    for (const xw of [CAR.XR, CAR.XF]) { const x = cx0 + xw * s; c.moveTo(x, GY + 24); c.lineTo(x, GY + 24 - (1720 * s + 24) * cl); }
    const yc = GY - CAR.RT * s; c.moveTo(cx0 - 40, yc); c.lineTo(cx0 - 40 + (1280 + 80) * cl, yc);
    c.stroke(); c.restore();
  }
  if (t > t4 - 0.05) {
    const fill = ease(bt(6), bt(6) + 0.35, t);
    const squat = (ease(bt(7), bt(7.8), t, E.inOutQuad) - ease(T.drop, T.drop + 0.25, t, E.outBack)) * 0.012;
    drawCar(t, {
      draw, fill, x: carX, spin, squat: squat,
      head: ease(bt(6), bt(6) + 0.12, t) * (0.85 + 0.15 * Math.sin(t * 40) * (1 - ease(bt(6), bt(6.5), t))),
      spec: inv(bt(6.1), bt(7.4), t), glow: 0.5 * (1 - ease(bt(6), bt(7), t)) * draw.body,
    });
    // light trails as the car leaves
    const lt = ease(T.drop, T.drop + 0.2, t) ;
    if (lt > 0) {
      const hx = cx0 + carX + 4768 * s, hy = GY - 744 * s, tx = cx0 + carX + 34 * s, ty = GY - 1012 * s;
      const len = Math.min(900, speedAt(t) * 0.35 + (carX - 150) * 0.6);
      for (const [x, y, col, w] of [[hx, hy, 'rgba(160,190,255,0.8)', 3], [tx, ty, 'rgba(255,60,40,0.7)', 4]]) {
        const g = e.createLinearGradient(x - len, 0, x, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
        e.save(); e.globalAlpha = lt; e.strokeStyle = g; e.lineWidth = w; e.beginPath(); e.moveTo(x - len, y); e.lineTo(x, y); e.stroke(); e.restore();
      }
    }
  }
  // dimension callouts (engineering drawing)
  const dimOut = ease(bt(7), bt(7.4), t);
  const dA = 1 - dimOut;
  if (dA > 0 && t > bt(5) - 0.05) {
    const xr = cx0 + CAR.XR * s, xf = cx0 + CAR.XF * s, x0 = cx0, x1 = cx0 + 1280;
    dimLine(c, xr, GY + 62, xf, GY + 62, '轴距 WHEELBASE  2,890 MM', ease(bt(5), bt(5) + 0.45, t), dA,
      { ext: [[xr, GY + 30, xr, GY + 72], [xf, GY + 30, xf, GY + 72]] });
    dimLine(c, x0, GY + 118, x1, GY + 118, '车长 LENGTH  4,797 MM', ease(bt(5.5), bt(5.5) + 0.45, t), dA,
      { ext: [[x0 + 6, GY - 540 * s, x0 + 6, GY + 128], [x1 - 2, GY - 420 * s, x1 - 2, GY + 128]] });
    const hx = x1 + 70;
    dimLine(c, hx, GY, hx, GY - 1624 * s, '车高 1,624 MM', ease(bt(6), bt(6) + 0.45, t), dA,
      { ext: [[cx0 + 2360 * s, GY - 1624 * s, hx + 10, GY - 1624 * s]], vertical: true });
  }

  // speed streaks after the drop
  const sp = ease(T.drop, T.drop + 0.25, t) ;
  if (sp > 0) {
    c.save();
    for (let i = 0; i < 46; i++) {
      const y = 330 + hash(i * 3.3) * 620, len = 80 + hash(i * 7.1) * 420, v = 2400 + hash(i * 1.7) * 4200;
      const x = W + 200 - ((t - T.drop) * v + hash(i * 9.1) * (W + 600)) % (W + 700);
      const blue = hash(i * 5.5) > 0.78;
      c.strokeStyle = blue ? `rgba(110,145,242,${0.55 * sp})` : `rgba(255,255,255,${(0.12 + 0.3 * hash(i)) * sp})`;
      c.lineWidth = hash(i * 2.2) > 0.85 ? 2 : 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
    }
    c.restore();
  }
  L.restore();

  // chapter 01 title (not affected by shake)
  chapterTitle(t, T.drop, 'vo2a', '01', '可持续交通', 'SUSTAINABLE TRANSPORT', { y: 300 });
}

// ───────────── 02 ENERGY — isometric Megapack field (white) ─────────────
const ISO = { U: 62, OX: 1160, OY: 318 };
function iso(x, y, z = 0) { return [ISO.OX + (x - y) * ISO.U * 0.8660254, ISO.OY + (x + y) * ISO.U * 0.5 - z * ISO.U]; }
function polyPath(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
const MP = (() => {
  const u = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) u.push({ i, j, x0: i * 3.45, y0: j * 1.85, lx: 3.0, ly: 1.15, h: 1.75 });
  return u.sort((a, b) => (a.x0 + a.y0) - (b.x0 + b.y0));
})();
function drawMegapack(c, e, m, k, charge) {
  const { x0, y0, lx, ly } = m, x1 = x0 + lx, y1 = y0 + ly, h = m.h * k;
  if (h <= 0.002) return;
  c.save();
  c.fillStyle = 'rgba(23,26,32,0.06)';
  polyPath(c, [iso(x0 - 0.1, y0 - 0.1), iso(x1 + 0.5 * k, y0 - 0.1), iso(x1 + 0.5 * k, y1 + 0.5 * k), iso(x0 - 0.1, y1 + 0.5 * k)]); c.fill();
  const top = [iso(x0, y0, h), iso(x1, y0, h), iso(x1, y1, h), iso(x0, y1, h)];
  const fl = [iso(x0, y1, 0), iso(x1, y1, 0), iso(x1, y1, h), iso(x0, y1, h)];
  const fr = [iso(x1, y0, 0), iso(x1, y1, 0), iso(x1, y1, h), iso(x1, y0, h)];
  c.lineJoin = 'round'; c.lineWidth = 1.3; c.strokeStyle = '#AEB4BD';
  c.fillStyle = '#EDEFF2'; polyPath(c, fl); c.fill(); c.stroke();
  c.fillStyle = '#D3D7DD'; polyPath(c, fr); c.fill(); c.stroke();
  c.fillStyle = '#FFFFFF'; polyPath(c, top); c.fill(); c.stroke();
  // occlude glow behind the box
  e.save(); e.fillStyle = '#000'; for (const f of [fl, fr, top]) { polyPath(e, f); e.fill(); } e.restore();
  c.strokeStyle = 'rgba(110,118,130,0.5)'; c.lineWidth = 1;
  c.beginPath();
  for (let d = 1; d < 6; d++) { const x = x0 + lx * d / 6, a = iso(x, y1, 0.14 * k), b = iso(x, y1, h - 0.1 * k); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
  let a = iso(x0, y1, 0.14 * k), b = iso(x1, y1, 0.14 * k); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
  for (let v = 0; v < 6; v++) { const z = h * (0.28 + v * 0.085); a = iso(x1, y0 + 0.2, z); b = iso(x1, y1 - 0.2, z); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
  const r = [iso(x0 + 0.16, y0 + 0.16, h), iso(x1 - 0.16, y0 + 0.16, h), iso(x1 - 0.16, y1 - 0.16, h), iso(x0 + 0.16, y1 - 0.16, h)];
  c.moveTo(r[0][0], r[0][1]); for (const p of r.slice(1)) c.lineTo(p[0], p[1]); c.closePath();
  c.stroke();
  if (charge > 0) {
    const zb = h - 0.26 * k; a = iso(x0 + 0.2, y1, zb); b = iso(x0 + 0.2 + (lx - 0.4) * charge, y1, zb);
    c.strokeStyle = C.blue; c.lineWidth = 4.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    e.save(); e.strokeStyle = C.blue; e.lineWidth = 10; e.beginPath(); e.moveTo(a[0], a[1]); e.lineTo(b[0], b[1]); e.stroke(); e.restore();
    const led = iso(x1, y1 - 0.25, h - 0.3 * k);
    c.fillStyle = charge >= 1 ? C.blue : '#9AA3B2'; c.beginPath(); c.arc(led[0], led[1], 3, 0, TAU); c.fill();
  }
  c.restore();
}
function isoLine(c, pts) { c.beginPath(); const a = iso(pts[0][0], pts[0][1]); c.moveTo(a[0], a[1]); for (const p of pts.slice(1)) { const q = iso(p[0], p[1]); c.lineTo(q[0], q[1]); } }

function sceneEnergy(t) {
  L.bg(C.white);
  const c = L.c, e = L.e, u = t - T.energy;
  L.save();
  const push = 1 + 0.05 * E.outQuad(inv(-0.2, 1.5, u));
  L.translate(1000, 540); L.scale(push); L.translate(-1000 - 30 * u, -540);
  // iso floor grid
  c.save(); c.strokeStyle = '#EEF0F3'; c.lineWidth = 1; c.beginPath();
  for (let k = -24; k <= 30; k++) { const a = iso(k, -20), b = iso(k, 30); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); const d = iso(-20, k), f = iso(30, k); c.moveTo(d[0], d[1]); c.lineTo(f[0], f[1]); }
  c.stroke(); c.restore();
  // power line: bus along y (left of array) + branches between rows
  const bus = [[-0.8, 22], [-0.8, -0.5]];
  const gaps = [1.5, 3.35, 5.2, 7.05];
  const pBus = ease(T.energy + 0.02, T.energy + 0.42, t, E.inOutCubic);
  c.save(); c.lineCap = 'round';
  const busPts = [iso(-0.8, 22), iso(-0.8, -0.5)];
  const bP = new Poly(busPts);
  c.strokeStyle = C.blue; c.lineWidth = 3; c.beginPath(); bP.trace(c, 0, pBus); c.stroke();
  e.save(); e.strokeStyle = C.blue; e.lineWidth = 7; e.globalAlpha = 0.7; e.beginPath(); bP.trace(e, 0, pBus); e.stroke(); e.restore();
  const brs = gaps.map((y, j) => new Poly([iso(-0.8, y), iso(10.4, y)]));
  brs.forEach((P, j) => {
    const pb = ease(T.energy + 0.25 + j * 0.06, T.energy + 0.6 + j * 0.06, t, E.inOutCubic);
    c.strokeStyle = 'rgba(62,106,225,0.75)'; c.lineWidth = 2; c.beginPath(); P.trace(c, 0, pb); c.stroke();
  });
  // pulses
  if (u > 0.3) {
    for (let k = 0; k < 9; k++) {
      const s = ((u - 0.3) * 1.15 + k / 9) % 1;
      const P = k % 3 === 0 ? bP : brs[k % 4];
      const a = P.at(P.L * s), b = P.at(P.L * Math.min(1, s + 0.05));
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      e.save(); e.strokeStyle = '#6E91F2'; e.lineWidth = 12; e.beginPath(); e.moveTo(a[0], a[1]); e.lineTo(b[0], b[1]); e.stroke(); e.restore();
    }
  }
  c.restore();
  // Megapacks pop on 16ths (diagonal wave)
  for (const m of MP) {
    const d = T.energy + 0.05 + (m.i + m.j) * 0.059;
    const k = spring(t - d, 3.4, 0.5);
    const ch = E.outCubic(inv(T.energy + 0.5 + (m.i + m.j) * 0.05, T.energy + 1.0 + (m.i + m.j) * 0.05, t));
    drawMegapack(c, e, m, Math.max(0, k), ch);
  }
  // sun
  const sx = 1640, sy = 214, pr = ease(T.energy + 0.2, T.energy + 0.55, t, E.inOutCubic);
  if (pr > 0) {
    c.save(); c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 40, -Math.PI / 2, -Math.PI / 2 + TAU * pr); c.stroke();
    c.translate(sx, sy); c.rotate(u * 0.5); c.lineCap = 'round';
    for (let k = 0; k < 12; k++) { const pk = ease(T.energy + 0.35 + k * 0.02, T.energy + 0.5 + k * 0.02, t, E.outBack); if (pk <= 0) continue; c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, -54); c.lineTo(0, -54 - 13 * pk); c.stroke(); }
    c.restore();
  }
  // callout
  const cp = ease(T.energy + 0.55, T.energy + 0.85, t);
  if (cp > 0) {
    const a = iso(9.9, 6.7, 0.9);
    c.save(); c.strokeStyle = C.graphite; c.fillStyle = C.graphite; c.lineWidth = 1.2;
    c.beginPath(); c.arc(a[0], a[1], 3.5, 0, TAU); c.fill();
    const lp = new Poly([[a[0], a[1]], [a[0] + 80, a[1] + 110], [a[0] + 330, a[1] + 110]]);
    c.beginPath(); lp.trace(c, 0, E.outCubic(cp)); c.stroke();
    setFont(c, 600, 15, FONT.mono, 3); c.textAlign = 'left'; c.fillStyle = C.ink;
    c.fillText(scramble('MEGAPACK', inv(0.3, 1, cp), false, 21), a[0] + 90, a[1] + 100);
    setFont(c, 500, 15, FONT.zh, 2); c.fillStyle = C.pewter;
    c.fillText(scramble('储能超级工厂 · 上海', inv(0.4, 1, cp), true, 22), a[0] + 90, a[1] + 136);
    c.restore();
  }
  L.restore();
  chapterTitle(t, T.energy, 'vo2b', '02', '可再生能源', 'RENEWABLE ENERGY', { y: 300, ink: C.ink, sub: C.pewter, accent: C.blue });
}

// ───────────── 03 AI — vision view (dark) ─────────────
const CARS = [
  { X: 0, Z0: 22, v: 1.3, w: 1.9, h: 1.45, l: 4.6, lab: 'CAR', cf: '0.98', d: 0 },
  { X: -3.6, Z0: 12.5, v: 3.8, w: 1.9, h: 1.5, l: 4.7, lab: 'CAR', cf: '0.97', d: 1 },
  { X: 3.6, Z0: 33, v: 2.2, w: 1.95, h: 1.6, l: 4.8, lab: 'SUV', cf: '0.96', d: 2 },
  { X: -3.6, Z0: 52, v: 1.0, w: 2.5, h: 3.3, l: 11, lab: 'TRUCK', cf: '0.94', d: 3 },
  { X: 3.6, Z0: 74, v: 2.5, w: 1.9, h: 1.45, l: 4.6, lab: 'CAR', cf: '0.91', d: 4 },
];
function sceneAI(t) {
  L.bg(C.night);
  const c = L.c, e = L.e, u = t - T.ai;
  const HY = 470, F = 1050, CH = 1.5, SPD = 24;
  const VX = 960 + Math.sin(u * 1.6) * 16;
  const cv = 0.0011 * Math.sin(u * 0.9 + 0.8);
  const P = (X, Z, Y = 0) => [VX + F * (X + cv * Z * Z) / Z, HY + F * (CH - Y) / Z];
  const zs = (z0, z1, n) => { const a = []; for (let i = 0; i <= n; i++) a.push(z0 * Math.pow(z1 / z0, i / n)); return a; };
  // horizon glow
  let g = c.createLinearGradient(0, HY - 260, 0, HY + 40);
  g.addColorStop(0, 'rgba(62,106,225,0)'); g.addColorStop(1, 'rgba(62,106,225,0.12)');
  c.fillStyle = g; c.fillRect(0, HY - 260, W, 300);
  // road surface
  const Z = zs(2.2, 240, 30);
  c.beginPath(); Z.forEach((z, i) => { const p = P(-7.2, z); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
  for (let i = Z.length - 1; i >= 0; i--) { const p = P(7.2, Z[i]); c.lineTo(p[0], p[1]); }
  c.closePath(); g = c.createLinearGradient(0, H, 0, HY); g.addColorStop(0, '#1A1E26'); g.addColorStop(1, '#101318'); c.fillStyle = g; c.fill();
  // lane geometry
  const strip = (X, z0, z1, w, col, ctx = c) => {
    if (z1 <= 2.2) return; z0 = Math.max(2.2, z0);
    const zz = zs(z0, z1, 10); ctx.beginPath();
    zz.forEach((z, i) => { const p = P(X - w / 2, z); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    for (let i = zz.length - 1; i >= 0; i--) { const p = P(X + w / 2, zz[i]); ctx.lineTo(p[0], p[1]); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  const fadeCol = (a) => { const gg = c.createLinearGradient(0, HY + 10, 0, H); gg.addColorStop(0, `rgba(215,220,228,0)`); gg.addColorStop(0.35, `rgba(215,220,228,${a * 0.6})`); gg.addColorStop(1, `rgba(215,220,228,${a})`); return gg; };
  const fc = fadeCol(0.9);
  strip(-5.4, 2.2, 200, 0.16, fc); strip(5.4, 2.2, 200, 0.16, fc);
  const off = (u * SPD) % 12;
  for (let k = 0; k < 18; k++) { const z0 = 1 + k * 12 - off; for (const X of [-1.8, 1.8]) strip(X, z0, z0 + 3.5, 0.13, fc); }
  // planned path (blue ribbon) + flowing chevrons
  const pa = ease(T.ai - 0.1, T.ai + 0.35, t);
  if (pa > 0) {
    const zz = zs(2.4, 46, 24);
    for (const [ctx, al] of [[c, 0.5], [e, 0.55]]) {
      const gg = ctx.createLinearGradient(0, H, 0, HY + 20);
      gg.addColorStop(0, `rgba(62,106,225,${al * pa})`); gg.addColorStop(1, 'rgba(62,106,225,0)');
      ctx.beginPath(); zz.forEach((z, i) => { const p = P(-0.9, z); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
      for (let i = zz.length - 1; i >= 0; i--) { const p = P(0.9, zz[i]); ctx.lineTo(p[0], p[1]); }
      ctx.closePath(); ctx.fillStyle = gg; ctx.fill();
    }
    for (let k = 0; k < 8; k++) { const z = 2.4 + ((k * 5.5 + u * SPD * 0.5) % 44); strip(0, z, z + 0.35, 1.8, `rgba(150,180,255,${0.55 * pa * (1 - z / 46)})`); strip(0, z, z + 0.35, 1.8, `rgba(110,145,242,${0.8 * pa * (1 - z / 46)})`, e); }
  }
  // point cloud (curbs, poles, facades)
  c.save(); e.save();
  for (let k = 0; k < 260; k++) {
    const side = hash(k * 1.3) > 0.5 ? 1 : -1;
    const X = side * (6.2 + Math.pow(hash(k * 2.7), 2) * 14);
    const Y = hash(k * 4.1) < 0.55 ? 0.05 : hash(k * 5.9) * 6;
    const z = 2.5 + ((hash(k * 7.3) * 150 - u * SPD) % 150 + 150) % 150;
    const p = P(X, z, Y); if (p[0] < -10 || p[0] > W + 10 || p[1] > H) continue;
    const a = clamp(1.2 - z / 120) * 0.8, r = clamp(12 / z, 0.6, 2.4);
    c.fillStyle = `rgba(150,175,235,${a})`; c.fillRect(p[0] - r / 2, p[1] - r / 2, r, r);
    e.fillStyle = `rgba(62,106,225,${a * 0.6})`; e.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
  }
  c.restore(); e.restore();
  // vehicles + detection
  const vis = CARS.map(o => ({ ...o, Z: o.Z0 - o.v * (u + 0.25) })).filter(o => o.Z > 3).sort((a, b) => b.Z - a.Z);
  for (const o of vis) {
    const x0 = o.X - o.w / 2, x1 = o.X + o.w / 2, z0 = o.Z, z1 = o.Z + o.l;
    const q = (x, y, z) => P(x, z, y);
    const rear = [q(x0, 0, z0), q(x1, 0, z0), q(x1, o.h, z0), q(x0, o.h, z0)];
    const top = [q(x0, o.h, z0), q(x1, o.h, z0), q(x1, o.h, z1), q(x0, o.h, z1)];
    const sx = o.X > 0.5 ? x0 : o.X < -0.5 ? x1 : null;
    const side = sx === null ? null : [q(sx, 0, z0), q(sx, 0, z1), q(sx, o.h, z1), q(sx, o.h, z0)];
    c.save(); c.lineJoin = 'round'; c.lineWidth = 1; c.strokeStyle = 'rgba(170,178,190,0.8)';
    if (side) { c.fillStyle = '#2A2F37'; polyPath(c, side); c.fill(); c.stroke(); }
    c.fillStyle = '#4A515E'; polyPath(c, top); c.fill(); c.stroke();
    c.fillStyle = '#394049'; polyPath(c, rear); c.fill(); c.stroke();
    e.save(); e.fillStyle = '#000'; for (const f of [rear, top, side].filter(Boolean)) { polyPath(e, f); e.fill(); } e.restore();
    // tail lights
    const tl = [q(x0 + 0.12, o.h * 0.62, z0), q(x0 + 0.42, o.h * 0.72, z0)], tr = [q(x1 - 0.42, o.h * 0.62, z0), q(x1 - 0.12, o.h * 0.72, z0)];
    for (const [a, b] of [tl, tr]) { c.fillStyle = '#FF4A3D'; c.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]); e.fillStyle = 'rgba(255,40,20,0.9)'; e.fillRect(a[0] - 2, b[1] - 2, b[0] - a[0] + 4, a[1] - b[1] + 4); }
    c.restore();
    // brackets
    const pts = [...rear, ...top, ...(side || [])];
    let bx0 = Math.min(...pts.map(p => p[0])), bx1 = Math.max(...pts.map(p => p[0])), by0 = Math.min(...pts.map(p => p[1])), by1 = Math.max(...pts.map(p => p[1]));
    const td = T.ai + 0.12 + o.d * 0.117, pd = ease(td, td + 0.16, t, E.outCubic);
    if (pd > 0) {
      const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, sc = 1 + 0.35 * (1 - pd), pad = 6;
      bx0 = cx + (bx0 - pad - cx) * sc; bx1 = cx + (bx1 + pad - cx) * sc; by0 = cy + (by0 - pad - cy) * sc; by1 = cy + (by1 + pad - cy) * sc;
      const k = Math.min(16, (bx1 - bx0) / 3);
      for (const [ctx, col, lw] of [[c, '#8FA9FF', 2], [e, C.blue, 6]]) {
        ctx.save(); ctx.globalAlpha = pd; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        ctx.moveTo(bx0, by0 + k); ctx.lineTo(bx0, by0); ctx.lineTo(bx0 + k, by0);
        ctx.moveTo(bx1 - k, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, by0 + k);
        ctx.moveTo(bx0, by1 - k); ctx.lineTo(bx0, by1); ctx.lineTo(bx0 + k, by1);
        ctx.moveTo(bx1 - k, by1); ctx.lineTo(bx1, by1); ctx.lineTo(bx1, by1 - k);
        ctx.stroke(); ctx.restore();
      }
      c.save(); c.globalAlpha = pd; setFont(c, 600, 12, FONT.mono, 1);
      const lab = scramble(`${o.lab} ${o.cf}`, inv(0, 0.8, pd), false, o.d * 7), tw = c.measureText(lab).width;
      c.fillStyle = 'rgba(62,106,225,0.92)'; c.fillRect(bx0, by0 - 22, tw + 12, 18);
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(lab, bx0 + 6, by0 - 12.5);
      c.fillStyle = C.fog; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText(`${o.Z.toFixed(1)} m`, bx1, by1 + 6);
      c.restore();
    }
  }
  // neural net panel
  const layers = [4, 6, 6, 3], NX = 1440, NY = 160, NWd = 300, NHt = 170;
  const node = (l, i) => [NX + l * NWd / (layers.length - 1), NY + (i + 0.5) * NHt / layers[l]];
  c.save(); e.save();
  for (let l = 0; l < layers.length - 1; l++) {
    const pl = ease(T.ai + 0.2 + l * 0.117, T.ai + 0.4 + l * 0.117, t);
    if (pl <= 0) continue;
    c.strokeStyle = `rgba(150,160,180,${0.18 * pl})`; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < layers[l]; i++) for (let j = 0; j < layers[l + 1]; j++) { const a = node(l, i), b = node(l + 1, j); c.moveTo(a[0], a[1]); c.lineTo(lerp(a[0], b[0], pl), lerp(a[1], b[1], pl)); }
    c.stroke();
    for (let s = 0; s < 5; s++) {
      const i = Math.floor(hash(l * 13 + s) * layers[l]), j = Math.floor(hash(l * 7 + s * 3) * layers[l + 1]);
      const ph = ((u * 2.2 + hash(s + l * 5)) % 1), a = node(l, i), b = node(l + 1, j), p = [lerp(a[0], b[0], ph), lerp(a[1], b[1], ph)];
      c.fillStyle = `rgba(160,190,255,${pl})`; c.beginPath(); c.arc(p[0], p[1], 2.2, 0, TAU); c.fill();
      e.fillStyle = C.blue; e.beginPath(); e.arc(p[0], p[1], 5, 0, TAU); e.fill();
    }
  }
  for (let l = 0; l < layers.length; l++) for (let i = 0; i < layers[l]; i++) {
    const pn = ease(T.ai + 0.15 + l * 0.117 + i * 0.015, T.ai + 0.3 + l * 0.117 + i * 0.015, t, E.outBack);
    if (pn <= 0) continue;
    const p = node(l, i), act = 0.5 + 0.5 * Math.sin(u * 9 + l * 1.7 + i * 2.3);
    c.fillStyle = C.night; c.strokeStyle = `rgba(200,210,230,${0.9})`; c.lineWidth = 1.4;
    c.beginPath(); c.arc(p[0], p[1], 5 * pn, 0, TAU); c.fill(); c.stroke();
    if (act > 0.75) { c.fillStyle = '#8FA9FF'; c.beginPath(); c.arc(p[0], p[1], 2.6 * pn, 0, TAU); c.fill(); e.fillStyle = C.blue; e.beginPath(); e.arc(p[0], p[1], 7, 0, TAU); e.fill(); }
  }
  setFont(c, 500, 12, FONT.mono, 3); c.fillStyle = C.fog; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillText(scramble('VISION NETWORK / 视觉神经网络', inv(T.ai + 0.3, T.ai + 0.8, t), false, 31), NX - 6, NY + NHt + 34);
  c.restore(); e.restore();
  chapterTitle(t, T.ai, 'vo2c', '03', '人工智能', 'ARTIFICIAL INTELLIGENCE', { y: 300 });
}

// ───────────── 04 ROBOTICS — humanoid assembles and waves (light) ─────────────
function capsule(c, x1, y1, x2, y2, w1, w2) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  c.beginPath();
  c.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); c.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
  c.arc(x2, y2, w2 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
  c.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  c.arc(x1, y1, w1 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
  c.closePath();
}
function whitePanel(c, x0, x1) {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, '#D9DDE3'); g.addColorStop(0.35, '#FFFFFF'); g.addColorStop(0.7, '#F4F5F7'); g.addColorStop(1, '#C9CED6');
  return g;
}
const DARK = '#1C1F25', DARK2 = '#2C3038', SEAM = 'rgba(120,128,140,0.55)';
function drawArm(c, s, th, te, a) {
  c.save(); c.globalAlpha *= a;
  c.rotate(th);
  capsule(c, 0, 8, 0, 106, 44, 38); c.fillStyle = whitePanel(c, -22, 22); c.fill(); c.strokeStyle = SEAM; c.lineWidth = 1; c.stroke();
  c.fillStyle = DARK; c.beginPath(); c.arc(0, 118, 21, 0, TAU); c.fill();
  c.translate(0, 118); c.rotate(te);
  capsule(c, 0, 12, 0, 100, 38, 30); c.fillStyle = whitePanel(c, -19, 19); c.fill(); c.stroke();
  c.fillStyle = DARK; c.beginPath(); c.arc(0, 108, 12, 0, TAU); c.fill();
  c.beginPath(); rrect(c, -17, 112, 34, 60, 9); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1.2; c.beginPath();
  for (const fx of [-8, 0, 8]) { c.moveTo(fx, 140); c.lineTo(fx, 168); } c.stroke();
  c.restore();
}
function drawRobot(t, u) {
  const c = L.c, e = L.e;
  const X = 1190, Y = 905;
  const part = (d, dx, dy) => { const p = spring(u - d, 3.3, 0.55), a = clamp((u - d) * 7); return { dx: dx * (1 - p), dy: dy * (1 - p), a }; };
  const legs = part(-0.2, 0, 150), torso = part(-0.083, 0, -190), arms = part(0.034, 1, 0), head = part(0.152, 0, -260);
  c.save(); c.translate(X, Y);
  // floor shadow
  const sg = c.createRadialGradient(0, 0, 10, 0, 0, 190); sg.addColorStop(0, `rgba(23,26,32,${0.22 * legs.a})`); sg.addColorStop(1, 'rgba(23,26,32,0)');
  c.save(); c.scale(1, 0.16); c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 190, 0, TAU); c.fill(); c.restore();
  // legs
  if (legs.a > 0) {
    c.save(); c.globalAlpha = legs.a; c.translate(legs.dx, legs.dy);
    for (const s of [-1, 1]) {
      c.fillStyle = DARK; c.beginPath(); c.moveTo(s * 58 - 30, 0); c.lineTo(s * 58 + 30, 0); c.quadraticCurveTo(s * 58 + 34, -26, s * 58 + 14, -34); c.lineTo(s * 58 - 14, -34); c.quadraticCurveTo(s * 58 - 34, -26, s * 58 - 30, 0); c.fill();
      c.fillStyle = DARK2; c.beginPath(); c.arc(s * 58, -44, 14, 0, TAU); c.fill();
      capsule(c, s * 57, -178, s * 58, -56, 50, 34); c.fillStyle = whitePanel(c, s * 57 - 25, s * 57 + 25); c.fill(); c.strokeStyle = SEAM; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.moveTo(s * 50, -160); c.quadraticCurveTo(s * 60, -120, s * 56, -80); c.strokeStyle = SEAM; c.stroke();
      c.fillStyle = DARK; c.beginPath(); c.arc(s * 56, -200, 22, 0, TAU); c.fill();
      c.fillStyle = DARK2; c.beginPath(); rrect(c, s * 56 - 12, -212, 24, 24, 6); c.fill();
      capsule(c, s * 50, -370, s * 55, -226, 70, 50); c.fillStyle = whitePanel(c, s * 52 - 35, s * 52 + 35); c.fill(); c.strokeStyle = SEAM; c.stroke();
      c.beginPath(); c.moveTo(s * 36, -335); c.quadraticCurveTo(s * 44, -290, s * 42, -250); c.strokeStyle = SEAM; c.stroke();
    }
    c.restore();
  }
  // torso
  if (torso.a > 0) {
    c.save(); c.globalAlpha = torso.a; c.translate(torso.dx, torso.dy);
    c.fillStyle = DARK; c.beginPath(); rrect(c, -58, -476, 116, 80, 14); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.beginPath(); for (const x of [-30, -10, 10, 30]) { c.moveTo(x, -466); c.lineTo(x, -410); } c.stroke();
    c.beginPath(); rrect(c, -88, -414, 176, 66, 22); c.fillStyle = whitePanel(c, -88, 88); c.fill(); c.strokeStyle = SEAM; c.lineWidth = 1; c.stroke();
    c.strokeStyle = SEAM; c.beginPath(); c.moveTo(-40, -414); c.quadraticCurveTo(0, -360, 40, -414); c.stroke();
    c.beginPath(); c.moveTo(-98, -588); c.quadraticCurveTo(0, -604, 98, -588); c.lineTo(80, -500); c.quadraticCurveTo(66, -466, 0, -462); c.quadraticCurveTo(-66, -466, -80, -500); c.closePath();
    c.fillStyle = whitePanel(c, -100, 100); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -596); c.lineTo(0, -470); c.moveTo(-60, -520); c.quadraticCurveTo(0, -505, 60, -520); c.strokeStyle = SEAM; c.stroke();
    c.restore();
  }
  // arms (viewer-left arm waves)
  if (arms.a > 0) {
    const raise = E.inOutCubic(inv(0.62, 0.92, u));
    const wave = 0.34 * Math.sin((u - 0.92) * TAU * 2.3) * env(u, 0.9, 1.0, 1.6, 1.8);
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * 116 + s * 220 * (1 - spring(u - 0.034, 3.3, 0.55)), -552);
      const th = s < 0 ? lerp(0.07, 2.35, raise) : -0.07, te = s < 0 ? lerp(0.05, 0.72, raise) + wave : -0.05;
      drawArm(c, s, th, te, arms.a);
      c.globalAlpha = arms.a; c.beginPath(); c.ellipse(0, -4, 42, 38, 0, 0, TAU); c.fillStyle = whitePanel(c, -42, 42); c.fill(); c.strokeStyle = SEAM; c.lineWidth = 1; c.stroke();
      c.restore();
    }
  }
  // head
  if (head.a > 0) {
    c.save(); c.globalAlpha = head.a; c.translate(head.dx, head.dy);
    c.fillStyle = DARK; c.beginPath(); c.moveTo(-14, -612); c.lineTo(14, -612); c.lineTo(20, -586); c.lineTo(-20, -586); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(0, -664, 50, 60, 0, 0, TAU); c.fillStyle = whitePanel(c, -50, 50); c.fill(); c.strokeStyle = SEAM; c.lineWidth = 1; c.stroke();
    const face = (ctx) => { ctx.beginPath(); ctx.moveTo(-40, -674); ctx.quadraticCurveTo(0, -690, 40, -674); ctx.lineTo(38, -640); ctx.quadraticCurveTo(30, -610, 0, -606); ctx.quadraticCurveTo(-30, -610, -38, -640); ctx.closePath(); };
    face(c); const fg = c.createLinearGradient(0, -690, 0, -606); fg.addColorStop(0, '#2B3038'); fg.addColorStop(1, '#0D0F12'); c.fillStyle = fg; c.fill();
    const gl = inv(0.5, 0.85, u);
    if (gl > 0 && gl < 1) {
      c.save(); face(c); c.clip(); const gx = lerp(-80, 80, E.inOutQuad(gl));
      const gg = c.createLinearGradient(gx - 24, 0, gx + 24, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(230,238,255,0.55)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gg; c.fillRect(-60, -700, 120, 100); c.restore();
    }
    c.restore();
  }
  c.restore();
  // callouts
  const calls = [[0.52, 40, -648, -660, '视觉 · VISION'], [0.64, 136, -290, -300, '灵巧手 · DEXTEROUS HANDS'], [0.76, 70, -200, -170, '执行器 · ACTUATORS']];
  for (const [d, px, py, ly, lab] of calls) {
    const p = ease(T.robot + d, T.robot + d + 0.3, t);
    if (p <= 0) continue;
    const ax = X + px, ay = Y + py, bx = X + 250, by = Y + ly;
    c.save(); c.strokeStyle = C.graphite; c.fillStyle = C.blue; c.lineWidth = 1.2;
    c.beginPath(); c.arc(ax, ay, 4, 0, TAU); c.fill();
    const lp = new Poly([[ax, ay], [bx, by], [bx + 60, by]]); c.beginPath(); lp.trace(c, 0, E.outCubic(p)); c.stroke();
    setFont(c, 500, 15, FONT.mono, 2); c.fillStyle = C.ink; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(scramble(lab, inv(0.3, 1, p), false, d * 50), bx + 72, by);
    c.restore();
  }
}
function sceneRobot(t) {
  L.bg(C.ash);
  const c = L.c, u = t - T.robot;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#F8F8F9'); g.addColorStop(0.83, '#EDEEF0'); g.addColorStop(1, '#E4E6E9');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(23,26,32,0.06)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 905); c.lineTo(W, 905); c.stroke();
  L.save(); L.translate(960, 540); L.scale(1 + 0.03 * u); L.translate(-960, -540);
  drawRobot(t, u);
  L.restore();
  chapterTitle(t, T.robot, 'vo2d', '04', '机器人', 'ROBOTICS', { y: 300, ink: C.ink, sub: C.pewter, accent: C.blue });
}

// ───────────── ROLES — "下一个 ___" slot machine (Electric Blue) ─────────────
const ROLES = [['工程师', 'ENGINEER'], ['设计师', 'DESIGNER'], ['软件工程师', 'SOFTWARE ENGINEER'], ['数据科学家', 'DATA SCIENTIST'],
  ['制造工程师', 'MANUFACTURING ENGINEER'], ['能源工程师', 'ENERGY ENGINEER'], ['机器人工程师', 'ROBOTICS ENGINEER'], ['AI 研究员', 'AI RESEARCHER'],
  ['服务技师', 'SERVICE TECHNICIAN'], ['销售顾问', 'SALES ADVISOR'], ['供应链专家', 'SUPPLY CHAIN'], ['实习生', 'INTERN'], ['突破', 'BREAKTHROUGH']];
const SLOT_STEPS = (() => {
  const s = [];
  [20.5, 21, 21.5, 22].forEach((b, k) => s.push([bt(b), k + 1, 0.16]));
  [22.25, 22.5, 22.75, 23, 23.25, 23.5].forEach((b, k) => s.push([bt(b), k + 5, 0.1]));
  s.push([bt(23.62), 11, 0.1]);
  return s;
})();
function slotPos(t) {
  let pos = 0;
  for (const [ts, idx, d] of SLOT_STEPS) if (t >= ts) pos = idx - 1 + E.outExpo(inv(ts, ts + d, t));
  const land0 = bt(23.8);
  if (t >= land0) pos = 11 + E.inOutCubic(inv(land0, T.you, t));
  return pos;
}
const TX = 200, TY = 620, TS = 132;
function sceneRoles(t) {
  L.bg(C.blue);
  const c = L.c, e = L.e, u = t - T.roles;
  const rg = c.createRadialGradient(560, 520, 50, 560, 520, 1300); rg.addColorStop(0, '#4B78EC'); rg.addColorStop(1, '#335CCF');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  grid(c, { alpha: 0.9, offX: -u * 40, minor: 0.035, major: 0.06, cross: false });
  const pos = slotPos(t), idx = Math.min(ROLES.length - 1, Math.round(pos));
  // 下一个
  setFont(c, 700, TS, FONT.zh, 0); const wNext = c.measureText('下一个').width;
  c.save(); c.beginPath(); c.rect(TX - 20, TY - TS, 1200, TS * 1.3); c.clip();
  kText(c, '下一个', TX, TY, { weight: 700, size: TS, color: C.white, anim: (i) => { const p = ease(T.roles - 0.2 + i * 0.04, T.roles + 0.15 + i * 0.04, t, E.outExpo); return { dy: (1 - p) * TS * 1.1 }; } });
  c.restore();
  // slot
  const SX = TX + wNext, STEP = 190;
  c.save(); c.beginPath(); c.rect(SX - 10, TY - TS * 0.98, 1500, TS * 1.24); c.clip();
  setFont(c, 700, TS, FONT.zh, 0); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  for (let k = Math.floor(pos) - 1; k <= Math.floor(pos) + 2; k++) {
    if (k < 0 || k >= ROLES.length) continue;
    const y = TY + (k - pos) * STEP;
    c.fillStyle = C.white; c.globalAlpha = clamp(1 - Math.abs(k - pos) * 0.6);
    c.fillText(ROLES[k][0], SX, y);
  }
  c.restore();
  // English line
  const since = t - (SLOT_STEPS.filter(s => s[0] <= t).pop() || [T.roles])[0];
  setFont(c, 600, 26, FONT.en, 7); c.fillStyle = 'rgba(255,255,255,0.85)'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillText('THE NEXT ' + scramble(ROLES[Math.min(idx, 11)][1], inv(0, 0.12, since), false, idx), TX + 4, TY + 82);
  // role list (right)
  const lx = 1540, ly = 300, lh = 44, li = ease(T.roles - 0.1, T.roles + 0.3, t, E.outExpo);
  c.save(); c.translate((1 - li) * 300, 0); c.globalAlpha = li;
  setFont(c, 500, 13, FONT.mono, 3); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText('OPEN ROLES / 开放职位', lx, ly - 30);
  setFont(c, 500, 23, FONT.zh, 1);
  ROLES.slice(0, 12).forEach(([zh], k) => {
    const on = k === idx && pos < 11.5;
    c.fillStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.38)';
    c.fillText(zh, lx + (on ? 22 : 0), ly + 22 + k * lh);
    if (on) { c.fillRect(lx, ly + k * lh + 2, 4, 26); e.fillStyle = '#FFFFFF'; e.fillRect(lx - 2, ly + k * lh, 8, 30); }
  });
  c.restore();
}

// ───────────── YOU — 下一个突破，由你创造 (dark) ─────────────
function sceneYou(t) {
  L.bg(C.night);
  const c = L.c, e = L.e, u = t - T.you;
  grid(c, { alpha: 0.7, offX: -u * 20 });
  const fade = 1 - ease(bt(27.3), bt(27.9), t, E.inCubic);
  const up = E.tesla(inv(0.02, 0.42, u));
  const y1 = lerp(TY, 470, up), bounce = -14 * Math.exp(-u * 10) * Math.cos(u * 34);
  setFont(c, 700, TS, FONT.zh, 0); const wNext = c.measureText('下一个').width;
  c.save(); c.globalAlpha = fade;
  kText(c, '下一个', TX, y1, { weight: 700, size: TS, color: C.white });
  kText(c, '突破', TX + wNext, y1 + bounce, { weight: 700, size: TS, color: C.white });
  setFont(c, 700, TS, FONT.zh, 0); const wBT = c.measureText('突破').width;
  const comma = ease(0.08, 0.2, u);
  if (comma > 0) { c.globalAlpha = fade * comma; setFont(c, 700, TS, FONT.zh); c.fillStyle = C.white; c.fillText('，', TX + wNext + wBT, y1); c.globalAlpha = fade; }
  // line 2, typed with the VO
  const line2 = '由你创造。', y2 = y1 + 190, times = [vo('vo3', 5), vo('vo3', 6), vo('vo3', 7), vo('vo3', 8), vo('vo3', 8) + 0.14];
  let typed = 0; times.forEach(ti => { if (t >= ti - 0.03) typed++; });
  const lay = (() => { setFont(c, 700, TS, FONT.zh); return layout(c, line2); })();
  const x2 = TX, endX = x2 + (typed ? lay.glyphs[typed - 1].x + lay.glyphs[typed - 1].w : 0);
  kText(c, line2, x2, y1 + 190, { weight: 700, size: TS, color: '#5A83F2', anim: (i) => { const p = inv(times[i] - 0.03, times[i] + 0.12, t); return { a: p > 0 ? 1 : 0, s: 1 + 0.18 * (1 - E.outCubic(p)) }; } });
  e.save(); e.globalAlpha = fade * 0.55; kText(e, line2, x2, y1 + 190, { weight: 700, size: TS, color: C.blue, anim: (i) => ({ a: t >= times[i] - 0.03 ? 1 : 0 }) }); e.restore();
  // English
  setFont(c, 600, 24, FONT.en, 7); c.fillStyle = C.fog; c.textAlign = 'left';
  c.fillText(scramble('THE NEXT BREAKTHROUGH IS YOURS TO MAKE', inv(vo('vo3', 5), vo('vo3', 5) + 0.8, t), false, 44), TX + 4, y2 + 72);
  c.restore();
  // cursor → the line
  const pA = E.inOutCubic(inv(bt(27), bt(27.5), t));     // grow + recentre
  const pB = E.inOutQuart(inv(bt(27.45), T.end, t));      // rotate + stretch
  const blink = typed > 0 && typed < 5 ? 1 : (Math.floor((t - T.you) / (BEAT / 2)) % 2 === 0 ? 1 : 0.15);
  let cx = endX + 18, cy = y2 - TS * 0.36, cw = 12, chh = TS * 0.86;
  cx = lerp(cx, 960, pB); cy = lerp(cy, 540, Math.max(pA * 0.6, pB));
  chh = lerp(chh, 360, pA); const rot = pB * Math.PI / 2;
  const len = lerp(chh, 2300, E.inQuart(pB)), thick = lerp(cw, 4, pB);
  const alpha = pA > 0 ? 1 : blink;
  for (const [ctx, col, extra] of [[c, '#FFFFFF', 0], [e, C.blue, 10]]) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = ctx === c ? (pB > 0.2 ? '#FFFFFF' : C.blue) : col;
    ctx.fillRect(-(thick + extra) / 2, -len / 2 - extra / 2, thick + extra, len + extra);
    ctx.restore();
  }
}

// ───────────── END CARD (white) ─────────────
function wordmark(c, cx, cy, w, col, prog) {
  // geometric T Ξ S L Λ, drawn as strokes on a 70 × 60 grid per letter
  const lw = 70, gap = 42, total = lw * 5 + gap * 4, k = w / total, th = 9;
  c.save(); c.translate(cx - w / 2, cy - 30 * k); c.scale(k, k);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = th; c.lineCap = 'butt'; c.lineJoin = 'miter';
  const letters = [
    (c) => { c.fillRect(0, 0, 70, th); c.fillRect(35 - th / 2, th + 5, th, 60 - th - 5); },
    (c) => { c.fillRect(0, 0, 70, th); c.fillRect(0, 30 - th / 2, 70, th); c.fillRect(0, 60 - th, 70, th); },
    (c) => { const r = 11, h = th / 2; c.beginPath(); c.moveTo(70, h); c.lineTo(h + r, h); c.arcTo(h, h, h, h + r, r); c.lineTo(h, 30 - r); c.arcTo(h, 30, h + r, 30, r); c.lineTo(70 - h - r, 30); c.arcTo(70 - h, 30, 70 - h, 30 + r, r); c.lineTo(70 - h, 60 - h - r); c.arcTo(70 - h, 60 - h, 70 - h - r, 60 - h, r); c.lineTo(0, 60 - h); c.stroke(); },
    (c) => { c.fillRect(0, 0, th, 60); c.fillRect(0, 60 - th, 70, th); },
    (c) => { c.beginPath(); c.moveTo(2, 60); c.lineTo(31, th / 2); c.lineTo(39, th / 2); c.lineTo(68, 60); c.stroke(); },
  ];
  letters.forEach((f, i) => {
    const p = prog(i);
    if (p <= 0) return;
    c.save(); c.translate(i * (lw + gap), 0);
    c.beginPath(); c.rect(-10, -10, lw + 20, 80); c.clip();
    c.translate(0, (1 - p) * 70); f(c);
    c.restore();
  });
  c.restore();
}
function button(c, x, y, w, h, fill, txt, tcol, font) {
  c.fillStyle = fill; c.beginPath(); rrect(c, x, y, w, h, 4); c.fill();
  c.font = font; c.fillStyle = tcol; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '0px';
  c.fillText(txt, x + w / 2, y + h / 2 + 1);
}
function sceneEnd(t) {
  L.bg(C.white);
  const c = L.c, u = t - T.end;
  const rise = (d, dur = 0.42) => E.glide(inv(d, d + dur, u));
  c.save(); c.translate(960, 560); c.scale(1.22, 1.22); c.translate(-960, -560);
  wordmark(c, 960, 392, 470, C.ink, (i) => rise(0.06 + i * 0.045, 0.5));
  kText(c, '加入我们', 960, 548, { weight: 500, size: 74, color: C.ink, align: 'center', tracking: 8, anim: (i) => { const p = rise(0.2 + i * 0.05); return { dy: (1 - p) * 30, a: p }; } });
  const pm = rise(0.34);
  c.save(); c.globalAlpha = pm; c.translate(0, (1 - pm) * 16);
  setFont(c, 400, 28, FONT.zh, 5); c.fillStyle = C.graphite; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText('建设一个富足非凡的世界', 960, 606);
  c.restore();
  const pb = rise(0.46), click = inv(1.2, 1.32, u);
  c.save(); c.globalAlpha = pb; c.translate(0, (1 - pb) * 18);
  const bw = 240, bh = 48, by = 668, bx1 = 960 - 8 - bw, bx2 = 968;
  const pressed = click > 0 && click < 1;
  button(c, bx1, by, bw, bh, pressed ? '#2F55C4' : C.blue, '查看职位', '#FFFFFF', `500 17px ${FONT.zh}`);
  button(c, bx2, by, bw, bh, C.ash, 'tesla.cn/careers', C.graphite, `600 17px ${FONT.en}`);
  if (click > 0) { const rp = E.outCubic(inv(1.2, 1.7, u)); c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - rp)})`; c.lineWidth = 2; c.beginPath(); c.arc(bx1 + bw / 2 + 10, by + bh / 2, 10 + 70 * rp, 0, TAU); c.save(); c.beginPath(); rrect(c, bx1, by, bw, bh, 4); c.clip(); c.beginPath(); c.arc(bx1 + bw / 2 + 10, by + bh / 2, 10 + 120 * rp, 0, TAU); c.fillStyle = `rgba(255,255,255,${0.25 * (1 - rp)})`; c.fill(); c.restore(); }
  c.restore();
  const pw = rise(0.6);
  c.save(); c.globalAlpha = pw * 0.9; setFont(c, 500, 15, FONT.zh, 3); c.fillStyle = C.pewter; c.textAlign = 'center';
  c.fillText('招聘公众号  TeslaHire', 960, 900); c.restore();
  // pointer
  const pp = E.inOutCubic(inv(0.72, 1.18, u));
  if (u > 0.7) {
    const px = lerp(1330, bx1 + bw / 2 + 10, pp), py = lerp(930, by + bh / 2 + 4, pp), s = 1 - 0.12 * Math.sin(Math.PI * clamp(click * 1.4));
    c.save(); c.translate(px, py); c.scale(s, s); c.globalAlpha = clamp((u - 0.7) * 6);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 30); c.lineTo(8, 23); c.lineTo(14, 36); c.lineTo(19, 34); c.lineTo(13, 21); c.lineTo(23, 21); c.closePath();
    c.fillStyle = C.ink; c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke(); c.fill();
    c.restore();
  }
  c.restore();
}

// ───────────── master timeline ─────────────
function drawFrame(t) {
  const c = L.c, e = L.e;
  const wS = bt(10.72), wE = T.energy + 0.1;                       // whip pan
  const iS = bt(13.5), iE = T.ai;                                   // iris to AI
  const sS = bt(16.4), sE = T.robot + 0.02;                         // scan line to robotics
  const pS = bt(19.4), pE = T.roles;                                // blue panel push
  const oS = T.end, oE = T.end + 0.34;                              // slit opens to white
  if (t < wS) { sceneLineCar(t); hud(t, C.fog); return; }
  if (t < wE) {
    const p = E.inOutQuint(inv(wS, wE, t));
    L.save(); L.translate(-p * W, 0); sceneLineCar(t); L.restore();
    L.save(); L.translate((1 - p) * W, 0); L.clipRect(0, 0, W, H); sceneEnergy(t); L.restore();
    hud(t, p < 0.5 ? C.fog : C.pewter); return;
  }
  if (t < iS) { sceneEnergy(t); hud(t, C.pewter); return; }
  if (t < iE) {
    const p = inv(iS, iE, t), r = E.inExpo(p) * 1250 + 6 * E.outCubic(inv(0, 0.3, p));
    L.save(); L.translate(960, 470); L.scale(1 + 0.6 * E.inQuad(p)); L.translate(-960, -470); sceneEnergy(t); L.restore();
    L.save(); L.clipPath(cc => cc.arc(960, 470, r, 0, TAU)); sceneAI(t); L.restore();
    c.save(); c.strokeStyle = C.blueHi; c.lineWidth = 3; c.beginPath(); c.arc(960, 470, r, 0, TAU); c.stroke(); c.restore();
    e.save(); e.strokeStyle = C.blue; e.lineWidth = 16; e.beginPath(); e.arc(960, 470, r, 0, TAU); e.stroke(); e.restore();
    hud(t, p < 0.6 ? C.pewter : C.fog); return;
  }
  if (t < sS) { sceneAI(t); hud(t, C.fog); return; }
  if (t < sE) {
    const y = H + 30 - E.inOutCubic(inv(sS, sE, t)) * (H + 60);
    sceneAI(t);
    L.save(); L.clipRect(0, y, W, H - y + 2); sceneRobot(t); L.restore();
    const g = c.createLinearGradient(0, y, 0, y + 90); g.addColorStop(0, 'rgba(62,106,225,0.25)'); g.addColorStop(1, 'rgba(62,106,225,0)');
    c.fillStyle = g; c.fillRect(0, y, W, 90);
    c.fillStyle = '#FFFFFF'; c.fillRect(0, y - 1.5, W, 3);
    e.fillStyle = C.blue; e.fillRect(0, y - 8, W, 16);
    hud(t, y < H / 2 ? C.pewter : C.fog); return;
  }
  if (t < pS) { sceneRobot(t); hud(t, C.pewter); return; }
  if (t < pE) {
    const p = E.inOutQuint(inv(pS, pE, t)), x = W * (1 - p);
    L.save(); L.translate(-p * W * 0.3, 0); sceneRobot(t); L.restore();
    L.save(); L.clipRect(x, 0, W - x + 2, H); L.translate(x, 0); sceneRoles(t); L.restore();
    c.fillStyle = '#FFFFFF'; c.fillRect(x - 1.5, 0, 3, H); e.fillStyle = C.blueHi; e.fillRect(x - 6, 0, 12, H);
    hud(t, p < 0.5 ? C.pewter : 'rgba(255,255,255,0.8)'); return;
  }
  if (t < T.you) { sceneRoles(t); hud(t, 'rgba(255,255,255,0.8)'); return; }
  if (t < oS) { sceneYou(t); hud(t, C.fog); return; }
  if (t < oE) {
    const hgt = 4 + E.outExpo(inv(oS, oE, t)) * 1120;
    sceneYou(t);
    L.save(); L.clipRect(0, 540 - hgt / 2, W, hgt); sceneEnd(t); L.restore();
    hud(t, C.fog); return;
  }
  sceneEnd(t); hud(t, C.pewter, 0.5);
}

function fxAt(t) {
  const hit = (t0, k = 10) => t >= t0 ? Math.exp(-(t - t0) * k) : 0;
  const ca = 0.0008 + 0.0045 * hit(T.drop, 8) + 0.006 * hit(T.energy - 0.1, 9) + 0.005 * hit(T.ai, 9)
    + 0.004 * hit(T.robot, 10) + 0.005 * hit(T.roles, 10) + 0.006 * hit(T.you, 9) + 0.004 * hit(T.end, 8);
  const flash = 0.22 * hit(T.drop, 16) + 0.16 * hit(T.you, 18) + 0.1 * hit(T.ai, 18);
  const white = (t >= T.energy - 0.05 && t < T.ai) || (t >= T.robot && t < bt(19.7)) || t >= T.end + 0.2;
  const blue = t >= bt(19.7) && t < T.you;
  return { ca, flash, vig: white ? 0.06 : blue ? 0.28 : 0.42, grain: white ? 0.016 : blue ? 0.03 : 0.04, bloom: white ? 0.6 : 1.0 };
}
function samplesAt(t) {
  const within = (a, b) => t >= a && t <= b;
  if (within(bt(7.9), T.energy + 0.3)) return 12;
  if (within(bt(13.4), T.ai + 0.15) || within(bt(16.3), T.robot + 0.5) || within(bt(19.3), T.roles + 0.1)) return 10;
  if (within(T.roles, T.you + 0.15) || within(bt(26.9), T.end + 0.4)) return 9;
  return 6;
}
