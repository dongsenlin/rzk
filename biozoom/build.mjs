#!/usr/bin/env node
// BIOZOOM static site build. Zero dependencies; Node 18 or newer.
//
//   node build.mjs          build src/ into dist/
//   node build.mjs --zip    also package dist/ as BIOZOOM-v<version>-cloudflare-static.zip
//
// Pages (src/pages/**/*.html) open with a front-matter block and are wrapped in
// src/layout.html unless they set `layout: none`. `{{> name}}` includes
// src/partials/name.html and `{{key}}` inserts a page or site value as-is, so
// values are written already HTML-escaped. Every file in src/assets is published
// as /assets/<name>.<sha256:10>.<ext>; references to /assets/<name>.<ext> in
// pages, CSS and JS are rewritten to the hashed name, and a reference to a file
// that does not exist fails the build. _headers receives the CSP hashes of any
// inline <style> blocks.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const dist = join(root, 'dist');

const site = JSON.parse(await readFile(join(src, 'site.json'), 'utf8'));

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return files.flat().sort();
}

const sha256 = data => createHash('sha256').update(data).digest();

// ---------------------------------------------------------------------------
// Assets: hash leaf files first, then CSS and JS (which may reference them).

const assetFiles = await walk(join(src, 'assets'));
const manifest = new Map(); // "styles.css" -> "styles.1c65f4f94e.css"
const assetOutput = new Map(); // hashed name -> contents
const referenced = new Set();

function rewriteAssetRefs(text, where) {
  return text.replace(/\/assets\/([A-Za-z0-9_.-]+)/g, (match, name) => {
    const hashed = manifest.get(name);
    if (!hashed) throw new Error(`${where}: unknown asset /assets/${name}`);
    referenced.add(name);
    return `/assets/${hashed}`;
  });
}

function publishAsset(file, contents) {
  const name = basename(file);
  const ext = extname(name);
  if (manifest.has(name)) throw new Error(`duplicate asset name ${name}`);
  const hashed = `${name.slice(0, -ext.length)}.${sha256(contents).toString('hex').slice(0, 10)}${ext}`;
  manifest.set(name, hashed);
  assetOutput.set(hashed, contents);
}

// Comments and layout whitespace only: nothing in the stylesheet is space-sensitive
// around braces and semicolons, and strings are left alone otherwise.
const minifyCss = css => css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim() + '\n';

const isCode = file => /\.(css|js)$/.test(file);
for (const file of assetFiles.filter(file => !isCode(file))) publishAsset(file, await readFile(file));
for (const file of assetFiles.filter(isCode)) {
  let text = rewriteAssetRefs(await readFile(file, 'utf8'), relative(root, file));
  if (file.endsWith('.css')) text = minifyCss(text);
  publishAsset(file, Buffer.from(text));
}

// ---------------------------------------------------------------------------
// Pages.

const partialCache = new Map();
async function partial(name) {
  if (!partialCache.has(name)) {
    partialCache.set(name, (await readFile(join(src, 'partials', `${name}.html`), 'utf8')).replace(/\n$/, ''));
  }
  return partialCache.get(name);
}

async function expandPartials(text, depth = 0) {
  if (depth > 8) throw new Error('partials nested too deeply');
  const names = [...new Set([...text.matchAll(/\{\{> ([\w-]+)\}\}/g)].map(match => match[1]))];
  for (const name of names) {
    text = text.replaceAll(`{{> ${name}}}`, await expandPartials(await partial(name), depth + 1));
  }
  return text;
}

function fill(text, values, where) {
  return text.replace(/\{\{([\w.-]+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`${where}: no value for {{${key}}}`);
    return values[key];
  });
}

function parsePage(text, where) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${where}: missing front matter`);
  const data = {};
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(':');
    if (at < 1) throw new Error(`${where}: bad front-matter line "${line}"`);
    data[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { data, body: text.slice(match[0].length) };
}

// "Home=/ ; Technologies=/technologies/" -> BreadcrumbList JSON-LD.
function breadcrumbJsonLd(spec) {
  const itemListElement = spec.split(';').map((part, index) => {
    const [name, path] = part.split('=').map(value => value.trim());
    return { '@type': 'ListItem', position: index + 1, name, item: `${site.origin}${path}` };
  });
  const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement });
  return `<script type="application/ld+json">${json}</script>`;
}

const layout = await readFile(join(src, 'layout.html'), 'utf8');
const pageFiles = (await walk(join(src, 'pages'))).filter(file => file.endsWith('.html'));
const pages = new Map(); // output path -> html
const inlineStyles = [];

for (const file of pageFiles) {
  const where = relative(root, file);
  const { data, body } = parsePage(await readFile(file, 'utf8'), where);
  const outPath = relative(join(src, 'pages'), file);
  const values = {
    ...Object.fromEntries(Object.entries(site).map(([key, value]) => [key, String(value)])),
    schemaOrganization: '',
    schemaBreadcrumb: '',
    ...data,
  };
  if (data.breadcrumbs) values.schemaBreadcrumb = breadcrumbJsonLd(data.breadcrumbs);
  if (data.schema === 'organization') values.schemaOrganization = fill(await partial('schema-organization'), values, where);
  values.url = `${site.origin}${data.path ?? ''}`;

  let html = data.layout === 'none' ? body : layout.replace('{{content}}', () => body.replace(/\n$/, ''));
  html = fill(await expandPartials(html), values, where);
  if (values.nav) {
    const marker = `data-nav="${values.nav}"`;
    if (!html.includes(marker)) throw new Error(`${where}: navigation has no ${marker}`);
    html = html.replace(marker, `${marker} class="active" aria-current="page"`);
  }
  // Empty slots leave whitespace-only lines behind; no page relies on them (no <pre>).
  html = rewriteAssetRefs(html.replace(/^[ \t]+$\n/gm, ''), where);
  for (const match of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) inlineStyles.push(match[1]);
  pages.set(outPath, html);
}

// ---------------------------------------------------------------------------
// Static files, CSP and output.

const styleHashes = [...new Set(inlineStyles.map(css => `'sha256-${sha256(css).toString('base64')}'`))];
const headers = fill(await readFile(join(src, '_headers'), 'utf8'), {
  styleSrc: ["'self'", ...styleHashes].join(' '),
}, 'src/_headers');

await rm(dist, { recursive: true, force: true });
async function emit(path, contents) {
  const target = join(dist, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}
for (const [path, html] of pages) await emit(path, html);
for (const [name, contents] of assetOutput) await emit(join('assets', name), contents);
await emit('_headers', headers);
await emit('robots.txt', await readFile(join(src, 'robots.txt')));

const unused = [...manifest.keys()].filter(name => !referenced.has(name));
if (unused.length) console.warn(`warning: published but never referenced: ${unused.join(', ')}`);

const bytes = [...assetOutput.values()].reduce((sum, contents) => sum + contents.length, 0);
console.log(`built ${pages.size} pages and ${assetOutput.size} assets (${(bytes / 1024).toFixed(0)} KiB) into ${relative(process.cwd(), dist) || '.'}`);

if (process.argv.includes('--zip')) {
  const zip = join(root, `BIOZOOM-v${site.version}-cloudflare-static.zip`);
  if (existsSync(zip)) await rm(zip);
  // -X drops extra file attributes; -D omits directory entries.
  execFileSync('zip', ['-q', '-r', '-X', '-D', zip, '.'], { cwd: dist });
  console.log(`packaged ${relative(process.cwd(), zip)}`);
}
