# BIOZOOM website

Static website for BIOZOOM (wastewater treatment and resource recovery), deployed as
Cloudflare static assets at <https://www.biozoom.workers.dev/>.

This directory is self-contained and unrelated to the rest of the repository.

## Layout

```
src/
  site.json        site-wide values (version, origin)
  layout.html      page shell: head, header, footer
  partials/        shared blocks: {{> name}} includes partials/name.html
  pages/           one file per URL; front matter + <main> content
  assets/          CSS, JS, fonts, images (published with content hashes)
  _headers         security headers; {{styleSrc}} receives inline-style CSP hashes
  robots.txt
build.mjs          zero-dependency build: src/ -> dist/ (+ optional zip)
serve.mjs          local preview that applies _headers like Cloudflare does
scripts/qa.mjs     Playwright + axe-core checks and screenshots
docs/fonts/        font licences (SIL OFL 1.1)
```

A page starts with front matter:

```
---
title: About Us | BIOZOOM
description: …
path: /about/
nav: about
breadcrumbs: Home=/ ; About Us=/about/
---
<main id="main" class="inner-page">…</main>
```

`nav` marks the active item in the main navigation, `breadcrumbs` becomes
BreadcrumbList JSON-LD, `schema: organization` adds the Organization JSON-LD and
`layout: none` publishes the file as a complete document (used by 404.html).
Values are inserted as written, so write them HTML-escaped (`&amp;`).

## Build, preview, check

```
node build.mjs            # dist/
node build.mjs --zip      # dist/ and BIOZOOM-v<version>-cloudflare-static.zip
node serve.mjs            # http://localhost:4321/
npm install && npm run qa # needs the preview server running
```

Assets are published as `/assets/<name>.<first 10 hex of sha256>.<ext>` and every
`/assets/<name>.<ext>` reference in pages, CSS and JS is rewritten; a reference to
a missing asset fails the build, and assets nothing references are reported.

## Deploy

Upload the contents of `dist/` (or the zip) as the Worker's static assets.
`_headers` sets the CSP and long-lived caching for the hashed `/assets/*`.
