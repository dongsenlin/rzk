/* PROLOGUE - bars 1-3 (0:00-0:06)
 * The point. The thread. The slit that opens on the title and closes on
 * the downbeat. Then the count-in: five columns, five numerals, five beats.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, T, C, E, P, clamp, lerp } = K;

  const CX = W / 2, CY = H / 2;
  const TITLE = { family: 'Bodoni Display', style: 'italic', size: 212, weight: 400 };
  const SLIT = 196; // half-height of the open slit

  // ------------------------------------------------ the thread --
  // Point at beat 2, stretched into a hairline on beat 4, plucked on beat 5.
  K.thread = function (ctx, t, t0, color) {
    const tPoint = t0, tLine = t0 + 0.8, tPluck = t0 + 1.2;
    if (t < tPoint) return;
    const appear = E.couture(P(t, tPoint, 0.5));
    const stretch = E.couture(P(t, tLine, 1.0));
    const thin = E.outCubic(P(t, tLine, 0.4));
    const w = lerp(7, 2300, stretch);
    const th = lerp(7, 1.5, thin);
    ctx.fillStyle = color;
    if (stretch <= 0) {
      ctx.beginPath();
      ctx.arc(CX, CY, 3.5 * appear, 0, K.TAU);
      ctx.fill();
      return;
    }
    const amp = t > tPluck ? 7 * Math.exp(-(t - tPluck) / 0.32) : 0;
    if (amp < 0.05) {
      ctx.beginPath();
      ctx.roundRect(CX - w / 2, CY - th / 2, w, th, th / 2);
      ctx.fill();
      return;
    }
    // plucked string: first harmonic plus a little of the second, decaying
    const ph = (t - tPluck) * 6.5 * K.TAU;
    ctx.strokeStyle = color;
    ctx.lineWidth = th;
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const x = -190 + (i / 96) * (W + 380);
      const s = (x + 190) / (W + 380);
      const y = CY + amp * (Math.sin(Math.PI * s) * Math.sin(ph) + 0.25 * Math.sin(2 * Math.PI * s) * Math.sin(ph * 2.1));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // --------------------------------------------------- count-in --
  const NUM_KEY = 'bodoni-display-400';
  const NUM_SIZE = 540;
  const WORDS = ['UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ'];
  const COLW = W / 5;
  const NUM_BASE = 712;

  // Layout of the count-in; `inv` swaps paper and ink (the NOIR downbeat).
  // `k(i)` gives per-column {on (0..1 panel), num (0..1 rise), dy, alpha}.
  K.countIn = function (ctx, k, inv) {
    const paper = inv ? C.noir : C.ivoire;
    const ink = inv ? C.ivoire : C.noir;
    for (let i = 0; i < 5; i++) {
      const s = k(i);
      if (!s) continue;
      const x0 = i * COLW;
      // panel wipes down from the top edge
      if (s.on > 0) {
        ctx.fillStyle = paper;
        ctx.fillRect(x0, 0, COLW + 0.5, H * s.on);
      }
      if (s.num <= 0) continue;
      ctx.save();
      ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
      ctx.translate(0, s.dy || 0);
      const ch = String(i + 1);
      const g = K.glyph(NUM_KEY, ch);
      const sc = NUM_SIZE / g.upm;
      const [bx0, , bx1] = g.bbox;
      const gx = x0 + COLW / 2 - ((bx0 + bx1) / 2) * sc;
      // rise inside the column
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, 140, COLW, NUM_BASE - 140 + 6);
      ctx.clip();
      ctx.fillStyle = ink;
      const rise = (1 - E.couture(s.num)) * 470;
      K.fillGlyph(ctx, NUM_KEY, ch, gx, NUM_BASE + rise, NUM_SIZE);
      ctx.restore();
      ctx.fillStyle = ink;
      K.typeOn(ctx, WORDS[i], x0 + COLW / 2, 868, K.LABEL, P(s.num, 0.25, 0.75), { align: 'center' });
      ctx.globalAlpha *= 0.55;
      K.typeOn(ctx, '0' + (i + 1), x0 + COLW / 2, 206, K.MONO, P(s.num, 0.1, 0.6), { align: 'center' });
      ctx.restore();
    }
  };

  K.scene('prologue', {
    start: 0,
    end: T(4),
    label: 'PROLOGUE',
    hud: (lt) => ({ alpha: P(lt, T(3), 0.3), label: '0 — PROLOGUE', blend: 'difference' }),
    draw(F, lt, t) {
      const ctx = F.ctx;
      K.fillBg(ctx, C.noir);

      if (t < T(3)) {
        // ---------------------------------------------- bar 1-2 --
        const open = E.couture(P(t, T(2, 1), 1.1));
        const close = E.aiguille(P(t, T(2, 4, 0.3), T(3) - T(2, 4, 0.3)));
        const hh = Math.max(0.75, lerp(0.75, SLIT, open) * (1 - close));
        if (t < T(2, 1)) {
          K.thread(ctx, t, T(1, 2), C.ivoire);
          return;
        }
        // title inside the slit
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, CY - hh, W, hh * 2);
        ctx.clip();
        const drift = E.soie(P(t, T(2, 1), 2.0));
        const tr = lerp(0.07, 0.0, E.couture(P(t, T(2, 1), 1.6)));
        const f = Object.assign({}, TITLE, { tracking: tr });
        const xh = K.xHeight(f);
        ctx.translate(CX, CY);
        ctx.scale(1 + 0.03 * drift, 1 + 0.03 * drift);
        ctx.fillStyle = C.ivoire;
        K.text(ctx, 'En cinq temps', 0, xh / 2, f, { align: 'center' });
        ctx.restore();
        // the two edges of the slit, retracting to the measure of the title
        const retract = E.soie(P(t, T(2, 2), 1.2));
        const half = lerp(W / 2 + 40, 560, retract);
        ctx.strokeStyle = K.rgba(C.ivoire, 0.9);
        ctx.lineWidth = 1.25;
        if (hh <= 1) {
          K.line(ctx, CX - half, CY, CX + half, CY);
        } else {
          K.line(ctx, CX - half, CY - hh, CX + half, CY - hh);
          K.line(ctx, CX - half, CY + hh, CX + half, CY + hh);
        }
        // credits line above and deck below
        const cu = P(t, T(2, 2), 0.7);
        ctx.fillStyle = C.ivoire;
        ctx.globalAlpha = (1 - close) * 0.6;
        K.typeOn(ctx, 'UN FILM-CONCEPT  ·  5/4  ·  150 BPM', CX, CY - hh - 26, K.MONO, cu, { align: 'center' });
        ctx.globalAlpha = 1 - close;
        const du = E.couture(P(t, T(2, 2, 0.5), 1.3));
        const deck = Object.assign({}, K.LABEL, { tracking: lerp(0.9, 0.46, du) });
        ctx.globalAlpha = (1 - close) * clamp(du * 2);
        K.text(ctx, 'UN FILM EN CINQ MOUVEMENTS', CX, CY + hh + 46, deck, { align: 'center' });
        ctx.globalAlpha = 1;
        return;
      }

      // ------------------------------------------------- bar 3 --
      // count-in: on each beat a column turns to paper and takes its numeral
      const breath = E.inOutSine(P(t, T(3, 5), 0.4));
      K.countIn(ctx, (i) => {
        const tb = T(3, i + 1);
        if (t < tb) return null;
        return { on: E.outCubic(P(t, tb, 0.12)), num: P(t, tb, 0.42), dy: -8 * breath };
      }, false);
      // column rules
      ctx.strokeStyle = K.rgba(C.noir, 0.14);
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const tb = T(3, i + 1);
        if (t >= tb) K.rule(ctx, i * COLW, 0, i * COLW, H, E.couture(P(t, tb, 0.5)));
      }
    },
  });
})();
