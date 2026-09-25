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

## v7.5 — "Editorial Engineering"

Direction from siteinspire.com's **Industry & Energy** and **Environment &
Sustainability** collections. Their featured sites are tagged Big Type (Daylight,
Polybion), Minimal (Everyday) and editorial / illustrative (Mærsk Mc-Kinney Møller
Center for Zero Carbon Shipping); Peak Energy and Q-Industrial are in the same set.
The common thread, applied here without changing the approved copy or claims:
oversized type, hairline grids, numbered section indexes, index lists with image
previews and a quiet paper-and-ink palette.

Design
- Type: body 17px (was 13–15px), fluid display sizes up to ~96px, mono labels at
  11px minimum (were 9–10px). Instrument Serif Italic (OFL, 22 KB) carries the second half of
  two-part headlines, including the hero's "Renewable Energy" and the existing motto.
- Palette: warm paper `#f5f4ef` alternates with white and deep navy; green text
  darkened to `#236f30` so it passes AA on paper (5.5:1).
- Home: numbered sections (01–06); solutions strip under a full-width heading;
  "About BIOZOOM" as a big-type statement with inline photo pills that inks line by
  line on scroll, then a full-width team photo; the three equipment cards became a
  five-row technology index with a sticky preview that follows hover and keyboard
  focus; dark scope band; numbered FAQ; contact form on a card; footer with the full
  address and an oversized wordmark bleeding off the bottom edge.
- Technology pages: outlined sequence number (01–05), sticky on-page navigation
  that tracks the current section, features as datasheet rows, equipment images on
  a plate at no more than their own size, a dark project-brief panel, and the other
  four technologies as index rows.
- About, Products, Services, Contact and 404 follow the same system (services as
  numbered rows, products as open cards with a dark selection card).
- Motion is progressive: hero settle, scroll reveal, scroll-linked ink
  (`animation-timeline`), animated FAQ (`::details-content`). Nothing is hidden
  or moving with reduced motion, without JavaScript, or in browsers lacking support.

Engineering
- The stylesheet was rewritten by component instead of stacking another override
  layer; no CSS nesting or `color-mix()`, so older Chromium-based in-app browsers
  still lay out correctly.
- The inline `<style>` blocks moved into the stylesheet, so the CSP is now
  `style-src 'self'` with no hashes.
- Logo: the official PNG is 176×57 and was shown at 176×57 CSS px, so it was soft
  on every high-density screen. `biozoom-logo-mask.png` is a 3× version made with
  Lanczos resampling and an alpha edge curve (no retracing; 11 KB, was 22 KB).
  `biozoom-logo-teal.png` replaces the white-on-transparent logo in the
  Organization JSON-LD, which would have been invisible on white. A vector logo
  from BIOZOOM would still be better.
- Seven unreferenced files are no longer published (hero-panorama-v2, hero-clean,
  logo.webp, official-biogas-desulfurization, process-membrane, process-recovery,
  project.webp): 842 KiB of assets instead of 1231 KiB.
- The capability strip is a `<ul>`: v7.4 already described it as capabilities,
  not a sequence.
- `↗` and `→` came from a fallback font (they are outside the font subset); they
  are SVG icons now.

Checked with `scripts/qa.mjs` (12 pages × 4 widths: no console or CSP errors, no
horizontal overflow, no axe WCAG 2.2 A/AA violations, all links and fragments
resolve) and a text diff against v7.4 to confirm the copy.
