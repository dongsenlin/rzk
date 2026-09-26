#!/usr/bin/env node
// Render the reel with headless Chromium.
//   node src/render.js                         full 1080p30 → build/video.mp4 (no audio)
//   node src/render.js --stills 0.5,2.9,4.2    PNG stills → build/stills/
//   node src/render.js --sheet 0.5             contact sheet every 0.5 s → build/sheet.png
//   options: --scale 0.5  --samples N  --workers N  --from F --to F
'use strict';
const path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const FFMPEG = process.env.FFMPEG || execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const scale = parseFloat(opt('scale', '1'));
const samples = opt('samples', null) ? parseInt(opt('samples')) : null;

async function page(browser) {
  const W = Math.round(1920 * scale), H = Math.round(1080 * scale);
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  const man = path.join(BUILD, 'vo', 'manifest.json');
  if (fs.existsSync(man)) await p.addInitScript(`window.VO = ${fs.readFileSync(man, 'utf8')};`);
  await p.goto('file://' + path.join(ROOT, 'src', 'reel.html') + `?scale=${scale}`);
  await p.evaluate(() => window.READY);
  await p.addStyleTag({ content: 'canvas#out{width:auto!important;height:auto!important}' });
  return { p, W, H };
}
const shot = (pg) => pg.p.screenshot({ type: 'png', clip: { x: 0, y: 0, width: pg.W, height: pg.H } });

async function launch() {
  return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--disable-gpu-driver-bug-workarounds'] });
}

async function stills(list) {
  const b = await launch(); const pg = await page(b);
  const dir = path.join(BUILD, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of list) {
    const f = Math.round(t * 30);
    const t0 = Date.now();
    await pg.p.evaluate(([f, s]) => window.renderFrame(f, s), [f, samples]);
    fs.writeFileSync(path.join(dir, `f${String(f).padStart(3, '0')}.png`), await shot(pg));
    console.log(`t=${(f / 30).toFixed(3)} frame ${f}  ${Date.now() - t0} ms`);
  }
  await b.close();
}

async function sheet(step) {
  const b = await launch(); const pg = await page(b);
  const dir = path.join(BUILD, 'sheet'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const frames = []; for (let t = 0; t < 15 - 1e-6; t += step) frames.push(Math.round(t * 30));
  for (const f of frames) {
    await pg.p.evaluate(([f, s]) => window.renderFrame(f, s), [f, samples || 1]);
    fs.writeFileSync(path.join(dir, `s${String(f).padStart(3, '0')}.png`), await shot(pg));
  }
  await b.close();
  const cols = 6;
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(dir, 's*.png'),
    '-vf', `scale=480:-1,drawtext=text='%{eif\\:n*${step}*100/100\\:d}':x=8:y=8:fontcolor=white:fontsize=18:box=1:boxcolor=black@0.5,tile=${cols}x${Math.ceil(frames.length / cols)}:padding=4`,
    '-frames:v', '1', path.join(BUILD, 'sheet.png')]);
  console.log('sheet →', path.join(BUILD, 'sheet.png'));
}

async function segment(from, to, out, worker) {
  const b = await launch(); const pg = await page(b);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-tune', 'film', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = from; f <= to; f++) {
    await pg.p.evaluate(([f, s]) => window.renderFrame(f, s), [f, samples]);
    const png = await shot(pg);
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - from) % 15 === 0) console.log(`[w${worker}] frame ${f}/${to}  ${((Date.now() - t0) / (f - from + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
}

async function full() {
  const from = parseInt(opt('from', '0')), to = parseInt(opt('to', '449'));
  const workers = parseInt(opt('workers', '2'));
  const dir = path.join(BUILD, 'seg'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = to - from + 1, per = Math.ceil(n / workers), jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = from + w * per, z = Math.min(to, a + per - 1);
    if (a <= z) jobs.push(segment(a, z, path.join(dir, `seg${w}.mp4`), w));
  }
  await Promise.all(jobs);
  const list = path.join(dir, 'list.txt');
  fs.writeFileSync(list, jobs.map((_, w) => `file 'seg${w}.mp4'`).join('\n'));
  const out = path.join(BUILD, opt('out', 'video.mp4'));
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
  console.log('video →', out);
}

(async () => {
  if (opt('stills', null)) await stills(String(opt('stills')).split(',').map(Number));
  else if (opt('sheet', null)) await sheet(parseFloat(opt('sheet')));
  else await full();
})().catch(e => { console.error(e); process.exit(1); });
