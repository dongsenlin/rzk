#!/usr/bin/env node
/*
 * Deterministic frame renderer for index.html / scene.js.
 *
 *   node render.cjs stills  <t1> <t2> ... [--out dir] [--samples n]   PNG stills at given times (s)
 *   node render.cjs frames  [--from 0] [--to 899] [--workers 3] [--out frames]
 *   node render.cjs events  [--out audio/events.json]                  timeline events for the score
 *
 * The page renders a frame (with sub-frame motion blur and grain) and POSTs the
 * raw RGB to this process, which writes it as PNG. No screenshots are involved,
 * so what is written is exactly what the scene computed. Existing frames are
 * skipped, so an interrupted render resumes where it stopped.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch { /* fall through to the global install */ }
  const root = execSync('npm root -g').toString().trim();
  return require(path.join(root, 'playwright'));
}
const { chromium } = loadPlaywright();

const ROOT = __dirname;
const W = 1080, H = 1920;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.json': 'application/json' };

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgb) {
  const stride = W * 3, raw = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return new Promise((resolve, reject) => zlib.deflate(raw, { level: 2 }, (err, idat) => {
    if (err) return reject(err);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
    resolve(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]));
  }));
}

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      if (req.method === 'POST' && url.pathname === '/frame') {
        const parts = [];
        req.on('data', d => parts.push(d));
        req.on('end', async () => {
          try {
            const rgb = Buffer.concat(parts);
            if (rgb.length !== W * H * 3) throw new Error(`bad frame size ${rgb.length}`);
            const file = url.searchParams.get('name');
            fs.writeFileSync(file + '.tmp', await encodePNG(rgb));
            fs.renameSync(file + '.tmp', file);
            res.writeHead(200); res.end('ok');
          } catch (e) { console.error(e); res.writeHead(500); res.end(String(e)); }
        });
        return;
      }
      const file = path.join(ROOT, decodeURIComponent(url.pathname));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    }).listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function args() {
  const [mode, ...rest] = process.argv.slice(2);
  const o = { mode, list: [] };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) o[rest[i].slice(2)] = rest[++i];
    else o.list.push(rest[i]);
  }
  return o;
}

async function openPage(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[page error]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(url);
  await page.evaluate(() => window.scene.ready);
  return page;
}

const send = (page, frame, samples, file) =>
  page.evaluate(([f, s, n]) => window.scene.sendFrame(f, s, n), [frame, samples ?? null, path.resolve(file)]);

(async () => {
  const o = args();
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html?render`;
  const browser = await chromium.launch();
  try {
    if (o.mode === 'events') {
      const page = await openPage(browser, url);
      const ev = await page.evaluate(() => ({ T: window.scene.T, ringN: window.scene.ringN, events: window.scene.events }));
      const out = o.out || path.join(ROOT, 'audio', 'events.json');
      fs.writeFileSync(out, JSON.stringify(ev, null, 1));
      console.log(`wrote ${ev.events.length} events → ${out}`);
    } else if (o.mode === 'stills') {
      const out = o.out || path.join(ROOT, 'out', 'stills');
      fs.mkdirSync(out, { recursive: true });
      const page = await openPage(browser, url);
      for (const ts of o.list) {
        const f = Math.round(parseFloat(ts) * 60);
        const file = path.join(out, `t${(f / 60).toFixed(2).padStart(5, '0')}.png`);
        const t0 = Date.now();
        await send(page, f, o.samples ? +o.samples : undefined, file);
        console.log(`${file}  ${Date.now() - t0} ms`);
      }
    } else if (o.mode === 'frames') {
      const from = +(o.from ?? 0), to = +(o.to ?? 899), workers = +(o.workers ?? 3);
      const out = path.resolve(o.out || path.join(ROOT, 'frames'));
      fs.mkdirSync(out, { recursive: true });
      const todo = [];
      for (let f = from; f <= to; f++) if (!fs.existsSync(path.join(out, `${String(f).padStart(4, '0')}.png`))) todo.push(f);
      console.log(`${todo.length} frames to render with ${workers} workers`);
      let next = 0, done = 0;
      const t0 = Date.now();
      await Promise.all(Array.from({ length: workers }, async () => {
        const page = await openPage(browser, url);
        while (next < todo.length) {
          const f = todo[next++];
          await send(page, f, undefined, path.join(out, `${String(f).padStart(4, '0')}.png`));
          if (++done % 30 === 0 || done === todo.length) {
            const el = (Date.now() - t0) / 1000;
            console.log(`${done}/${todo.length}  ${el.toFixed(0)} s  eta ${((el / done) * (todo.length - done)).toFixed(0)} s`);
          }
        }
      }));
    } else {
      console.log('usage: node render.cjs stills|frames|events …');
    }
  } finally {
    await browser.close();
    srv.close();
  }
})();
