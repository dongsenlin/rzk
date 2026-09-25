/* EN CINQ TEMPS - kit
 * Shared graphic devices: hairline rules, type-on captions, the numeral
 * zoom-through (the film's one transition), the slit, stitches.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, C, E, P, clamp, lerp } = K;

  // Mono caption set in the house annotation style.
  K.MONO = { family: 'DM Mono', size: 14, weight: 400, tracking: 0.14 };
  K.MONO_S = { family: 'DM Mono', size: 12, weight: 400, tracking: 0.16 };
  K.LABEL = { family: 'Jost', size: 17, weight: 500, tracking: 0.42 };

  // Type-on: glyphs appear left to right across u in [0,1], each with a short fade.
  K.typeOn = function (ctx, str, x, y, f, u, opt = {}) {
    const n = Array.from(str).length;
    if (u <= 0) return;
    const soft = opt.soft || 3; // glyphs of fade overlap
    K.text(ctx, str, x, y, f, {
      align: opt.align,
      color: opt.color,
      each: (i) => {
        const a = clamp(u * (n + soft) - i, 0, soft) / soft;
        return a <= 0 ? null : { alpha: a };
      },
    });
  };

  // Hairline from (x0,y0) toward (x1,y1), drawn to fraction u.
  K.rule = function (ctx, x0, y0, x1, y1, u, from = 0) {
    if (u <= from) return;
    const a = clamp(from), b = clamp(u);
    ctx.beginPath();
    ctx.moveTo(lerp(x0, x1, a), lerp(y0, y1, a));
    ctx.lineTo(lerp(x0, x1, b), lerp(y0, y1, b));
    ctx.stroke();
  };

  // Rule drawn out from its centre.
  K.ruleC = function (ctx, x0, y0, x1, y1, u) {
    if (u <= 0) return;
    const h = clamp(u) / 2;
    K.rule(ctx, x0, y0, x1, y1, 0.5 + h, 0.5 - h);
  };

  // Dashed line (stitches) drawn to fraction u, dashes quantised so a dash
  // never appears half-sewn.
  K.stitches = function (ctx, x0, y0, x1, y1, u, dash = 14, gap = 9) {
    if (u <= 0) return;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const dx = (x1 - x0) / len, dy = (y1 - y0) / len;
    const per = dash + gap;
    const count = Math.floor((len * clamp(u)) / per + 1e-6);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const s = i * per;
      ctx.moveTo(x0 + dx * s, y0 + dy * s);
      ctx.lineTo(x0 + dx * (s + dash), y0 + dy * (s + dash));
    }
    ctx.stroke();
  };

  // ------------------------------------------------ inscribed anchor --
  // The deepest point inside a glyph (centre of its largest inscribed
  // circle), found once on a raster distance field. The zoom-through dives
  // into this point, so the window is guaranteed to swallow the frame.
  const anchors = new Map();
  K.glyphAnchor = function (key, ch) {
    const id = key + '|' + ch;
    if (anchors.has(id)) return anchors.get(id);
    const g = K.glyph(key, ch);
    const [x0, y0, x1, y1] = g.bbox;
    const R = 220; // raster resolution along the longest side
    const s = R / Math.max(x1 - x0, y1 - y0);
    const w = Math.ceil((x1 - x0) * s) + 4, h = Math.ceil((y1 - y0) * s) + 4;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');
    c.translate(2 - x0 * s, h - 2 + y0 * s);
    c.scale(s, -s);
    c.fill(g.path);
    const d = c.getImageData(0, 0, w, h).data;
    const inside = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) inside[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    // two-pass chamfer distance transform
    const INF = 1e9;
    const dist = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) dist[i] = inside[i] ? INF : 0;
    const A = 1, B = Math.SQRT2;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!dist[i]) continue;
        let v = dist[i];
        if (x > 0) v = Math.min(v, dist[i - 1] + A);
        if (y > 0) v = Math.min(v, dist[i - w] + A);
        if (x > 0 && y > 0) v = Math.min(v, dist[i - w - 1] + B);
        if (x < w - 1 && y > 0) v = Math.min(v, dist[i - w + 1] + B);
        dist[i] = v;
      }
    for (let y = h - 1; y >= 0; y--)
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        if (!dist[i]) continue;
        let v = dist[i];
        if (x < w - 1) v = Math.min(v, dist[i + 1] + A);
        if (y < h - 1) v = Math.min(v, dist[i + w] + A);
        if (x < w - 1 && y < h - 1) v = Math.min(v, dist[i + w + 1] + B);
        if (x > 0 && y < h - 1) v = Math.min(v, dist[i + w - 1] + B);
        dist[i] = v;
      }
    let best = 0, bi = 0;
    for (let i = 0; i < w * h; i++) if (dist[i] > best) { best = dist[i]; bi = i; }
    const px = bi % w, py = Math.floor(bi / w);
    // back to font units (y up)
    const fx = (px - 2) / s + x0, fy = (h - 2 - py) / s + y0;
    const res = { x: fx, y: fy, r: best / s };
    anchors.set(id, res);
    return res;
  };

  // ------------------------------------------------- zoom-through --
  // A numeral becomes a window onto the next scene, then the camera dives
  // through its thickest stroke. `u` runs 0..1 over the dive; `open` 0..1
  // fades the next scene into the window before the dive starts.
  //   spec: {key, ch, x, y, size, toId, toTime, u, open, outline}
  K.zoomThrough = function (F, spec) {
    const ctx = F.ctx;
    const a = K.glyphAnchor(spec.key, spec.ch);
    const g = K.glyph(spec.key, spec.ch);
    const s0 = spec.size / g.upm;
    // anchor in canvas coords at rest
    const ax = spec.x + a.x * s0, ay = spec.y - a.y * s0;
    const rCanvas = a.r * s0;
    const zEnd = (Math.hypot(W, H) / 2 / rCanvas) * 1.08;
    const u = clamp(spec.u || 0);
    const k = E.aiguille(u);
    const z = Math.exp(lerp(0, Math.log(zEnd), k));
    const cx = lerp(ax, W / 2, E.inOutSine(clamp(u * 1.4))), cy = lerp(ay, H / 2, E.inOutSine(clamp(u * 1.4)));
    const setGlyphTransform = (c) => {
      c.translate(cx, cy);
      c.scale(z, z);
      c.translate(-ax, -ay);
      c.translate(spec.x, spec.y);
      c.scale(s0, -s0);
    };
    if (u >= 1) {
      K.drawSceneInto(F, ctx, spec.toId, spec.toTime);
      return;
    }
    // window contents
    const L = K.layer(F, 'tx:' + (spec.slot || 'a'));
    L.save();
    setGlyphTransform(L);
    L.clip(g.path);
    L.setTransform(F.scale, 0, 0, F.scale, 0, 0);
    K.drawSceneInto(F, L, spec.toId, spec.toTime);
    L.restore();
    // optional solid fill of the glyph under the window (keeps the numeral
    // readable while the next scene fades in)
    if (spec.fill) {
      ctx.save();
      setGlyphTransform(ctx);
      ctx.fillStyle = spec.fill;
      ctx.fill(g.path);
      ctx.restore();
    }
    K.blit(ctx, L, spec.open === undefined ? 1 : clamp(spec.open));
    if (spec.outline) {
      ctx.save();
      setGlyphTransform(ctx);
      ctx.strokeStyle = spec.outline;
      ctx.lineWidth = (1.2 * g.upm) / spec.size / z;
      ctx.stroke(g.path);
      ctx.restore();
    }
  };

  // Render a registered scene into an arbitrary context (used by windows).
  K.drawSceneInto = function (F, ctx, id, t) {
    const s = window.FILM.scenes.get(id);
    if (!s) return;
    const F2 = Object.assign({}, F, { ctx, nested: true });
    ctx.save();
    ctx.setTransform(F.scale, 0, 0, F.scale, 0, 0);
    s.draw(F2, t - s.start, t);
    ctx.restore();
  };

  // A full-frame fill in logical units (respects clip and current transform).
  K.fillFrame = function (ctx, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    ctx.restore();
  };
})();
