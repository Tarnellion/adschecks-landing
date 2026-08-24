// @ts-check
import { test, expect } from '@playwright/test';
import { blockExternalFonts, useReducedMotion } from './_helpers.js';

/**
 * src/data/plans.ts is the single source of truth for pricing; PricingCards
 * renders it on both / and /pricing/ and the same module feeds the JSON-LD
 * `offers`. These tests pin the numbers in all three places so a card and its
 * structured data can never drift apart.
 *
 * useReducedMotion() short-circuits script.js's initCountUp(), which
 * otherwise animates `[data-count]` from ~65% of the target up to the real
 * price — the assertions read a settled value instead of racing the animation.
 */

const PLANS = [
  { name: 'Starter', price: '39' },
  { name: 'Growth', price: '79' },
  { name: 'Standard', price: '149' },
];

/** Prices declared in the SoftwareApplication JSON-LD offers on a page. */
async function offerPrices(page) {
  return page.$$eval('script[type="application/ld+json"]', (nodes) => {
    for (const node of nodes) {
      const data = JSON.parse(node.textContent ?? '{}');
      if (data['@type'] === 'SoftwareApplication' && Array.isArray(data.offers)) {
        return data.offers.map((offer) => String(offer.price));
      }
    }
    return [];
  });
}

test.describe('pricing cards', () => {
  test('homepage: three plans at 39 / 79 / 149', async ({ page }) => {
    await useReducedMotion(page);
    await blockExternalFonts(page);
    await page.goto('/', { waitUntil: 'load' });

    const section = page.locator('#terms-overview');
    await expect(section).toBeVisible();

    const cards = section.locator('.pt-grid .pt-card');
    await expect(cards).toHaveCount(3);

    await expect(section.locator('.pt-card__name')).toHaveText(PLANS.map((p) => p.name));
    await expect(section.locator('.pt-card__num')).toHaveText(PLANS.map((p) => p.price));

    // Homepage outline: the section owns the h2, so plan names must be h3.
    await expect(section.locator('h3.pt-card__name')).toHaveCount(3);

    // Custom/enterprise row still present.
    await expect(section.locator('.pt-custom')).toHaveCount(1);

    expect(await offerPrices(page), 'JSON-LD offers drifted from the cards').toEqual(
      PLANS.map((p) => p.price),
    );
  });

  test('/pricing/: one h1, three h2 plan names, same prices', async ({ page }) => {
    await useReducedMotion(page);
    await blockExternalFonts(page);
    await page.goto('/pricing/', { waitUntil: 'load' });

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();

    const cards = page.locator('.pt-grid .pt-card');
    await expect(cards).toHaveCount(3);

    await expect(page.locator('.pt-card__name')).toHaveText(PLANS.map((p) => p.name));
    await expect(page.locator('.pt-card__num')).toHaveText(PLANS.map((p) => p.price));

    // The page used to have zero h2s; the plan names now supply the outline.
    await expect(page.locator('h2')).toHaveCount(3);
    await expect(page.locator('h2.pt-card__name')).toHaveCount(3);

    await expect(page.locator('.pt-custom')).toHaveCount(1);

    expect(await offerPrices(page), 'JSON-LD offers drifted from the cards').toEqual(
      PLANS.map((p) => p.price),
    );
  });

  test('both pages agree on prices and CTA targets', async ({ page }) => {
    await useReducedMotion(page);
    await blockExternalFonts(page);

    const read = async (path, scope) => {
      await page.goto(path, { waitUntil: 'load' });
      return page.locator(scope).evaluate((root) =>
        [...root.querySelectorAll('.pt-card')].map((card) => ({
          name: card.querySelector('.pt-card__name')?.textContent?.trim(),
          price: card.querySelector('.pt-card__num')?.textContent?.trim(),
          cta: card.querySelector('.pt-card__cta')?.getAttribute('href'),
        })),
      );
    };

    const home = await read('/', '#terms-overview');
    const pricing = await read('/pricing/', 'main');

    expect(home).toEqual(pricing);
    expect(home.map((card) => card.cta)).toEqual([
      'https://app.adschecks.com/signup?plan=starter',
      'https://app.adschecks.com/signup?plan=growth',
      'https://app.adschecks.com/signup?plan=standard',
    ]);
  });
});
