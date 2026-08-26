// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  ROUTES,
  NOT_FOUND_ROUTE,
  blockExternalFonts,
  waitForFonts,
  useReducedMotion,
} from './_helpers.js';

/**
 * axe-core over EVERY route, at a mobile and a desktop width.
 *
 * Why this exists next to Lighthouse: lighthouserc.mjs only collects three of
 * the sixteen rendered pages, and its accessibility budget is an error gate at
 * 0.9 — a score, not a pass/fail per rule. So a page outside those three can
 * regress freely, and even inside them a single serious violation can hide
 * under a 0.91. This spec is the per-rule gate: every route, every rule in the
 * WCAG 2.0/2.1 A+AA sets, no score arithmetic.
 *
 * The 404 page is included deliberately — it is a real rendered page that
 * nothing else in the suite renders, and it is exactly the kind of page a
 * redesign forgets.
 *
 * Both widths matter and are not redundant: layout-dependent rules genuinely
 * differ. `scrollable-region-focusable` fires on prose tables only where the
 * table actually overflows, so it appears on all three blog posts at 375px but
 * on only one of them at 1280px.
 */

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** 375 = the narrowest phone the design commits to; 1280 = the primary desktop width. */
const WIDTHS = [375, 1280];

const ALL_ROUTES = [...ROUTES, NOT_FOUND_ROUTE];

/**
 * Renders a route in the state a returning visitor sees, minus the animations.
 *
 * The consent banner is the reason for the localStorage write: BaseLayout keeps
 * `#cookie-bar` in the markup permanently and only unhides it when no choice is
 * stored. Pre-storing 'denied' makes the inline script return before
 * `bar.removeAttribute('hidden')`, so the banner stays `hidden` — and a
 * `hidden` subtree is outside axe's scope entirely, so it can neither raise a
 * false violation (e.g. contrast measured against a background it is painted
 * over) nor mask the content behind it. The banner's own accessibility, in its
 * visible state, belongs to analytics-consent.spec.js.
 *
 * `useReducedMotion` matters for more than speed: under `reduce`,
 * utilities.css drops `.reveal { opacity: 0 }`, so every section is in its
 * settled, fully-painted state and colour-contrast is measured on the real
 * colours instead of on a mid-fade element.
 */
async function openForAudit(page, route, width) {
  await blockExternalFonts(page);
  await useReducedMotion(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('consent-analytics', 'denied');
    } catch {}
  });
  // setViewportSize rather than `test.use({ viewport })`: _helpers.js documents
  // that with a device descriptor spread into the project's `use`, fixture
  // options do not reliably reach the page in this Playwright version.
  await page.setViewportSize({ width, height: 900 });

  const response = await page.goto(route.path, { waitUntil: 'load' });
  expect(response?.status(), `unexpected status for ${route.path}`).toBe(route.status ?? 200);

  await waitForFonts(page);
}

/** A readable report: rule, impact, description, and the nodes that failed it. */
function formatViolations(violations) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `      - ${node.target.join(' ')}`)
        .join('\n');
      return [
        `  ${violation.id} [${violation.impact}] — ${violation.help}`,
        `    ${violation.helpUrl}`,
        `    ${violation.nodes.length} node(s):`,
        nodes,
      ].join('\n');
    })
    .join('\n\n');
}

for (const route of ALL_ROUTES) {
  for (const width of WIDTHS) {
    test(`a11y — ${route.name} @ ${width}px`, async ({ page }) => {
      await openForAudit(page, route, width);

      // Sanity: a page that failed to render would trivially have no
      // violations, which would be a false pass.
      await expect(page.locator('#main')).toHaveCount(1);

      const { violations } = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();

      // Assert on one-line summaries, never on the raw axe objects: comparing
      // the objects makes Playwright print a page of nested JSON that buries
      // the actual finding. The readable report goes in the message instead.
      const summary = violations.map((v) => `${v.id} [${v.impact}] — ${v.nodes.length} node(s)`);

      expect(
        summary,
        `${route.path} at ${width}px has ${violations.length} accessibility violation(s):\n\n` +
          `${formatViolations(violations)}\n`,
      ).toEqual([]);
    });
  }
}

/**
 * The banner is hidden for every audit above, so this pins the assumption that
 * makes those audits meaningful. If BaseLayout ever stops honouring a stored
 * 'denied', the banner would start overlaying all sixteen pages and the results
 * above would silently change meaning — better to fail here, on the cause.
 */
test('a stored "denied" really keeps the consent banner out of the audit', async ({ page }) => {
  await openForAudit(page, ROUTES[0], 1280);

  const banner = page.locator('#cookie-bar');
  const built = (await banner.count()) > 0;
  test.skip(!built, 'build has no PUBLIC_GA_ID — consent banner is not rendered at all');

  await expect(banner).toHaveAttribute('hidden', '');
  await expect(banner).toBeHidden();
});
