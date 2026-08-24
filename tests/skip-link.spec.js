// @ts-check
import { test, expect } from '@playwright/test';
import { blockExternalFonts } from './_helpers.js';

/**
 * WCAG 2.4.1 "Bypass Blocks": the layout's first focusable element must be a
 * skip link that becomes visible on focus and jumps past the 9-item primary
 * navigation.
 *
 * Note the animation: `.skip-link` is parked off-screen with
 * `transform: translateY(calc(-100% - 16px))` and slides in over a 160ms
 * `transition: transform 160ms ease-out` on `:focus-visible`
 * (src/styles/utilities.css:37). We poll its box until it lands rather than
 * sleeping for a fixed interval — no reducedMotion override here, because the
 * transition is exactly what is under test.
 */
test.describe('skip link', () => {
  test('is the first tab stop on a fresh load and slides into view', async ({ page }) => {
    await blockExternalFonts(page);
    await page.goto('/', { waitUntil: 'load' });

    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main');

    // Parked above the viewport before anything is focused.
    const parked = await skipLink.boundingBox();
    expect(parked, 'skip link has no box').not.toBeNull();
    expect(
      parked.y + parked.height,
      'skip link must start off-screen (it is only revealed on focus)',
    ).toBeLessThanOrEqual(0);

    await page.keyboard.press('Tab');

    // The very first Tab — nothing focusable may precede it in the DOM.
    await expect(skipLink).toBeFocused();

    // Wait out the 160ms transform transition instead of guessing.
    await expect
      .poll(
        async () => {
          const box = await skipLink.boundingBox();
          return box ? Math.round(box.y) : -9999;
        },
        {
          message: 'skip link never transitioned into the viewport after being focused',
          timeout: 3000,
          intervals: [16, 32, 64, 128],
        },
      )
      .toBeGreaterThanOrEqual(0);

    // Fully on-screen and actually rendered, not just nudged.
    const revealed = await skipLink.boundingBox();
    expect(revealed.height).toBeGreaterThan(0);
    expect(revealed.x).toBeGreaterThanOrEqual(0);
    await expect(skipLink).toBeInViewport();
  });

  test('Enter on the focused skip link navigates to #main', async ({ page }) => {
    await blockExternalFonts(page);
    await page.goto('/', { waitUntil: 'load' });

    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#main$/);
    const main = page.locator('#main');
    await expect(main).toBeVisible();
    // The nav must genuinely be behind us: #main starts after <header>.
    const skippedNavLinks = await page.locator('#primary-nav a').count();
    expect(skippedNavLinks).toBeGreaterThan(0);
    expect(await page.locator('#main #primary-nav').count()).toBe(0);
  });

  test('is present on inner pages too (it lives in BaseLayout)', async ({ page }) => {
    await blockExternalFonts(page);
    for (const path of ['/pricing/', '/blog/', '/faq/']) {
      await page.goto(path, { waitUntil: 'load' });
      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link'), `no skip link on ${path}`).toBeFocused();
    }
  });
});
