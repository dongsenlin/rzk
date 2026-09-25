/* I. NOIR - bars 4-8 (0:06-0:16)
 * The count-in inverts on the downbeat. The "1" walks into the word NOIR,
 * set in Jost 900 - the weight typographers call Black. A pattern-maker's
 * plate of the little black dress is drawn one stroke per beat, then
 * flooded with ink; the camera dives into the black and finds 1926.
 * The "2" of 1926 becomes the window onto II.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, T, C, E, P, clamp, lerp } = K;

  const S0 = T(4);
  const NOIR = { family: 'Jost', size: 520, weight: 900, tracking: 0.035 };
  const NOIR_BASE = 712; // shares the count-in baseline

  // ------------------------------------------------------ the dress --
  // Local coordinates: (0,0) is the centre of the neckline, y down.
  const L = (a, b) => [a, [lerp(a[0], b[0], 1 / 3), lerp(a[1], b[1], 1 / 3)], [lerp(a[0], b[0], 2 / 3), lerp(a[1], b[1], 2 / 3)], b];
  const mirror = (cs) => cs.map(([p0, c0, c1, p1]) => [[-p0[0], p0[1]], [-c0[0], c0[1]], [-c1[0], c1[1]], [-p1[0], p1[1]]]);
  const reverse = (cs) => cs.slice().reverse().map(([p0, c0, c1, p1]) => [p1, c1, c0, p0]);

  const neck = [L([-152, 20], [-96, 0]), [[-96, 0], [-52, 20], [52, 20], [96, 0]], L([96, 0], [152, 20])];
  const sideR = [[[152, 20], [144, 72], [124, 118], [131, 152]], L([131, 152], [140, 432])];
  const skirtR = [[[140, 432], [160, 540], [188, 668], [210, 762]]];
  const hemR = [[[210, 762], [120, 776], [50, 778], [0, 778]]];
  const waist = [[[-140, 432], [-50, 443], [50, 443], [140, 432]]];
  const pleats = [-2, -1, 0, 1, 2].map((k) => [[k * 42, 440], [k * 62, 777]]);

  const P_NECK = K.sampleCubics(neck, 18);
  const P_SIDE_R = K.sampleCubics(sideR, 20), P_SIDE_L = K.sampleCubics(mirror(sideR), 20);
  const P_SKIRT_R = K.sampleCubics(skirtR, 24), P_SKIRT_L = K.sampleCubics(mirror(skirtR), 24);
  const P_HEM_R = K.sampleCubics(hemR, 20), P_HEM_L = K.sampleCubics(mirror(hemR), 20);
  const P_WAIST = K.sampleCubics(waist, 24);
  const OUTLINE = [].concat(
    P_NECK, P_SIDE_R, P_SKIRT_R, P_HEM_R, K.sampleCubics(reverse(mirror(hemR)), 20),
    K.sampleCubics(reverse(mirror(skirtR)), 24), K.sampleCubics(reverse(mirror(sideR)), 20)
  );
  function outlinePath(ctx) {
    ctx.beginPath();
    OUTLINE.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }

  const DX = 760, DY = 150; // plate placement
  const NOTES = [
    { at: [-60, 11], label: 'ENCOLURE BATEAU' },
    { at: [-137, 96], label: 'SANS MANCHES' },
    { at: [-140, 432], label: 'TAILLE BASSE' },
    { at: [-196, 766], label: 'OURLET AU GENOU' },
    { at: [-62, 640], label: 'CINQ PLIS' },
  ];
  const LABEL_X = -330; // labels right-aligned left of the dress

  function drawPlate(ctx, t) {
    const b = (k) => T(5, k); // beat k of bar 5
    const draw = (k, dur = 0.42) => E.couture(P(t, b(k), dur));
    ctx.save();
    ctx.translate(DX, DY);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // centre axis, dash-dot, drawn on beat 1
    ctx.strokeStyle = K.rgba(C.noir, 0.28);
    ctx.lineWidth = 1;
    ctx.setLineDash([22, 6, 3, 6]);
    K.rule(ctx, 0, -60, 0, 850, draw(1, 0.8));
    ctx.setLineDash([]);

    // flood level (bar 6, beat 1): hem to neck
    const flood = E.coupe(P(t, T(6, 1), 0.95));
    const level = lerp(790, -8, flood);
    if (flood > 0) {
      ctx.save();
      outlinePath(ctx);
      ctx.clip();
      ctx.fillStyle = C.noir;
      ctx.beginPath();
      const amp = 7 * (1 - flood) * Math.min(1, flood * 6);
      ctx.moveTo(-260, 900);
      for (let x = -260; x <= 260; x += 8) ctx.lineTo(x, level + amp * Math.sin(x * 0.028 + t * 9));
      ctx.lineTo(260, 900);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // the five strokes
    const ink = (x) => {
      ctx.strokeStyle = C.noir;
      ctx.lineWidth = x;
    };
    ink(1.6);
    K.partialPolyline(ctx, P_NECK, draw(1));
    K.partialPolyline(ctx, P_SIDE_R, draw(2));
    K.partialPolyline(ctx, P_SIDE_L, draw(2));
    K.partialPolyline(ctx, P_SKIRT_R, draw(3));
    K.partialPolyline(ctx, P_SKIRT_L, draw(3));
    K.partialPolyline(ctx, P_HEM_R, draw(4));
    K.partialPolyline(ctx, P_HEM_L, draw(4));
    // details: waist seam and five pleats. Under the ink they turn to paper.
    const details = (color, w) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      K.partialPolyline(ctx, P_WAIST, draw(5));
      pleats.forEach(([a, z], i) => K.rule(ctx, a[0], a[1], z[0], z[1], E.couture(P(t, b(5) + 0.05 + i * 0.035, 0.45))));
    };
    details(C.noir, 1.1);
    if (flood > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-300, level + 4, 600, 900);
      ctx.clip();
      details(K.rgba(C.ivoire, 0.8), 1.1);
      ctx.restore();
    }

    // annotations with leaders
    NOTES.forEach((n, i) => {
      const u = P(t, b(i + 1) + 0.12, 0.5, E.couture);
      if (u <= 0) return;
      const [ax, ay] = n.at;
      const lx = LABEL_X + 14;
      ctx.strokeStyle = K.rgba(C.noir, 0.55);
      ctx.lineWidth = 1;
      K.rule(ctx, ax, ay, lx, ay, u);
      ctx.fillStyle = C.noir;
      ctx.beginPath();
      ctx.arc(ax, ay, 2.6 * clamp(u * 3), 0, K.TAU);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      K.typeOn(ctx, n.label, LABEL_X, ay + 4.5, K.MONO, P(t, b(i + 1) + 0.25, 0.4), { align: 'right' });
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  function drawPlateText(ctx, t) {
    const x = 1190;
    ctx.fillStyle = C.noir;
    ctx.globalAlpha = 0.55;
    K.typeOn(ctx, 'PLANCHE I', x, 262, K.MONO, P(t, T(5, 1, 0.3), 0.4));
    ctx.globalAlpha = 1;
    K.typeOn(ctx, 'LA PETITE ROBE NOIRE', x, 302, K.LABEL, P(t, T(5, 1, 0.5), 0.6));
    ctx.globalAlpha = 0.55;
    K.typeOn(ctx, 'CRÊPE DE CHINE  ·  1926', x, 338, K.MONO, P(t, T(5, 2, 0.5), 0.5));
    ctx.globalAlpha = 1;
    const deck = { family: 'Bodoni Deck', style: 'italic', size: 70, weight: 400 };
    K.riseText(ctx, 'The colour that', x - 4, 596, deck, P(t, T(6, 3), 0.8), { stagger: 0.35 });
    K.riseText(ctx, 'holds all the others.', x - 4, 680, deck, P(t, T(6, 4), 0.8), { stagger: 0.35 });
  }

  // ------------------------------------------------------- 1926 --
  const Y_KEY = 'bodoni-display-400';
  const Y_SIZE = 560, Y_BASE = 700;
  const YEAR = '1926';
  function yearLayout() {
    // digit origins, centred as a word using glyph advances
    const g = YEAR.split('').map((ch) => K.glyph(Y_KEY, ch));
    const s = Y_SIZE / g[0].upm;
    const track = 0.02 * Y_SIZE;
    const total = g.reduce((a, gi) => a + gi.adv * s, 0) + track * 3;
    let x = W / 2 - total / 2;
    return g.map((gi, i) => {
      const o = { ch: YEAR[i], x, w: gi.adv * s };
      x += gi.adv * s + track;
      return o;
    });
  }
  let YL = null;

  // crop marks snapping round a box
  function cropMarks(ctx, x, y, w, h, u, color) {
    if (u <= 0) return;
    const k = lerp(1.25, 1, E.outCubic(u));
    const cx = x + w / 2, cy = y + h / 2;
    const hw = (w / 2) * k, hh = (h / 2) * k, l = 26;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = clamp(u * 3) * (1 - P(u, 0.6, 0.4));
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const px = cx + sx * hw, py = cy + sy * hh;
      ctx.beginPath();
      ctx.moveTo(px - sx * l, py);
      ctx.lineTo(px, py);
      ctx.lineTo(px, py - sy * l);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawYear(F, t) {
    const ctx = F.ctx;
    if (!YL) YL = yearLayout();
    const fallStart = T(8, 1);
    YL.forEach((d, i) => {
      const tb = T(7, i + 1);
      if (t < tb) return;
      const rise = E.couture(P(t, tb, 0.45));
      let dy = (1 - rise) * 380, alpha = 1, dx = 0, sz = Y_SIZE;
      const isTwo = i === 2;
      if (!isTwo && t >= fallStart) {
        const f = E.inQuart(P(t, fallStart + [0, 0.05, 0, 0.1][i], 0.5));
        dy += f * 900;
        alpha = 1 - P(f, 0.6, 0.4);
      }
      if (isTwo && t >= fallStart) return; // the 2 is handed to the transition
      ctx.save();
      ctx.beginPath();
      ctx.rect(d.x - 40, 0, d.w + 80, Y_BASE + 8 + (t >= fallStart ? 900 : 0));
      ctx.clip();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = C.ivoire;
      K.fillGlyph(ctx, Y_KEY, d.ch, d.x + dx, Y_BASE + dy, sz);
      ctx.restore();
      const box = K.glyphBox(Y_KEY, d.ch, d.x, Y_BASE, Y_SIZE);
      cropMarks(ctx, box.x - 18, box.y - 18, box.w + 36, box.h + 36, P(t, tb, 0.5), C.ivoire);
    });
    // captions
    const cap = 1 - P(t, fallStart, 0.25);
    ctx.fillStyle = C.ivoire;
    ctx.globalAlpha = 0.9 * cap;
    K.typeOn(ctx, 'VOGUE  ·  OCTOBRE 1926', W / 2, 850, K.MONO, P(t, T(7, 5), 0.35), { align: 'center' });
    ctx.globalAlpha = 0.55 * cap;
    K.typeOn(ctx, '« LA FORD DE CHANEL »', W / 2, 882, K.MONO, P(t, T(7, 5, 0.4), 0.35), { align: 'center' });
    ctx.globalAlpha = 1;
  }

  // the "2" of 1926 drifts to centre and becomes the window onto II
  function drawTwo(F, t) {
    if (!YL) YL = yearLayout();
    const d = YL[2];
    const move = E.coupe(P(t, T(8, 1), 0.9));
    const size = lerp(Y_SIZE, 700, move);
    const g = K.glyph(Y_KEY, '2');
    const s = size / g.upm;
    const [bx0, by0, bx1, by1] = g.bbox;
    const tx = W / 2 - ((bx0 + bx1) / 2) * s;
    const ty = H / 2 + ((by0 + by1) / 2) * s;
    const x = lerp(d.x, tx, move), y = lerp(Y_BASE, ty, move);
    const open = E.inOutSine(P(t, T(8, 3), 0.8));
    const dive = P(t, T(8, 4), T(9) - T(8, 4));
    K.zoomThrough(F, {
      key: Y_KEY, ch: '2', x, y, size,
      toId: 'matelasse', toTime: T(9) + (dive - 1) * 0.0,
      u: dive, open, fill: C.ivoire,
    });
  }

  // --------------------------------------------------------- scene --
  K.scene('noir', {
    start: S0,
    end: T(9),
    label: 'I — NOIR',
    hud: (lt, t) => ({ alpha: t < T(8, 4) ? 1 : 1 - P(t, T(8, 4), 0.3), label: 'I — NOIR — 1926', blend: 'difference' }),
    draw(F, lt, t) {
      const ctx = F.ctx;
      if (t < T(5)) {
        // ---------------------------------------- bar 4: NOIR --
        K.fillBg(ctx, C.noir);
        const fall = (i) => E.inQuad(P(t, S0 + 0.01 + (i - 1) * 0.035, 0.36));
        // inverted count-in, numerals 2-5 fall away
        K.countIn(ctx, (i) => {
          if (i === 0) return null;
          const f = fall(i);
          if (f >= 1) return null;
          return { on: 0, num: 1, dy: f * 1150, alpha: 1 - P(f, 0.45, 0.55) };
        }, true);
        // the 1 walks into NOIR and becomes its I
        const Lw = K.layout('NOIR', NOIR);
        const x0 = W / 2 - Lw.width / 2;
        const iX = x0 + Lw.xs[2] + Lw.ws[2] / 2;
        const walk = E.coupe(P(t, S0 + 0.1, 0.3));
        const morph = P(t, S0 + 0.24, 0.16);
        const g1 = K.glyph('bodoni-display-400', '1');
        const s1 = 540 / g1.upm;
        const c1 = ((g1.bbox[0] + g1.bbox[2]) / 2) * s1;
        const x1 = lerp(W / 10, iX, walk) - c1;
        if (morph < 1) {
          ctx.globalAlpha = 1 - morph;
          ctx.fillStyle = C.ivoire;
          K.fillGlyph(ctx, 'bodoni-display-400', '1', x1, NOIR_BASE, 540);
          ctx.globalAlpha = 1;
        }
        const stamp = (tb) => (t < tb ? null : { dy: (1 - E.couture(P(t, tb, 0.22))) * 34, scale: lerp(1.035, 1, E.outCubic(P(t, tb, 0.2))) });
        const beats = { 0: T(4, 2), 1: T(4, 3), 2: -1, 3: T(4, 4) };
        ctx.fillStyle = C.ivoire;
        K.text(ctx, 'NOIR', W / 2, NOIR_BASE, NOIR, {
          align: 'center',
          each: (i) => {
            if (i === 2) {
              if (morph <= 0) return null;
              return { alpha: morph, dx: (x1 + c1) - iX };
            }
            return stamp(beats[i]);
          },
        });
        // caption on beat 5
        ctx.globalAlpha = 0.9;
        K.typeOn(ctx, 'LA PETITE ROBE NOIRE', W / 2, 862, K.LABEL, P(t, T(4, 5), 0.45), { align: 'center' });
        ctx.globalAlpha = 0.5;
        K.typeOn(ctx, 'JOST 900 — « BLACK »', W / 2, 206, K.MONO, P(t, T(4, 5, 0.3), 0.4), { align: 'center' });
        ctx.globalAlpha = 1;
        return;
      }

      if (t < T(7)) {
        // ------------------------------ bars 5-6: the plate, the ink --
        K.fillBg(ctx, C.ivoire);
        // the dive into the black bodice: last beat of bar 6
        const dive = E.aiguille(P(t, T(6, 5), BEATS(1)));
        ctx.save();
        if (dive > 0) {
          const ax = DX, ay = DY + 300;
          const z = Math.exp(lerp(0, Math.log(16), dive));
          ctx.translate(lerp(ax, W / 2, dive), lerp(ay, H / 2, dive));
          ctx.scale(z, z);
          ctx.translate(-ax, -ay);
        }
        // faint module grid of the pattern paper
        ctx.strokeStyle = K.rgba(C.noir, 0.05);
        ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) K.rule(ctx, (W / 10) * i, 0, (W / 10) * i, H, E.couture(P(t, T(5, 1) + i * 0.02, 0.9)));
        for (let j = 1; j < 10; j++) K.rule(ctx, 0, (H / 10) * j, W, (H / 10) * j, E.couture(P(t, T(5, 1) + j * 0.02, 0.9)));
        drawPlate(ctx, t);
        drawPlateText(ctx, t);
        ctx.restore();
        return;
      }

      // ---------------------------------------- bars 7-8: 1926 --
      K.fillBg(ctx, C.noir);
      drawYear(F, t);
      if (t >= T(8, 1)) drawTwo(F, t);
    },
  });

  function BEATS(n) {
    return n * K.BEAT;
  }
})();
