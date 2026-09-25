/* EN CINQ TEMPS - film
 * Section registry, frame composition, HUD, guides, stills and contact sheets.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { W, H, T, BEAT, BAR, DURATION, C, E, P, clamp, lerp } = K;

  const scenes = new Map();
  const order = [];
  // A scene owns [start, end). Outgoing scenes draw their own transition and
  // may render the next scene into a layer through FILM.drawScene.
  K.scene = function (id, def) {
    def.id = id;
    scenes.set(id, def);
    order.push(def);
    order.sort((a, b) => a.start - b.start);
    return def;
  };

  function drawScene(id, F, t) {
    const s = scenes.get(id);
    if (!s) return;
    const ctx = F.ctx;
    ctx.save();
    s.draw(F, t - s.start, t);
    ctx.restore();
  }

  function sceneAt(t) {
    for (let i = order.length - 1; i >= 0; i--) if (t >= order[i].start) return order[i];
    return order[0];
  }

  // ------------------------------------------------------------- HUD --
  // Editorial metadata in the four corners: movement, metre, timecode, beat.
  const HUD_F = { family: 'DM Mono', size: 13, weight: 400, tracking: 0.14 };
  function timecode(t) {
    const fr = Math.floor(t * K.FPS + 1e-6);
    const s = Math.floor(fr / K.FPS), f = fr % K.FPS;
    const m = Math.floor(s / 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s % 60)}:${pad(f)}`;
  }

  function drawHUD(F, t) {
    const s = sceneAt(t);
    const hud = s.hud ? s.hud(t - s.start, t) : null;
    if (!hud || hud.alpha <= 0) return;
    const ctx = F.ctx;
    const m = K.musical(t);
    const color = hud.color || C.ivoire;
    const a = hud.alpha;
    const x0 = 64, x1 = W - 64, y0 = 64 + 10, y1 = H - 64;
    ctx.save();
    if (hud.blend) ctx.globalCompositeOperation = hud.blend;
    ctx.fillStyle = hud.blend === 'difference' ? '#ECE8E0' : color;
    ctx.globalAlpha = a * (hud.blend === 'difference' ? 0.8 : 0.62);
    K.text(ctx, hud.label || '', x0, y0, HUD_F);
    K.text(ctx, 'EN CINQ TEMPS', x1, y0, HUD_F, { align: 'right' });
    K.text(ctx, timecode(t), x0, y1, HUD_F);
    const bar = String(m.bar).padStart(2, '0');
    const L = K.text(ctx, `5/4  ${bar}.${m.beat}`, x1 - 5 * 16 - 18, y1, HUD_F, { align: 'right' });
    // the five beat dots: the metronome of the film
    for (let i = 0; i < 5; i++) {
      const cx = x1 - (4 - i) * 16 - 4, cy = y1 - 4.5;
      const on = i + 1 === m.beat;
      ctx.globalAlpha = a * (on ? 0.95 : 0.35);
      ctx.beginPath();
      ctx.arc(cx, cy, on ? 3.2 : 2.2, 0, K.TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------- guides --
  // The construction layer: 5x5 module grid (each module is itself 16:9),
  // margins, centre axes and the beat. Toggle with G in the player.
  function drawGuides(F, t) {
    const ctx = F.ctx;
    const m = K.musical(t);
    ctx.save();
    ctx.strokeStyle = K.rgba(C.guide, 0.5);
    ctx.lineWidth = 1 / F.scale;
    for (let i = 1; i < 5; i++) {
      K.line(ctx, (W / 5) * i, 0, (W / 5) * i, H);
      K.line(ctx, 0, (H / 5) * i, W, (H / 5) * i);
    }
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = K.rgba(C.guide, 0.35);
    K.line(ctx, W / 2, 0, W / 2, H);
    K.line(ctx, 0, H / 2, W, H / 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = K.rgba(C.guide, 0.3);
    ctx.strokeRect(64, 64, W - 128, H - 128);
    // beat flash
    const flash = Math.exp(-m.phase * 5) * (m.beat === 1 || m.beat === 4 ? 1 : 0.5);
    ctx.fillStyle = K.rgba(C.guide, 0.85);
    ctx.font = '500 15px "DM Mono"';
    ctx.fillText(`BAR ${String(m.bar).padStart(2, '0')} / 32   BEAT ${m.beat}/5   T ${t.toFixed(3)}s   ${sceneAt(t).id}`, 72, H - 84);
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = i + 1 === m.beat ? 0.35 + 0.65 * flash : 0.18;
      ctx.fillRect(72 + i * 26, H - 76, 20, 6);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------- render --
  function render(ctx, t, opt = {}) {
    const scale = ctx.canvas.width / W;
    const F = { ctx, t, scale, pw: ctx.canvas.width, ph: ctx.canvas.height, opt };
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    K.fillBg(ctx, C.noir);
    const s = sceneAt(t);
    ctx.save();
    s.draw(F, t - s.start, t);
    ctx.restore();
    if (opt.hud !== false) drawHUD(F, t);
    if (opt.guides) drawGuides(F, t);
    return F;
  }

  // -------------------------------------------------- stills & sheets --
  function makeCanvas(scale) {
    const c = document.createElement('canvas');
    c.width = Math.round(W * scale);
    c.height = Math.round(H * scale);
    return c;
  }

  function still(t, opt = {}) {
    const c = makeCanvas(opt.scale || 1);
    render(c.getContext('2d'), t, opt);
    return c.toDataURL('image/png');
  }

  // How much the picture moves across the shutter: mean luma difference
  // between the shutter's two ends, measured on a quarter-size render.
  let probe = null;
  function motion(t, shutter) {
    if (!probe) {
      probe = [0, 1].map(() => {
        const c = document.createElement('canvas');
        c.width = W / 4;
        c.height = H / 4;
        return c.getContext('2d', { willReadFrequently: true });
      });
    }
    render(probe[0], t, { hud: false });
    render(probe[1], t + shutter, { hud: false });
    const a = probe[0].getImageData(0, 0, W / 4, H / 4).data, b = probe[1].getImageData(0, 0, W / 4, H / 4).data;
    let sum = 0;
    for (let i = 0; i < a.length; i += 4) sum += Math.abs(a[i] + a[i + 1] + a[i + 2] - b[i] - b[i + 1] - b[i + 2]) / 3;
    return sum / (a.length / 4);
  }

  // Averaged sub-frames over a shutter interval: true motion blur for export.
  // opt.samples 'auto' picks the count from the measured motion, so a hold
  // costs two renders and a dive through a numeral gets thirty-two.
  let acc = null;
  function blurred(canvas, t, opt = {}) {
    const shutterDur = (opt.shutter === undefined ? 0.5 : opt.shutter) / K.FPS;
    let n = opt.samples;
    if (n === 'auto' || n === undefined) {
      const d = motion(t, shutterDur);
      n = d < 0.08 ? 1 : d < 0.6 ? 4 : d < 2 ? 8 : d < 6 ? 16 : 32;
    }
    n = Math.max(1, n);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (n === 1) {
      render(ctx, t, opt);
      return n;
    }
    const shutter = shutterDur;
    const len = canvas.width * canvas.height * 4;
    if (!acc || acc.length !== len) acc = new Float32Array(len);
    acc.fill(0);
    for (let i = 0; i < n; i++) {
      // The shutter opens on the frame, as a film camera's does: a cut on a
      // frame boundary (every beat is one) never bleeds into the frame before.
      const ts = t + ((i + 0.5) / n) * shutter;
      render(ctx, ts, opt);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let j = 0; j < len; j++) acc[j] += d[j];
    }
    const img = ctx.createImageData(canvas.width, canvas.height);
    const o = img.data;
    const inv = 1 / n;
    for (let j = 0; j < len; j++) o[j] = acc[j] * inv + 0.5;
    ctx.putImageData(img, 0, 0);
    return n;
  }

  // Post grain for export: a whisper of luminance noise that dithers the
  // gradients through 8-bit H.264. Applied after the motion-blur average.
  const grainCache = [];
  function grainPost(canvas, t, amount = 0.02) {
    const g = canvas.getContext('2d');
    if (!grainCache.length) {
      const rnd = K.rng(25);
      for (let k = 0; k < 8; k++) {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const cg = c.getContext('2d');
        const img = cg.createImageData(512, 512);
        for (let i = 0; i < 512 * 512; i++) {
          const v = Math.round(((rnd() + rnd() + rnd() + rnd()) / 4) * 255);
          img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
          img.data[i * 4 + 3] = 255;
        }
        cg.putImageData(img, 0, 0);
        grainCache.push(c);
      }
    }
    const fr = Math.floor(t * K.FPS + 1e-6);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = amount;
    g.fillStyle = g.createPattern(grainCache[fr % grainCache.length], 'repeat');
    g.translate(-((fr * 173) % 512), -((fr * 311) % 512));
    g.fillRect(0, 0, canvas.width + 512, canvas.height + 512);
    g.restore();
  }

  function sheet(times, opt = {}) {
    const cols = opt.cols || 6;
    const sc = opt.scale || 0.2;
    const tw = Math.round(W * sc), th = Math.round(H * sc);
    const pad = opt.pad === undefined ? 10 : opt.pad, lab = opt.labels === false ? 0 : 22;
    const rows = Math.ceil(times.length / cols);
    const out = document.createElement('canvas');
    out.width = cols * tw + (cols + 1) * pad;
    out.height = rows * (th + lab) + (rows + 1) * pad;
    const g = out.getContext('2d');
    g.fillStyle = opt.bg || '#1a1a1a';
    g.fillRect(0, 0, out.width, out.height);
    const c = makeCanvas(sc);
    const cg = c.getContext('2d');
    times.forEach((t, i) => {
      render(cg, t, opt);
      const x = pad + (i % cols) * (tw + pad);
      const y = pad + Math.floor(i / cols) * (th + lab + pad);
      g.drawImage(c, x, y);
      if (lab) {
        const m = K.musical(t);
        g.fillStyle = '#9a9a9a';
        g.font = '400 13px "DM Mono"';
        g.fillText(`${t.toFixed(2)}s  ${String(m.bar).padStart(2, '0')}.${m.beat}  ${sceneAt(t).id}`, x, y + th + 16);
      }
    });
    return out.toDataURL(opt.type || 'image/png', 0.92);
  }

  window.FILM = {
    scenes, order, render, still, blurred, grainPost, sheet, drawScene, sceneAt, timecode,
    get duration() { return DURATION; },
    sections: () => order.map((s) => ({ id: s.id, label: s.label, start: s.start, end: s.end })),
  };
})();
