#!/usr/bin/env node
/* Renders stills and contact sheets of the film in headless Chromium.
 *
 *   node tools/stills.cjs --out media/stills 1.2 6.0 12.5      one PNG per time
 *   node tools/stills.cjs --sheet media/sheet.png --from 0 --to 64 --step 1 --cols 8
 *
 * Flags: --scale <s> (still resolution, default 0.5), --guides, --no-hud
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { requirePlaywright, filmURL } = require('./lib.cjs');

async function main() {
  const args = process.argv.slice(2);
  const opt = { out: null, sheet: null, scale: 0.5, guides: false, hud: true, from: 0, to: 64, step: 1, cols: 8, times: [], jpg: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out') opt.out = args[++i];
    else if (a === '--sheet') opt.sheet = args[++i];
    else if (a === '--scale') opt.scale = parseFloat(args[++i]);
    else if (a === '--guides') opt.guides = true;
    else if (a === '--no-hud') opt.hud = false;
    else if (a === '--from') opt.from = parseFloat(args[++i]);
    else if (a === '--to') opt.to = parseFloat(args[++i]);
    else if (a === '--step') opt.step = parseFloat(args[++i]);
    else if (a === '--cols') opt.cols = parseInt(args[++i], 10);
    else if (a === '--jpg') opt.jpg = true;
    else opt.times.push(parseFloat(a));
  }
  const { chromium } = requirePlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(filmURL({ mode: 'still' }));
  await page.waitForFunction(() => window.FILM_READY && window.FILM_READY.then, null, { timeout: 60000 });
  await page.evaluate(() => window.FILM_READY);

  const decode = (dataURL) => Buffer.from(dataURL.split(',')[1], 'base64');
  if (opt.sheet) {
    const times = [];
    for (let t = opt.from; t < opt.to - 1e-9; t += opt.step) times.push(+t.toFixed(4));
    if (opt.times.length) times.splice(0, times.length, ...opt.times);
    const data = await page.evaluate(
      ([times, o]) => window.FILM.sheet(times, { cols: o.cols, scale: o.scale, guides: o.guides, hud: o.hud, type: o.jpg ? 'image/jpeg' : 'image/png' }),
      [times, { cols: opt.cols, scale: Math.min(opt.scale, 0.3), guides: opt.guides, hud: opt.hud, jpg: opt.jpg }]
    );
    fs.mkdirSync(path.dirname(opt.sheet), { recursive: true });
    fs.writeFileSync(opt.sheet, decode(data));
    console.log('sheet', opt.sheet, times.length, 'frames');
  } else {
    const out = opt.out || 'media/stills';
    fs.mkdirSync(out, { recursive: true });
    for (const t of opt.times) {
      const data = await page.evaluate(([t, o]) => window.FILM.still(t, o), [t, { scale: opt.scale, guides: opt.guides, hud: opt.hud }]);
      const file = path.join(out, `t${t.toFixed(2).padStart(6, '0')}.png`);
      fs.writeFileSync(file, decode(data));
      console.log(file);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
