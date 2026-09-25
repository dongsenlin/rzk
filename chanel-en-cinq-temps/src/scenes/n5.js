/* V. N°5 - bars 24-28 (0:46-0:56)
 * An architect's elevation of the bottle, one construction per beat. Glass.
 * Gold rises in five steps - five notes, base to top, one per beat. The
 * stopper lifts; the sillage rises in gold particles and, on the downbeat
 * of bar 28, every particle lands in N°5. Then all of it collapses back
 * into the point the film began with.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, T, C, E, P, clamp, lerp } = K;

  const S0 = T(24);
  // bottle geometry, local units: x centred, y up from the base (negative)
  const BX = W / 2, BY = 902;
  const BODY = { x: 210, top: -500 };
  const BEVEL = 26;
  const NECK = { x: 58, top: -534 };
  const STOP = { cy: -606, w: 300, h: 144, flat: 184, side: 56 };
  const LABEL = { cy: -318, w: 246, h: 170 };

  const octagon = (cx, cy, w, h, flat, side) => [
    [cx - flat / 2, cy - h / 2], [cx + flat / 2, cy - h / 2], [cx + w / 2, cy - side / 2], [cx + w / 2, cy + side / 2],
    [cx + flat / 2, cy + h / 2], [cx - flat / 2, cy + h / 2], [cx - w / 2, cy + side / 2], [cx - w / 2, cy - side / 2],
  ];
  const polyPath = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  };
  const rectPts = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

  // ------------------------------------------------ construction --
  function construction(ctx, t, alpha) {
    const b = (k) => E.couture(P(t, T(24, k), 0.55));
    ctx.save();
    ctx.translate(BX, BY);
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = K.rgba(C.ivoire, 0.85 * alpha);
    // beat 1: axis, ground line, body
    ctx.save();
    ctx.setLineDash([24, 7, 3, 7]);
    ctx.strokeStyle = K.rgba(C.ivoire, 0.35 * alpha);
    K.rule(ctx, 0, 60, 0, -760, b(1));
    ctx.restore();
    K.ruleC(ctx, -W / 2, 0, W / 2, 0, b(1));
    K.partialPolyline(ctx, rectPts(-BODY.x, 0, BODY.x, BODY.top).slice(0), b(1));
    // beat 2: the bevel
    const ix = BODY.x - BEVEL, it = BODY.top + BEVEL, ib = -BEVEL;
    K.partialPolyline(ctx, rectPts(-ix, ib, ix, it), b(2));
    [[-BODY.x, 0, -ix, ib], [BODY.x, 0, ix, ib], [BODY.x, BODY.top, ix, it], [-BODY.x, BODY.top, -ix, it]].forEach(([a, c, d, e]) => K.rule(ctx, a, c, d, e, b(2)));
    // beat 3: neck, construction circle, octagon, facets
    K.partialPolyline(ctx, [[-NECK.x, BODY.top], [-NECK.x, NECK.top], [NECK.x, NECK.top], [NECK.x, BODY.top]], b(3));
    const circ = b(3);
    if (circ > 0) {
      ctx.save();
      ctx.strokeStyle = K.rgba(C.ivoire, 0.3 * alpha);
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.ellipse(0, STOP.cy, STOP.w / 2, STOP.h / 2, 0, -Math.PI / 2, -Math.PI / 2 + circ * K.TAU);
      ctx.stroke();
      ctx.restore();
    }
    const oct = octagon(0, STOP.cy, STOP.w, STOP.h, STOP.flat, STOP.side);
    K.partialPolyline(ctx, oct.concat([oct[0]]), E.couture(P(t, T(24, 3, 0.3), 0.55)));
    const inner = octagon(0, STOP.cy, STOP.w * 0.62, STOP.h * 0.5, STOP.flat * 0.56, STOP.side * 0.5);
    const fu = E.couture(P(t, T(24, 3, 0.55), 0.5));
    K.partialPolyline(ctx, inner.concat([inner[0]]), fu);
    oct.forEach((p, i) => K.rule(ctx, p[0], p[1], inner[i][0], inner[i][1], fu));
    // beat 4: the label, double rule
    const lx = LABEL.w / 2, ly0 = LABEL.cy - LABEL.h / 2, ly1 = LABEL.cy + LABEL.h / 2;
    K.partialPolyline(ctx, rectPts(-lx, ly0, lx, ly1), b(4));
    K.partialPolyline(ctx, rectPts(-lx + 7, ly0 + 7, lx - 7, ly1 - 7), E.couture(P(t, T(24, 4, 0.2), 0.55)));
    // beat 5: dimensions and notes
    const d = b(5);
    if (d > 0) {
      ctx.strokeStyle = K.rgba(C.ivoire, 0.5 * alpha);
      ctx.fillStyle = K.rgba(C.ivoire, 0.7 * alpha);
      // width dimension under the base
      const dy = 44;
      K.ruleC(ctx, -BODY.x, dy, BODY.x, dy, d);
      K.rule(ctx, -BODY.x, 10, -BODY.x, dy + 10, d);
      K.rule(ctx, BODY.x, 10, BODY.x, dy + 10, d);
      ctx.globalAlpha = alpha * 0.8;
      K.typeOn(ctx, '5 : 6', 0, dy + 30, K.MONO, P(t, T(24, 5, 0.2), 0.3), { align: 'center' });
      // height dimension, right
      const dx = BODY.x + 60;
      K.ruleC(ctx, dx, 0, dx, BODY.top, d);
      K.rule(ctx, BODY.x + 12, 0, dx + 12, 0, d);
      K.rule(ctx, BODY.x + 12, BODY.top, dx + 12, BODY.top, d);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // leader notes around the drawing
  function notes(ctx, t, alpha) {
    const items = [
      { t: T(24, 3, 0.6), at: [STOP.w / 2, STOP.cy], to: [430, STOP.cy], label: 'BOUCHON OCTOGONAL', sub: 'LE PLAN DE LA PLACE VENDÔME' },
      { t: T(24, 2, 0.5), at: [-BODY.x + BEVEL / 2, -150], to: [-430, -150], label: 'VERRE BISEAUTÉ', sub: '', left: true },
      { t: T(24, 4, 0.4), at: [LABEL.w / 2, LABEL.cy], to: [430, LABEL.cy], label: 'ÉTIQUETTE', sub: '' },
    ];
    ctx.save();
    ctx.translate(BX, BY);
    for (const n of items) {
      const u = E.couture(P(t, n.t, 0.5));
      if (u <= 0) continue;
      ctx.strokeStyle = K.rgba(C.ivoire, 0.5 * alpha);
      ctx.lineWidth = 1;
      K.rule(ctx, n.at[0], n.at[1], n.to[0], n.to[1], u);
      ctx.fillStyle = K.rgba(C.ivoire, alpha);
      ctx.beginPath();
      ctx.arc(n.at[0], n.at[1], 2.6 * clamp(u * 3), 0, K.TAU);
      ctx.fill();
      ctx.globalAlpha = 0.85 * alpha;
      const x = n.to[0] + (n.left ? -14 : 14);
      K.typeOn(ctx, n.label, x, n.to[1] + 5, K.MONO, P(t, n.t + 0.15, 0.4), { align: n.left ? 'right' : 'left' });
      if (n.sub) {
        ctx.globalAlpha = 0.5 * alpha;
        K.typeOn(ctx, n.sub, x, n.to[1] + 29, K.MONO_S, P(t, n.t + 0.35, 0.5), { align: n.left ? 'right' : 'left' });
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ----------------------------------------------------- glass --
  const NOTES = ['SANTAL', 'JASMIN', 'ROSE DE MAI', 'YLANG-YLANG', 'ALDÉHYDES'];
  function level(t) {
    // five steps, one per beat of bar 26, each with a small slosh after
    let L = 0, slosh = 0;
    for (let k = 0; k < 5; k++) {
      const tb = T(26, k + 1);
      const u = E.couture(P(t, tb, 0.34));
      L += u / 5;
      if (t >= tb) slosh += Math.exp(-(t - tb) / 0.28) * Math.sin((t - tb) * 22) * 7;
    }
    return { L, slosh };
  }

  function glass(ctx, t, a, stopperLift) {
    const ix = BODY.x - BEVEL, it = BODY.top + BEVEL, ib = -BEVEL;
    ctx.save();
    ctx.translate(BX, BY);
    ctx.globalAlpha = a;
    // body glass
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(-BODY.x, BODY.top, BODY.x * 2, -BODY.top);
    // the juice
    const { L, slosh } = level(t);
    if (L > 0) {
      const top = ib + (it - ib) * L;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-ix, it, ix * 2, ib - it);
      ctx.clip();
      const g = ctx.createLinearGradient(0, it, 0, ib);
      g.addColorStop(0, C.orPale);
      g.addColorStop(0.45, C.or);
      g.addColorStop(1, C.orProfond);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-ix - 2, ib + 2);
      for (let x = -ix - 2; x <= ix + 2; x += 6) ctx.lineTo(x, top + (x / ix) * slosh + Math.sin(x * 0.03 + t * 5) * 1.4);
      ctx.lineTo(ix + 2, ib + 2);
      ctx.closePath();
      ctx.fill();
      // refraction bands in the juice
      const rg = ctx.createLinearGradient(-ix, 0, ix, 0);
      rg.addColorStop(0, 'rgba(60,35,5,0.45)');
      rg.addColorStop(0.18, 'rgba(255,240,200,0.10)');
      rg.addColorStop(0.5, 'rgba(0,0,0,0.0)');
      rg.addColorStop(0.82, 'rgba(255,240,200,0.14)');
      rg.addColorStop(1, 'rgba(60,35,5,0.5)');
      ctx.fillStyle = rg;
      ctx.fillRect(-ix, top - 20, ix * 2, ib - top + 20);
      // meniscus
      ctx.strokeStyle = 'rgba(255,244,214,0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = -ix; x <= ix; x += 6) {
        const y = top + (x / ix) * slosh + Math.sin(x * 0.03 + t * 5) * 1.4;
        x === -ix ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    // bevel faces catch the light
    const faces = [
      [[-BODY.x, BODY.top], [BODY.x, BODY.top], [ix, it], [-ix, it], 0.16],
      [[-BODY.x, BODY.top], [-ix, it], [-ix, ib], [-BODY.x, 0], 0.1],
      [[BODY.x, BODY.top], [BODY.x, 0], [ix, ib], [ix, it], 0.05],
      [[-BODY.x, 0], [-ix, ib], [ix, ib], [BODY.x, 0], 0.12],
    ];
    for (const f of faces) {
      polyPath(ctx, f.slice(0, 4));
      ctx.fillStyle = `rgba(255,255,255,${f[4]})`;
      ctx.fill();
    }
    // edges
    ctx.strokeStyle = 'rgba(242,238,230,0.55)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-BODY.x, BODY.top, BODY.x * 2, -BODY.top);
    ctx.strokeStyle = 'rgba(242,238,230,0.3)';
    ctx.strokeRect(-ix, it, ix * 2, ib - it);
    // vertical reflections
    for (const [x0, w0, al] of [[-ix + 14, 16, 0.16], [ix - 34, 10, 0.1]]) {
      const vg = ctx.createLinearGradient(x0, 0, x0 + w0, 0);
      vg.addColorStop(0, 'rgba(255,255,255,0)');
      vg.addColorStop(0.5, `rgba(255,255,255,${al})`);
      vg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = vg;
      ctx.fillRect(x0, it + 10, w0, ib - it - 20);
    }
    // neck
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(-NECK.x, NECK.top, NECK.x * 2, BODY.top - NECK.top);
    ctx.strokeStyle = 'rgba(242,238,230,0.45)';
    ctx.strokeRect(-NECK.x, NECK.top, NECK.x * 2, BODY.top - NECK.top);
    // stopper, cut glass
    ctx.save();
    ctx.translate(0, -stopperLift);
    const oct = octagon(0, STOP.cy, STOP.w, STOP.h, STOP.flat, STOP.side);
    const inner = octagon(0, STOP.cy, STOP.w * 0.62, STOP.h * 0.5, STOP.flat * 0.56, STOP.side * 0.5);
    polyPath(ctx, oct);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      polyPath(ctx, [oct[i], oct[j], inner[j], inner[i]]);
      const lit = [0.2, 0.26, 0.1, 0.04, 0.03, 0.05, 0.08, 0.16][i];
      ctx.fillStyle = `rgba(255,255,255,${lit})`;
      ctx.fill();
    }
    polyPath(ctx, inner);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(242,238,230,0.5)';
    ctx.lineWidth = 1;
    polyPath(ctx, oct);
    ctx.stroke();
    polyPath(ctx, inner);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function labelArt(ctx, t, a) {
    const u = E.couture(P(t, T(25, 3), 0.6));
    if (u <= 0) return;
    ctx.save();
    ctx.translate(BX, BY + LABEL.cy);
    ctx.globalAlpha = a * u;
    const w = LABEL.w, h = LABEL.h;
    ctx.fillStyle = '#FAF8F3';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = C.noir;
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20);
    ctx.fillStyle = C.noir;
    K.typeOn(ctx, 'N°5', 0, -12, { family: 'Jost', size: 50, weight: 600, tracking: 0.02 }, P(t, T(25, 3, 0.3), 0.3), { align: 'center' });
    K.typeOn(ctx, 'CHANEL', 0, 28, { family: 'Jost', size: 25, weight: 600, tracking: 0.16 }, P(t, T(25, 3, 0.5), 0.35), { align: 'center' });
    K.typeOn(ctx, 'PARIS', 0, 50, { family: 'Jost', size: 10, weight: 500, tracking: 0.5 }, P(t, T(25, 3, 0.7), 0.3), { align: 'center' });
    K.typeOn(ctx, 'PARFUM', 0, 70, { family: 'Jost', size: 8, weight: 500, tracking: 0.5 }, P(t, T(25, 4), 0.3), { align: 'center' });
    ctx.restore();
  }

  // a sweep of light across the glass, clipped to the silhouette
  function sweep(ctx, t) {
    const u = P(t, T(25, 1, 0.5), 1.0, E.inOutSine);
    if (u <= 0 || u >= 1) return;
    ctx.save();
    ctx.translate(BX, BY);
    ctx.beginPath();
    ctx.rect(-BODY.x, BODY.top, BODY.x * 2, -BODY.top);
    ctx.rect(-NECK.x, NECK.top, NECK.x * 2, BODY.top - NECK.top);
    polyPath(ctx, octagon(0, STOP.cy, STOP.w, STOP.h, STOP.flat, STOP.side));
    ctx.clip();
    const x = lerp(-520, 520, u);
    ctx.rotate(0.32);
    const g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,250,240,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - 90, -1200, 180, 1600);
    ctx.restore();
  }

  function gauge(ctx, t, a) {
    const ix = BODY.x - BEVEL, it = BODY.top + BEVEL, ib = -BEVEL;
    ctx.save();
    ctx.translate(BX, BY);
    for (let k = 0; k < 5; k++) {
      const tb = T(26, k + 1);
      const u = E.couture(P(t, tb + 0.05, 0.4));
      if (u <= 0) continue;
      const y = ib + ((it - ib) * (k + 1)) / 5;
      ctx.globalAlpha = a;
      ctx.strokeStyle = K.rgba(C.or, 0.8);
      ctx.lineWidth = 1;
      K.rule(ctx, -BODY.x - 16, y, -BODY.x - 16 - 150, y, u);
      K.rule(ctx, BODY.x + 16, y, BODY.x + 16 + 40, y, u);
      ctx.fillStyle = C.orPale;
      K.typeOn(ctx, NOTES[k], -BODY.x - 180, y + 5, K.MONO, P(t, tb + 0.1, 0.4), { align: 'right' });
      ctx.fillStyle = K.rgba(C.orPale, 0.7);
      K.typeOn(ctx, String(k + 1), BODY.x + 66, y + 5, K.MONO, P(t, tb + 0.1, 0.2));
    }
    ctx.restore();
    ctx.globalAlpha = a;
    ctx.fillStyle = C.orPale;
    K.typeOn(ctx, 'CINQ NOTES', 1470, 322, K.LABEL, P(t, T(26, 1), 0.5));
    ctx.fillStyle = K.rgba(C.orPale, 0.55);
    K.typeOn(ctx, 'DU FOND AU SOMMET', 1470, 356, K.MONO, P(t, T(26, 1, 0.5), 0.5));
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------- particles --
  const NP = 2600;
  let parts = null;
  function buildParticles() {
    // targets: sample the filled N°5 on a raster
    const size = 640;
    const key = 'bodoni-display-400';
    const gs = ['N', '°', '5'].map((ch) => K.glyph(key, ch));
    const s = size / gs[0].upm;
    const kern = [-0.03 * size, -0.02 * size];
    let total = 0;
    gs.forEach((g, i) => (total += g.adv * s + (kern[i] || 0)));
    const layout = [];
    let x = W / 2 - total / 2;
    gs.forEach((g, i) => {
      layout.push({ ch: ['N', '°', '5'][i], x });
      x += g.adv * s + (kern[i] || 0);
    });
    const base = H / 2 + (K.glyph(key, 'N').bbox[3] * s) / 2;
    const cv = document.createElement('canvas');
    const q = 0.5;
    cv.width = W * q;
    cv.height = H * q;
    const c = cv.getContext('2d');
    c.scale(q, q);
    c.fillStyle = '#fff';
    layout.forEach((l) => K.fillGlyph(c, key, l.ch, l.x, base, size));
    const img = c.getImageData(0, 0, cv.width, cv.height).data;
    const pix = [];
    for (let y = 0; y < cv.height; y++) for (let xx = 0; xx < cv.width; xx++) if (img[(y * cv.width + xx) * 4 + 3] > 160) pix.push([xx / q, y / q]);
    const rnd = K.rng(1921);
    const neckY = BY + NECK.top;
    const P0 = [];
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    for (let i = 0; i < NP; i++) {
      const tp = pix[Math.floor(rnd() * pix.length)];
      P0.push({
        tx: tp[0] + (rnd() - 0.5) * 2, ty: tp[1] + (rnd() - 0.5) * 2,
        b: T(27, 1, 0.3) + rnd() * 1.7,
        rib: i % 3,
        o: gauss(),
        ex: BX + (rnd() - 0.5) * 30, ey: neckY - 26 + (rnd() - 0.5) * 10,
        k0: rnd(), size: 0.8 + rnd() * 1.9, tw: rnd() * K.TAU,
        jx: rnd() * K.TAU, jy: rnd() * K.TAU,
        hue: rnd(),
      });
    }
    return { P0, layout, base, size, key };
  }

  // Sillage: three ribbons of dust, each a travelling wave along its own
  // plume - coherent like smoke, never a burst. `tau` is the particle's age;
  // its place along the ribbon is fixed by age, its place across by `o`.
  const RIBBONS = [
    { rise: 200, lean: -330, A: 110, k: 0.016, w: 1.6, ph: 0.0, width: 80 },
    { rise: 235, lean: 40, A: 80, k: 0.013, w: 1.3, ph: 2.1, width: 60 },
    { rise: 180, lean: 360, A: 125, k: 0.017, w: 1.8, ph: 4.0, width: 90 },
  ];
  function freePos(p, tau, t) {
    const r = RIBBONS[p.rib];
    const along = r.rise * tau;
    const amp = r.A * Math.min(1, 0.15 + tau * 0.9);
    const wave = Math.sin(r.k * along - r.w * t + r.ph);
    const width = 10 + r.width * tau;
    // normal of the ribbon ~ horizontal for a mostly vertical plume
    return [
      p.ex + r.lean * tau * tau * 0.6 + amp * wave + p.o * width + Math.sin(t * 1.7 + p.jx) * 3,
      p.ey - along - Math.abs(p.o) * 6 + Math.cos(t * 1.3 + p.jy) * 3,
    ];
  }
  const T_LAND = T(28, 1);
  function particlePos(p, t) {
    const tau = t - p.b;
    if (tau < 0) return null;
    let [x, y] = freePos(p, tau, t);
    // converge: every particle lands exactly on the downbeat of bar 28
    const c0 = T_LAND - 0.95 + p.k0 * 0.35;
    const k = E.inOutCubic(clamp((t - c0) / (T_LAND - c0)));
    x = lerp(x, p.tx, k);
    y = lerp(y, p.ty, k);
    if (t > T_LAND) {
      x += Math.sin(t * 3 + p.tw) * 0.9;
      y += Math.cos(t * 2.3 + p.tw) * 0.9;
    }
    // collapse into the point
    const cc = E.inCubic(P(t, T(28, 4) + p.k0 * 0.18, 0.55));
    x = lerp(x, W / 2, cc);
    y = lerp(y, H / 2, cc);
    return [x, y];
  }

  function particles(ctx, t) {
    if (!parts) parts = buildParticles();
    const buckets = [[], [], []];
    const prevDt = 0.004;
    for (const p of parts.P0) {
      const a = particlePos(p, t);
      if (!a) continue;
      const b = particlePos(p, t - prevDt) || a;
      const bi = p.hue < 0.33 ? 0 : p.hue < 0.75 ? 1 : 2;
      buckets[bi].push(a[0], a[1], b[0], b[1], p.size);
    }
    const cols = ['rgba(255,236,190,0.72)', 'rgba(222,184,110,0.62)', 'rgba(170,122,50,0.62)'];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // a soft halo pass: the dust glows a little before it lands
    const halo = t < T_LAND ? 1 : 1 - P(t, T_LAND, 0.5);
    if (halo > 0) {
      ctx.strokeStyle = `rgba(214,170,90,${0.06 * halo})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      buckets.forEach((arr) => {
        for (let i = 0; i < arr.length; i += 15) {
          ctx.moveTo(arr[i + 2], arr[i + 3]);
          ctx.lineTo(arr[i] + 0.01, arr[i + 1]);
        }
      });
      ctx.stroke();
    }
    buckets.forEach((arr, bi) => {
      if (!arr.length) return;
      ctx.strokeStyle = cols[bi];
      // two widths per bucket keeps the batching cheap
      for (const wide of [false, true]) {
        ctx.lineWidth = wide ? 2.4 : 1.3;
        ctx.beginPath();
        for (let i = 0; i < arr.length; i += 5) {
          if ((arr[i + 4] > 1.8) !== wide) continue;
          ctx.moveTo(arr[i + 2], arr[i + 3]);
          ctx.lineTo(arr[i] + 0.01, arr[i + 1]);
        }
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // the solid N°5 under the dust, so the numeral reads crisp
  function solidNumeral(ctx, t) {
    if (!parts) parts = buildParticles();
    const u = E.couture(P(t, T_LAND, 0.6)) * (1 - E.inCubic(P(t, T(28, 4), 0.35)));
    if (u <= 0) return;
    const push = 1 + 0.035 * E.soie(P(t, T_LAND, 1.6));
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(push, push);
    ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha = u * 0.92;
    // gradients are evaluated in the space of the fill: glyph units, y up
    const cap = K.glyph(parts.key, 'N').bbox[3];
    const g = ctx.createLinearGradient(0, cap, 0, 0);
    g.addColorStop(0, C.orPale);
    g.addColorStop(0.55, C.or);
    g.addColorStop(1, C.orProfond);
    ctx.fillStyle = g;
    parts.layout.forEach((l) => K.fillGlyph(ctx, parts.key, l.ch, l.x, parts.base, parts.size));
    ctx.restore();
  }

  // --------------------------------------------------------- scene --
  K.scene('n5', {
    start: S0,
    end: T(29),
    label: 'V — N°5',
    hud: (lt, t) => ({ alpha: t < T(28, 3) ? 1 : 1 - P(t, T(28, 3), 0.4), label: 'V — N°5 — 1921', color: C.ivoire }),
    draw(F, lt, t) {
      const ctx = F.ctx;
      K.fillBg(ctx, C.noir);
      // the drawing recedes as the glass appears, the bottle as the sillage rises
      const glassIn = E.couture(P(t, T(25, 1), 0.8));
      const release = E.inOutSine(P(t, T(27, 1, 0.5), 1.6));
      const drawA = lerp(1, 0.22, glassIn) * (1 - release) * (1 - P(t, T(27, 1), 0.3));
      const lift = E.couture(P(t, T(27, 1), 0.6)) * 86;
      ctx.save();
      const z = lerp(1, 0.94, release);
      ctx.translate(W / 2, BY);
      ctx.scale(z, z);
      ctx.translate(-W / 2, -BY);
      if (drawA > 0.01) {
        construction(ctx, t, drawA);
        notes(ctx, t, drawA * (1 - glassIn * 0.6));
      }
      const bottleA = glassIn * (1 - release);
      if (bottleA > 0.01) {
        glass(ctx, t, bottleA, lift);
        sweep(ctx, t);
        labelArt(ctx, t, bottleA);
        gauge(ctx, t, bottleA * (1 - P(t, T(27, 1), 0.6)));
      }
      ctx.restore();

      solidNumeral(ctx, t);
      if (t >= T(27, 1)) particles(ctx, t);

      // the line
      if (t >= T(27, 3)) {
        const out = 1 - P(t, T(28, 3), 0.5);
        const deck = { family: 'Bodoni Deck', style: 'italic', size: 70, weight: 400 };
        ctx.fillStyle = C.ivoire;
        ctx.globalAlpha = out;
        K.riseText(ctx, 'She chose the fifth.', 128, 986, deck, P(t, T(27, 3), 0.9), { stagger: 0.4 });
        ctx.globalAlpha = 0.6 * out;
        K.typeOn(ctx, 'LE CINQUIÈME ÉCHANTILLON  ·  1921', W - 132, 986, K.MONO, P(t, T(27, 4, 0.5), 0.6), { align: 'right' });
        ctx.globalAlpha = 1;
      }
    },
  });
})();
