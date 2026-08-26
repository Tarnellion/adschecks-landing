// @ts-check
import { test, expect } from '@playwright/test';
import { ROUTES, blockExternalFonts, useReducedMotion } from './_helpers.js';

/**
 * Every asset a rendered page points at must actually come back from the
 * server, with a plausible content-type and a non-truncated body.
 *
 * WHY THIS SHAPE, AND NOT A LIST OF PROPERTIES TO CHECK
 * -----------------------------------------------------
 * A previous CSS cleanup was guarded by a test that compared a hand-written
 * list of computed properties. The list had `background-color` but not
 * `background-image`, and the hero world map is wired up through the
 * `background:` shorthand (src/styles/hero.css:228/241/254) — so the map could
 * have vanished entirely and the suite would have stayed green. A human caught
 * it by looking at the page.
 *
 * The lesson: do not enumerate what to look at, because whoever adds the next
 * property will not remember to extend the list. Instead, ask the rendered page
 * what it references — every computed style, both pseudo-elements, every
 * asset-bearing attribute, and every rule in the CSSOM — and then prove each
 * of those URLs is really served. A missing file fails here whether it was
 * reached through a shorthand, a media query, a pseudo-element or an attribute.
 *
 * Scanning the CSSOM (`document.styleSheets`) on top of computed styles is what
 * catches assets no element currently resolves to: `@font-face src` is never
 * visible in `getComputedStyle`, and neither is a `url()` parked inside a
 * media query that this viewport does not match.
 */

/**
 * The canonical origin baked into absolute references (og:image and friends).
 * Those URLs point at production, but the bytes are the ones in this build, so
 * we re-point them at the server under test instead of skipping them — that is
 * the whole reason the check exists. Genuinely third-party origins are skipped
 * (see below).
 */
const PRODUCTION_ORIGIN = 'https://adschecks.com';

/** Minimum believable body size per asset class — an empty or truncated file is a defect too. */
const ASSET_CLASSES = [
  { kind: 'image', ext: /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)$/i, type: /^image\//i, minBytes: 100 },
  { kind: 'stylesheet', ext: /\.css$/i, type: /text\/css/i, minBytes: 1_000 },
  { kind: 'script', ext: /\.m?js$/i, type: /javascript/i, minBytes: 200 },
  {
    kind: 'font',
    ext: /\.(woff2?|ttf|otf|eot)$/i,
    // Some static hosts still label fonts as a generic binary blob.
    type: /font|application\/octet-stream/i,
    minBytes: 1_000,
  },
];

/** Falls back to a class that only demands "200 and not empty" for unknown extensions. */
function classify(url) {
  const { pathname } = new URL(url);
  return (
    ASSET_CLASSES.find((candidate) => candidate.ext.test(pathname)) ?? {
      kind: 'other',
      ext: /.*/,
      type: /.*/,
      minBytes: 1,
    }
  );
}

/**
 * Asks the live page for every URL it references.
 *
 * Returns `{ url, where }` pairs — `where` names the property/attribute that
 * produced the reference, so a failure reads as a diagnosis rather than a
 * bare 404.
 */
function collectAssetReferences(page) {
  return page.evaluate(() => {
    /** @type {{url: string, where: string}[]} */
    const references = [];

    // Matches url(x), url('x') and url("x").
    const URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

    const isIgnorable = (value) =>
      !value ||
      value === 'none' ||
      value === 'normal' ||
      value.startsWith('data:') ||
      value.startsWith('blob:') ||
      value.startsWith('about:') ||
      // url(#gradient) points at an inline SVG node, not at a network resource.
      value.startsWith('#');

    const record = (where, rawValue, base) => {
      const value = String(rawValue ?? '').trim();
      if (isIgnorable(value)) return;
      let absolute;
      try {
        absolute = new URL(value, base ?? location.href).href;
      } catch {
        references.push({ url: `«unresolvable: ${value}»`, where });
        return;
      }
      references.push({ url: absolute, where });
    };

    /** Pulls every url() out of a CSS value / rule text. */
    const recordUrlsIn = (where, cssText, base) => {
      const text = String(cssText ?? '');
      if (!text || text === 'none') return;
      URL_PATTERN.lastIndex = 0;
      let match;
      while ((match = URL_PATTERN.exec(text)) !== null) record(where, match[2], base);
    };

    // ---- 1. Computed styles, element and both pseudo-elements ----------------
    const CSS_PROPERTIES = [
      'backgroundImage',
      'borderImageSource',
      'maskImage',
      'webkitMaskImage',
      'listStyleImage',
      'content', // `content: url(...)` is a real fetch
      'cursor', // `cursor: url(...), pointer`
    ];

    for (const element of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        let style;
        try {
          style = getComputedStyle(element, pseudo);
        } catch {
          continue;
        }
        if (!style) continue;
        for (const property of CSS_PROPERTIES) {
          recordUrlsIn(`computed ${property}${pseudo ?? ''}`, style[property], location.href);
        }
      }
    }

    // ---- 2. Asset-bearing attributes ----------------------------------------
    // There are currently no <img>/<source>/<video> elements on this site; these
    // collectors exist so the first one added is covered on the day it lands.
    for (const img of document.querySelectorAll('img[src]')) {
      record('img[src]', img.getAttribute('src'), img.baseURI);
    }

    for (const element of document.querySelectorAll('img[srcset], source[srcset]')) {
      const srcset = element.getAttribute('srcset') ?? '';
      // A data: URI contains commas, which would shred a naive comma split —
      // and it is not a network fetch anyway, so leave those srcsets alone.
      if (srcset.includes('data:')) continue;
      for (const candidate of srcset.split(',')) {
        record(`${element.tagName.toLowerCase()}[srcset]`, candidate.trim().split(/\s+/)[0], element.baseURI);
      }
    }

    for (const video of document.querySelectorAll('video[poster]')) {
      record('video[poster]', video.getAttribute('poster'), video.baseURI);
    }

    const LINKED = [
      ['link[rel~="icon"][href]', 'link[rel=icon]'],
      ['link[rel="apple-touch-icon"][href]', 'link[rel=apple-touch-icon]'],
      ['link[rel="stylesheet"][href]', 'link[rel=stylesheet]'],
    ];
    for (const [selector, where] of LINKED) {
      for (const link of document.querySelectorAll(selector)) {
        record(where, link.getAttribute('href'), link.baseURI);
      }
    }

    for (const script of document.querySelectorAll('script[src]')) {
      record('script[src]', script.getAttribute('src'), script.baseURI);
    }

    for (const meta of document.querySelectorAll(
      'meta[property="og:image"][content], meta[name="twitter:image"][content]',
    )) {
      const where = meta.getAttribute('property') ?? meta.getAttribute('name');
      record(`meta[${where}]`, meta.getAttribute('content'), meta.baseURI);
    }

    // ---- 3. The CSSOM, for everything computed styles cannot see -------------
    // `@font-face src` never surfaces in getComputedStyle, and a url() inside a
    // non-matching media query is invisible until someone resizes. Reading a
    // rule's cssText covers nested rules (@media/@supports/@layer) in one pass.
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        // Cross-origin sheet: its CSSOM is unreadable. The <link href> itself is
        // still collected above, so the sheet is not silently dropped.
        continue;
      }
      if (!rules) continue;
      const base = sheet.href ?? location.href;
      for (const rule of rules) recordUrlsIn(`stylesheet ${sheet.href ?? '(inline)'}`, rule.cssText, base);
    }

    return references;
  });
}

/**
 * URLs already proven good, so a favicon linked from all 15 routes is fetched
 * once instead of fifteen times.
 *
 * Caveat by design: with `fullyParallel` this module is instantiated per worker
 * process, so the cache is per worker, not truly global. That only costs a
 * handful of extra requests — it can never let a broken asset through, because
 * an entry is added only after that asset passed, and a worker that has not
 * seen a URL checks it itself.
 */
const verified = new Set();

test.describe('referenced assets resolve', () => {
  for (const route of ROUTES) {
    test(`${route.name}: every referenced asset is really served`, async ({ page, request }) => {
      await blockExternalFonts(page);
      await useReducedMotion(page);
      // Keep the consent banner collapsed: BaseLayout's inline script returns
      // before `bar.removeAttribute('hidden')` when the stored value is 'denied'.
      await page.addInitScript(() => {
        try {
          localStorage.setItem('consent-analytics', 'denied');
        } catch {}
      });

      await page.goto(route.path, { waitUntil: 'load' });

      const references = await collectAssetReferences(page);
      expect(
        references.length,
        `${route.path} references no assets at all — the collector is probably broken`,
      ).toBeGreaterThan(0);

      const origin = new URL(page.url()).origin;

      /** url → the first place it was referenced from, for the failure message. */
      const targets = new Map();
      for (const { url, where } of references) {
        if (url.startsWith('«unresolvable')) {
          targets.set(url, where);
          continue;
        }
        const rewritten = url.startsWith(`${PRODUCTION_ORIGIN}/`)
          ? origin + url.slice(PRODUCTION_ORIGIN.length)
          : url;

        // Third-party origins are deliberately NOT fetched. This spec must stay
        // offline-deterministic: a CDN hiccup is not a defect in this build, and
        // _helpers.js already aborts the font CDNs for exactly that reason.
        // Today the site references none — every asset above is same-origin —
        // so this branch is dead code that only exists to keep a future
        // third-party reference from turning the whole suite flaky. Whether a
        // third party may be linked at all is head-assets.spec.js's question,
        // not this one's.
        if (new URL(rewritten).origin !== origin) continue;

        if (!targets.has(rewritten)) targets.set(rewritten, where);
      }

      const problems = [];

      for (const [url, where] of targets) {
        if (url.startsWith('«unresolvable')) {
          problems.push(`${where}: ${url}`);
          continue;
        }
        if (verified.has(url)) continue;

        const expected = classify(url);
        const response = await request.get(url);
        const status = response.status();
        const contentType = response.headers()['content-type'] ?? '(none)';
        const bytes = (await response.body()).length;

        const describe = () =>
          `${url}\n    referenced by: ${where}\n    status: ${status}  content-type: ${contentType}  bytes: ${bytes}`;

        if (status !== 200) {
          problems.push(`not served (expected 200)\n  ${describe()}`);
          continue;
        }
        if (!expected.type.test(contentType)) {
          problems.push(
            `content-type does not look like a ${expected.kind} (expected ${expected.type})\n  ${describe()}`,
          );
          continue;
        }
        if (bytes < expected.minBytes) {
          problems.push(
            `body is too small for a ${expected.kind} (expected at least ${expected.minBytes} bytes)\n  ${describe()}`,
          );
          continue;
        }

        verified.add(url);
      }

      expect(
        problems,
        `${route.path} references ${problems.length} asset(s) the server does not deliver:\n\n${problems.join('\n\n')}\n`,
      ).toEqual([]);
    });
  }
});

/**
 * INTENTIONALLY BRITTLE — READ BEFORE "FIXING".
 *
 * The check above proves that whatever the page references is served; it cannot
 * notice the hero map being unhooked, because a page that references nothing
 * still passes. This test pins the one asset whose silent disappearance already
 * happened once and was caught only by eye.
 *
 * So: if a redesign removes or renames the map, THIS TEST IS SUPPOSED TO DIE.
 * That is the point — the map should never be able to leave the page quietly.
 * When it genuinely goes, delete this test in the same commit as the redesign;
 * do not weaken it into `if (exists)`, which would restore the original blind
 * spot.
 */
test('homepage hero still paints the world map (deliberately brittle)', async ({ page }) => {
  await blockExternalFonts(page);
  await useReducedMotion(page);
  await page.goto('/', { waitUntil: 'load' });

  const map = page.locator('.map-viz__map');
  await expect(map, 'the hero map element is gone from the homepage').toHaveCount(1);

  const backgroundImage = await map.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(
    backgroundImage,
    `.map-viz__map has no world.svg in its background-image — the map is wired up through the\n` +
      `\`background:\` shorthand in src/styles/hero.css, which is exactly how it silently vanished before.\n` +
      `Computed value was: ${backgroundImage}`,
  ).toContain('world.svg');
});
