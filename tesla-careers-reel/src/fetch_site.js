#!/usr/bin/env node
// Download the real imagery from tesla.cn (run on your own machine — the cloud
// sandbox that built this project cannot reach tesla.cn).
//
//   node src/fetch_site.js            headless Chromium
//   node src/fetch_site.js --headed   visible browser (if the site blocks headless)
//
// Output:
//   assets/photos/raw/<page>_<nn>.jpg   every large image the pages load (converted to JPEG)
//   assets/photos/raw/<page>_page.png   screenshot of each page (style reference)
//   assets/photos/index.json            file, page, source URL, size
//   assets/photos/contact.html/.png     numbered overview to pick from
//   assets/photos/photos.json           slot → file, auto-guessed; edit it, it is never overwritten
//
// Slots used by scenes.js (all optional; a missing slot falls back to the vector design):
//   car      Model Y, landscape       → full-bleed after the drop (可持续交通)
//   energy   Megapack / solar         → card in the energy chapter
//   robot    Optimus                  → line-art robot "develops" into the photo
//   people1…people8  careers imagery  → blue duotone montage behind the job-title slot machine
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'photos');
const RAW = path.join(OUT, 'raw');
const PAGES = [
  ['careers', 'https://www.tesla.cn/careers'],
  ['internships', 'https://www.tesla.cn/careers/internships'],
  ['modely', 'https://www.tesla.cn/modely'],
  ['megapack', 'https://www.tesla.cn/megapack'],
  ['powerwall', 'https://www.tesla.cn/powerwall'],
  ['ai', 'https://www.tesla.cn/AI'],
  ['werobot', 'https://www.tesla.cn/we-robot'],
  ['manufacturing', 'https://www.tesla.cn/manufacturing'],
  ['impact', 'https://www.tesla.cn/impact'],
];
const MIN_BYTES = 60 * 1024;
const headed = process.argv.includes('--headed');

async function scroll(page) {
  await page.evaluate(async () => {
    const step = 700;
    for (let y = 0; y < document.body.scrollHeight + 2000; y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 350)); }
    window.scrollTo(0, 0);
  });
}

async function main() {
  fs.mkdirSync(RAW, { recursive: true });
  const browser = await chromium.launch({ headless: !headed });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const conv = await ctx.newPage();                      // converts any image format to JPEG
  await conv.setContent('<canvas id=c></canvas>');
  const index = [], seen = new Set();
  for (const [name, url] of PAGES) {
    const page = await ctx.newPage();
    const bodies = [];
    page.on('response', async (res) => {
      try {
        const type = (res.headers()['content-type'] || '');
        if (!type.startsWith('image/') || type.includes('svg')) return;
        const u = res.url().split('?')[0];
        if (seen.has(u)) return;
        const buf = await res.body();
        if (buf.length < MIN_BYTES) return;
        seen.add(u); bodies.push({ url: res.url(), type, buf });
      } catch (e) { /* redirects / aborted */ }
    });
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await scroll(page);
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.screenshot({ path: path.join(RAW, `${name}_page.png`), fullPage: true }).catch(() => {});
    } catch (e) { console.error(`! ${name}: ${e.message.split('\n')[0]}`); }
    let n = 0;
    for (const b of bodies) {
      const dataUrl = `data:${b.type.split(';')[0]};base64,${b.buf.toString('base64')}`;
      const out = await conv.evaluate(async (src) => {
        const img = new Image(); img.src = src;
        try { await img.decode(); } catch (e) { return null; }
        const c = document.getElementById('c'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
        return { w: c.width, h: c.height, jpg: c.toDataURL('image/jpeg', 0.93) };
      }, dataUrl);
      if (!out || out.w < 800) continue;
      const file = `${name}_${String(++n).padStart(2, '0')}.jpg`;
      fs.writeFileSync(path.join(RAW, file), Buffer.from(out.jpg.split(',')[1], 'base64'));
      index.push({ file: `raw/${file}`, page: name, url: b.url, width: out.w, height: out.h });
    }
    console.log(`${name.padEnd(14)} ${n} images`);
    await page.close();
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));

  // contact sheet
  const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#111;color:#ddd;font:14px sans-serif;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:8px}
    figure{margin:0}img{width:100%;height:210px;object-fit:cover;display:block}figcaption{padding:4px 0}</style>` +
    index.map(e => `<figure><img src="${e.file}"><figcaption>${e.file.slice(4)} · ${e.width}×${e.height}</figcaption></figure>`).join('');
  fs.writeFileSync(path.join(OUT, 'contact.html'), html);
  const cp = await ctx.newPage();
  await cp.goto('file://' + path.join(OUT, 'contact.html'));
  await cp.waitForTimeout(1500);
  await cp.screenshot({ path: path.join(OUT, 'contact.png'), fullPage: true });

  // first guess for the slots (only if photos.json does not exist yet)
  const pj = path.join(OUT, 'photos.json');
  if (!fs.existsSync(pj)) {
    const land = e => e.width / e.height >= 1.45;
    const big = (arr) => arr.sort((a, b) => b.width * b.height - a.width * a.height);
    const from = (pages, pred = () => true) => big(index.filter(e => pages.includes(e.page) && pred(e)));
    const slots = {};
    const pick = (slot, list) => { const e = list.find(x => !Object.values(slots).includes(x.file)); if (e) slots[slot] = e.file; };
    pick('car', from(['modely'], land));
    pick('energy', from(['megapack', 'powerwall'], land));
    pick('robot', from(['werobot', 'ai'], e => /optimus|robot/i.test(e.url)).concat(from(['werobot'])));
    from(['careers', 'internships', 'manufacturing', 'impact'], land).slice(0, 8).forEach((e, i) => { slots[`people${i + 1}`] = e.file; });
    fs.writeFileSync(pj, JSON.stringify(slots, null, 1));
    console.log('photos.json (first guess):', slots);
  }
  await browser.close();
  console.log(`\n${index.length} images → ${RAW}\nopen ${path.join(OUT, 'contact.png')} and edit ${pj} to choose.`);
}
main().catch(e => { console.error(e); process.exit(1); });
