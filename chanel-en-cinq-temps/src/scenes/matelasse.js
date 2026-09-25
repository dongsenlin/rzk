/* II. 2.55 - bars 9-13 (0:16-0:26)
 * Beige lambskin, quilted. A quilting machine sews every seam at once, one
 * step per sixteenth note. The leather puffs on beat 5. A wave of tiles
 * flips to the bordeaux lining and prints 2.55 across it. A gold chain
 * drops, swings, settles. The "3" opens onto III.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, T, C, E, P, clamp, lerp } = K;

  const S0 = T(9);
  const A = 104, B = 128; // rhombus half-diagonals (world units at zoom 1)
  const SIXTEENTH = K.BEAT / 4;
  const TEXT = { key: 'bodoni-display-400', size: 690 };
  const BORDEAUX = C.rouge;

  // camera: world -> screen about the frame centre
  function cam(t) {
    const push = E.outCubic(P(t, S0, 2.4));
    const z = lerp(1.0, 1.12, push) * lerp(1, 0.94, E.soie(P(t, T(11), 4.0)));
    return { z, ox: 0, oy: lerp(0, -16, push) };
  }

  // Lattice cells overlapping the frame for a camera.
  function cells(c) {
    const out = [];
    const hw = W / 2 / c.z + 2 * A, hh = H / 2 / c.z + 2 * B;
    const j0 = Math.floor((-hh - c.oy) / B) - 1, j1 = Math.ceil((hh - c.oy) / B) + 1;
    for (let j = j0; j <= j1; j++) {
      const shift = (j & 1) * A;
      const i0 = Math.floor((-hw - shift) / (2 * A)) - 1, i1 = Math.ceil((hw - shift) / (2 * A)) + 1;
      for (let i = i0; i <= i1; i++) {
        const wx = i * 2 * A + shift, wy = j * B;
        out.push({ i, j, wx, wy, sx: W / 2 + (wx + c.ox) * c.z, sy: H / 2 + (wy + c.oy) * c.z });
      }
    }
    return out;
  }

  function rhombus(ctx, x, y, a, b) {
    ctx.beginPath();
    ctx.moveTo(x, y - b);
    ctx.lineTo(x + a, y);
    ctx.lineTo(x, y + b);
    ctx.lineTo(x - a, y);
    ctx.closePath();
  }

  // pillow: radial light from the upper left; `puff` 0..1 deepens it
  function pillow(ctx, x, y, a, b, puff, light = 1) {
    const g = ctx.createRadialGradient(x - a * 0.2, y - b * 0.28, 0, x, y, Math.max(a, b) * 1.08);
    const k = puff;
    g.addColorStop(0, K.mix('#F7F2EA', '#FBF8F2', k * light));
    g.addColorStop(0.5, K.mix('#EEE7DA', '#EEE5D6', k));
    g.addColorStop(1, K.mix('#E4D9C6', '#C4B196', k));
    ctx.fillStyle = g;
    rhombus(ctx, x, y, a + 0.6, b + 0.6);
    ctx.fill();
  }

  // ---------------------------------------------------- the lining --
  // Full-frame back side: bordeaux, faint tone-on-tone seams, "2.55".
  function lining(ctx, t, c) {
    ctx.fillStyle = BORDEAUX;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    // soft light falloff
    const g = ctx.createRadialGradient(W * 0.42, H * 0.38, 0, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, 'rgba(255,255,255,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    seams(ctx, c, 'rgba(0,0,0,0.22)', 'rgba(255,255,255,0.05)', 1);
    ctx.fillStyle = C.ivoire;
    drawNumber(ctx, t);
  }

  function numberLayout() {
    const str = '2.55';
    const gs = str.split('').map((ch) => K.glyph(TEXT.key, ch));
    const s = TEXT.size / gs[0].upm;
    const kern = [0, -0.02, 0.01].map((v) => v * TEXT.size);
    let total = 0;
    gs.forEach((g, i) => (total += g.adv * s + (kern[i] || 0)));
    let x = W / 2 - total / 2;
    const out = [];
    gs.forEach((g, i) => {
      out.push({ ch: str[i], x });
      x += g.adv * s + (kern[i] || 0);
    });
    return out;
  }
  let NL = null;
  const NUM_BASE = 792;
  function drawNumber(ctx, t) {
    if (!NL) NL = numberLayout();
    NL.forEach((d, i) => {
      const f = E.inQuad(P(t, T(13, 1) + [0.04, 0.1, 0, 0.07][i], 0.46));
      K.fillGlyph(ctx, TEXT.key, d.ch, d.x, NUM_BASE + f * 1150, TEXT.size);
    });
  }

  // lattice seam lines across the frame
  function seams(ctx, c, dark, light, width, sew = 1) {
    const L = Math.hypot(A, B);
    const dirs = [[A / L, B / L], [A / L, -B / L]];
    const span = (Math.hypot(W, H) / c.z) * 0.6 + 4 * L;
    ctx.lineCap = 'butt';
    for (let d = 0; d < 2; d++) {
      const [dx, dy] = dirs[d];
      const k0 = Math.floor((-W / 2 / c.z - span) / (2 * A)) - 1, k1 = Math.ceil((W / 2 / c.z + span) / (2 * A)) + 1;
      for (let k = k0; k <= k1; k++) {
        // line through world (k*2A, 0)
        const wx = k * 2 * A, wy = 0;
        const x0 = W / 2 + (wx - dx * span + c.ox) * c.z, y0 = H / 2 + (wy - dy * span + c.oy) * c.z;
        const x1 = W / 2 + (wx + dx * span + c.ox) * c.z, y1 = H / 2 + (wy + dy * span + c.oy) * c.z;
        ctx.strokeStyle = dark;
        ctx.lineWidth = width * 2.2;
        K.line(ctx, x0, y0, x1, y1);
        if (light) {
          ctx.strokeStyle = light;
          ctx.lineWidth = width;
          const nx = -dy * 1.6, ny = dx * 1.6;
          K.line(ctx, x0 + nx, y0 + ny, x1 + nx, y1 + ny);
        }
      }
    }
  }

  // stitches in the seams; sewing is quantised to sixteenth notes
  function stitches(ctx, c, uA, uB, color, width = 1.35) {
    const L = Math.hypot(A, B);
    const dirs = [[A / L, B / L], [A / L, -B / L]];
    const reach = (Math.hypot(W, H) / c.z) * 0.62 + 2 * L;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    for (let d = 0; d < 2; d++) {
      const u = d ? uB : uA;
      if (u <= 0) continue;
      const [dx, dy] = dirs[d];
      const k0 = Math.floor((-W / 2 / c.z - reach) / (2 * A)) - 1, k1 = Math.ceil((W / 2 / c.z + reach) / (2 * A)) + 1;
      for (let k = k0; k <= k1; k++) {
        const wx = k * 2 * A;
        const p0x = W / 2 + (wx - dx * reach + c.ox) * c.z, p0y = H / 2 + (-dy * reach + c.oy) * c.z;
        const p1x = W / 2 + (wx + dx * reach + c.ox) * c.z, p1y = H / 2 + (dy * reach + c.oy) * c.z;
        // every seam is sewn from its lower end upward
        if (p0y > p1y) K.stitches(ctx, p0x, p0y, p1x, p1y, u, 9 * c.z, 6.5 * c.z);
        else K.stitches(ctx, p1x, p1y, p0x, p0y, u, 9 * c.z, 6.5 * c.z);
      }
    }
  }

  // -------------------------------------------------------- the chain --
  // A catenary of alternating flat and edge-on links, dropped on beat 1 of
  // bar 11, landing on beat 2, then a damped swing.
  const LINK = 30, LINK_W = 21;
  function chainCurve(t) {
    const tDrop = T(11, 1), tLand = T(11, 2);
    const fall = E.inQuad(P(t, tDrop, tLand - tDrop));
    const since = Math.max(0, t - tLand);
    const settle = t >= tLand ? Math.exp(-since / 0.42) : 0;
    const y0 = lerp(-520, 150, fall) + E.inQuad(P(t, T(13, 1), 0.55)) * 1500;
    const sag0 = 330;
    const sag = sag0 * (1 + (t >= tLand ? 0.22 * settle * Math.cos(since * K.TAU / 0.62) : 0));
    const sway = (t >= tLand ? 40 * settle * Math.sin(since * K.TAU / 0.9) : 0) + 14 * Math.sin(t * 1.3);
    const xL = -140, xR = W + 140, xm = W / 2 + sway, half = (xR - xL) / 2;
    const k = 1.25;
    const ch = Math.cosh(k);
    const f = (x) => {
      const q = clamp((x - xm) / half, -1.2, 1.2);
      return y0 + (sag * (Math.cosh(k * q) - ch)) / (1 - ch);
    };
    return { f, xL, xR };
  }
  function chain(ctx, t) {
    if (t < T(11, 1)) return;
    const { f, xL, xR } = chainCurve(t);
    // arc-length samples
    const N = 600;
    const pts = [];
    let acc = 0;
    for (let i = 0; i <= N; i++) {
      const x = lerp(xL, xR, i / N), y = f(x);
      if (i) acc += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
      pts.push({ x, y, s: acc });
    }
    const at = (s) => {
      let lo = 0, hi = N;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].s < s) lo = mid; else hi = mid;
      }
      const a = pts[lo], b = pts[hi];
      const u = (s - a.s) / Math.max(1e-6, b.s - a.s);
      return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), ang: Math.atan2(b.y - a.y, b.x - a.x) };
    };
    const n = Math.floor(acc / LINK);
    // shadow on the lining
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 16;
    ctx.filter = 'blur(10px)';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x + 10, p.y + 26) : ctx.moveTo(p.x + 10, p.y + 26)));
    ctx.stroke();
    ctx.restore();
    for (let pass = 0; pass < 2; pass++) {
      for (let i = pass; i < n; i += 2) {
        const p = at(i * LINK + LINK / 2);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        const rx = LINK * 0.66, flat = i % 2 === 0;
        const ry = flat ? LINK_W / 2 : 3.2;
        ctx.lineWidth = flat ? 6.5 : 6;
        ctx.strokeStyle = '#4A3410';
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, K.TAU);
        ctx.stroke();
        ctx.lineWidth = flat ? 4.6 : 4.2;
        ctx.strokeStyle = flat ? C.or : '#B38D49';
        ctx.stroke();
        if (flat) {
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = 'rgba(255,240,205,0.9)';
          ctx.beginPath();
          ctx.ellipse(0, -1.2, rx - 0.6, ry - 1.4, 0, Math.PI * 1.08, Math.PI * 1.72);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // ------------------------------------------------------- the scene --
  K.scene('matelasse', {
    start: S0,
    end: T(14),
    label: 'II — 2.55',
    hud: (lt, t) => {
      const onLining = t >= T(10, 2, 0.5);
      return {
        alpha: t < T(13, 4) ? 1 : 1 - P(t, T(13, 4), 0.3),
        label: 'II — 2.55 — FÉVRIER 1955',
        color: onLining ? C.ivoire : C.noir,
      };
    },
    draw(F, lt, t) {
      const ctx = F.ctx;
      const c = cam(t);
      const cs = cells(c);

      // flip wave: left to right across bar 10, one column per sixteenth
      const tFlip = T(10, 1);
      const flipOf = (cell) => {
        const col = Math.floor((cell.sx + 60) / (A * c.z));
        // one column per 1/32 note, rows lag slightly: a diagonal wave
        const start = tFlip + col * (SIXTEENTH * 0.62) + (cell.sy / H) * 0.16;
        return P(t, start, 0.24, E.inOutSine);
      };
      const puff = t < T(9, 5) ? 0.28 : 0.28 + 0.72 * E.outBack(P(t, T(9, 5), 0.5), 1.6);
      const sewA = Math.floor(P(t, T(9, 1), 0.8) * 8 + 1e-6) / 8;
      const sewB = Math.floor(P(t, T(9, 3), 0.8) * 8 + 1e-6) / 8;

      const anyFlip = t >= tFlip;
      const allDone = anyFlip && cs.every((cell) => flipOf(cell) >= 1);

      if (allDone) {
        lining(ctx, t, c);
      } else {
        K.fillBg(ctx, anyFlip ? '#1E070C' : '#E9E0D1');
        const front = [], moving = [], back = [];
        for (const cell of cs) {
          const u = anyFlip ? flipOf(cell) : 0;
          if (u <= 0) front.push(cell);
          else if (u >= 1) back.push(cell);
          else moving.push([cell, u]);
        }
        // back faces already turned: lining clipped to their union
        if (back.length) {
          ctx.save();
          ctx.beginPath();
          for (const cell of back) {
            ctx.moveTo(cell.sx, cell.sy - B * c.z - 0.5);
            ctx.lineTo(cell.sx + A * c.z + 0.5, cell.sy);
            ctx.lineTo(cell.sx, cell.sy + B * c.z + 0.5);
            ctx.lineTo(cell.sx - A * c.z - 0.5, cell.sy);
            ctx.closePath();
          }
          ctx.clip();
          lining(ctx, t, c);
          ctx.restore();
        }
        for (const cell of front) pillow(ctx, cell.sx, cell.sy, A * c.z, B * c.z, puff);
        // seams + stitches over the front faces
        ctx.save();
        if (back.length) {
          // keep seams off the lining
          ctx.beginPath();
          ctx.rect(-10, -10, W + 20, H + 20);
          for (const cell of back) {
            ctx.moveTo(cell.sx, cell.sy - B * c.z);
            ctx.lineTo(cell.sx - A * c.z, cell.sy);
            ctx.lineTo(cell.sx, cell.sy + B * c.z);
            ctx.lineTo(cell.sx + A * c.z, cell.sy);
            ctx.closePath();
          }
          ctx.clip('evenodd');
        }
        seams(ctx, c, `rgba(118,96,68,${0.25 + 0.35 * puff})`, `rgba(255,255,255,${0.35 + 0.3 * puff})`, 1);
        stitches(ctx, c, sewA, sewB, 'rgba(96,76,52,0.85)');
        ctx.restore();
        // tiles mid-flip: squash about their vertical axis
        for (const [cell, u] of moving) {
          const ang = u * Math.PI;
          const sx = Math.cos(ang);
          const showBack = sx < 0;
          ctx.save();
          ctx.translate(cell.sx, cell.sy);
          ctx.scale(Math.max(0.001, Math.abs(sx)), 1);
          // lift: a flipping tile rises toward the viewer
          const lift = 1 + 0.08 * Math.sin(ang);
          ctx.scale(lift, lift);
          ctx.translate(-cell.sx, -cell.sy);
          rhombus(ctx, cell.sx, cell.sy, A * c.z, B * c.z);
          ctx.clip();
          if (showBack) {
            // past 90 degrees the back face projects un-mirrored: |cos| is right
            lining(ctx, t, c);
            ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 + sx)})`;
            ctx.fillRect(cell.sx - A * c.z, cell.sy - B * c.z, 2 * A * c.z, 2 * B * c.z);
          } else {
            pillow(ctx, cell.sx, cell.sy, A * c.z, B * c.z, puff, 1);
            ctx.fillStyle = `rgba(60,40,20,${0.3 * (1 - sx)})`;
            ctx.fillRect(cell.sx - A * c.z, cell.sy - B * c.z, 2 * A * c.z, 2 * B * c.z);
          }
          ctx.restore();
        }
      }

      // the chain, over the lining
      chain(ctx, t);

      // captions
      const onLining = t >= T(10, 2, 0.5);
      const ink = onLining ? C.ivoire : C.noir;
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.7 * (1 - P(t, T(10, 3), 0.3));
      K.typeOn(ctx, 'MATELASSÉ  ·  AGNEAU BEIGE', 132, 984, K.MONO, P(t, T(9, 2), 0.5));
      ctx.globalAlpha = 1;
      if (t >= T(11, 3)) {
        const deck = { family: 'Bodoni Deck', style: 'italic', size: 70, weight: 400 };
        ctx.fillStyle = C.ivoire;
        ctx.globalAlpha = 1 - P(t, T(13, 1), 0.4);
        K.riseText(ctx, 'Every stitch, a beat.', 128, 986, deck, P(t, T(11, 3), 0.9), { stagger: 0.4 });
        ctx.globalAlpha = 0.7 * (1 - P(t, T(13, 1), 0.4));
        K.typeOn(ctx, 'DOUBLURE BORDEAUX  ·  CHAÎNE DORÉE  ·  FÉVRIER 1955', W - 132, 986, K.MONO, P(t, T(11, 5), 0.6), { align: 'right' });
        ctx.globalAlpha = 1;
      }

      // -------------------------------------- bar 13: the 3 opens onto III
      if (t >= T(13, 2)) {
        const g = K.glyph('bodoni-display-400', '3');
        const size = 720;
        const s = size / g.upm;
        const [bx0, by0, bx1, by1] = g.bbox;
        const x = W / 2 - ((bx0 + bx1) / 2) * s, y = H / 2 + ((by0 + by1) / 2) * s;
        const appear = E.couture(P(t, T(13, 2), 0.5));
        // the lining darkens behind the numeral
        ctx.fillStyle = `rgba(20,4,8,${0.4 * appear})`;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.globalAlpha = appear;
        K.zoomThrough(F, {
          key: 'bodoni-display-400', ch: '3', x, y: y + (1 - appear) * 60, size,
          toId: 'cambon', toTime: T(14),
          u: P(t, T(13, 4), T(14) - T(13, 4)),
          open: E.inOutSine(P(t, T(13, 3), 0.7)),
          fill: C.ivoire,
        });
        ctx.restore();
      }
    },
  });
})();
