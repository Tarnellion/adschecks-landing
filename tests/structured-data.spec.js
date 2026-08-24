// @ts-check
import { test, expect } from '@playwright/test';
import { ROUTES, NOT_FOUND_ROUTE, blockExternalFonts } from './_helpers.js';

/**
 * Regression guard for the bug that shipped to production unnoticed:
 * `.astro` files do NOT evaluate expressions inside a `<script>` element, so
 *
 *     <script type="application/ld+json">{JSON.stringify({ … })}</script>
 *
 * emitted the literal text `{JSON.stringify({...})}` into the HTML. 32 of 34
 * JSON-LD blocks were unparseable garbage. The fix is `set:html={JSON.stringify(…)}`.
 *
 * These tests therefore visit EVERY route, not just the homepage, and assert
 * both that each block parses and that no unevaluated expression leaked.
 */
test.describe('schema.org / JSON-LD', () => {
  for (const route of ROUTES) {
    test(`${route.name}: every ld+json block parses`, async ({ page }) => {
      await blockExternalFonts(page);
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      const blocks = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
        nodes.map((node) => node.textContent ?? ''),
      );

      expect(blocks.length, `${route.path} exposes no JSON-LD at all`).toBeGreaterThan(0);

      const problems = [];
      blocks.forEach((raw, index) => {
        const label = `block #${index + 1}`;
        const trimmed = raw.trim();

        if (trimmed === '') {
          problems.push(`${label}: empty`);
          return;
        }
        if (trimmed.includes('JSON.stringify')) {
          problems.push(
            `${label}: unevaluated Astro expression leaked into the markup — ` +
              'use set:html={JSON.stringify(...)} instead of {JSON.stringify(...)}',
          );
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(trimmed);
        } catch (error) {
          problems.push(`${label}: invalid JSON (${error.message}) — starts with: ${trimmed.slice(0, 120)}`);
          return;
        }

        if (!String(parsed['@context'] ?? '').includes('schema.org')) {
          problems.push(`${label}: missing or non-schema.org @context`);
        }
        if (!parsed['@type']) {
          problems.push(`${label}: missing @type`);
        }
      });

      expect(problems, `Broken JSON-LD on ${route.path}:\n${problems.join('\n')}`).toEqual([]);
    });
  }

  for (const route of [...ROUTES, NOT_FOUND_ROUTE]) {
    test(`${route.name}: no unevaluated Astro expression anywhere in the HTML`, async ({ request }) => {
      const response = await request.get(route.path);
      expect(response.status()).toBe(route.status ?? 200);

      const html = await response.text();
      expect(
        html.includes('JSON.stringify'),
        `${route.path} still contains the literal text "JSON.stringify" — an .astro expression was not evaluated`,
      ).toBe(false);
    });
  }

  test('homepage carries the four expected schema types', async ({ page }) => {
    await blockExternalFonts(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const types = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
      nodes.map((node) => JSON.parse(node.textContent ?? '{}')['@type']),
    );

    expect(types).toEqual(
      expect.arrayContaining(['SoftwareApplication', 'Organization', 'WebSite', 'FAQPage']),
    );
  });

  test('blog posts carry Article + BreadcrumbList', async ({ page }) => {
    await blockExternalFonts(page);
    for (const route of ROUTES.filter((r) => r.blogPost)) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      const types = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
        nodes.map((node) => JSON.parse(node.textContent ?? '{}')['@type']),
      );
      expect(types, `wrong schema types on ${route.path}`).toEqual(
        expect.arrayContaining(['Article', 'BreadcrumbList']),
      );
    }
  });
});
