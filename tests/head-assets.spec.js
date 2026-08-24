// @ts-check
import { test, expect } from '@playwright/test';
import { ROUTES, blockExternalFonts } from './_helpers.js';

/**
 * CSS used to live in `public/styles/` as seven files chained by `@import`
 * inside `public/styles/index.css` — seven render-blocking round trips. It now
 * lives in `src/styles/` and is imported by BaseLayout, so Astro bundles and
 * hashes it into a single `/_astro/*.css`.
 *
 * These tests fail if anyone reintroduces the waterfall: a second own
 * stylesheet link, an `@import` inside the bundle, or a hand-rolled
 * `/styles/…` link.
 */
test.describe('stylesheet delivery', () => {
  for (const route of ROUTES) {
    test(`${route.name}: exactly one own stylesheet`, async ({ page }) => {
      await blockExternalFonts(page);
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      const hrefs = await page.$$eval('link[rel="stylesheet"]', (links) =>
        links.map((link) => link.getAttribute('href') ?? ''),
      );

      const origin = new URL(page.url()).origin;
      const own = hrefs.filter((href) => {
        const absolute = new URL(href, origin);
        return absolute.origin === origin;
      });

      expect(
        own,
        `${route.path} must link exactly one first-party stylesheet, found:\n${own.join('\n')}`,
      ).toHaveLength(1);

      expect(
        own[0],
        'the stylesheet must be the hashed bundle Astro emits from src/styles/, not a hand-maintained /styles/ file',
      ).toMatch(/^\/_astro\/.+\.css$/);

      // The retired public/styles/ waterfall must not come back.
      expect(hrefs.filter((href) => href.startsWith('/styles/'))).toEqual([]);
    });
  }

  test('the bundle is self-contained (no @import chain)', async ({ page, request }) => {
    await blockExternalFonts(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const href = await page.getAttribute('link[rel="stylesheet"][href^="/_astro/"]', 'href');
    expect(href, 'no Astro-bundled stylesheet on the homepage').toBeTruthy();

    const response = await request.get(href);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/css');

    const css = await response.text();
    expect(css.includes('@import'), 'the CSS bundle pulls in more files at runtime').toBe(false);
    expect(css.length, 'the bundle looks suspiciously small').toBeGreaterThan(10_000);
    // The @layer order the architecture depends on must survive bundling.
    expect(css).toMatch(/@layer\s+foundation\s*,\s*layout\s*,\s*components\s*,\s*hero\s*,\s*pages\s*,\s*utilities/);
  });

  test('every page ships the same hashed bundle', async ({ page }) => {
    await blockExternalFonts(page);
    const seen = new Set();
    for (const route of ROUTES) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      const href = await page.getAttribute('link[rel="stylesheet"][href^="/_astro/"]', 'href');
      seen.add(href);
    }
    expect(
      [...seen],
      'pages disagree about which CSS bundle to load — the shared layout should emit one',
    ).toHaveLength(1);
  });
});
