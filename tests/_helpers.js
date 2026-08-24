// @ts-check
/**
 * Shared fixtures/constants for the AdsChecks suite.
 *
 * Not picked up as a test file: Playwright's default testMatch only collects
 * `*.spec.js` / `*.test.js`.
 */

/** Breakpoints the design and CLAUDE.md commit to. */
export const WIDTHS = [320, 375, 430, 768, 1024, 1280, 1440];

/** Widths below the `@media (max-width: 640px)` mobile switch. */
export const MOBILE_WIDTHS = WIDTHS.filter((w) => w <= 640);

/**
 * Every rendered route of the site. `blogPost: true` marks the
 * Content-Collection article template (src/pages/blog/[slug].astro), which
 * carries a known mobile layout bug — see responsive-overflow.spec.js.
 */
export const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'pricing', path: '/pricing/' },
  { name: 'what-we-verify', path: '/what-we-verify/' },
  { name: 'status-model', path: '/status-model/' },
  { name: 'faq', path: '/faq/' },
  { name: 'about', path: '/about/' },
  { name: 'ad-slot-verification', path: '/ad-slot-verification/' },
  { name: 'blog-index', path: '/blog/' },
  { name: 'blog-post-qa-checklist', path: '/blog/ad-slot-qa-checklist/', blogPost: true },
  {
    name: 'blog-post-fraud-detection',
    path: '/blog/ad-verification-vs-ad-fraud-detection/',
    blogPost: true,
  },
  { name: 'blog-post-prebid', path: '/blog/how-to-verify-prebid-ad-slots/', blogPost: true },
  { name: 'privacy-policy', path: '/privacy-policy/' },
  { name: 'terms-and-conditions', path: '/terms-and-conditions/' },
  { name: 'refund-policy', path: '/refund-policy/' },
  { name: 'legal-notice', path: '/legal-notice/' },
];

/** Any unknown path renders dist/client/404.html with HTTP 404. */
export const NOT_FOUND_ROUTE = { name: '404', path: '/no-such-page-here/', status: 404 };

/**
 * The only third-party asset the layout links is the Bunny font stylesheet.
 * Aborting it keeps every run offline-deterministic — layout is measured with
 * the declared fallback stack instead of whatever the CDN happens to return.
 * (Verified: the overflow results are identical with the CDN reachable.)
 */
export async function blockExternalFonts(page) {
  await page.route(/fonts\.(bunny\.net|gstatic\.com|googleapis\.com)/, (route) => route.abort());
}

/** Wait until webfonts have settled so measurements are stable. */
export async function waitForFonts(page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/**
 * Puts the page into its settled, animation-free state.
 *
 * utilities.css scopes `.reveal { opacity: 0; transform: … }` to
 * `@media (prefers-reduced-motion: no-preference)`, script.js skips the
 * map-connector rAF loop under `reduce`, and initCountUp() writes the final
 * price straight into `[data-count]` instead of animating it. Emulating
 * `reduce` therefore gives us the resting layout without scrolling the whole
 * page first or racing any animation.
 *
 * Must be called on the page, not declared via `test.use({ reducedMotion })`:
 * with a device descriptor spread into the project's `use` (Playwright 1.58)
 * the fixture option never reaches the page — verified, matchMedia still
 * reported `no-preference`.
 */
export async function useReducedMotion(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

/**
 * Returns every element that sticks out past the left or right viewport edge.
 *
 * Why not `documentElement.scrollWidth > clientWidth`: foundation.css sets
 * `overflow-x: hidden` on html AND body, so the document never reports a
 * horizontal scroll no matter how far content spills — the classic check is
 * silently vacuous on this site. (`.section { overflow: hidden }` masks it a
 * second time.) Overflow here means "content is being clipped off-screen", so
 * we walk the box tree instead.
 *
 * Exclusions, and why they are safe:
 *  - `[aria-hidden="true"]` subtrees — the hero map's beams, browser mockups
 *    and glow layers are designed to bleed out of their clipped container.
 *  - anything inside an `overflow-x: auto|scroll` ancestor — legitimately
 *    scrollable (e.g. the `.table-scroll` wrapper around prose tables).
 *  - `display: none` / `visibility: hidden` / zero-sized boxes.
 */
export async function findHorizontalOverflow(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const TOLERANCE = 1; // sub-pixel rounding

    const insideScrollContainer = (el) => {
      let parent = el.parentElement;
      while (parent) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
        parent = parent.parentElement;
      }
      return false;
    };

    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('[aria-hidden="true"]')) continue;

      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right <= viewportWidth + TOLERANCE && rect.left >= -TOLERANCE) continue;
      if (insideScrollContainer(el)) continue;

      const selector =
        el.tagName.toLowerCase() +
        (el.id ? `#${el.id}` : '') +
        (typeof el.className === 'string' && el.className
          ? `.${el.className.trim().split(/\s+/).join('.')}`
          : '');

      offenders.push(
        `${selector} — box [${Math.round(rect.left)}, ${Math.round(rect.right)}] vs viewport [0, ${viewportWidth}]`,
      );
    }

    // De-duplicate: a single wide child usually drags its whole ancestor chain.
    return [...new Set(offenders)];
  });
}

/** Number of tracks in a grid container's resolved `grid-template-columns`. */
export async function gridColumnCount(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return -1;
    const value = getComputedStyle(el).gridTemplateColumns;
    if (!value || value === 'none') return 0;
    return value.trim().split(/\s+/).length;
  }, selector);
}
