// Canvas geometry, palette, fonts and the master timeline (seconds).
'use strict';

const W = 1080, H = 1920, FPS = 60, DURATION = 15;

// Moon and lunar dial, in world coordinates.
const MOON = { x: 540, y: 640, r: 270 };
const DIAL = { r: 332 };

const PAL = {
  ivory: [246, 238, 220],
  paper: [250, 242, 226],
  gold: [217, 183, 122],
  goldHi: [248, 228, 178],
  cinnabar: [184, 48, 38],
  moonGlow: [255, 231, 184],
  mist: [150, 158, 214],
  lavender: [168, 172, 204],
  lamp: [255, 206, 128],
};

const FONT = {
  serif: '"Noto Serif SC"',
  latin: '"Cormorant Garamond"',
  mono: '"JetBrains Mono"',
};

// Master timeline. Every animated element reads its window from here so the
// soundtrack cue sheet (window.CUES) stays in sync with the picture.
const T = {
  label: [0.35, 1.6],
  ring: [0.15, 1.5],
  phase: [0.3, 2.45],
  full: 2.45,
  counterOut: [2.95, 3.55],
  land: [1.2, 3.9],
  clouds: [2.6, 4.4],
  petals: [3.0, 4.4],
  nodes: [4.15, 5.35],
  poem: [5.15, 6.95],
  netDim: [6.7, 7.8],
  trace: [7.0, 8.4],
  fill: [7.95, 9.0],
  shine: [9.0, 9.75],
  seal: 9.4,
  lockup: [9.75, 10.8],
  divider: [10.25, 10.95],
  greet: [10.6, 11.95],
  date: [11.65, 12.35],
  sweep: [12.75, 13.7],
  outro: [14.4, 15.0],
};
