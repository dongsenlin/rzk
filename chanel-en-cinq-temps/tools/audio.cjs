#!/usr/bin/env node
/* Renders the score (OfflineAudioContext in headless Chromium) to a WAV.
 *   node tools/audio.cjs [out.wav]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { requirePlaywright, filmURL } = require('./lib.cjs');

async function renderWav(page) {
  const b64 = await page.evaluate(async () => {
    const buf = await window.SCORE.renderScore();
    const wav = new Uint8Array(window.SCORE.encodeWAV(buf));
    let s = '';
    for (let i = 0; i < wav.length; i += 0x8000) s += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}

async function main() {
  const out = process.argv[2] || path.join(__dirname, '..', 'media', 'score.wav');
  const { chromium } = requirePlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await page.goto(filmURL({ mode: 'still' }));
  await page.waitForFunction(() => window.FILM_READY && window.SCORE);
  const t0 = Date.now();
  const wav = await renderWav(page);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, wav);
  console.log(`wrote ${out} (${(wav.length / 1e6).toFixed(1)} MB) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await browser.close();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { renderWav };
