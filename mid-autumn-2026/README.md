# 千里共婵娟 · Mid-Autumn 2026

**栋森网络科技 携 Opus 5.5 祝大家中秋快乐** — a 15-second, 9:16 motion piece.

`out/mid-autumn-2026.mp4` · 1080×1920 · 60 fps · H.264 High / AAC 256k · −14 LUFS

The whole film — picture and score — is generated from code: no stock footage,
no samples, no templates. Every frame is a pure function of time, and the
soundtrack is written against the same timeline, so every hit lands on its frame.

## Idea

Su Shi's line *但愿人长久，千里共婵娟* (“though a thousand li apart, we share the
same moon”) is the spine. A network company's version of that line: the people
you love are nodes scattered across the map; the network brings them home; when
everyone is gathered into one circle, the circle becomes the full moon.

Colour carries the story: cold blue for distance, gold for connection, ivory
moonlight for reunion. Type weight carries it too — 千里 is set hairline-light and
drifts apart, 共 thickens from 200 to 900 as the ties form, 团圆 slides back
together in Black.

## Storyboard (120 BPM — one beat = 0.5 s = 30 frames)

| time | chapter | picture | sound |
|---|---|---|---|
| 0.0 | — | a text caret blinks twice where home will be | two ticks |
| 0.5 | 01 千里 | home lights up on 大地原点 (China's geodetic origin); a sonar sweep reveals 13 real cities by true great-circle bearing, distances counted in 里 | ping, a grain of light per node (panned by position), heartbeat on every beat |
| 2.0 | | **千里** rises in, hairline weight; the two characters drift apart and fly out of frame | low open fifth; two whooshes, left and right |
| 4.0 | 02 相连 | **共** thickens 200→900; dashed measuring lines bend into warm arcs; packets run home and back; warmth spreads city by city | arcs launch as a 32nd-note guzheng arpeggio; arrivals chime |
| 5.0 | | the network spirals onto a ring; 共 flies through the camera | the ring closes as a real 刮奏 glissando, swept in ring order |
| 6.0 | 03 团圆 | **团圆** slides together; chords `n → n·k mod 93` weave a cardioid, then k accelerates to 9 | 摇指 tremolo climbing D–E–F♯–A, riser, a tone that follows k |
| 7.75 | | inhale: the ring contracts, the room dims | the drop chord reversed, sucked into silence |
| 8.0 | 04 婵娟 | the ring becomes the moon: white-hot disc cooling into a lunar surface with the real maria layout (玉兔), shockwave, every node bursts into an osmanthus fleck | boom, 大锣 gong, full D chord |
| 8.25 | | the couplet hangs either side of the moon like 对联, 16th by 16th; 千里 / 共 arrive gilded — they were set earlier in the film | 上联 rises, 下联 answers |
| 10.0 | 05 中秋 | **中 / 秋 / 快 / 乐**, one per beat, full-frame, inverted against the moon | taiko + guzheng; bass climbs G–A–B–C♯ |
| 12.0 | | the giant 乐 was a close-up: the line pulls back as one body and 中秋快 sweep in | resolution to D |
| 12.25 | | *栋森网络科技 携 Opus 5.5 祝大家* streams in token by token, like a model writing | soft typing ticks |
| 13.0 | | the seal 栋森网络 (白文) is pressed | a woody thump |
| 13.55 | | a light sweep crosses 中秋快乐 | a chime moving left → right |

## Design system

- **Grid** — 60 px frame margins, HUD at the edges, the moon centred at (540, 760),
  a reserved type zone below it (centre line y = 1420). Everything typographic
  lives in that zone until the 中秋快乐 hits break the grid on purpose.
- **Type** — Noto Serif SC (variable, 200–900) for display, Noto Sans SC for UI,
  JetBrains Mono for data. Font weight is animated, not swapped.
- **Palette** — ink `#03050C` → night `#090E1E`, ivory `#F3EAD5`, moon `#FCF4E2`,
  gold `#F0C880`, cool `#96B8F0`, cinnabar `#BE2E24`.
- **Motion** — one signature deceleration, `cubic-bezier(0.16, 1, 0.3, 1)`, plus
  a strong in-out for travel and an expo-in for exits. Nothing ever sits fully
  still: the camera breathes, held type keeps a slow push.
- **Rhythm** — every cut sits on the 120 BPM grid; the beat ruler at the bottom
  of the frame makes that grid visible.

## How it is made

- `scene.js` — Canvas 2D scene. Deterministic (seeded) and stateless: `drawScene(t)`.
  - motion blur: 3–8 sub-frames across a 180° shutter, averaged in a 16-bit accumulator
  - bloom: a quarter-resolution emission buffer, blurred and bilinearly added back
  - film grain in the mid-tones, applied while resolving the frame
  - procedural moon: soft-union of warped ellipses on the true maria layout, fBm detail, craters, Tycho's rays
  - string art: the modular times-table, `k(t) = 2 + u + 6.4u⁴`
- `render.cjs` — drives headless Chromium; each page renders a frame and POSTs raw RGB back; frames are written as PNG and resume if interrupted.
- `audio/synth.py` — every sound synthesised with numpy/scipy: Karplus–Strong guzheng
  (allpass-tuned loop, nail click, body resonances, 揉弦 vibrato, 按音 bends),
  additive pads, 大锣 gong with blooming inharmonic partials, taiko, risers from
  spectrally shaped noise, a convolution hall — all placed from `audio/events.json`.
- `build.sh` — events → score → frames → master (two-pass loudness normalisation).

```sh
python3 fetch_fonts.py   # only when the copy changes; subsets are committed
./build.sh               # ≈ 10 min on 4 cores
```

Open `index.html` through any static server to watch a real-time preview
(click to start the score); `index.html?t=8.3` renders a single frame.

Fonts: Noto Serif SC, Noto Sans SC, JetBrains Mono — SIL Open Font License,
subset to the glyphs used.
