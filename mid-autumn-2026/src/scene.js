// The film. renderAt(t) draws one frame purely from t (seconds), so capture is
// deterministic and any frame can be scrubbed to directly.
'use strict';

const Scene = (() => {
  const { clamp, lerp, smooth, TAU, ease: E, seg, hash, rng, rgba, sampleQ } = U;

  let A, cv, g;
  let moonTmp, moonTmpG, mask, maskG, maskImg, bloom, bloomG, fx, fxG;
  let stars, petals, sparks, nodes, arcs, links, glyphs, cues;
  const MS = 176; // phase-mask resolution

  // ------------------------------------------------------------------ helpers
  const font = (w, px, fam) => `${w} ${px}px ${fam}`;

  // Per-character layout with tracking (em fraction), for text we animate per glyph.
  function layout(ctx, f, text, tracking) {
    ctx.font = f;
    const px = parseFloat(f.split(' ')[1]);
    const chars = [...text];
    let x = 0;
    const out = chars.map((ch, i) => {
      const w = ctx.measureText(ch).width;
      const item = { ch, x, w };
      x += w + (i < chars.length - 1 ? tracking * px : 0);
      return item;
    });
    return { chars: out, width: x };
  }

  function camera(t) {
    const p = E.inOutSine(clamp(t / DURATION));
    const dt = t - T.full, kick = dt > 0 ? Math.exp(-dt / 0.32) * (1 - Math.exp(-dt / 0.05)) : 0;
    return { s: 1 + 0.055 * p + 0.016 * kick, dy: -16 * p };
  }
  function withCam(t, depth, fn) {
    const c = camera(t), s = 1 + (c.s - 1) * depth;
    g.save();
    g.translate(MOON.x, MOON.y + c.dy * depth);
    g.scale(s, s);
    g.translate(-MOON.x, -MOON.y);
    fn();
    g.restore();
  }

  // Lunar day (1..15) and phase angle.
  const dayAt = t => 1 + 14 * E.inOutSine(seg(t, T.phase[0], T.phase[1]));
  const phaseAngle = t => lerp(0.13 * Math.PI, Math.PI, (dayAt(t) - 1) / 14);
  const illum = a => (1 - Math.cos(a)) / 2;
  const DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五'];

  // Envelope of the full-moon flash.
  const flash = t => (t < T.full ? Math.pow(seg(t, T.full - 0.5, T.full), 3) : Math.exp(-(t - T.full) / 0.45));

  // ------------------------------------------------------------------ init
  function init(canvasEl, assets) {
    cv = canvasEl; g = cv.getContext('2d'); A = assets;
    moonTmp = U.canvas(A.moon.width, A.moon.height); moonTmpG = moonTmp.getContext('2d');
    mask = U.canvas(MS, MS); maskG = mask.getContext('2d'); maskImg = maskG.createImageData(MS, MS);
    bloom = U.canvas(W / 6, H / 6); bloomG = bloom.getContext('2d');
    fx = U.canvas(W, 700); fxG = fx.getContext('2d');

    const r = rng(1508);
    stars = Array.from({ length: 430 }, () => {
      const b = Math.pow(r(), 2.8);
      return {
        x: r() * (W + 120) - 60, y: Math.pow(r(), 1.3) * 1560 - 60, b,
        size: 1.6 + b * 4.2, tw: 0.35 + r() * 1.6, ph: r() * TAU, warm: r() < 0.22, spike: b > 0.62 && r() < 0.8,
      };
    });

    petals = Array.from({ length: 58 }, () => {
      const z = r();
      return {
        x0: r() < 0.45 ? 560 + r() * 560 : r() * (W + 200) - 100, y0: r() * (H + 320), vy: 38 + z * 70 + r() * 20, amp: 18 + r() * 46,
        fr: 0.25 + r() * 0.5, ph: r() * TAU, rot: r() * TAU, vr: (r() - 0.5) * 2.4, vf: 1.2 + r() * 2.6, pf: r() * TAU,
        z, size: 9 + z * 20,
      };
    });

    sparks = Array.from({ length: 120 }, () => ({
      a: r() * TAU, v: 160 + Math.pow(r(), 2) * 560, k: 2.2 + r() * 1.6, life: 0.7 + r() * 1.1, size: 0.8 + r() * 2, tw: r() * TAU,
    }));

    // Network: village lights on the ridges (plus two beyond the frame edges) that
    // link up to the moon along out-bowed arcs, framing the title like a lantern.
    const L = A.layers;
    const spec = [
      [-60, null, 1210, 0.0], [72, 1, 0, 0.15], [168, 2, 0, 0.32], [270, 1, 0, 0.46], [372, 2, 0, 0.62],
      [W + 60, null, 1270, 0.08], [1000, 1, 0, 0.22], [904, 2, 0, 0.38], [806, 1, 0, 0.52], [712, 2, 0, 0.7],
    ];
    nodes = spec.map(([x, li, y, delay], i) => {
      const ny = li == null ? y : L[li].ridge(x) + 18 + hash(i, 3) * 26;
      return { x, y: ny, li, t0: T.nodes[0] + delay, off: li == null };
    });
    arcs = nodes.map((n, i) => {
      const side = n.x < MOON.x ? -1 : 1;
      const k = side < 0 ? i : i - 5;                   // 0 = outermost
      const ang = side < 0 ? Math.PI - (0.30 + k * 0.1) : 0.30 + k * 0.1;
      const tx = MOON.x + Math.cos(ang) * MOON.r, ty = MOON.y + Math.sin(ang) * MOON.r;
      const cx = side < 0 ? Math.min(n.x, tx) - 150 + k * 22 : Math.max(n.x, tx) + 150 - k * 22;
      const cy = lerp(n.y, ty, 0.46) + 60;
      const t0 = n.t0 + 0.18, dur = 0.95 + hash(i, 9) * 0.25;
      return { pts: sampleQ([n.x, n.y], [cx, cy], [tx, ty], 90), t0, t1: t0 + dur, side, speed: 0.5 + hash(i, 5) * 0.35, ph: hash(i, 6) };
    });
    // Neighbouring villages link to each other too.
    links = [[1, 2], [2, 3], [3, 4], [6, 7], [7, 8], [8, 9], [4, 9]].map(([a, b], i) => {
      const p = nodes[a], q = nodes[b], mx = (p.x + q.x) / 2, my = Math.min(p.y, q.y) - 40 - Math.abs(p.x - q.x) * 0.12;
      const t0 = Math.max(p.t0, q.t0) + 0.45;
      return { pts: sampleQ([p.x, p.y], [mx, my], [q.x, q.y], 40), t0, t1: t0 + 0.6 };
    });

    glyphs = buildGlyphs();
    cues = buildCues();
    window.CUES = cues;
  }

  // Calligraphy outlines -> Path2D per contour, with length and sample points.
  function buildGlyphs() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    document.body.appendChild(svg);
    const FS = 262, B = 1242;
    const out = [...'中秋'].map((ch, j) => {
      const G = window.GLYPHS[ch];
      const ox = 540 - FS + j * FS;
      const contours = G.contours.map(d => {
        const el = document.createElementNS(svgNS, 'path');
        el.setAttribute('d', d); svg.appendChild(el);
        const len = el.getTotalLength();
        const samples = Array.from({ length: 161 }, (_, i) => { const p = el.getPointAtLength((len * i) / 160); return [p.x, p.y]; });
        return { path: new Path2D(d), len, samples };
      });
      return { ch, ox, contours, full: new Path2D(G.contours.join(' ')), bbox: G.bbox };
    });
    svg.remove();
    return { FS, B, list: out, box: { x0: 540 - FS + 0.15 * FS, x1: 540 + FS, y0: B - 0.86 * FS, y1: B + 0.14 * FS } };
  }

  function buildCues() {
    const c = [{ t: 0, type: 'start' }];
    // Lunar-day ticks: find when the eased day counter crosses each integer.
    let prev = 1;
    for (let f = 0; f <= T.phase[1] * FPS + 2; f++) {
      const t = f / FPS, d = Math.floor(dayAt(t) + 1e-6);
      if (f === Math.round(T.phase[0] * FPS)) c.push({ t, type: 'tick', i: 0 });
      if (d > prev) { c.push({ t, type: 'tick', i: d - 1 }); prev = d; }
    }
    c.push({ t: T.ring[0], type: 'ring', dur: T.ring[1] - T.ring[0] });
    c.push({ t: T.label[0], type: 'decode', dur: T.label[1] - T.label[0] });
    c.push({ t: T.full, type: 'full' });
    c.push({ t: T.land[0], type: 'land' });
    c.push({ t: T.clouds[0], type: 'clouds' });
    nodes.forEach((n, i) => c.push({ t: n.t0, type: 'node', pan: (n.x / W) * 2 - 1, i }));
    arcs.forEach((a, i) => c.push({ t: a.t1, type: 'connect', pan: a.side * 0.6, i }));
    for (let i = 0; i < 10; i++) c.push({ t: T.poem[0] + i * 0.12, type: 'poem', i });
    c.push({ t: T.trace[0], type: 'trace', dur: T.trace[1] - T.trace[0] });
    c.push({ t: T.fill[0], type: 'fill', dur: T.fill[1] - T.fill[0] });
    c.push({ t: T.shine[0], type: 'shine' });
    c.push({ t: T.seal + 0.2, type: 'seal' });
    c.push({ t: T.lockup[0], type: 'lockup' });
    for (let i = 0; i < 9; i++) c.push({ t: T.greet[0] + i * 0.1, type: 'greet', i });
    c.push({ t: T.sweep[0], type: 'sweep' });
    c.push({ t: T.outro[0], type: 'outro', dur: T.outro[1] - T.outro[0] });
    return c.sort((a, b) => a.t - b.t);
  }

  // ------------------------------------------------------------------ layers
  function drawSky(t) {
    withCam(t, 0.2, () => {
      g.drawImage(A.sky, -A.MARGIN, -A.MARGIN);
      // Warm sky glow that grows with the moon.
      const k = illum(phaseAngle(t)) * (0.85 + 0.35 * flash(t)) * (1 + 0.03 * Math.sin(t * 1.3));
      const rg = g.createRadialGradient(MOON.x, MOON.y, MOON.r * 0.9, MOON.x, MOON.y + 120, 1250);
      rg.addColorStop(0, rgba([120, 108, 132], 0.34 * k));
      rg.addColorStop(0.4, rgba([58, 56, 98], 0.24 * k));
      rg.addColorStop(1, rgba([20, 22, 50], 0));
      g.fillStyle = rg; g.fillRect(-A.MARGIN, -A.MARGIN, W + 2 * A.MARGIN, H + 2 * A.MARGIN);
    });
  }

  function drawStars(t) {
    const fade = 0.35 + 0.65 * seg(t, 0.0, 1.4, E.inOutSine);
    withCam(t, 0.28, () => {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const d = Math.hypot(s.x - MOON.x, s.y - MOON.y);
        const moonFade = smooth(MOON.r * 1.08, MOON.r * 2.3, d);
        if (moonFade <= 0) continue;
        const tw = 0.64 + 0.26 * Math.sin(t * s.tw * TAU + s.ph) + 0.1 * Math.sin(t * s.tw * 2.7 + s.ph * 3);
        const a = fade * moonFade * (0.18 + 0.82 * s.b) * tw;
        const sz = s.size;
        g.globalAlpha = a;
        g.drawImage(A.starDot, s.x - sz, s.y - sz, sz * 2, sz * 2);
        if (s.spike) {
          const k = 18 + s.b * 34;
          g.globalAlpha = a * 0.7 * (0.75 + 0.25 * Math.sin(t * 2.1 + s.ph));
          g.drawImage(A.spike, s.x - k / 2, s.y - k / 2, k, k);
        }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    });
  }

  function computeMask(a) {
    const tilt = 0.5, L0 = Math.sin(a) * Math.cos(tilt), L1 = Math.sin(a) * Math.sin(tilt), L2 = -Math.cos(a);
    const d = maskImg.data;
    for (let py = 0; py < MS; py++) for (let px = 0; px < MS; px++) {
      const x = ((px + 0.5) / MS) * 2 - 1, y = ((py + 0.5) / MS) * 2 - 1, r2 = x * x + y * y, i = (py * MS + px) * 4;
      let v = 0;
      if (r2 < 1.02) {
        const z = Math.sqrt(Math.max(0, 1 - r2)), dot = x * L0 + y * L1 + z * L2;
        const ls = dot > 0 ? (2 * dot) / (dot + z + 1e-3) : 0;
        v = clamp(ls) * smooth(-0.04, 0.07, dot);
        v = Math.pow(v, 0.75);
      }
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255 * v;
    }
    maskG.putImageData(maskImg, 0, 0);
  }

  function drawMoon(t) {
    const a = phaseAngle(t), k = illum(a), fl = flash(t);
    const breathe = 1 + 0.035 * Math.sin(t * 1.25) * seg(t, 3, 5);
    const glow = (0.25 + 0.75 * Math.pow(k, 1.4)) * (1 + 0.6 * fl) * breathe;
    const { x, y, r } = MOON;
    withCam(t, 0.6, () => {
      // Back halo.
      g.globalCompositeOperation = 'lighter';
      let rg = g.createRadialGradient(x, y, r * 0.95, x, y, r * 4.4);
      rg.addColorStop(0, rgba(PAL.moonGlow, 0.2 * glow));
      rg.addColorStop(0.18, rgba(PAL.moonGlow, 0.075 * glow));
      rg.addColorStop(0.5, rgba([200, 180, 170], 0.02 * glow));
      rg.addColorStop(1, rgba(PAL.moonGlow, 0));
      g.fillStyle = rg; g.fillRect(x - r * 4.4, y - r * 4.4, r * 8.8, r * 8.8);
      rg = g.createRadialGradient(x, y, r * 0.98, x, y, r * 1.7);
      rg.addColorStop(0, rgba(PAL.moonGlow, 0.3 * glow));
      rg.addColorStop(0.3, rgba(PAL.moonGlow, 0.1 * glow));
      rg.addColorStop(1, rgba(PAL.moonGlow, 0));
      g.fillStyle = rg; g.fillRect(x - r * 1.7, y - r * 1.7, r * 3.4, r * 3.4);
      g.globalCompositeOperation = 'source-over';

      // Earthshine on the dark limb, then the sunlit part through the phase mask.
      g.globalAlpha = 0.16 * (1 - k * 0.95);
      g.drawImage(A.earth, x - r, y - r, r * 2, r * 2);
      g.globalAlpha = 1;
      if (a < Math.PI - 1e-3) {
        computeMask(a);
        moonTmpG.globalCompositeOperation = 'source-over';
        moonTmpG.clearRect(0, 0, moonTmp.width, moonTmp.height);
        moonTmpG.drawImage(A.moon, 0, 0);
        moonTmpG.globalCompositeOperation = 'destination-in';
        moonTmpG.imageSmoothingQuality = 'high';
        moonTmpG.drawImage(mask, 0, 0, moonTmp.width, moonTmp.height);
        g.drawImage(moonTmp, x - r, y - r, r * 2, r * 2);
      } else {
        g.drawImage(A.moon, x - r, y - r, r * 2, r * 2);
      }

      // Rim light + flash.
      g.globalCompositeOperation = 'lighter';
      rg = g.createRadialGradient(x, y, r * 0.86, x, y, r * 1.06);
      rg.addColorStop(0, rgba(PAL.moonGlow, 0));
      rg.addColorStop(0.75, rgba(PAL.moonGlow, 0.12 * glow * k));
      rg.addColorStop(1, rgba(PAL.moonGlow, 0));
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r * 1.06, 0, TAU); g.fill();
      if (fl > 0.01) {
        g.globalAlpha = 0.2 * fl;
        g.drawImage(A.glowDot, x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
        g.globalAlpha = 1;
        // Anamorphic streak across the frame.
        for (const [h, al] of [[26, 0.1], [3, 0.5]]) {
          const lg = g.createLinearGradient(x - W, 0, x + W, 0);
          lg.addColorStop(0, rgba(PAL.moonGlow, 0)); lg.addColorStop(0.5, rgba(PAL.moonGlow, al * fl)); lg.addColorStop(1, rgba(PAL.moonGlow, 0));
          g.fillStyle = lg; g.fillRect(x - W, y - h / 2, 2 * W, h);
        }
      }
      // Shockwave ring at full moon.
      const sp = seg(t, T.full, T.full + 1.3, E.outCubic);
      if (sp > 0 && sp < 1) {
        g.strokeStyle = rgba(PAL.goldHi, 0.55 * (1 - sp));
        g.lineWidth = 2.5 * (1 - sp) + 0.5;
        g.beginPath(); g.arc(x, y, r * (1.02 + 0.95 * sp), 0, TAU); g.stroke();
        g.strokeStyle = rgba(PAL.goldHi, 0.25 * (1 - sp));
        g.beginPath(); g.arc(x, y, r * (1.02 + 0.55 * sp), 0, TAU); g.stroke();
      }
      const dt = t - T.full;
      if (dt > 0 && dt < 2) {
        for (const s of sparks) {
          if (dt > s.life) continue;
          const rr = r * 1.01 + (s.v * (1 - Math.exp(-s.k * dt))) / s.k;
          const al = Math.pow(1 - dt / s.life, 1.6) * (0.7 + 0.3 * Math.sin(dt * 30 + s.tw));
          g.fillStyle = rgba(PAL.goldHi, al);
          g.beginPath(); g.arc(x + Math.cos(s.a) * rr, y + Math.sin(s.a) * rr, s.size, 0, TAU); g.fill();
        }
      }
      g.globalCompositeOperation = 'source-over';
    });
  }

  // Lunar dial: 朔 · 上弦 · 望 · 下弦 with 28 day ticks; the marker walks to 望.
  function drawDial(t) {
    const pr = seg(t, T.ring[0], T.ring[1], E.inOutCubic);
    if (pr <= 0) return;
    const settle = lerp(1, 0.5, seg(t, 3.2, 4.6, E.inOutSine)) * (1 - 0.25 * seg(t, T.trace[0], T.trace[1]));
    const { x, y } = MOON, rd = DIAL.r, a0 = -Math.PI / 2;
    const day = dayAt(t), am = a0 + ((day - 1) / 28) * TAU;
    withCam(t, 0.6, () => {
      g.lineCap = 'round';
      // Base ring with a bright drawing head.
      g.strokeStyle = rgba(PAL.gold, 0.5 * settle); g.lineWidth = 1.3;
      g.beginPath(); g.arc(x, y, rd, a0, a0 + TAU * pr); g.stroke();
      if (pr < 1) {
        const ha = a0 + TAU * pr;
        g.globalCompositeOperation = 'lighter';
        g.drawImage(A.glowDot, x + Math.cos(ha) * rd - 16, y + Math.sin(ha) * rd - 16, 32, 32);
        g.globalCompositeOperation = 'source-over';
      }
      // Progress arc from 朔 to the current day.
      if (t >= T.phase[0]) {
        const fade = 1 - seg(t, 3.4, 4.8);
        g.strokeStyle = rgba(PAL.goldHi, 0.9 * fade); g.lineWidth = 2.4;
        g.beginPath(); g.arc(x, y, rd, a0, am); g.stroke();
      }
      // Ticks.
      for (let i = 0; i < 56; i++) {
        const u = i / 56, ta = seg(pr, u - 0.005, u + 0.04);
        if (ta <= 0) continue;
        const ang = a0 + u * TAU, major = i % 14 === 0, dayTick = i % 2 === 0;
        const len = major ? 20 : dayTick ? 10 : 5;
        const lit = t >= T.phase[0] && ang <= am + 1e-6 && seg(t, 3.4, 4.8) < 1;
        g.strokeStyle = rgba(lit ? PAL.goldHi : PAL.gold, (major ? 0.9 : dayTick ? 0.6 : 0.35) * ta * settle);
        g.lineWidth = major ? 1.6 : 1.1;
        g.beginPath();
        g.moveTo(x + Math.cos(ang) * (rd + 4), y + Math.sin(ang) * (rd + 4));
        g.lineTo(x + Math.cos(ang) * (rd + 4 + len), y + Math.sin(ang) * (rd + 4 + len));
        g.stroke();
      }
      // Rotating inner dotted ring + outer arc segments.
      const rot = t * 0.07;
      g.fillStyle = rgba(PAL.goldHi, 0.3 * pr * settle);
      for (let i = 0; i < 120; i++) {
        const ang = rot + (i / 120) * TAU;
        g.beginPath(); g.arc(x + Math.cos(ang) * (rd - 16), y + Math.sin(ang) * (rd - 16), i % 10 === 0 ? 1.5 : 0.8, 0, TAU); g.fill();
      }
      g.strokeStyle = rgba(PAL.gold, 0.32 * pr * settle); g.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const s = -t * 0.11 + (k * TAU) / 3;
        g.beginPath(); g.arc(x, y, rd + 36, s, s + 0.55); g.stroke();
      }
      // Light sweeps once around the dial on the full-moon beat.
      const sw = seg(t, T.full, T.full + 0.85, E.inOutCubic);
      if (sw > 0 && sw < 1) {
        const ha = a0 + TAU * sw, al = Math.sin(Math.PI * sw);
        g.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 24; j++) {
          const aa = ha - j * 0.03;
          g.strokeStyle = rgba(PAL.goldHi, 0.9 * al * (1 - j / 24)); g.lineWidth = 2.4;
          g.beginPath(); g.arc(x, y, rd, aa - 0.03, aa); g.stroke();
        }
        g.globalAlpha = al;
        g.drawImage(A.glowDot, x + Math.cos(ha) * rd - 26, y + Math.sin(ha) * rd - 26, 52, 52);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      // Cardinal labels.
      g.font = font(400, 22, FONT.serif); g.textAlign = 'center'; g.textBaseline = 'middle';
      const labels = [['朔', 0], ['上弦', 0.25], ['望', 0.5], ['下弦', 0.75]];
      for (const [txt, u] of labels) {
        let la = seg(pr, u - 0.01, u + 0.08) * settle;
        if (txt === '望') la *= 1 - seg(t, T.trace[0] - 0.4, T.trace[0] + 0.3);
        if (la <= 0) continue;
        const ang = a0 + u * TAU, rl = rd + 44 + (txt.length > 1 ? 8 : 0);
        const hot = txt === '望' ? flash(t) : 0;
        g.fillStyle = rgba(hot > 0.05 ? PAL.goldHi : PAL.gold, la * (0.85 + 0.15 * hot));
        g.fillText(txt, x + Math.cos(ang) * rl, y + Math.sin(ang) * rl);
      }
      // Day marker.
      if (t >= T.phase[0] - 0.1) {
        const ma = seg(t, T.phase[0] - 0.1, T.phase[0] + 0.2) * (1 - seg(t, 3.4, 4.4));
        if (ma > 0) {
          const mx = x + Math.cos(am) * rd, my = y + Math.sin(am) * rd;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = ma;
          g.drawImage(A.glowDot, mx - 22, my - 22, 44, 44);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          g.save(); g.translate(mx, my); g.rotate(am + Math.PI / 4);
          g.fillStyle = rgba(PAL.goldHi, ma); g.fillRect(-5, -5, 10, 10);
          g.restore();
          g.strokeStyle = rgba(PAL.goldHi, 0.8 * ma); g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(x + Math.cos(am) * (rd - 8), y + Math.sin(am) * (rd - 8)); g.lineTo(x + Math.cos(am) * (rd - 30), y + Math.sin(am) * (rd - 30)); g.stroke();
        }
      }
    });
  }

  function drawCounter(t) {
    const vis = seg(t, T.phase[0] - 0.2, T.phase[0] + 0.3, E.outCubic) * (1 - seg(t, T.counterOut[0], T.counterOut[1], E.inOutSine));
    if (vis <= 0) return;
    const drop = 14 * seg(t, T.counterOut[0], T.counterOut[1], E.inCubic);
    const day = dayAt(t), di = Math.min(15, Math.floor(day + 1e-6)), frac = day - di;
    g.save();
    g.globalAlpha = vis;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    // 农历 · 八月
    const top = layout(g, font(400, 22, FONT.serif), '农历丙午年 · 八月', 0.42);
    top.chars.forEach(c => { g.fillStyle = rgba(PAL.lavender, 0.85); g.fillText(c.ch, 540 - top.width / 2 + c.x + c.w / 2, 1078 + drop); });
    // Day name, odometer-style.
    const pop = t >= T.full ? Math.sin(Math.PI * seg(t, T.full, T.full + 0.45)) : 0;
    const k = di > 1 && di < 15 ? seg(frac, 0, 0.35) : 1;
    g.save();
    g.beginPath(); g.rect(300, 1098 + drop, 480, 94); g.clip();
    const f = font(600, 70, FONT.serif);
    const drawDay = (idx, dy, a, s) => {
      const L = layout(g, f, DAYS[idx - 1], 0.18);
      g.save(); g.translate(540, 1170 + dy + drop); g.scale(s, s);
      L.chars.forEach(c => {
        const col = t >= T.full ? U.mix3(PAL.ivory, PAL.goldHi, 0.4 + 0.6 * pop) : PAL.ivory;
        g.fillStyle = rgba(col, a);
        g.fillText(c.ch, -L.width / 2 + c.x + c.w / 2, 0);
      });
      g.restore();
    };
    if (k < 1) drawDay(di - 1, -84 * E.inOutSine(k), 1 - k, 1);
    drawDay(di, 84 * (1 - E.inOutSine(k)), Math.min(1, k * 1.6), 1 + 0.07 * pop);
    g.restore();
    // Illumination read-out.
    const il = illum(phaseAngle(t)) * 100;
    const txt = `ILLUMINATION  ${il.toFixed(1).padStart(5, ' ')}%`;
    const L = layout(g, font(500, 17, FONT.mono), txt, 0.3);
    g.fillStyle = rgba(PAL.gold, 0.8);
    L.chars.forEach(c => g.fillText(c.ch, 540 - L.width / 2 + c.x + c.w / 2, 1236 + drop));
    g.restore();
  }

  function drawLabel(t) {
    const text = 'MID-AUTUMN FESTIVAL · 2026', n = text.length;
    const [a, b] = T.label;
    g.save();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const L = layout(g, font(500, 18, FONT.mono), text, 0.42);
    const x0 = 540 - L.width / 2, y = 158, f = Math.floor(t * FPS);
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
    L.chars.forEach((c, i) => {
      const ti = a + (b - a) * 0.75 * (i / (n - 1));
      if (t < ti - 0.3 || c.ch === ' ') return;
      let ch = c.ch, al = 0.72;
      if (t < ti) { ch = glyphs[Math.floor(hash(i, f >> 1) * glyphs.length)]; al = 0.45; }
      g.fillStyle = rgba(t < ti ? PAL.lavender : PAL.gold, al);
      g.fillText(ch, x0 + c.x + c.w / 2, y);
    });
    // Hairlines either side.
    const hp = seg(t, b - 0.35, b + 0.5, E.inOutCubic);
    if (hp > 0) {
      g.strokeStyle = rgba(PAL.gold, 0.5); g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x0 - 22, y); g.lineTo(x0 - 22 - 70 * hp, y);
      g.moveTo(x0 + L.width + 22, y); g.lineTo(x0 + L.width + 22 + 70 * hp, y);
      g.stroke();
    }
    g.restore();
  }

  function drawClouds(t) {
    const p = seg(t, T.clouds[0], T.clouds[1], E.outCubic);
    if (p <= 0) return;
    const list = [['big', 300, 904, -300, 1, 7], ['mid', 836, 954, W + 300, 1, -6]];
    withCam(t, 0.8, () => {
      for (const [key, fx0, fy, sx, alpha, drift] of list) {
        const C = A.clouds[key];
        const x = lerp(sx, fx0, p) + drift * Math.max(0, t - T.clouds[0]);
        const y = fy + 3 * Math.sin(t * 0.6 + fx0);
        g.globalAlpha = alpha * seg(t, T.clouds[0], T.clouds[0] + 0.8);
        g.drawImage(C.canvas, x + C.ox, y + C.oy, C.canvas.width / C.scale, C.canvas.height / C.scale);
      }
      g.globalAlpha = 1;
    });
  }

  function drawLand(t, from, to) {
    const k = illum(phaseAngle(t));
    for (let i = from; i <= to; i++) {
      const Lr = A.layers[i];
      const rise = 90 * (1 - E.outCubic(seg(t, T.land[0] + i * 0.22, T.land[1] - (3 - i) * 0.1)));
      withCam(t, 0.62 + i * 0.12, () => {
        g.globalAlpha = seg(t, T.land[0] + i * 0.22, T.land[0] + i * 0.22 + 0.8);
        // Moonlight reveals the landscape as the moon waxes.
        const lit = 0.3 + 0.7 * Math.pow(k, 0.8);
        if (lit < 0.995) g.filter = `brightness(${lit.toFixed(3)})`;
        g.drawImage(Lr.canvas, Lr.x, Lr.y + rise);
        g.filter = 'none';
        g.globalAlpha = 1;
        // Mist in front of this layer.
        if (i < 3) {
          const M = A.mist[i % 2], my = [1430, 1545, 1665][i] + rise * 0.5;
          const dx = ((t * (14 + i * 6) * (i % 2 ? -1 : 1)) % M.width + M.width) % M.width;
          g.globalAlpha = (0.13 + 0.05 * i) * seg(t, T.land[0] + 0.4, T.land[1]) * (0.45 + 0.55 * k);
          g.drawImage(M, -A.MARGIN - dx, my - M.height / 2);
          g.drawImage(M, -A.MARGIN - dx + M.width, my - M.height / 2);
          g.globalAlpha = 1;
        }
      });
    }
  }

  function drawNetwork(t) {
    if (t < T.nodes[0] - 0.1) return;
    const dim = lerp(1, 0.4, seg(t, T.netDim[0], T.netDim[1], E.inOutSine));
    withCam(t, 0.9, () => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      // Links between villages.
      for (const l of links) {
        const p = seg(t, l.t0, l.t1, E.inOutCubic);
        if (p <= 0) continue;
        const n = Math.max(1, Math.floor(p * (l.pts.length - 1)));
        g.strokeStyle = rgba(PAL.gold, 0.32 * dim); g.lineWidth = 1;
        g.beginPath();
        for (let i = 0; i <= n; i++) i ? g.lineTo(...l.pts[i]) : g.moveTo(...l.pts[i]);
        g.stroke();
      }
      // Arcs to the moon: glow pass + core pass, bright comet head while drawing.
      g.globalCompositeOperation = 'lighter';
      arcs.forEach((a, ai) => {
        const p = seg(t, a.t0, a.t1, E.inOutCubic);
        if (p <= 0) return;
        const pts = a.pts, n = Math.max(1, Math.floor(p * (pts.length - 1)));
        const settle = p < 1 ? 1 : lerp(1, 0.55, seg(t, a.t1, a.t1 + 0.8));
        for (const [lw, al] of [[6, 0.08], [1.6, 0.6]]) {
          for (let i = 1; i <= n; i++) {
            const tail = p < 1 ? Math.pow(i / n, 1.6) : 1;
            g.strokeStyle = rgba(i > n - 8 && p < 1 ? PAL.goldHi : PAL.gold, al * tail * settle * dim);
            g.lineWidth = lw;
            g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke();
          }
        }
        if (p < 1) {
          const [hx, hy] = pts[n];
          g.drawImage(A.glowDot, hx - 18, hy - 18, 36, 36);
        } else {
          // Contact flare on the moon rim, then data packets streaming up.
          const cf = Math.exp(-(t - a.t1) / 0.35);
          const [ex, ey] = pts[pts.length - 1];
          g.globalAlpha = 0.85 * cf + 0.18 * dim;
          g.drawImage(A.glowDot, ex - 26, ey - 26, 52, 52);
          g.globalAlpha = 1;
          const age = t - a.t1;
          for (let q = 0; q < 2; q++) {
            const u = (age * a.speed + a.ph + q * 0.5) % 1;
            const pa = Math.sin(Math.PI * u) * seg(age, 0, 0.5) * dim;
            for (let s = 0; s < 6; s++) {
              const uu = u - s * 0.012;
              if (uu < 0) continue;
              const [px, py] = pts[Math.round(uu * (pts.length - 1))];
              g.fillStyle = rgba(PAL.goldHi, pa * (1 - s / 6) * 0.9);
              g.beginPath(); g.arc(px, py, 2.4 - s * 0.3, 0, TAU); g.fill();
            }
          }
        }
      });
      // Village lights with ignition pings.
      nodes.forEach(n => {
        if (n.off) return;
        const p = seg(t, n.t0, n.t0 + 0.35, E.outCubic);
        if (p <= 0) return;
        const flick = 0.85 + 0.15 * Math.sin(t * 7 + n.x);
        g.globalAlpha = p * flick * (0.6 + 0.4 * dim);
        g.drawImage(A.lampDot, n.x - 20, n.y - 20, 40, 40);
        g.globalAlpha = 1;
        const pp = seg(t, n.t0, n.t0 + 0.9, E.outCubic);
        if (pp > 0 && pp < 1) {
          g.strokeStyle = rgba(PAL.lamp, 0.7 * (1 - pp)); g.lineWidth = 1.3;
          g.beginPath(); g.arc(n.x, n.y, 4 + 30 * pp, 0, TAU); g.stroke();
        }
      });
      g.globalCompositeOperation = 'source-over';
    });
  }

  function drawBranch(t) {
    const p = seg(t, 2.7, 4.3, E.outCubic);
    if (p <= 0) return;
    const [ax, ay] = A.branchAnchor, wx = 1112, wy = 262, sc = 0.9;
    const sway = 0.02 * Math.sin(t * 0.85 + 0.4) + 0.008 * Math.sin(t * 2.1 + 1.3);
    withCam(t, 1.15, () => {
      g.save();
      g.translate(wx + 170 * (1 - p), wy - 150 * (1 - p));
      g.rotate(sway - 0.12 * (1 - p));
      g.scale(sc, sc);
      g.globalAlpha = seg(t, 2.7, 3.4);
      g.drawImage(A.branch, -ax, -ay);
      g.restore();
    });
  }

  function drawPetals(t) {
    const vis = seg(t, T.petals[0], T.petals[1], E.inOutSine);
    if (vis <= 0) return;
    const span = H + 320;
    for (const p of petals) {
      const y = ((p.y0 + p.vy * t) % span) - 160;
      const x = p.x0 + Math.sin(t * p.fr * TAU + p.ph) * p.amp + t * 10;
      const flip = Math.cos(t * p.vf + p.pf);
      const s = p.size;
      g.save();
      g.translate(x, y); g.rotate(p.rot + t * p.vr); g.scale(Math.max(0.18, Math.abs(flip)), 1);
      g.globalAlpha = vis * (0.35 + 0.6 * p.z) * (0.75 + 0.25 * Math.abs(flip));
      const spr = p.z > 0.82 || p.z < 0.12 ? A.petalSoft : A.petal;
      g.drawImage(spr, -s / 2, -s / 2, s, s);
      g.restore();
    }
  }

  function drawPoem(t) {
    const [t0] = T.poem;
    if (t < t0) return;
    const cols = [['但', '愿', '人', '长', '久'], ['千', '里', '共', '婵', '娟']];
    const xs = [156, 92], y0 = 322, step = 58;
    g.save();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font(400, 40, FONT.serif);
    // Column rule.
    const lp = seg(t, t0, t0 + 1.4, E.inOutCubic);
    g.strokeStyle = rgba(PAL.gold, 0.35); g.lineWidth = 1;
    g.beginPath(); g.moveTo(124, y0 - 30); g.lineTo(124, y0 - 30 + (step * 5) * lp); g.stroke();
    cols.forEach((col, ci) => col.forEach((ch, ri) => {
      const i = ci * 5 + ri, p = seg(t, t0 + i * 0.12, t0 + i * 0.12 + 0.6, E.outCubic);
      if (p <= 0) return;
      g.filter = p < 1 ? `blur(${(1 - p) * 7}px)` : 'none';
      g.fillStyle = rgba(PAL.ivory, 0.92 * p);
      g.fillText(ch, xs[ci], y0 + ri * step + 14 * (1 - p));
    }));
    g.filter = 'none';
    g.restore();
  }

  function drawTitle(t) {
    const [a, b] = T.trace;
    if (t < a) return;
    const { FS, B, list, box } = glyphs;
    const fillP = seg(t, T.fill[0], T.fill[1], E.inOutSine);
    const shineP = seg(t, T.shine[0], T.shine[1], E.inOutQuad);
    // 1) Filled calligraphy with a top-down ink wipe, rendered offscreen.
    const oy = box.y0 - 60, h = fx.height;
    fxG.setTransform(1, 0, 0, 1, 0, 0);
    fxG.clearRect(0, 0, W, h);
    if (fillP > 0) {
      fxG.save();
      fxG.translate(0, -oy);
      const grad = fxG.createLinearGradient(0, box.y0, 0, box.y1);
      grad.addColorStop(0, 'rgb(255,248,230)'); grad.addColorStop(0.55, 'rgb(244,221,168)'); grad.addColorStop(1, 'rgb(212,168,96)');
      fxG.fillStyle = grad;
      for (const G of list) {
        fxG.save(); fxG.translate(G.ox, B); fxG.scale(FS, FS);
        fxG.fill(G.full, 'nonzero');
        fxG.restore();
      }
      // Wipe mask.
      const band = 140, edge = lerp(box.y0 - band, box.y1 + band, fillP);
      const m = fxG.createLinearGradient(0, edge - band, 0, edge);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      fxG.globalCompositeOperation = 'destination-in';
      fxG.fillStyle = m; fxG.fillRect(0, box.y0 - 200, W, box.y1 - box.y0 + 400);
      // Shine sweep.
      if (shineP > 0 && shineP < 1) {
        fxG.globalCompositeOperation = 'source-atop';
        const sx = lerp(box.x0 - 300, box.x1 + 300, shineP);
        const sg = fxG.createLinearGradient(sx - 120, box.y0, sx + 120, box.y1);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,250,0.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        fxG.fillStyle = sg; fxG.fillRect(box.x0 - 400, box.y0 - 100, box.x1 - box.x0 + 800, box.y1 - box.y0 + 200);
      }
      fxG.restore();
      g.save();
      g.shadowColor = rgba([255, 200, 120], 0.45 * fillP);
      g.shadowBlur = 38;
      g.drawImage(fx, 0, oy);
      g.restore();
    }
    // 2) Gold contour trace with comet heads.
    const traceFade = 1 - 0.8 * seg(t, T.fill[0] + 0.3, T.fill[1] + 0.3);
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    list.forEach((G, j) => {
      G.contours.forEach((c, k) => {
        const s0 = a + j * 0.3 + k * 0.08, p = seg(t, s0, s0 + (b - a) - 0.45, E.inOutCubic);
        if (p <= 0) return;
        g.save(); g.translate(G.ox, B); g.scale(FS, FS);
        g.setLineDash([c.len * p, c.len * 2]);
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rgba(PAL.gold, 0.22 * traceFade); g.lineWidth = 7 / FS; g.stroke(c.path);
        g.strokeStyle = rgba(PAL.goldHi, 0.95 * traceFade); g.lineWidth = 1.8 / FS; g.stroke(c.path);
        g.restore();
        if (p < 1) {
          const [hx, hy] = c.samples[Math.round(p * 160)];
          const px = G.ox + hx * FS, py = B + hy * FS;
          g.globalCompositeOperation = 'lighter';
          g.drawImage(A.glowDot, px - 20, py - 20, 40, 40);
          g.globalCompositeOperation = 'source-over';
        }
      });
    });
    g.restore();
  }

  function drawSeal(t) {
    const p = seg(t, T.seal, T.seal + 0.32);
    if (p <= 0) return;
    const S = 86, x = 846, y = 1210;
    const s = p < 0.7 ? lerp(1.9, 0.96, E.inCubic(p / 0.7)) : lerp(0.96, 1, E.outQuad((p - 0.7) / 0.3));
    const imp = T.seal + 0.22;
    g.save();
    // Ink bloom on impact.
    const bp = seg(t, imp, imp + 0.7, E.outCubic);
    if (bp > 0 && bp < 1) {
      g.strokeStyle = rgba(PAL.cinnabar, 0.45 * (1 - bp)); g.lineWidth = 2;
      g.strokeRect(x - S / 2 - 22 * bp, y - S / 2 - 22 * bp, S + 44 * bp, S + 44 * bp);
    }
    g.translate(x, y); g.rotate(lerp(-0.2, -0.05, E.outCubic(p))); g.scale(s, s);
    g.globalAlpha = seg(p, 0, 0.45);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 18 * (1 - p) + 4; g.shadowOffsetY = 6 * (1 - p) + 2;
    g.drawImage(A.seal, -S / 2, -S / 2, S, S);
    g.restore();
  }

  // Lock-up, divider, greeting and date; drawn into fx so the final sweep can ride on it.
  function drawLockup(t) {
    if (t < T.lockup[0]) return;
    const oy = 1270, h = fx.height;
    fxG.setTransform(1, 0, 0, 1, 0, 0);
    fxG.clearRect(0, 0, W, h);
    fxG.save(); fxG.translate(0, -oy);
    fxG.textAlign = 'center'; fxG.textBaseline = 'alphabetic';

    // Line 1: 栋森网络科技  携  Opus 5.5
    const fA = font(600, 42, FONT.serif), fB = font(300, 28, FONT.serif), fC = font(600, 58, FONT.latin);
    const LA = layout(fxG, fA, '栋森网络科技', 0.16);
    fxG.font = fB; const wB = fxG.measureText('携').width;
    fxG.font = fC; const wC = fxG.measureText('Opus 5.5').width;
    const gap = 26, total = LA.width + gap + wB + gap + wC, x0 = 540 - total / 2, y1 = 1352;
    const pA = seg(t, T.lockup[0], T.lockup[0] + 0.95, E.outCubic);
    const trackA = lerp(0.62, 0.16, pA), cA = x0 + LA.width / 2;
    fxG.font = fA;
    LA.chars.forEach((c, i) => {
      const pos = c.x + c.w / 2 - LA.width / 2;
      const spread = pos * (1 + (trackA - 0.16) * 1.6);
      fxG.filter = pA < 1 ? `blur(${(1 - pA) * 6}px)` : 'none';
      fxG.fillStyle = rgba(PAL.ivory, pA);
      fxG.fillText(c.ch, cA + spread, y1);
    });
    fxG.filter = 'none';
    const pB = seg(t, T.lockup[0] + 0.45, T.lockup[0] + 0.85);
    if (pB > 0) {
      fxG.save(); fxG.translate(x0 + LA.width + gap + wB / 2, y1 - 11); fxG.scale(E.outBack(pB, 2.2), E.outBack(pB, 2.2));
      fxG.font = fB; fxG.fillStyle = rgba(PAL.gold, pB); fxG.textBaseline = 'middle'; fxG.fillText('携', 0, 0);
      fxG.restore();
    }
    const pC = seg(t, T.lockup[0] + 0.2, T.lockup[0] + 1.05, E.outCubic);
    if (pC > 0) {
      fxG.font = fC;
      fxG.filter = pC < 1 ? `blur(${(1 - pC) * 6}px)` : 'none';
      const og = fxG.createLinearGradient(0, y1 - 40, 0, y1 + 8);
      og.addColorStop(0, rgba(PAL.goldHi, pC)); og.addColorStop(1, rgba(PAL.gold, pC));
      fxG.fillStyle = og;
      fxG.fillText('Opus 5.5', x0 + total - wC / 2 + 36 * (1 - pC), y1 + 2);
      fxG.filter = 'none';
    }

    // Divider with a centre lozenge.
    const pd = seg(t, T.divider[0], T.divider[1], E.inOutCubic);
    if (pd > 0) {
      const y = 1400, half = 230 * pd;
      const lg = fxG.createLinearGradient(540 - half, 0, 540 + half, 0);
      lg.addColorStop(0, rgba(PAL.gold, 0)); lg.addColorStop(0.5, rgba(PAL.gold, 0.85)); lg.addColorStop(1, rgba(PAL.gold, 0));
      fxG.fillStyle = lg; fxG.fillRect(540 - half, y - 0.6, half * 2, 1.2);
      fxG.save(); fxG.translate(540, y); fxG.rotate(Math.PI / 4 * E.outBack(pd)); fxG.scale(pd, pd);
      fxG.fillStyle = `rgb(${PAL.goldHi})`; fxG.fillRect(-5, -5, 10, 10);
      fxG.fillStyle = 'rgb(12,15,36)'; fxG.fillRect(-2, -2, 4, 4);
      fxG.restore();
    }

    // Greeting, glyph by glyph.
    const fG = font(600, 56, FONT.serif), LG = layout(fxG, fG, '祝大家中秋佳节快乐', 0.26);
    const gx0 = 540 - LG.width / 2, gy = 1486;
    fxG.font = fG;
    const gg = fxG.createLinearGradient(0, gy - 50, 0, gy + 8);
    gg.addColorStop(0, 'rgb(255,247,228)'); gg.addColorStop(1, 'rgb(232,204,146)');
    LG.chars.forEach((c, i) => {
      const s0 = T.greet[0] + i * 0.1, p = seg(t, s0, s0 + 0.6, E.outCubic);
      if (p <= 0) return;
      fxG.filter = p < 1 ? `blur(${(1 - p) * 8}px)` : 'none';
      fxG.globalAlpha = p;
      fxG.fillStyle = gg;
      fxG.fillText(c.ch, gx0 + c.x + c.w / 2, gy + 20 * (1 - p));
    });
    fxG.filter = 'none'; fxG.globalAlpha = 1;

    // Date line.
    const pdt = seg(t, T.date[0], T.date[1], E.outCubic);
    if (pdt > 0) {
      const LD = layout(fxG, font(400, 23, FONT.serif), '丙午年 · 八月十五', lerp(0.9, 0.5, pdt));
      fxG.fillStyle = rgba(PAL.lavender, 0.82 * pdt);
      LD.chars.forEach(c => fxG.fillText(c.ch, 540 - LD.width / 2 + c.x + c.w / 2, 1546));
    }

    // Final light sweep.
    const sp = seg(t, T.sweep[0], T.sweep[1], E.inOutSine);
    if (sp > 0 && sp < 1) {
      fxG.globalCompositeOperation = 'source-atop';
      const sx = lerp(80, 1000, sp);
      const sg = fxG.createLinearGradient(sx - 90, 1300, sx + 90, 1420);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,253,240,0.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      fxG.fillStyle = sg; fxG.fillRect(0, 1280, W, 300);
      fxG.globalCompositeOperation = 'source-over';
    }
    fxG.restore();
    g.save();
    g.shadowColor = 'rgba(2,3,10,0.85)'; g.shadowBlur = 24;
    g.drawImage(fx, 0, oy);
    g.restore();
  }

  function drawBloom() {
    bloomG.setTransform(1, 0, 0, 1, 0, 0);
    bloomG.globalCompositeOperation = 'copy';
    bloomG.filter = 'brightness(0.78) contrast(2.6) blur(2.5px)';
    bloomG.drawImage(cv, 0, 0, bloom.width, bloom.height);
    bloomG.filter = 'none';
    g.save();
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.28;
    g.imageSmoothingQuality = 'high';
    g.drawImage(bloom, 0, 0, W, H);
    g.restore();
  }

  function drawFinish(t) {
    g.drawImage(A.vignette, 0, 0);
    // Film grain (also dithers the dark gradients against banding).
    // Grain refreshes at 30 Hz like film stock; light enough to survive platform re-encodes.
    const f = Math.floor(t * 30), tile = A.grain[f % A.grain.length];
    const ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
    g.save();
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = 0.06;
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(tile, x, y);
    g.restore();
    // Fade in from night, fade out at the end.
    const black = Math.max(0.5 * (1 - seg(t, 0, 0.8, E.outSine)), E.inCubic(seg(t, T.outro[0], T.outro[1])));
    if (black > 0) { g.fillStyle = `rgba(0,0,0,${black})`; g.fillRect(0, 0, W, H); }
  }

  // ------------------------------------------------------------------ frame
  function renderAt(t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
    g.fillStyle = '#03050d'; g.fillRect(0, 0, W, H);
    drawSky(t);
    drawStars(t);
    drawDial(t);
    drawMoon(t);
    drawLand(t, 0, 2);
    drawClouds(t);
    drawNetwork(t);
    drawLand(t, 3, 3);
    drawBranch(t);
    drawPetals(t);
    drawLabel(t);
    drawCounter(t);
    drawPoem(t);
    drawTitle(t);
    drawSeal(t);
    drawLockup(t);
    drawBloom();
    drawFinish(t);
  }

  return { init, renderAt };
})();
