(function () {
  const K = window.CINQ;
  const { C } = K;
  K.scene('specimen', {
    start: 0, end: 64, label: 'SPECIMEN',
    hud: () => ({ alpha: 1, label: 'I — NOIR — 1926' }),
    draw(F, lt) {
      const ctx = F.ctx;
      K.fillBg(ctx, C.ivoire);
      ctx.fillStyle = C.noir;
      K.text(ctx, 'En cinq temps', 120, 260, { family: 'Bodoni Display', style: 'italic', size: 180, weight: 400 });
      K.text(ctx, '1 2 3 4 5  N°5  2.55', 120, 470, { family: 'Bodoni Display', size: 180, weight: 400 });
      K.text(ctx, 'CHANEL', 120, 640, { family: 'Jost', size: 140, weight: 600, tracking: 0.12 });
      K.text(ctx, 'The colour that holds all the others.', 120, 760, { family: 'Bodoni Deck', style: 'italic', size: 56, weight: 400 });
      K.text(ctx, 'UN FILM EN CINQ MOUVEMENTS — 5/4 — 150 BPM — CAMÉLIA · VENDÔME', 120, 840, { family: 'DM Mono', size: 20, weight: 300, tracking: 0.12 });
      K.text(ctx, 'weight 900', 1200, 640, { family: 'Bodoni Display', size: 90, weight: 900 });
      ctx.fillStyle = C.rouge;
      K.fillGlyph(ctx, 'bodoni-display-400', '5', 1500, 470, 380);
      ctx.strokeStyle = C.guide; ctx.lineWidth = 1;
      const b = K.glyphBox('bodoni-display-400', '5', 1500, 470, 380);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      K.line(ctx, 100, 470, 1900, 470);
      K.line(ctx, 100, 470 - K.capHeight({ family: 'Bodoni Display', size: 180 }), 1900, 470 - K.capHeight({ family: 'Bodoni Display', size: 180 }));
    },
  });
})();
