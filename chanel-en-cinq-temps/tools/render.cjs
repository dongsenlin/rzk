#!/usr/bin/env node
/* Exports the film: frame-accurate, motion-blurred, muxed with the score.
 *
 *   node tools/render.cjs [--out media/chanel-en-cinq-temps.mp4]
 *        [--fps 25] [--samples 6] [--shutter 0.5] [--scale 1] [--workers 4]
 *        [--from 0] [--to 64] [--crf 17] [--grain 0.022] [--keep]
 *
 * Every frame is rendered in headless Chromium as the average of `samples`
 * sub-frames across a 180-degree shutter (true motion blur, the way a film
 * camera integrates light), in parallel pages, then encoded with x264.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { requirePlaywright, filmURL, findFFmpeg } = require('./lib.cjs');
const { renderWav } = require('./audio.cjs');

function args() {
  const a = process.argv.slice(2);
  const o = { out: 'media/chanel-en-cinq-temps.mp4', fps: 25, samples: 'auto', shutter: 0.5, scale: 1, workers: 4, from: 0, to: 64, crf: 17, grain: 0.022, keep: false, audio: true };
  for (let i = 0; i < a.length; i++) {
    const k = a[i].replace(/^--/, '');
    if (k === 'keep') o.keep = true;
    else if (k === 'no-audio') o.audio = false;
    else if (k === 'samples') o.samples = a[++i] === 'auto' ? 'auto' : parseInt(a[i], 10);
    else if (k in o) o[k] = typeof o[k] === 'number' ? parseFloat(a[++i]) : a[++i];
  }
  return o;
}

async function main() {
  const o = args();
  const root = path.join(__dirname, '..');
  const dir = path.join(root, '.frames');
  fs.mkdirSync(dir, { recursive: true });
  const ff = findFFmpeg();
  const { chromium } = requirePlaywright();
  const browser = await chromium.launch();

  // score first (deterministic, same code the player embeds)
  let wavPath = null;
  if (o.audio) {
    const page = await browser.newPage();
    await page.goto(filmURL({ mode: 'still' }));
    await page.waitForFunction(() => window.FILM_READY && window.SCORE);
    const t0 = Date.now();
    const wav = await renderWav(page);
    wavPath = path.join(dir, 'score.wav');
    fs.writeFileSync(wavPath, wav);
    await page.close();
    console.log(`score rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }

  const f0 = Math.round(o.from * o.fps), f1 = Math.round(o.to * o.fps);
  const frames = [];
  for (let f = f0; f < f1; f++) frames.push(f);
  const todo = frames.filter((f) => !fs.existsSync(path.join(dir, `f${String(f).padStart(5, '0')}.png`)));
  console.log(`${frames.length} frames (${todo.length} to render), sub-frames: ${o.samples}, ${o.workers} workers`);
  const t0 = Date.now();
  let done = 0;
  const hist = {};
  async function worker(w) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error(`[w${w}]`, e.message));
    await page.goto(filmURL({ mode: 'still' }));
    await page.waitForFunction(() => window.FILM_READY && window.FILM_READY.then);
    await page.evaluate(() => window.FILM_READY);
    await page.evaluate((s) => {
      window.__cv = document.createElement('canvas');
      window.__cv.width = Math.round(1920 * s);
      window.__cv.height = Math.round(1080 * s);
    }, o.scale);
    for (let i = w; i < todo.length; i += o.workers) {
      const f = todo[i];
      const r = await page.evaluate(({ t, samples, shutter, grain }) => {
        const n = window.FILM.blurred(window.__cv, t, { samples, shutter });
        if (grain > 0) window.FILM.grainPost(window.__cv, t, grain);
        return { n, data: window.__cv.toDataURL('image/png') };
      }, { t: f / o.fps, samples: o.samples, shutter: o.shutter, grain: o.grain });
      fs.writeFileSync(path.join(dir, `f${String(f).padStart(5, '0')}.png`), Buffer.from(r.data.split(',')[1], 'base64'));
      hist[r.n] = (hist[r.n] || 0) + 1;
      done++;
      if (done % 50 === 0 || done === todo.length) {
        const el = (Date.now() - t0) / 1000;
        console.log(`  ${done}/${todo.length}  ${el.toFixed(0)} s  (~${((el / done) * (todo.length - done)).toFixed(0)} s left)`);
      }
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: o.workers }, (_, w) => worker(w)));
  await browser.close();
  console.log('sub-frames per frame:', Object.entries(hist).map(([n, c]) => `${n}x${c}`).join('  '));

  const out = path.resolve(root, o.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const enc = ['-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(o.fps), '-start_number', String(f0), '-i', path.join(dir, 'f%05d.png')];
  if (wavPath) enc.push('-itsoffset', String(o.from ? -o.from : 0), '-i', wavPath);
  enc.push('-map', '0:v');
  if (wavPath) enc.push('-map', '1:a', '-c:a', 'aac', '-b:a', '256k');
  enc.push('-c:v', 'libx264', '-preset', 'slow', '-crf', String(o.crf), '-tune', 'film',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', '-t', String((f1 - f0) / o.fps), out);
  const r = spawnSync(ff, enc, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  console.log(`wrote ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (!o.keep) fs.rmSync(dir, { recursive: true, force: true });
}

main().catch((e) => { console.error(e); process.exit(1); });
