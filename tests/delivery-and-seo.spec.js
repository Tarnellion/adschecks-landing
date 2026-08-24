// @ts-check
import { test, expect } from '@playwright/test';
import { ROUTES } from './_helpers.js';

/**
 * `npm run preview` runs the build through wrangler, which applies
 * public/_headers and public/_redirects exactly as Cloudflare Pages does — so
 * these files are testable instead of being deploy-time guesswork.
 */

test.describe('redirects', () => {
  const REDIRECTS = [
    ['/sitemap.xml', '/sitemap-index.xml'],
    ['/pricing-usage', '/pricing/'],
    ['/pricing-usage/', '/pricing/'],
    ['/refunds-disputes', '/refund-policy/'],
    ['/refunds-disputes/', '/refund-policy/'],
    ['/index.html', '/'],
  ];

  for (const [from, to] of REDIRECTS) {
    test(`${from} → ${to} (301)`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(new URL(response.headers()['location'], 'http://localhost').pathname).toBe(to);
    });
  }
});

test.describe('security headers', () => {
  test('every HTML response is hardened', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['permissions-policy']).toContain('geolocation=()');
  });

  // Only /_astro/* carries a content hash in the filename, so only it may be
  // immutable. public/assets/ is copied verbatim under stable names — marking
  // it immutable for a year would make a favicon or map update undeliverable.
  test('content-hashed output is immutable, verbatim assets are not', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const cssHref = await page.getAttribute('link[rel="stylesheet"][href^="/_astro/"]', 'href');

    const hashed = await request.get(cssHref);
    expect(hashed.status(), `${cssHref} is not served`).toBe(200);
    const hashedCache = hashed.headers()['cache-control'] ?? '';
    expect(hashedCache, `${cssHref} must be immutably cached`).toContain('immutable');
    expect(hashedCache).toContain('max-age=31536000');

    for (const path of ['/assets/graphics/world.svg', '/assets/favicons/favicon-32.png']) {
      const response = await request.get(path);
      expect(response.status(), `${path} is not served`).toBe(200);
      const cacheControl = response.headers()['cache-control'] ?? '';
      expect(cacheControl, `${path} has no cache policy`).toContain('max-age=');
      expect(
        cacheControl,
        `${path} has no content hash in its name — immutable would strand updates`,
      ).not.toContain('immutable');
    }
  });

  test('HTML itself is not cached immutably', async ({ request }) => {
    const cacheControl = (await request.get('/')).headers()['cache-control'] ?? '';
    expect(cacheControl).not.toContain('immutable');
  });
});

test.describe('crawlability', () => {
  test('robots.txt points at the sitemap index Astro actually emits', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toMatch(/Sitemap:\s*https:\/\/adschecks\.com\/sitemap-index\.xml/);
    // The old pointer at /sitemap.xml is a 301 now — robots must not use it.
    expect(body).not.toMatch(/Sitemap:\s*\S+\/sitemap\.xml\s*$/m);
  });

  test('sitemap index resolves to a populated urlset', async ({ request }) => {
    const index = await request.get('/sitemap-index.xml');
    expect(index.status()).toBe(200);
    const indexBody = await index.text();
    expect(indexBody).toContain('https://adschecks.com/sitemap-0.xml');

    const urlset = await request.get('/sitemap-0.xml');
    expect(urlset.status()).toBe(200);
    const body = await urlset.text();

    for (const route of ROUTES) {
      expect(body, `${route.path} missing from the sitemap`).toContain(
        `https://adschecks.com${route.path}`,
      );
    }

    // astro.config.mjs filters these retired routes out.
    expect(body).not.toContain('/pricing-usage');
    expect(body).not.toContain('/refunds-disputes');

    // lastmod comes from the build date, not a hardcoded string.
    const lastmod = body.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    expect(lastmod, 'sitemap has no lastmod').toBeTruthy();
    expect(Number.isNaN(Date.parse(lastmod)), `unparseable lastmod: ${lastmod}`).toBe(false);
  });

  test('unknown paths return a real 404 page', async ({ request }) => {
    const response = await request.get('/no-such-page-here/');
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('Page Not Found');
  });

  test('every route is reachable and self-canonical', async ({ request }) => {
    for (const route of ROUTES) {
      const response = await request.get(route.path, { maxRedirects: 0 });
      expect(response.status(), `${route.path} is not a direct 200`).toBe(200);

      const html = await response.text();
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect(canonical, `${route.path} has no canonical`).toBe(
        `https://adschecks.com${route.path}`,
      );
    }
  });
});
