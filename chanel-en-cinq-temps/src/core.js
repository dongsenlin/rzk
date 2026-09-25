/* EN CINQ TEMPS - core
 * Time grid, easing, noise, colour, type layout, glyph geometry, layers.
 * Everything in the film is a pure function of time t (seconds), so any
 * frame can be rendered in any order: scrubbing, stills and parallel export
 * all see exactly the same picture.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- time --
  // 5/4 at 150 BPM: a beat is 0.4 s, a bar is 2 s, 10 frames per beat at 25 fps.
  const W = 1920, H = 1080;
  const BPM = 150, METER = 5;
  const BEAT = 60 / BPM, BAR = BEAT * METER;
  const BARS = 32, DURATION = BARS * BAR;
  const FPS = 25;

  // Score position -> seconds. Bars and beats are 1-based, like a score.
  const T = (bar, beat = 1, sub = 0) => (bar - 1) * BAR + (beat - 1 + sub) * BEAT;

  function musical(t) {
    const b = Math.max(0, t) / BEAT;
    const i = Math.floor(b + 1e-9);
    return { bar: Math.floor(i / METER) + 1, beat: (i % METER) + 1, phase: b - i, beatIndex: i };
  }

  // ---------------------------------------------------------------- math --
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;
  const inv = (a, b, x) => (x - a) / (b - a);
  const remap = (x, a, b, c, d) => lerp(c, d, clamp(inv(a, b, x)));
  const smooth = (u) => u * u * (3 - 2 * u);
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------- easing --
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (u) => ((ax * u + bx) * u + cx) * u;
    const sy = (u) => ((ay * u + by) * u + cy) * u;
    const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(u) - x;
        if (Math.abs(e) < 1e-7) return sy(u);
        const d = dx(u);
        if (Math.abs(d) < 1e-7) break;
        u -= e / d;
      }
      let lo = 0, hi = 1;
      u = x;
      for (let i = 0; i < 40; i++) {
        const v = sx(u);
        if (Math.abs(v - x) < 1e-7) break;
        if (v < x) lo = u; else hi = u;
        u = (lo + hi) / 2;
      }
      return sy(u);
    };
  }

  const E = {
    linear: (x) => x,
    inSine: (x) => 1 - Math.cos((x * Math.PI) / 2),
    outSine: (x) => Math.sin((x * Math.PI) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inQuart: (x) => x * x * x * x,
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    inQuint: (x) => x * x * x * x * x,
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    inOutQuint: (x) => (x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutExpo: (x) =>
      x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: (x, s = 1.2) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
    bezier,
  };
  // House curves. Named once, used everywhere: the film has one motion voice.
  E.couture = bezier(0.16, 1, 0.3, 1); // reveals: fast departure, a long couture settle
  E.coupe = bezier(0.76, 0, 0.24, 1); //  transitions: a decisive cut through the middle
  E.soie = bezier(0.45, 0, 0.55, 1); //   silk: drifts and holds
  E.aiguille = bezier(0.64, 0, 0.78, 0); // needle: accelerates into a hit

  // Eased progress of t through [t0, t0 + dur].
  const P = (t, t0, dur, ease = E.linear) => ease(clamp((t - t0) / dur));

  // Keyframe track: [[t, v], [t, v, ease-into-this-key], ...]
  function track(keys) {
    return (t) => {
      if (t <= keys[0][0]) return keys[0][1];
      for (let i = 1; i < keys.length; i++) {
        const [t1, v1, e] = keys[i];
        if (t <= t1) {
          const [t0, v0] = keys[i - 1];
          const u = (e || E.linear)(clamp((t - t0) / (t1 - t0)));
          return v0 + (v1 - v0) * u;
        }
      }
      return keys[keys.length - 1][1];
    };
  }

  // Beat pulse: 1 at the beat, decaying exponentially (used for accents).
  function pulse(t, t0, decay = 0.18) {
    if (t < t0) return 0;
    return Math.exp(-(t - t0) / decay);
  }

  // -------------------------------------------------------- randomness --
  function hash1(n) {
    n = (n | 0) ^ 0x9e3779b9;
    n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
    n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  const hash2 = (x, y) => hash1((x | 0) * 374761393 + (y | 0) * 668265263);
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise1(x, seed = 0) {
    const i = Math.floor(x), f = x - i, u = smooth(f);
    return lerp(hash1(i + seed * 7919), hash1(i + 1 + seed * 7919), u) * 2 - 1;
  }
  function noise2(x, y, seed = 0) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi, u = smooth(xf), v = smooth(yf);
    const s = seed * 1013;
    const a = hash2(xi + s, yi), b = hash2(xi + 1 + s, yi);
    const c = hash2(xi + s, yi + 1), d = hash2(xi + 1 + s, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
  }

  // ------------------------------------------------------------- colour --
  const C = {
    noir: '#0A0A0A',
    encre: '#050505',
    ivoire: '#F2EEE6',
    blanc: '#FFFFFF',
    beige: '#D6C4A6',
    or: '#C9A35E',
    orPale: '#E9D3A1',
    orProfond: '#8C6424',
    rouge: '#6E1020',
    rougeClair: '#8E1B2C',
    argent: '#B7BCC2',
    graphite: '#1B1B1C',
    guide: '#FF2D55',
  };
  function hexRGB(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgbCache = new Map();
  function rgba(hex, a = 1) {
    let c = rgbCache.get(hex);
    if (!c) rgbCache.set(hex, (c = hexRGB(hex)));
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function mix(h1, h2, u, a = 1) {
    const x = hexRGB(h1), y = hexRGB(h2);
    const r = Math.round(lerp(x[0], y[0], u)), g = Math.round(lerp(x[1], y[1], u)), b = Math.round(lerp(x[2], y[2], u));
    return `rgba(${r},${g},${b},${a})`;
  }

  // --------------------------------------------------------------- type --
  // Type specs are plain objects: {family, size, weight, style, tracking(em)}
  const fontStr = (f) => `${f.style || 'normal'} ${f.weight || 400} ${f.size}px "${f.family}"`;

  function metrics(f) {
    const m = (window.FONT_METRICS || {})[`${f.family}|${f.style || 'normal'}`] ||
      (window.FONT_METRICS || {})[`${f.family}|normal`];
    return m || { upm: 1000, capHeight: 700, xHeight: 480, ascender: 900, descender: -250 };
  }
  const capHeight = (f) => (metrics(f).capHeight / metrics(f).upm) * f.size;
  const xHeight = (f) => (metrics(f).xHeight / metrics(f).upm) * f.size;

  let measureCtx = null;
  const layoutCache = new Map();
  // Kerning-aware glyph positions for a string with tracking (em). The x of
  // glyph i is width(prefix incl. i) - advance(i): that keeps the kern pair
  // (i-1, i) and never counts trailing tracking in the width.
  function layout(text, f) {
    const tr = f.tracking || 0;
    const key = fontStr(f) + '|' + tr + '|' + text;
    let L = layoutCache.get(key);
    if (L) return L;
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    const g = measureCtx;
    g.font = fontStr(f);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    const chars = Array.from(text);
    const xs = [], ws = [];
    let acc = '';
    const trPx = tr * f.size;
    for (let i = 0; i < chars.length; i++) {
      acc += chars[i];
      const adv = g.measureText(chars[i]).width;
      xs.push(g.measureText(acc).width - adv + i * trPx);
      ws.push(adv);
    }
    const width = chars.length ? xs[chars.length - 1] + ws[chars.length - 1] : 0;
    L = { chars, xs, ws, width, f };
    layoutCache.set(key, L);
    if (layoutCache.size > 4000) layoutCache.clear();
    return L;
  }

  const alignOffset = (w, align) => (align === 'center' ? -w / 2 : align === 'right' ? -w : 0);

  // Draw a tracked line of text. `each(i, ch)` may return per-glyph
  // {dx, dy, alpha, scale, rotate, color}; returning null skips the glyph.
  function text(ctx, str, x, y, f, opt = {}) {
    const L = layout(str, f);
    const ox = x + alignOffset(L.width, opt.align || 'left');
    ctx.font = fontStr(f);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const base = opt.color || ctx.fillStyle;
    const a0 = ctx.globalAlpha;
    if (!opt.each && !opt.stroke) {
      ctx.fillStyle = base;
      if (!(f.tracking) && !opt.forceGlyphs) {
        ctx.fillText(str, ox, y);
      } else {
        for (let i = 0; i < L.chars.length; i++) ctx.fillText(L.chars[i], ox + L.xs[i], y);
      }
      return L;
    }
    for (let i = 0; i < L.chars.length; i++) {
      const ch = L.chars[i];
      if (ch === ' ') continue;
      const s = opt.each ? opt.each(i, ch, L) : {};
      if (s === null) continue;
      const alpha = s.alpha === undefined ? 1 : s.alpha;
      if (alpha <= 0.001) continue;
      ctx.globalAlpha = a0 * alpha;
      const gx = ox + L.xs[i] + (s.dx || 0), gy = y + (s.dy || 0);
      if (s.scale !== undefined || s.rotate) {
        ctx.save();
        const cx = gx + L.ws[i] / 2;
        ctx.translate(cx, gy);
        if (s.rotate) ctx.rotate(s.rotate);
        if (s.scale !== undefined) ctx.scale(s.scale, s.scale);
        ctx.fillStyle = s.color || base;
        ctx.fillText(ch, -L.ws[i] / 2, 0);
        ctx.restore();
      } else {
        if (opt.stroke) {
          ctx.strokeStyle = s.color || base;
          ctx.strokeText(ch, gx, gy);
        } else {
          ctx.fillStyle = s.color || base;
          ctx.fillText(ch, gx, gy);
        }
      }
    }
    ctx.globalAlpha = a0;
    return L;
  }

  // Masked rise: each glyph slides up from below its own baseline clip.
  // progress 0..1, stagger in [0,1) is the fraction of the run spent staggering.
  function riseText(ctx, str, x, y, f, progress, opt = {}) {
    const L = layout(str, f);
    const n = L.chars.length;
    const st = opt.stagger === undefined ? 0.5 : opt.stagger;
    const ease = opt.ease || E.couture;
    const depth = opt.depth || f.size * 1.05;
    const clipTop = y - f.size * 1.2, clipH = f.size * 1.2 + (opt.descent === undefined ? f.size * 0.3 : opt.descent);
    const ox = x + alignOffset(L.width, opt.align || 'left');
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox - f.size, clipTop, L.width + f.size * 2, clipH);
    ctx.clip();
    const order = opt.order || ((i) => i);
    text(ctx, str, x, y, f, {
      align: opt.align,
      color: opt.color,
      each: (i) => {
        const k = n > 1 ? order(i, n) / (n - 1) : 0;
        const u = ease(clamp((progress - k * st) / (1 - st)));
        if (u <= 0) return null;
        return { dy: (1 - u) * depth * (opt.dir || 1), alpha: opt.fade ? u : 1 };
      },
    });
    ctx.restore();
    return L;
  }

  // ------------------------------------------------------------ glyphs --
  const pathCache = new Map();
  function glyph(key, ch) {
    const id = key + '|' + ch;
    let g = pathCache.get(id);
    if (g) return g;
    const set = window.GLYPHS[key];
    const src = set.glyphs[ch];
    g = { path: new Path2D(src.d), adv: src.adv, bbox: src.bbox, upm: set.upm, set };
    pathCache.set(id, g);
    return g;
  }
  // Transform so that font units map to canvas: baseline at (x,y), em = size px.
  function glyphTransform(ctx, key, ch, x, y, size) {
    const g = glyph(key, ch);
    const s = size / g.upm;
    ctx.translate(x, y);
    ctx.scale(s, -s);
    return g;
  }
  function fillGlyph(ctx, key, ch, x, y, size) {
    ctx.save();
    const g = glyphTransform(ctx, key, ch, x, y, size);
    ctx.fill(g.path);
    ctx.restore();
    return g;
  }
  // Glyph box in canvas units for a baseline position.
  function glyphBox(key, ch, x, y, size) {
    const g = glyph(key, ch);
    const s = size / g.upm;
    const [x0, y0, x1, y1] = g.bbox;
    return { x: x + x0 * s, y: y - y1 * s, w: (x1 - x0) * s, h: (y1 - y0) * s, adv: g.adv * s };
  }

  // ------------------------------------------------------------ layers --
  // Off-screen layers match the main canvas' backing store; drawing into them
  // uses the same 1920x1080 logical space.
  const layers = new Map();
  function layer(F, name) {
    let c = layers.get(name);
    if (!c || c.width !== F.pw || c.height !== F.ph) {
      c = document.createElement('canvas');
      c.width = F.pw;
      c.height = F.ph;
      layers.set(name, c);
    }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.filter = 'none';
    g.clearRect(0, 0, c.width, c.height);
    g.setTransform(F.scale, 0, 0, F.scale, 0, 0);
    return g;
  }
  // Composite a layer (or any canvas at backing resolution) onto ctx.
  function blit(ctx, g, alpha = 1, op = 'source-over') {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = op;
    ctx.drawImage(g.canvas, 0, 0);
    ctx.restore();
  }

  function fillBg(ctx, color) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  function line(ctx, x0, y0, x1, y1) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Draw the first `u` (0..1) of a polyline given as [[x,y],...].
  function partialPolyline(ctx, pts, u) {
    if (u <= 0 || pts.length < 2) return;
    let total = 0;
    const seg = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(l);
      total += l;
    }
    let left = total * clamp(u);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const l = seg[i - 1];
      if (left >= l) {
        ctx.lineTo(pts[i][0], pts[i][1]);
        left -= l;
      } else {
        const k = l > 0 ? left / l : 0;
        ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
        break;
      }
    }
    ctx.stroke();
  }

  // Sample a cubic Bezier chain [[p0, c0, c1, p1], ...] into a polyline.
  function sampleCubics(curves, stepsPer = 24) {
    const out = [];
    curves.forEach(([p0, c0, c1, p1], ci) => {
      for (let s = ci === 0 ? 0 : 1; s <= stepsPer; s++) {
        const u = s / stepsPer, v = 1 - u;
        const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
        out.push([a * p0[0] + b * c0[0] + c * c1[0] + d * p1[0], a * p0[1] + b * c0[1] + c * c1[1] + d * p1[1]]);
      }
    });
    return out;
  }

  // ------------------------------------------------------------ fonts --
  function b64ToBuffer(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  async function loadFonts() {
    const faces = window.FONT_FACES || [];
    await Promise.all(
      faces.map(async (f) => {
        const face = new FontFace(f.family, b64ToBuffer(f.data), { style: f.style, weight: f.weight });
        await face.load();
        document.fonts.add(face);
      })
    );
    // Warm every family so the first frame is typeset, not fallback.
    const probe = document.createElement('canvas').getContext('2d');
    for (const f of faces) {
      probe.font = `${f.style} ${f.weight.split(' ')[0]} 40px "${f.family}"`;
      probe.fillText('N°5 CHANEL 2.55', 0, 40);
    }
    await document.fonts.ready;
  }

  window.CINQ = {
    W, H, BPM, METER, BEAT, BAR, BARS, DURATION, FPS, T, musical,
    clamp, lerp, inv, remap, smooth, TAU,
    E, P, track, pulse,
    hash1, hash2, rng, noise1, noise2,
    C, rgba, mix, hexRGB,
    fontStr, metrics, capHeight, xHeight, layout, text, riseText, alignOffset,
    glyph, glyphTransform, fillGlyph, glyphBox,
    layer, blit, fillBg, line, partialPolyline, sampleCubics,
    loadFonts,
  };
})();
