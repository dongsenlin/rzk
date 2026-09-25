/* IV. CAMÉLIA - bars 19-23 (0:36-0:46)
 * The C that met its reflection in III blooms: fifty-five of them, placed
 * on the golden angle (137.5 degrees), opening from the centre outward.
 * The camellia has no scent; the petals fall and leave the air empty for
 * what comes next. The "5" rises into the empty page.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, T, C, E, P, clamp, lerp } = K;

  const S0 = T(19);
  const KEY = 'jost-700';
  const N = 55;
  const GA = Math.PI * (3 - Math.sqrt(5)); // 137.507...
  const FX = 664, FY = 540, RMAX = 318;

  const petals = [];
  (function build() {
    const rnd = K.rng(19);
    for (let n = 0; n < N; n++) {
      const k = (n + 0.6) / N;
      petals.push({
        n,
        th: n * GA,
        r: RMAX * Math.sqrt(k),
        size: lerp(100, 420, Math.sqrt((n + 1) / N)),
        // bloom: inner petals first; the order follows the spiral
        t0: T(19, 1) + Math.pow(n / N, 0.85) * 1.9,
        // closing: outer petals first, the flower folds back into its seed
        tc: T(22, 1) + Math.pow((N - 1 - n) / N, 0.9) * 1.35,
      });
    }
  })();

  let G = null;
  function glyphInfo() {
    const g = K.glyph(KEY, 'C');
    const [bx0, by0, bx1, by1] = g.bbox;
    return { g, gcx: (bx0 + bx1) / 2, gcy: (by0 + by1) / 2 };
  }

  function flower(ctx, t) {
    if (!G) G = glyphInfo();
    const spin = -0.14 * E.soie(P(t, S0, 7.0));
    for (let i = N - 1; i >= 0; i--) {
      const p = petals[i];
      const open = E.couture(P(t, p.t0, 0.7));
      const close = E.inOutCubic(P(t, p.tc, 0.5));
      const b = open * (1 - close);
      if (b <= 0) continue;
      const th = p.th + spin + (1 - open) * 0.9 - close * 0.9;
      const r = p.r * lerp(0.55, 1, open) * (1 - close);
      const x = FX + Math.cos(th) * r, y = FY + Math.sin(th) * r;
      const rot = th + Math.PI;
      const sc = (p.size / G.g.upm) * lerp(0.25, 1, open) * lerp(1, 0.04, close);
      const alpha = clamp(b * 2.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(sc, -sc);
      ctx.translate(-G.gcx, -G.gcy);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = C.ivoire;
      ctx.lineWidth = 7 / sc;
      ctx.stroke(G.g.path);
      ctx.fillStyle = C.noir;
      ctx.fill(G.g.path);
      ctx.restore();
    }
  }

  // the golden angle, drawn as a construction: two radii and an arc
  function goldenAngle(ctx, t, x, y) {
    const u = E.couture(P(t, T(21, 3), 0.8));
    if (u <= 0) return;
    const r = 34;
    ctx.save();
    ctx.globalAlpha = 1 - P(t, T(22, 1), 0.8);
    ctx.strokeStyle = C.noir;
    ctx.lineWidth = 1;
    K.rule(ctx, x, y, x + r, y, u);
    const a1 = -GA;
    K.rule(ctx, x, y, x + Math.cos(a1) * r, y + Math.sin(a1) * r, u);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, a1 * u, true);
    ctx.stroke();
    ctx.fillStyle = C.noir;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, K.TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.75;
    K.typeOn(ctx, "137,5°  —  L'ANGLE D'OR", x + r + 26, y + 5, K.MONO, P(t, T(21, 3, 0.4), 0.6));
    ctx.restore();
  }

  K.scene('camelia', {
    start: S0,
    end: T(24),
    label: 'IV — CAMÉLIA',
    hud: (lt, t) => ({ alpha: t < T(23, 4) ? 1 : 1 - P(t, T(23, 4), 0.3), label: 'IV — CAMÉLIA', blend: 'difference' }),
    draw(F, lt, t) {
      const ctx = F.ctx;
      K.fillBg(ctx, C.ivoire);
      flower(ctx, t);

      const x = 1204;
      const leave = 1 - P(t, T(22, 1), 1.0);
      ctx.fillStyle = C.noir;
      ctx.globalAlpha = 0.55 * leave;
      K.typeOn(ctx, 'PLANCHE IV', x, 302, K.MONO, P(t, T(20, 1), 0.4));
      ctx.globalAlpha = leave;
      K.typeOn(ctx, 'LE CAMÉLIA', x, 342, K.LABEL, P(t, T(20, 1, 0.3), 0.5));
      ctx.globalAlpha = 0.55 * leave;
      K.typeOn(ctx, `CAMELLIA JAPONICA  ·  ${N} PÉTALES EN « C »`, x, 378, K.MONO, P(t, T(20, 2), 0.6));
      ctx.globalAlpha = leave;
      const deck = { family: 'Bodoni Deck', style: 'italic', size: 62, weight: 400 };
      K.riseText(ctx, 'A flower without a scent,', x - 4, 604, deck, P(t, T(21, 1), 0.9), { stagger: 0.35 });
      K.riseText(ctx, 'leaving the air to N°5.', x - 4, 688, deck, P(t, T(21, 2), 0.9), { stagger: 0.35 });
      ctx.globalAlpha = 0.55 * leave;
      K.typeOn(ctx, 'PARFUM : AUCUN', x, 752, K.MONO, P(t, T(21, 2, 0.5), 0.4));
      ctx.globalAlpha = 1;
      goldenAngle(ctx, t, x + 34, 876);

      // ------------------------- bars 22-23: the seed becomes the 5 --
      // The folded flower leaves one black point. It travels to where the
      // ball terminal of the 5 will be; the numeral grows out of it; the
      // camera dives back into that same point, into V.
      const g5 = K.glyph('bodoni-display-400', '5');
      const size = 720;
      const s5 = size / g5.upm;
      const [bx0, by0, bx1, by1] = g5.bbox;
      const gx = W / 2 - ((bx0 + bx1) / 2) * s5, gy = H / 2 + ((by0 + by1) / 2) * s5;
      const ball = K.glyphAnchor('bodoni-display-400', '5');
      const ballX = gx + ball.x * s5, ballY = gy - ball.y * s5, ballR = ball.r * s5;
      const seed = E.couture(P(t, T(22, 3, 0.5), 0.5));
      if (seed > 0 && t < T(23, 2, 0.6)) {
        const travel = E.coupe(P(t, T(23, 1), 0.45));
        const px = lerp(FX, ballX, travel), py = lerp(FY, ballY, travel);
        const pr = lerp(0, 9, seed) + (ballR - 9) * E.inOutSine(P(t, T(23, 1, 0.5), 0.55));
        ctx.fillStyle = C.noir;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0, pr), 0, K.TAU);
        ctx.fill();
      }
      if (t >= T(23, 2, 0.3)) {
        // the numeral grows radially out of its own ball terminal
        const grow = E.couture(P(t, T(23, 2, 0.3), 0.7));
        ctx.save();
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballR + grow * 900, 0, K.TAU);
        ctx.clip();
        K.zoomThrough(F, {
          key: 'bodoni-display-400', ch: '5', x: gx, y: gy, size,
          toId: 'n5', toTime: T(24),
          u: P(t, T(23, 4), T(24) - T(23, 4)),
          open: E.inOutSine(P(t, T(23, 3), 0.7)),
          fill: C.noir,
        });
        ctx.restore();
      }
    },
  });
})();
