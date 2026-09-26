// Math, easing, seeded randomness and noise shared by the scene.
'use strict';

const U = (() => {
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, x) => clamp((x - a) / (b - a));
  const smooth = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
  const TAU = Math.PI * 2;

  const ease = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => 1 - (1 - t) * (1 - t),
    inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: t => t * t * t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    inOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: t => 1 - Math.pow(1 - t, 5),
    inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: t => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    outSine: t => Math.sin((t * Math.PI) / 2),
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  };

  // Progress of t through [a, b], optionally eased.
  const seg = (t, a, b, e) => { const p = inv(a, b, t); return e ? e(p) : p; };

  // mulberry32
  const rng = seed => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Stateless integer hash -> [0, 1).
  const hash = (a, b = 0, c = 0) => {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // Improved Perlin noise, 3D.
  const makeNoise = seed => {
    const r = rng(seed);
    const p = new Uint8Array(512);
    const perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const grad = (h, x, y, z) => {
      const u = (h & 15) < 8 ? x : y;
      const v = (h & 15) < 4 ? y : (h & 15) === 12 || (h & 15) === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };
    const n3 = (x, y, z = 0) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
      return lerp(
        lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u), lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
        lerp(lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u), lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v),
        w);
    };
    const fbm = (x, y, z = 0, oct = 5, lac = 2.03, gain = 0.5) => {
      let s = 0, a = 0.5, f = 1, n = 0;
      for (let i = 0; i < oct; i++) { s += a * n3(x * f, y * f, z * f); n += a; a *= gain; f *= lac; }
      return s / n;
    };
    return { n3, fbm };
  };

  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    return c;
  };

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // Quadratic Bezier helpers.
  const qpt = (p0, c, p1, t) => {
    const m = 1 - t;
    return [m * m * p0[0] + 2 * m * t * c[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * c[1] + t * t * p1[1]];
  };
  const sampleQ = (p0, c, p1, n) => Array.from({ length: n + 1 }, (_, i) => qpt(p0, c, p1, i / n));

  return { clamp, lerp, inv, smooth, TAU, ease, seg, rng, hash, makeNoise, canvas, rgba, mix3, qpt, sampleQ };
})();
