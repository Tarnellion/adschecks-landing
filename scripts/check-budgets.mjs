#!/usr/bin/env node
/**
 * Fast static gate over dist/client. Runs in ~1s and fails before the slow
 * Playwright suite gets a chance to.
 *
 * Everything here checks a class of failure that has actually happened in this
 * repo, or a budget that was expensive to win and is easy to lose:
 *
 *   - unevaluated Astro expressions leaking into HTML (32 of 34 JSON-LD blocks
 *     shipped as literal `{JSON.stringify({...})}` text for months)
 *   - a second stylesheet or an @import waterfall creeping back in
 *   - a third-party origin reappearing after fonts were self-hosted
 *   - CSS bundle size drifting past the ceiling
 *   - .DS_Store reaching the CDN
 *
 * Usage: node scripts/check-budgets.mjs [--json]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist/client';

/** Ceilings. Tighten these when the actuals improve — a budget above reality catches nothing. */
const BUDGET = {
  cssGzipBytes: 16_000,
  stylesheetsPerPage: 1,
  thirdPartyOrigins: 0,
};

/** Hosts a page is allowed to *reference* in markup (links and metadata, not loaded subresources). */
const ALLOWED_REFERENCE_HOSTS = new Set([
  'adschecks.com',
  'app.adschecks.com',
  'schema.org',
  'www.paddle.com',
  'policies.google.com',
  'publisher.example',
  'media-outlet.example',
  'www.googletagmanager.com', // only inside the consent script, never loaded before Accept
]);

const failures = [];
const notes = [];

function fail(check, detail) {
  failures.push({ check, detail });
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error(`✗ ${DIST} not found — run \`npm run build\` first.`);
  process.exit(2);
}

const htmlFiles = files.filter((f) => extname(f) === '.html');
const cssFiles = files.filter((f) => extname(f) === '.css');

if (htmlFiles.length === 0) fail('build', 'no HTML files in the build output');

// ── 1. No unevaluated Astro expressions ──────────────────────────────────────
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const marker of ['JSON.stringify(', 'Astro.props', '{JSON.']) {
    if (html.includes(marker)) {
      fail('unevaluated-expression', `${relative(DIST, file)} contains literal "${marker}"`);
    }
  }
}

// ── 2. Every ld+json block parses ────────────────────────────────────────────
let ldOk = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const blocks = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const block of blocks) {
    const body = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '').trim();
    try {
      JSON.parse(body);
      ldOk += 1;
    } catch (error) {
      fail('json-ld', `${relative(DIST, file)}: ${error.message.slice(0, 80)}`);
    }
  }
}
notes.push(`ld+json blocks valid: ${ldOk}`);

// ── 3. Exactly one first-party stylesheet, no @import ────────────────────────
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
    .map((m) => (m[0].match(/href="([^"]+)"/) || [])[1])
    .filter(Boolean);
  const firstParty = hrefs.filter((h) => !/^https?:\/\//.test(h));

  if (firstParty.length !== BUDGET.stylesheetsPerPage) {
    fail('stylesheets', `${relative(DIST, file)} has ${firstParty.length} first-party stylesheets, expected ${BUDGET.stylesheetsPerPage}`);
  }
  for (const href of firstParty) {
    if (!href.startsWith('/_astro/')) {
      fail('stylesheets', `${relative(DIST, file)} loads "${href}" — CSS must be bundled into /_astro/`);
    }
  }
}

for (const file of cssFiles) {
  if (readFileSync(file, 'utf8').includes('@import')) {
    fail('css-import', `${relative(DIST, file)} contains @import — the bundle must be flat`);
  }
}

// ── 4. CSS budget ────────────────────────────────────────────────────────────
const cssGzip = cssFiles.reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0);
notes.push(`CSS gzip: ${cssGzip} B across ${cssFiles.length} file(s)`);
if (cssGzip > BUDGET.cssGzipBytes) {
  fail('css-budget', `CSS gzip ${cssGzip} B exceeds ceiling ${BUDGET.cssGzipBytes} B`);
}

// ── 5. No unexpected third-party origins ─────────────────────────────────────
const seenHosts = new Map();
// Markup is not enough. @font-face src and background url() live in the bundled
// CSS and a beacon would live in script.js — a font quietly moving back to a CDN
// is exactly the regression this budget exists to prevent, and it would never
// appear in the HTML. .xml/.txt/.svg are excluded on purpose: their namespace
// URIs (www.w3.org, www.sitemaps.org) are identifiers, not origins.
const originScanned = files.filter((f) => ['.html', '.css', '.js'].includes(extname(f)));
for (const file of originScanned) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:https?:)?\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/gi)) {
    const host = match[1].toLowerCase();
    if (!seenHosts.has(host)) seenHosts.set(host, relative(DIST, file));
  }
}
const unexpected = [...seenHosts.keys()].filter((h) => !ALLOWED_REFERENCE_HOSTS.has(h));
if (unexpected.length > BUDGET.thirdPartyOrigins) {
  for (const host of unexpected) {
    fail('third-party-origin', `unexpected host "${host}" first seen in ${seenHosts.get(host)}`);
  }
}

// ── 6. Junk must not reach the CDN ───────────────────────────────────────────
for (const file of files) {
  if (file.endsWith('.DS_Store')) fail('junk', `${relative(DIST, file)} would be published`);
}

// ── Report ───────────────────────────────────────────────────────────────────
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ok: failures.length === 0, failures, notes }, null, 2));
} else {
  for (const note of notes) console.log(`  ${note}`);
  console.log(`  routes: ${htmlFiles.length} HTML files`);
  if (failures.length === 0) {
    console.log('\n✓ budgets ok');
  } else {
    console.error(`\n✗ ${failures.length} budget failure(s):\n`);
    for (const { check, detail } of failures) console.error(`  [${check}] ${detail}`);
  }
}

process.exit(failures.length === 0 ? 0 : 1);
