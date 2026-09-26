#!/usr/bin/env node
// Deterministic frame capture for index.html.
//
//   node tools/render.mjs stills <t> [t ...] [--out dir]      PNG stills at times t (s)
//   node tools/render.mjs cues [--out output/cues.json]         soundtrack cue sheet
//   node tools/render.mjs video [--out file.mp4] [--audio file] [--workers n] [--fps n] [--crf n] [--maxrate 10M]
//                                                             full render piped to ffmpeg
//
// Env: FFMPEG (path to an ffmpeg with libx264), default "ffmpeg".
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = pathToFileURL(resolve(ROOT, 'index.html')).href + '?capture';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

function playwright() {
  try { return require('playwright'); } catch { /* fall back to a global install */ }
  return require(resolve(execSync('npm root -g').toString().trim(), 'playwright'));
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
    else o._.push(argv[i]);
  }
  return o;
}

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('[page error]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(PAGE);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  await page.evaluate(() => {
    const cv = document.getElementById('stage');
    const ctx = cv.getContext('2d');
    window.grabPNG = t => { window.renderAt(t); return cv.toDataURL('image/png'); };
    // Raw RGBA as base64 - avoids a PNG encode/decode round trip per frame.
    window.grabRaw = async t => {
      window.renderAt(t);
      const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(new Blob([px.buffer])); });
      return url.slice(url.indexOf(',') + 1);
    };
  });
  return page;
}

async function stills(o) {
  const out = resolve(o.out || 'stills');
  mkdirSync(out, { recursive: true });
  const browser = await playwright().chromium.launch();
  const page = await openPage(browser);
  console.log('assets built in', await page.evaluate(() => window.META.assetsMs), 'ms');
  for (const ts of o._) {
    const t = parseFloat(ts), t0 = Date.now();
    const url = await page.evaluate(t => window.grabPNG(t), t);
    const file = resolve(out, `t${t.toFixed(2).padStart(5, '0')}.png`);
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file, `${Date.now() - t0}ms`);
  }
  await browser.close();
}

async function cues(o) {
  const browser = await playwright().chromium.launch();
  const page = await openPage(browser);
  const c = await page.evaluate(() => window.CUES);
  const out = resolve(o.out || resolve(ROOT, 'output/cues.json'));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(c, null, 1));
  console.log(out, c.length, 'cues');
  await browser.close();
}

async function video(o) {
  const fps = +(o.fps || 60), workers = +(o.workers || 3);
  const meta = { W: 1080, H: 1920, DURATION: 15 };
  const total = Math.round(meta.DURATION * fps);
  const out = resolve(o.out || resolve(ROOT, 'output/mid-autumn-2026.mp4'));
  mkdirSync(dirname(out), { recursive: true });

  const ff = [
    '-y', '-hide_banner', '-loglevel', 'error', '-nostats',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${meta.W}x${meta.H}`, '-r', String(fps), '-i', '-',
  ];
  if (o.audio) ff.push('-i', resolve(o.audio));
  ff.push(
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', o.preset || 'slow', '-crf', String(o.crf || 17), '-tune', 'film',
    // Capped CRF: quality-targeted, but never above --maxrate (default 10 Mbit/s).
    '-maxrate', o.maxrate || '10M', '-bufsize', o.bufsize || '20M',
    '-profile:v', 'high', '-g', String(fps * 2), '-bf', '3',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  );
  if (o.audio) ff.push('-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest');
  ff.push('-movflags', '+faststart', out);
  const enc = spawn(FFMPEG, ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const encDone = new Promise((res, rej) => enc.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));

  // Workers render interleaved frames; a reorder buffer feeds ffmpeg in order.
  const pending = new Map();
  let next = 0;
  const write = buf => new Promise(res => (enc.stdin.write(buf) ? res() : enc.stdin.once('drain', res)));
  let flushing = Promise.resolve();
  const push = (f, buf) => {
    pending.set(f, buf);
    flushing = flushing.then(async () => {
      while (pending.has(next)) { const b = pending.get(next); pending.delete(next); await write(b); next++; }
    });
    return flushing;
  };

  const { chromium } = playwright();
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const browser = await chromium.launch();
    const page = await openPage(browser);
    for (let f = k; f < total; f += workers) {
      while (f - next > workers * 6) await new Promise(r => setTimeout(r, 5));
      const b64 = await page.evaluate(t => window.grabRaw(t), f / fps);
      await push(f, Buffer.from(b64, 'base64'));
      if (f % 60 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`frame ${f}/${total}  ${(f / el).toFixed(1)} fps  eta ${((total - f) / Math.max(f / el, 0.01)).toFixed(0)}s`);
      }
    }
    await browser.close();
  }));
  await flushing;
  enc.stdin.end();
  await encDone;
  console.log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

const o = args(process.argv.slice(2));
const mode = o._.shift();
const run = { stills, cues, video }[mode];
if (!run) { console.error('usage: render.mjs stills|cues|video ...'); process.exit(2); }
run(o).catch(e => { console.error(e); process.exit(1); });
