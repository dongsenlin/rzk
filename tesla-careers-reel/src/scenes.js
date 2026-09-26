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
    [3350, 1212, 3050, 1432, 2872, 1556],
    [2700, 1611, 2520, 1624, 2360, 1624],
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
    [3562, 1064], [2862, 1492],
    [2600, 1546, 2200, 1553, 1800, 1533],
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
  if (st.squat) { L.translate(CAR.XR * s, -CAR.RT * s); L.rotate(-st.squat); L.translate(-CAR.XR * s, CAR.RT * s); }
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

  // ── wheels
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

  // ── strokes
  c.save(); c.strokeStyle = ink; c.lineWidth = 2.2; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  if (D.arch > 0) { archR.trace(c, 0.5 - D.arch / 2, 0.5 + D.arch / 2); archF.trace(c, 0.5 - D.arch / 2, 0.5 + D.arch / 2); }
  if (D.body > 0) { body.trace(c, 0, D.body); bodyF.trace(c, 0, D.body); sill.trace(c, 0.5 - D.body / 2, 0.5 + D.body / 2); }
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

// ───────────── stubs for later chapters ─────────────
function sceneEnergy(t) { L.bg(C.white); }
function sceneAI(t) { L.bg(C.night); }
function sceneRobot(t) { L.bg(C.ash); }
function sceneRoles(t) { L.bg(C.blue); }
function sceneEnd(t) { L.bg(C.white); }

// ───────────── master timeline ─────────────
function drawFrame(t) {
  // whip pan transport → energy
  const wS = bt(10.72), wE = T.energy + 0.1;
  if (t < wS) { sceneLineCar(t); hud(t, C.fog); return; }
  if (t < wE) {
    const p = E.inOutQuint(inv(wS, wE, t));
    L.save(); L.translate(-p * W, 0); sceneLineCar(t); L.restore();
    L.save(); L.translate((1 - p) * W, 0); L.clipRect(0, 0, W, H); sceneEnergy(t); L.restore();
    hud(t, p < 0.5 ? C.fog : C.pewter);
    return;
  }
  if (t < T.ai) { sceneEnergy(t); hud(t, C.pewter); return; }
  if (t < T.robot) { sceneAI(t); hud(t, C.fog); return; }
  if (t < T.roles) { sceneRobot(t); hud(t, C.pewter); return; }
  if (t < T.end) { sceneRoles(t); hud(t, 'rgba(255,255,255,0.8)'); return; }
  sceneEnd(t); hud(t, C.pewter, 0.5);
}

function fxAt(t) {
  const hit = (t0, k = 10) => t >= t0 ? Math.exp(-(t - t0) * k) : 0;
  let ca = 0.0015 + 0.02 * hit(T.drop, 7) + 0.03 * hit(T.energy - 0.1, 8);
  const flash = 0.35 * hit(T.drop, 14);
  const white = t >= T.energy - 0.05 && t < T.ai || (t >= T.robot && t < T.roles) || t >= T.end;
  return { ca, flash, vig: white ? 0.08 : 0.42, grain: white ? 0.02 : 0.04, bloom: 1.0 };
}
function samplesAt(t) {
  if (t > bt(7.9) && t < T.energy + 0.3) return 12;
  return 7;
}
