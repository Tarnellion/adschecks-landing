// @ts-check
import { test, expect } from '@playwright/test';
import {
  ROUTES,
  NOT_FOUND_ROUTE,
  WIDTHS,
  blockExternalFonts,
  waitForFonts,
  useReducedMotion,
  findHorizontalOverflow,
} from './_helpers.js';

/**
 * Horizontal overflow is this project's historical regression: html/body carry
 * `overflow-x: hidden` and `.section` carries `overflow: hidden`, so a broken
 * layout never produces a scrollbar — it just silently clips content off the
 * right edge. See findHorizontalOverflow() for how we detect it anyway.
 *
 * useReducedMotion() is deliberate, not a shortcut:
 *  - utilities.css scopes `.reveal { opacity: 0; transform: … }` to
 *    `@media (prefers-reduced-motion: no-preference)`, so under `reduce` every
 *    reveal element sits in its RESTING layout. Without it, off-screen
 *    `.timeline .reveal` elements report a -20px `translateX` and every page
 *    would need a full scroll-through before it could be measured.
 *  - script.js keeps the map-connector rAF loop switched off under `reduce`,
 *    so nothing mutates geometry while we read it.
 */

const ALL_ROUTES = [...ROUTES, NOT_FOUND_ROUTE];

for (const route of ALL_ROUTES) {
  for (const width of WIDTHS) {
    test(`no horizontal overflow — ${route.name} @ ${width}px`, async ({ page }) => {

      await useReducedMotion(page);
      await blockExternalFonts(page);
      await page.setViewportSize({ width, height: 900 });

      const response = await page.goto(route.path, { waitUntil: 'load' });
      expect(response?.status(), `unexpected status for ${route.path}`).toBe(route.status ?? 200);

      await waitForFonts(page);

      const offenders = await findHorizontalOverflow(page);
      expect(
        offenders,
        `${route.path} spills outside the ${width}px viewport:\n${offenders.join('\n')}`,
      ).toEqual([]);
    });
  }
}
