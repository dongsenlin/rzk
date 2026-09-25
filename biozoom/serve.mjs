#!/usr/bin/env node
// Local preview of dist/ that behaves like Cloudflare static assets closely
// enough to test with: rules from _headers are applied (so the CSP is live),
// /path redirects to /path/ when that directory exists, and unknown paths get
// 404.html with a 404 status.
//
//   node serve.mjs [port]      default port 4321

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number(process.argv[2] ?? 4321);

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json',
};

// _headers: an unindented URL pattern, then indented "Name: value" lines.
const rules = [];
for (const line of (await readFile(join(dist, '_headers'), 'utf8')).split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) {
    const pattern = new RegExp(`^${line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    rules.push({ pattern, headers: [] });
  } else {
    const at = line.indexOf(':');
    rules.at(-1).headers.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
  }
}

async function isFile(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  let file = normalize(join(dist, pathname));
  let status = 200;
  if (!file.startsWith(dist)) file = join(dist, '404.html');
  if (pathname.endsWith('/')) file = join(file, 'index.html');
  else if (!(await isFile(file)) && await isFile(join(file, 'index.html'))) {
    response.writeHead(307, { Location: `${pathname}/${url.search}` }).end();
    return;
  }
  if (!(await isFile(file)) || file.endsWith('_headers')) { file = join(dist, '404.html'); status = 404; }
  for (const rule of rules) {
    if (rule.pattern.test(pathname)) for (const [name, value] of rule.headers) response.setHeader(name, value);
  }
  response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
  response.writeHead(status).end(request.method === 'HEAD' ? undefined : await readFile(file));
}).listen(port, () => console.log(`serving ${dist} at http://localhost:${port}/`));
