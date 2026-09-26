#!/usr/bin/env node
// Render the reel with headless Chromium.  The page composites each frame on the
// CPU and POSTs raw RGBA to a tiny local server, which pipes it into ffmpeg.
//   node src/render.js                         full 1080p30 → build/video.mp4 (no audio)
//   node src/render.js --stills 0.5,2.9,4.2    PNG stills → build/stills/
//   node src/render.js --sheet 0.5             contact sheet every 0.5 s → build/sheet.png
//   options: --scale 0.5  --samples N  --workers N  --from F --to F  --out name.mp4
//   (times and frames are global: the film proper starts after the PRE-second opening)
'use strict';
const path = require('path'), fs = require('fs'), http = require('http');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return 'ffmpeg'; } catch (e) {}
  for (const py of ['python3', 'python']) {
    try { return execFileSync(py, ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim(); } catch (e) {}
  }
  throw new Error('ffmpeg not found: install ffmpeg or `pip install imageio-ffmpeg`, or set FFMPEG');
}
const FFMPEG = findFfmpeg();
const scale = parseFloat(opt('scale', '1'));
const samples = opt('samples', null) ? parseInt(opt('samples')) : null;
const ASPECT = opt('aspect', 'h');                     // h = 16:9 (1920×1080), v = 9:16 (1080×1920)
const [VW, VH] = ASPECT === 'v' ? [1080, 1920] : [1920, 1080];
const RW = Math.round(VW * scale), RH = Math.round(VH * scale);
const LAB = opt('lab', null);                          // --lab name: render a test board instead of the film

// ── local server: static files + frame sink
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif' };
const sinks = new Map();
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/frame/')) {
    const key = decodeURIComponent(req.url.slice(7)), chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => { res.writeHead(200); res.end('ok'); const f = sinks.get(key); sinks.delete(key); if (f) f(Buffer.concat(chunks)); });
    return;
  }
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data);
  });
});
let PORT = 0;

async function launch() { return chromium.launch({ args: ['--allow-file-access-from-files', '--disable-accelerated-2d-canvas', '--js-flags=--max-old-space-size=4096'] }); }
async function page(browser) {
  const p = await browser.newPage({ viewport: { width: 640, height: 360 } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  const man = path.join(BUILD, 'vo', 'manifest.json');
  if (fs.existsSync(man)) await p.addInitScript(`window.VO = ${fs.readFileSync(man, 'utf8')};`);
  await p.goto(`http://127.0.0.1:${PORT}/src/reel.html?scale=${scale}&w=${VW}&h=${VH}${LAB ? '&lab=' + LAB : ''}`);
  await p.evaluate(() => window.READY);
  return p;
}
// length of the reel, read from engine.js so the opening and the film never drift apart
async function meta() {
  const b = await launch(), p = await b.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/src/reel.html?scale=${scale}&w=${VW}&h=${VH}${LAB ? '&lab=' + LAB : ''}`);
  const m = await p.evaluate(() => window.META); await b.close(); return m;
}
let seq = 0;
async function frame(p, f, s) {
  const key = `k${seq++}`;
  const got = new Promise(r => sinks.set(key, r));
  await p.evaluate(([f, s, url]) => window.renderSend(f, s, url), [f, s, `http://127.0.0.1:${PORT}/frame/${key}`]);
  return got;
}
function png(buf, file) {
  return new Promise((res, rej) => {
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${RW}x${RH}`, '-i', '-', '-frames:v', '1', file]);
    ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()); ff.stdin.end(buf);
  });
}

async function stills(list) {
  const b = await launch(), p = await page(b);
  const dir = path.join(BUILD, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of list) {
    const f = Math.round(t * 30), t0 = Date.now();
    const buf = await frame(p, f, samples);
    await png(buf, path.join(dir, `${ASPECT}${LAB ? '_' + LAB : ''}_f${String(f).padStart(4, '0')}.png`));
    console.log(`t=${(f / 30).toFixed(3)} frame ${f}  ${Date.now() - t0} ms`);
  }
  await b.close();
}

async function sheet(step) {
  const dir = path.join(BUILD, 'sheet'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const M = await meta();
  const frames = []; for (let t = 0; t < M.DUR - 1e-6; t += step) frames.push(Math.round(t * 30));
  const workers = parseInt(opt('workers', '3')), queue = frames.slice();
  await Promise.all(Array.from({ length: workers }, async () => {
    const b = await launch(), p = await page(b);
    while (queue.length) { const f = queue.shift(); await png(await frame(p, f, samples || 1), path.join(dir, `s${String(f).padStart(4, '0')}.png`)); }
    await b.close();
  }));
  const cols = 6;
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(dir, 's*.png'),
    '-vf', `scale=${ASPECT === 'v' ? 270 : 480}:-1,tile=${cols}x${Math.ceil(frames.length / cols)}:padding=4`, '-frames:v', '1', path.join(BUILD, `sheet_${ASPECT}.png`)]);
  console.log('sheet →', path.join(BUILD, 'sheet.png'));
}

async function segment(from, to, out, worker) {
  const b = await launch(), p = await page(b);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${RW}x${RH}`, '-r', '30', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-tune', 'film', '-x264-params', 'keyint=30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = from; f <= to; f++) {
    const buf = await frame(p, f, samples);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - from) % 15 === 0) console.log(`[w${worker}] frame ${f}/${to}  ${((Date.now() - t0) / (f - from + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
}

async function full() {
  const M = await meta();
  const from = parseInt(opt('from', '0')), to = parseInt(opt('to', String(M.NFRAMES - 1)));
  const workers = parseInt(opt('workers', '4'));
  const dir = path.join(BUILD, 'seg'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = to - from + 1, per = Math.ceil(n / workers), jobs = [], names = [];
  for (let w = 0; w < workers; w++) {
    const a = from + w * per, z = Math.min(to, a + per - 1);
    if (a <= z) { names.push(`seg${w}.mp4`); jobs.push(segment(a, z, path.join(dir, `seg${w}.mp4`), w)); }
  }
  await Promise.all(jobs);
  const list = path.join(dir, 'list.txt');
  fs.writeFileSync(list, names.map(n => `file '${n}'`).join('\n'));
  const out = path.join(BUILD, opt('out', `video_${ASPECT}.mp4`));
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
  console.log('video →', out);
  const wav = path.join(BUILD, 'audio.wav');
  if (fs.existsSync(wav) && !opt('noaudio', null)) {
    const fin = path.join(ROOT, 'out', (process.env.REEL_NAME || path.basename(ROOT)) + `_${ASPECT}_master.mp4`);
    fs.mkdirSync(path.dirname(fin), { recursive: true });
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', out, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest', '-movflags', '+faststart', fin]);
    console.log('final →', fin);
  }
}

server.listen(0, '127.0.0.1', async () => {
  PORT = server.address().port;
  try {
    if (opt('stills', null)) await stills(String(opt('stills')).split(',').map(Number));
    else if (opt('sheet', null)) await sheet(parseFloat(opt('sheet')));
    else await full();
  } catch (e) { console.error(e); process.exit(1); }
  server.close();
});
