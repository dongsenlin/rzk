#!/usr/bin/env node
// QA for dist/, served by serve.mjs. For every page at several viewport widths:
// console errors (CSP violations are reported there), failed or 4xx/5xx requests,
// horizontal overflow, and an axe-core WCAG 2.2 A/AA scan. Internal links and
// their #fragment targets are checked once. Screenshots go to qa-output/.
//
//   npm install && npm run build && (npm run serve &) && npm run qa
//   node scripts/qa.mjs --base http://localhost:4321 --shots desktop,mobile

import { mkdir, readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(`--${name}`); return at >= 0 ? args[at + 1] : fallback; };
const base = option('base', 'http://localhost:4321');
const shotViewports = option('shots', 'desktop,mobile').split(',').filter(Boolean);
const only = option('only', '');
const out = join(root, 'qa-output');
const axeSource = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const viewports = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1100, height: 800 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))).flat();
}
const pages = (await walk(join(root, 'dist')))
  .filter(file => file.endsWith('.html'))
  .map(file => '/' + relative(join(root, 'dist'), file).replace(/index\.html$/, ''))
  .filter(path => !only || path.includes(only))
  .sort();

await mkdir(out, { recursive: true });
const problems = [];
const report = (where, message) => { problems.push(`${where}: ${message}`); };
const links = new Map(); // href -> first page that uses it

const browser = await chromium.launch();
for (const [name, viewport] of Object.entries(viewports)) {
  // Reduced motion keeps scroll-reveal content visible in full-page screenshots.
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  for (const path of pages) {
    const where = `${path} @${name}`;
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error') report(where, `console: ${message.text()}`); });
    page.on('pageerror', error => report(where, `script error: ${error.message}`));
    page.on('requestfailed', request => report(where, `request failed: ${request.url()}`));
    page.on('response', response => {
      const expected = path === '/404.html' && response.url().endsWith('/404.html');
      if (response.status() >= 400 && !expected) report(where, `HTTP ${response.status()} ${response.url()}`);
    });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 0) report(where, `horizontal overflow of ${overflow}px`);

    if (name === 'desktop' || name === 'mobile') {
      // page.evaluate is not subject to the page's CSP, so axe can run as shipped.
      const results = await page.evaluate(async source => {
        (0, eval)(source);
        return axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] });
      }, axeSource);
      for (const violation of results.violations) {
        const targets = violation.nodes.slice(0, 4).map(node => node.target.join(' ')).join(' | ');
        report(where, `axe ${violation.impact} ${violation.id}: ${violation.help} [${targets}]`);
      }
    }
    if (name === 'desktop') {
      for (const href of await page.$$eval('a[href]', anchors => anchors.map(a => a.getAttribute('href')))) {
        if (!links.has(href)) links.set(href, path);
      }
    }
    if (shotViewports.includes(name)) {
      const file = `${path.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home'}.${name}.png`;
      await page.screenshot({ path: join(out, file.replace('.html', '')), fullPage: true });
    }
    await page.close();
  }
  await context.close();
}

// Internal links resolve, and fragments point at an element on the target page.
const context = await browser.newContext();
const page = await context.newPage();
for (const [href, from] of links) {
  if (/^(mailto|tel):/.test(href) || /^https?:/.test(href)) continue;
  const target = new URL(href, base + from);
  // Load the document without its fragment: a same-document goto returns no response.
  const response = await page.goto(target.href.split('#')[0], { waitUntil: 'domcontentloaded' });
  if (!response || response.status() !== 200) { report(from, `link ${href} -> HTTP ${response?.status()}`); continue; }
  if (target.hash && !(await page.$(`[id="${decodeURIComponent(target.hash.slice(1))}"]`))) report(from, `link ${href}: no element with that id`);
}
await browser.close();

console.log(`checked ${pages.length} pages at ${Object.keys(viewports).length} widths and ${links.size} distinct links`);
if (problems.length) {
  console.log([...new Set(problems)].join('\n'));
  process.exitCode = 1;
} else console.log('no problems found');
