/**
 * Single source of truth for pricing plans.
 *
 * Consumed by:
 *  - src/components/PricingCards.astro  (rendered `.pt-grid` on / and /pricing/)
 *  - src/pages/index.astro              (SoftwareApplication JSON-LD `offers`)
 *  - src/pages/pricing/index.astro      (SoftwareApplication JSON-LD `offers`)
 *
 * Change a price here and it propagates to every card and every JSON-LD block.
 */

export interface PlanFeature {
  /** Feature copy as rendered inside `.pt-card__features li`. */
  text: string;
  /**
   * Shorter wording used when the consumer asks for `featureWording="short"`.
   * Only differs for the monthly-volume bullet ("pages/month" vs "pages per month").
   */
  textShort?: string;
  /** Renders the bullet as `<li class="limit">` — something the plan does NOT include. */
  limit?: boolean;
}

export interface PlanNudge {
  /** Leading copy inside `.pt-card__nudge`, rendered before the link. */
  prefix: string;
  /** Plan the nudge upsells to — its name and price build the link label. */
  target: 'starter' | 'growth' | 'standard';
}

export interface Plan {
  id: 'starter' | 'growth' | 'standard';
  /** Plan name, rendered in `.pt-card__name`. */
  name: string;
  /** Monthly price in USD. Drives `.pt-card__num`, its `data-count`, and JSON-LD. */
  price: number;
  /** Monthly verified-page allowance as a raw number (JSON-LD copy). */
  pages: number;
  /** Same allowance, thousands-separated, for on-page copy. */
  pagesLabel: string;
  /** Copy for `.pt-card__volume`. */
  volume: string;
  features: PlanFeature[];
  /** `href` of `.pt-card__cta`. */
  ctaHref: string;
  /** Highlights the card via `.pt-card--featured`. */
  featured?: boolean;
  /** Copy for `.pt-card__pill` (e.g. "Most popular"). */
  pill?: string;
  nudge?: PlanNudge;
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    pages: 500,
    pagesLabel: '500',
    volume: '500 verified pages / month',
    features: [
      { text: '500 verified pages per month', textShort: '500 verified pages/month' },
      { text: 'Scheduled runs' },
      { text: 'Screenshots + JSON evidence' },
      { text: 'No GEO routing', limit: true },
      { text: 'Cancel any time' },
      { text: 'No overages — runs pause at limit' },
    ],
    ctaHref: 'https://app.adschecks.com/signup?plan=starter',
    nudge: { prefix: 'GEO routing from ', target: 'growth' },
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    pages: 1000,
    pagesLabel: '1,000',
    volume: '1,000 verified pages / month',
    features: [
      { text: '1,000 verified pages per month', textShort: '1,000 verified pages/month' },
      { text: 'Scheduled runs' },
      { text: 'Screenshots + JSON evidence' },
      { text: 'GEO routing included' },
      { text: 'Cancel any time' },
      { text: 'No overages — runs pause at limit' },
    ],
    ctaHref: 'https://app.adschecks.com/signup?plan=growth',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 149,
    pages: 3000,
    pagesLabel: '3,000',
    volume: '3,000 verified pages / month',
    features: [
      { text: '3,000 verified pages per month', textShort: '3,000 verified pages/month' },
      { text: 'Scheduled runs' },
      { text: 'Screenshots + JSON evidence' },
      { text: 'GEO routing included' },
      { text: 'Cancel any time' },
      { text: 'No overages — runs pause at limit' },
    ],
    ctaHref: 'https://app.adschecks.com/signup?plan=standard',
    featured: true,
    pill: 'Most popular',
  },
];

export function getPlan(id: Plan['id']): Plan {
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan id: ${id}`);
  return plan;
}

/** Label for an upsell nudge link, e.g. "Growth — $79/mo →". */
export function nudgeLinkLabel(nudge: PlanNudge): string {
  const target = getPlan(nudge.target);
  return `${target.name} — $${target.price}/mo →`;
}

/** schema.org offers with a UnitPriceSpecification — used on the homepage. */
export function offersWithPriceSpecification() {
  return plans.map((plan) => ({
    '@type': 'Offer',
    name: plan.name,
    price: String(plan.price),
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: String(plan.price),
      priceCurrency: 'USD',
      billingIncrement: 1,
      unitCode: 'MON',
    },
  }));
}

/** schema.org offers described by monthly volume — used on /pricing/. */
export function offersWithVolumeDescription() {
  return plans.map((plan) => ({
    '@type': 'Offer',
    name: plan.name,
    price: String(plan.price),
    priceCurrency: 'USD',
    description: `${plan.pages} verified pages/month`,
  }));
}
