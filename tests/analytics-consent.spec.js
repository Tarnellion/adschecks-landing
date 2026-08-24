// @ts-check
import { test, expect } from '@playwright/test';
import { blockExternalFonts } from './_helpers.js';

/**
 * GDPR/ePrivacy invariant: nothing from Google may be requested before the
 * visitor clicks Accept.
 *
 * BaseLayout only renders the banner and the gtag bootstrap when the build had
 * PUBLIC_GA_ID; playwright.config.js therefore builds with a dummy id
 * (G-TEST12345). LIMITATION: if you point the suite at a server that was built
 * WITHOUT PUBLIC_GA_ID — e.g. an already-running `npm run preview` picked up by
 * `reuseExistingServer` — there is no banner to click and these tests skip
 * themselves rather than reporting a false pass. The skip reason names the
 * cause.
 *
 * Google hosts are intercepted and aborted, so a green run never actually
 * talks to Google and the suite stays offline-safe.
 */

const GOOGLE_HOSTS = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com)$/;
const CONSENT_KEY = 'consent-analytics';

/** Records every attempted Google request and blocks it from leaving. */
async function interceptGoogle(page) {
  const hits = [];
  await page.route(
    (url) => GOOGLE_HOSTS.test(url.hostname),
    (route) => {
      hits.push(route.request().url());
      return route.abort();
    },
  );
  return hits;
}

const gaBootstrapped = (page) => page.evaluate(() => Boolean(window.__gaLoaded));
const storedConsent = (page) => page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY);

/**
 * Loads a page with interception in place and reports whether this build ships
 * the consent UI at all.
 */
async function open(page, path = '/') {
  const hits = await interceptGoogle(page);
  await blockExternalFonts(page);
  await page.goto(path, { waitUntil: 'load' });
  const banner = page.locator('#cookie-bar');
  const built = (await banner.count()) > 0;
  return { hits, banner, built };
}

test.describe('analytics consent', () => {
  test('no Google request before the visitor decides', async ({ page }) => {
    const { hits, banner, built } = await open(page);
    test.skip(!built, 'build has no PUBLIC_GA_ID — consent banner is not rendered');

    await expect(banner).toBeVisible();
    expect(await gaBootstrapped(page), 'gtag bootstrapped before consent').toBe(false);
    expect(hits, `Google was contacted before consent:\n${hits.join('\n')}`).toEqual([]);
    expect(await storedConsent(page)).toBeNull();
  });

  test('Decline blocks analytics and is remembered across reloads', async ({ page }) => {
    const { hits, banner, built } = await open(page);
    test.skip(!built, 'build has no PUBLIC_GA_ID — consent banner is not rendered');

    await page.locator('#cookie-decline').click();

    await expect(banner).toBeHidden();
    await expect.poll(() => storedConsent(page)).toBe('denied');
    expect(await gaBootstrapped(page)).toBe(false);
    expect(hits, `Decline still triggered Google:\n${hits.join('\n')}`).toEqual([]);

    // The choice must survive a reload — and must not re-prompt.
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#cookie-bar')).toBeHidden();
    expect(await gaBootstrapped(page)).toBe(false);
    expect(hits, `Google was contacted after a remembered Decline:\n${hits.join('\n')}`).toEqual([]);
  });

  test('Accept loads gtag and is remembered across reloads', async ({ page }) => {
    const { hits, banner, built } = await open(page);
    test.skip(!built, 'build has no PUBLIC_GA_ID — consent banner is not rendered');

    expect(hits).toEqual([]);
    await page.locator('#cookie-accept').click();

    await expect(banner).toBeHidden();
    await expect.poll(() => storedConsent(page)).toBe('granted');
    expect(await gaBootstrapped(page)).toBe(true);

    await expect
      .poll(() => hits.length, { message: 'no gtag.js request after Accept' })
      .toBeGreaterThan(0);
    expect(hits.some((url) => url.includes('googletagmanager.com/gtag/js'))).toBe(true);

    // Consent persists: the banner stays away and gtag loads unprompted.
    const before = hits.length;
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#cookie-bar')).toBeHidden();
    expect(await gaBootstrapped(page)).toBe(true);
    await expect.poll(() => hits.length).toBeGreaterThan(before);
  });

  test('the banner links to the privacy policy', async ({ page }) => {
    const { banner, built } = await open(page);
    test.skip(!built, 'build has no PUBLIC_GA_ID — consent banner is not rendered');

    await expect(banner.locator('a[href="/privacy-policy/"]')).toBeVisible();
  });
});
