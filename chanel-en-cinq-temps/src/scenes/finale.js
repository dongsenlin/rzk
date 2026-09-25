/* FINALE - bars 29-32 (0:56-1:04)
 * The breath: the point the film began with, alone, in silence. It becomes
 * the thread again, and the thread opens - this time onto light. CHANEL
 * resolves out of wide tracking and out of focus, on the chord. Paris.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, T, C, E, P, clamp, lerp } = K;

  const S0 = T(29);
  const CX = W / 2, CY = H / 2;
  const MARK = { family: 'Jost', size: 214, weight: 640 };
  const CITY = { family: 'Jost', size: 21, weight: 500 };

  K.scene('finale', {
    start: S0,
    end: T(33),
    label: 'FIN',
    hud: () => ({ alpha: 0 }),
    draw(F, lt, t) {
      const ctx = F.ctx;
      K.fillBg(ctx, C.noir);

      // --- the breath, then the thread
      const stretch = E.couture(P(t, T(29, 4), 0.95));
      const thin = E.outCubic(P(t, T(29, 4), 0.4));
      const open = E.couture(P(t, T(30, 1), 1.15));
      const hh = lerp(0.75, CY + 12, open);
      if (open <= 0) {
        ctx.fillStyle = C.ivoire;
        if (stretch <= 0) {
          ctx.beginPath();
          ctx.arc(CX, CY, 3.5, 0, K.TAU);
          ctx.fill();
        } else {
          const w = lerp(7, 2300, stretch), th = lerp(7, 1.5, thin);
          ctx.beginPath();
          ctx.roundRect(CX - w / 2, CY - th / 2, w, th, th / 2);
          ctx.fill();
        }
        return;
      }

      // --- the slit opens onto light
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, CY - hh, W, hh * 2);
      ctx.clip();
      K.fillFrame(ctx, C.ivoire);

      const settle = E.couture(P(t, T(30, 1), 1.9));
      const focus = E.outCubic(P(t, T(30, 1), 1.2));
      const mark = Object.assign({}, MARK, { tracking: lerp(0.95, 0.125, settle) });
      const capH = K.capHeight(mark);
      const breathe = 1 + 0.018 * E.soie(P(t, T(30, 3), 3.6));
      ctx.save();
      ctx.translate(CX, CY);
      ctx.scale(breathe, breathe);
      ctx.fillStyle = C.noir;
      const blur = (1 - focus) * 12;
      if (blur > 0.2) ctx.filter = `blur(${(blur * F.scale).toFixed(2)}px)`;
      ctx.globalAlpha = clamp(focus * 1.6);
      K.text(ctx, 'CHANEL', 0, capH / 2, mark, { align: 'center', forceGlyphs: true });
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      // Paris, on bar 31
      const cu = E.couture(P(t, T(31, 1), 1.2));
      if (cu > 0) {
        const city = Object.assign({}, CITY, { tracking: lerp(1.3, 0.66, cu) });
        ctx.globalAlpha = clamp(cu * 1.5);
        K.text(ctx, 'PARIS', 0, capH / 2 + 104, city, { align: 'center' });
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // end card, bar 32
      const ec = E.couture(P(t, T(32, 1), 0.9));
      if (ec > 0) {
        ctx.fillStyle = C.noir;
        ctx.globalAlpha = 0.5 * ec;
        const credit = window.FILM_CREDIT ? `RÉALISATION  ·  ${window.FILM_CREDIT.toUpperCase()}` : 'EN CINQ TEMPS';
        K.typeOn(ctx, credit, 64, H - 64, K.MONO_S, P(t, T(32, 1), 0.6));
        K.typeOn(ctx, 'FILM-CONCEPT NON OFFICIEL  ·  NON AFFILIÉ À CHANEL', CX, H - 64, K.MONO_S, P(t, T(32, 1, 0.3), 0.7), { align: 'center' });
        K.typeOn(ctx, '5/4  ·  150 BPM  ·  64 S', W - 64, H - 64, K.MONO_S, P(t, T(32, 1, 0.6), 0.6), { align: 'right' });
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // the edges of the slit while it opens
      if (open < 1) {
        ctx.strokeStyle = K.rgba(C.ivoire, 0.9 * (1 - open));
        ctx.lineWidth = 1.25;
        K.line(ctx, 0, CY - hh, W, CY - hh);
        K.line(ctx, 0, CY + hh, W, CY + hh);
      }

      // fade to black on the last two beats
      const out = E.inOutSine(P(t, T(32, 4), 0.8));
      if (out > 0) {
        ctx.fillStyle = `rgba(0,0,0,${out})`;
        ctx.fillRect(-10, -10, W + 20, H + 20);
      }
    },
  });
})();
