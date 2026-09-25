/* III. 31, RUE CAMBON - bars 14-18 (0:26-0:36)
 * Five steps climb to the centre of the frame, one per beat, carrying the
 * address. A mirror opens on the axis and completes the composition: the
 * double staircase. Mirror facing mirror: a tunnel of frames the camera
 * falls through, one reflection per beat. A C walks into its own
 * reflection and they interlock. The "4" opens onto IV.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, T, C, E, P, clamp, lerp } = K;

  const S0 = T(14);
  const BG = '#111214';
  const SILVER = C.argent;

  // mirror-glass background: graphite with a slow diagonal sheen
  function glass(ctx, t, alpha = 1) {
    ctx.fillStyle = BG;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    const k = (t * 0.035) % 1;
    const x0 = lerp(-W, W, k);
    const g = ctx.createLinearGradient(x0, 0, x0 + W * 0.9, H * 0.9);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(214,220,228,${0.055 * alpha})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }

  // ------------------------------------------------ the staircase --
  const X0 = 104, Y0 = 936, R = (W / 2 - 104) / 5, RISE = 118;
  const WORDS = [
    { s: '31,', f: { family: 'Bodoni Display', size: 104, weight: 400 } },
    { s: 'RUE', f: { family: 'Jost', size: 25, weight: 500, tracking: 0.34 } },
    { s: 'CAMBON', f: { family: 'Jost', size: 25, weight: 500, tracking: 0.34 } },
    { s: 'PARIS', f: { family: 'Jost', size: 25, weight: 500, tracking: 0.34 } },
    { s: '75001', f: Object.assign({}, K.MONO, { size: 15 }) },
  ];

  function staircase(ctx, t, ink) {
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'square';
    // floor
    K.rule(ctx, -20, Y0, X0, Y0, E.couture(P(t, S0, 0.35)));
    for (let k = 0; k < 5; k++) {
      const tb = T(14, k + 1);
      const u = E.couture(P(t, tb, 0.36));
      if (u <= 0) continue;
      const x = X0 + k * R, y = Y0 - k * RISE;
      // riser then tread, as one stroke
      const a = clamp(u * 2), b = clamp(u * 2 - 1);
      K.rule(ctx, x, y, x, y - RISE, a);
      if (b > 0) K.rule(ctx, x, y - RISE, x + R, y - RISE, b);
      // the word sits on its tread
      const w = WORDS[k];
      K.riseText(ctx, w.s, x + 16, y - RISE - 16, w.f, P(t, tb + 0.08, 0.5), { stagger: 0.3, descent: 4 });
    }
    // the handrail and five balusters, on beat 5 + 0.5
    const hr = E.couture(P(t, T(14, 5, 0.5), 0.6));
    if (hr > 0) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = K.rgba(ink === C.ivoire ? C.ivoire : ink, 0.55);
      const hx0 = X0 - 40, hy0 = Y0 - 250 + (40 * RISE) / R;
      const hx1 = W / 2, hy1 = Y0 - 5 * RISE - 250 + RISE * 0.5;
      K.rule(ctx, hx0, hy0, hx1, hy1, hr);
      for (let k = 0; k < 5; k++) {
        const bx = X0 + k * R + R * 0.5;
        const by = Y0 - (k + 1) * RISE;
        const ty = lerp(hy0, hy1, (bx - hx0) / (hx1 - hx0));
        K.rule(ctx, bx, by, bx, ty, E.couture(P(t, T(14, 5, 0.5) + k * 0.05, 0.5)));
      }
    }
  }

  // ------------------------------------------------- the tunnel --
  // Nested frames, ratio r, the camera falls one frame per beat.
  const RATIO = 0.78;
  function tunnel(ctx, t) {
    glass(ctx, t);
    const beats = Math.max(0, (t - T(16)) / K.BEAT);
    // continuous fall with a tiny ease on each beat: the step is felt
    const whole = Math.floor(beats), frac = beats - whole;
    const tau = whole + E.outCubic(frac) * 0.82 + frac * 0.18;
    const cx = W / 2, cy = H / 2;
    const label = { family: 'Jost', size: 22, weight: 500, tracking: 0.36 };
    for (let n = 14; n >= -2; n--) {
      const s = Math.pow(RATIO, n - tau);
      if (s > 1.6 || s < 0.01) continue;
      const w = W * s * 0.94, h = H * s * 0.94;
      const x = cx - w / 2, y = cy - h / 2;
      const depth = clamp(1 - Math.log(1 / s) / Math.log(1 / RATIO) / 12);
      const leave = 1 - K.smooth(clamp((s - 0.72) / 0.2));
      ctx.strokeStyle = K.rgba(SILVER, 0.55 * depth);
      ctx.lineWidth = Math.max(0.6, 1.4 * Math.min(1, s * 1.2));
      ctx.strokeRect(x, y, w, h);
      // every other frame is a reflection: its caption reads backwards
      const mirrored = ((n % 2) + 2) % 2 === 1;
      ctx.save();
      ctx.translate(x + 26 * s, y + 46 * s);
      ctx.scale(s, s);
      if (mirrored) {
        const Lw = K.layout('31, RUE CAMBON', label).width;
        ctx.translate(Lw, 0);
        ctx.scale(-1, 1);
      }
      ctx.fillStyle = K.rgba(C.ivoire, 0.75 * depth * leave);
      K.text(ctx, '31, RUE CAMBON', 0, 0, label);
      ctx.restore();
      ctx.save();
      ctx.translate(x + w - 26 * s, y + h - 30 * s);
      ctx.scale(s, s);
      ctx.fillStyle = K.rgba(C.ivoire, 0.5 * depth * leave);
      if (mirrored) ctx.scale(-1, 1);
      K.text(ctx, 'MIROIR ' + String(((n % 100) + 100) % 100).padStart(2, '0'), 0, 0, K.MONO, { align: mirrored ? 'left' : 'right' });
      ctx.restore();
    }
    // the line, fixed in front of the fall
    const deck = { family: 'Bodoni Deck', style: 'italic', size: 72, weight: 400 };
    ctx.fillStyle = C.ivoire;
    ctx.shadowColor = BG;
    ctx.shadowBlur = 28;
    K.riseText(ctx, 'She watched from the stairs,', W / 2, 520, deck, P(t, T(16, 2), 0.9), { align: 'center', stagger: 0.35 });
    K.riseText(ctx, 'unseen, in every mirror.', W / 2, 610, deck, P(t, T(16, 3), 0.9), { align: 'center', stagger: 0.35 });
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  // ----------------------------------------------- the monogram --
  // A C and its reflection. The weave: right over left at the top,
  // left over right at the bottom.
  const CKEY = 'jost-700';
  const CSIZE = 560;
  function cGeom() {
    const g = K.glyph(CKEY, 'C');
    const s = CSIZE / g.upm;
    const [bx0, by0, bx1, by1] = g.bbox;
    return { g, s, cx: ((bx0 + bx1) / 2) * s, cy: ((by0 + by1) / 2) * s, w: (bx1 - bx0) * s, h: (by1 - by0) * s };
  }
  let CG = null;
  function drawC(ctx, x, color, mirrored, gap) {
    // x is the optical centre of the letter; baseline chosen to centre it
    const { g, s, cx, cy } = CG;
    ctx.save();
    ctx.translate(x, H / 2);
    if (mirrored) ctx.scale(-1, 1);
    ctx.translate(-cx, cy);
    ctx.scale(s, -s);
    if (gap) {
      ctx.strokeStyle = gap;
      ctx.lineWidth = 22 / s;
      ctx.lineJoin = 'round';
      ctx.stroke(g.path);
    }
    ctx.fillStyle = color;
    ctx.fill(g.path);
    ctx.restore();
  }
  function monogram(ctx, t, alpha, bg) {
    if (!CG) CG = cGeom();
    const walk = E.couture(P(t, T(17, 1), 0.95));
    const d = CG.w * 0.27;
    const xL = lerp(W / 2 - 820, W / 2 - d, walk);
    const xR = W - xL;
    const lock = P(t, T(17, 3), 0.25);
    ctx.globalAlpha = alpha;
    // before the lock the right C is a reflection: dimmer, cooler, behind glass
    const refl = lerp(0.42, 1, E.outCubic(lock));
    const rc = K.mix(SILVER, C.ivoire, lock, refl);
    if (lock <= 0) {
      drawC(ctx, xR, rc, true);
      drawC(ctx, xL, C.ivoire, false);
      return;
    }
    // interlocked: the reflection passes over at the top, the letter over
    // at the bottom. The clip seam sits on the horizontal axis, where the
    // two rings do not overlap, so it never shows.
    drawC(ctx, xL, C.ivoire, false);
    drawC(ctx, xR, rc, true, bg);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, H / 2, W, H / 2);
    ctx.clip();
    drawC(ctx, xL, C.ivoire, false, bg);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // mirror axis, silver hairline with a soft halo
  function mirrorLine(ctx, u, glow = 0) {
    if (u <= 0) return;
    ctx.save();
    ctx.strokeStyle = K.rgba(SILVER, 0.9);
    ctx.lineWidth = 1.2;
    K.ruleC(ctx, W / 2, 0, W / 2, H, u);
    if (glow > 0) {
      const g = ctx.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0);
      g.addColorStop(0, 'rgba(220,226,232,0)');
      g.addColorStop(0.5, `rgba(220,226,232,${0.13 * glow})`);
      g.addColorStop(1, 'rgba(220,226,232,0)');
      ctx.fillStyle = g;
      ctx.fillRect(W / 2 - 60, 0, 120, H);
    }
    ctx.restore();
  }

  K.scene('cambon', {
    start: S0,
    end: T(19),
    label: 'III — 31, RUE CAMBON',
    hud: (lt, t) => ({ alpha: t < T(18, 4) ? 1 : 1 - P(t, T(18, 4), 0.3), label: 'III — 31, RUE CAMBON — 1918', color: C.ivoire }),
    draw(F, lt, t) {
      const ctx = F.ctx;
      if (t < T(16)) {
        // ------------------------------- bars 14-15: stairs + mirror --
        glass(ctx, t);
        const open = E.couture(P(t, T(15, 1, 0.25), 0.9));
        // the reflected half first, so the real stair sits over the axis
        if (open > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(W / 2, 0, W / 2, H);
          ctx.clip();
          ctx.translate(W / 2, 0);
          ctx.scale(-open, 1);
          ctx.translate(-W / 2, 0);
          ctx.globalAlpha = 0.9;
          staircase(ctx, t, K.mix(SILVER, C.ivoire, 0.35));
          ctx.restore();
          // silvering: the reflection is behind glass
          ctx.fillStyle = `rgba(150,160,172,${0.05 * open})`;
          ctx.fillRect(W / 2, 0, W / 2, H);
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W / 2 + 0.5, H);
        ctx.clip();
        staircase(ctx, t, C.ivoire);
        ctx.restore();
        mirrorLine(ctx, E.couture(P(t, T(15, 1), 0.4)), P(t, T(15, 1), 0.3) * (1 - P(t, T(15, 2), 0.8)));
        ctx.fillStyle = C.ivoire;
        ctx.globalAlpha = 0.7;
        K.typeOn(ctx, "L'ESCALIER AUX MIROIRS", W / 2, 994, K.MONO, P(t, T(15, 3), 0.5), { align: 'center' });
        ctx.globalAlpha = 0.45;
        K.typeOn(ctx, 'ELLE Y VOYAIT LE DÉFILÉ SANS ÊTRE VUE', W / 2, 1022, K.MONO_S, P(t, T(15, 4), 0.6), { align: 'center' });
        ctx.globalAlpha = 1;
        return;
      }
      if (t < T(17)) {
        // ------------------------------------ bar 16: the tunnel --
        tunnel(ctx, t);
        return;
      }
      // ------------------------------- bars 17-18: C meets its reflection
      glass(ctx, t);
      const lock = P(t, T(17, 3), 0.25);
      const out = E.inOutSine(P(t, T(18, 1), 0.4));
      mirrorLine(ctx, 1 - lock, lock > 0 ? (1 - lock) * 2 : 0.4);
      ctx.save();
      const push = E.soie(P(t, T(17, 3), 2.2));
      const z = (1 + 0.05 * push) * lerp(1, 0.9, out);
      ctx.translate(W / 2, H / 2);
      ctx.scale(z, z);
      ctx.translate(-W / 2, -H / 2);
      monogram(ctx, t, 1 - out, BG);
      ctx.restore();
      // flash along the axis at the lock
      const flash = K.pulse(t, T(17, 3), 0.22) * (t >= T(17, 3) ? 1 : 0);
      if (flash > 0.01) {
        const g = ctx.createLinearGradient(W / 2 - 240, 0, W / 2 + 240, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, `rgba(255,255,255,${0.2 * flash})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(W / 2 - 240, 0, 480, H);
      }
      ctx.fillStyle = C.ivoire;
      ctx.globalAlpha = 0.6 * (1 - out);
      K.typeOn(ctx, 'C  ·  SON REFLET', W / 2, 912, K.MONO, P(t, T(17, 4), 0.5), { align: 'center' });
      ctx.globalAlpha = 1;

      // ---------------------------------------- bar 18: the 4 --
      if (t >= T(18, 2)) {
        const g = K.glyph('bodoni-display-400', '4');
        const size = 720;
        const s = size / g.upm;
        const [bx0, by0, bx1, by1] = g.bbox;
        const x = W / 2 - ((bx0 + bx1) / 2) * s, y = H / 2 + ((by0 + by1) / 2) * s;
        const appear = E.couture(P(t, T(18, 2), 0.5));
        ctx.save();
        ctx.globalAlpha = appear;
        K.zoomThrough(F, {
          key: 'bodoni-display-400', ch: '4', x, y: y + (1 - appear) * 60, size,
          toId: 'camelia', toTime: T(19),
          u: P(t, T(18, 4), T(19) - T(18, 4)),
          open: E.inOutSine(P(t, T(18, 3), 0.7)),
          fill: C.ivoire,
        });
        ctx.restore();
      }
    },
  });
})();
