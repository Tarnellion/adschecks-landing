// @ts-check
import { test, expect } from '@playwright/test';
import { blockExternalFonts, gridColumnCount, useReducedMotion } from './_helpers.js';

/**
 * The breakpoint behaviour CLAUDE.md commits to, pinned so a CSS refactor
 * cannot quietly flip it: hero CTAs stack below 641px, the content grids go
 * one column on mobile and multi-column on desktop, and the compact nav is a
 * real toggle.
 */

test.describe('responsive layout invariants', () => {
  test('hero CTA row at >=641px, column at <=640px', async ({ page }) => {
    await useReducedMotion(page);
    await blockExternalFonts(page);

    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    expect(
      await page.locator('.hero__actions').evaluate((el) => getComputedStyle(el).flexDirection),
      'hero CTAs must stack at 640px',
    ).toBe('column');

    await page.setViewportSize({ width: 641, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    expect(
      await page.locator('.hero__actions').evaluate((el) => getComputedStyle(el).flexDirection),
      'hero CTAs must sit in a row at 641px',
    ).toBe('row');
  });

  test('check grid: 1 column on mobile, 2 on desktop', async ({ page }) => {
    await useReducedMotion(page);
    await blockExternalFonts(page);

    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    expect(await gridColumnCount(page, '.check-grid')).toBe(1);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    expect(await gridColumnCount(page, '.check-grid')).toBe(2);
  });

  test('pricing grid: 1 column on mobile, 3 on desktop', async ({ page }) => {
    await useReducedMotion(page);
    await blockExternalFonts(page);

    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/pricing/', { waitUntil: 'load' });
    expect(await gridColumnCount(page, '.pt-grid')).toBe(1);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pricing/', { waitUntil: 'load' });
    expect(await gridColumnCount(page, '.pt-grid')).toBe(3);
  });

  test('compact nav toggles open and closed', async ({ page }) => {
    await useReducedMotion(page);
    await blockExternalFonts(page);
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/', { waitUntil: 'load' });

    const toggle = page.locator('.nav-toggle');
    const nav = page.locator('#primary-nav');

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-controls', 'primary-nav');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toHaveClass(/nav--open/);
    await expect(nav.getByRole('link', { name: 'Pricing' })).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).not.toHaveClass(/nav--open/);
  });

  test('desktop nav needs no toggle', async ({ page }) => {
    await useReducedMotion(page);
    await blockExternalFonts(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });

    await expect(page.locator('.nav-toggle')).toBeHidden();
    await expect(page.locator('#primary-nav').getByRole('link', { name: 'Pricing' })).toBeVisible();
  });
});
