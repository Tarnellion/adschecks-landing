# ROADMAP

## Session — 2026-08-24

### Completed

**Structured data — the big one:**
- [x] Found that essentially none of the schema.org markup worked. Astro does not evaluate `{...}` expressions inside `<script>` element content, so `<script type="application/ld+json">{JSON.stringify({...})}</script>` shipped the literal source text `{JSON.stringify({...})}` to the browser. 32 of 34 rendered `ld+json` blocks were invalid.
- [x] Converted every block to `<script type="application/ld+json" set:html={JSON.stringify({ ... })} />`. Now 34 of 34 are valid.

**CSS pipeline — the other big one:**
- [x] Moved CSS from `public/styles/` to `src/styles/` and wired it through `import '../styles/index.css'` in `BaseLayout.astro`, so Astro bundles and minifies it instead of serving raw files.
- [x] 7 render-blocking stylesheet requests → 1 hashed file under `/_astro/`.
- [x] 152 KB → 87.5 KB (gzip 22.7 KB → 15.3 KB).
- [x] Removed 124 dead CSS classes.

**Performance:**
- [x] `initMapConnectors()` in `public/script.js` now starts its rAF loop only while `.map-viz__inner` is in the viewport (IntersectionObserver), stops it on `visibilitychange`, and never starts it under `prefers-reduced-motion: reduce`. Measured: 252 `getBoundingClientRect()` calls/sec while idle → 0.

**Analytics and privacy:**
- [x] GA4 moved behind `import.meta.env.PUBLIC_GA_ID`. Without the env var neither the consent banner nor gtag renders at all.
- [x] Consent banner with Accept / Decline; the Google script is not requested until Accept. Choice stored in `localStorage` under `consent-analytics`.
- [x] Privacy Policy: added an Analytics section, removed the Formspree mention (the site has no forms), refreshed the date.

**SEO / infra:**
- [x] `robots.txt` now points at `sitemap-index.xml`; added a 301 from `/sitemap.xml` in `public/_redirects`.
- [x] `astro.config.mjs`: sitemap `lastmod` now comes from the build date (was hardcoded to 2026-04-02).
- [x] New `public/_headers`: security headers (`nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS) plus immutable one-year caching for `/_astro/*` and `/assets/*`.

**Accessibility and structure:**
- [x] Added a skip link (WCAG 2.4.1 bypass block) to `BaseLayout.astro` with `.skip-link` styles in `utilities.css`.
- [x] Extracted the pricing cards into `src/components/PricingCards.astro` and `PricingCustomRow.astro`, with plan data in `src/data/plans.ts` (also the source of the JSON-LD `offers`).
- [x] Plan names are now `h2` on `/pricing/` (the page previously had zero `h2`) and `h3` on the homepage, keeping both outlines valid.

**Repo / tooling:**
- [x] `.github/workflows/lighthouse.yml`: Node 18 → 22.
- [x] `package.json`: removed the broken `seo:sitemap` script.
- [x] `.gitignore`: `tests/` and `playwright.config.js` are no longer ignored.

**Docs (this pass):**
- [x] `CLAUDE.md` — rewrote the "two CSS directories" section, which was actively harmful: it sent assistants looking for `public/styles/` and a root `styles/`, neither of which exists. Also removed the Formspree and legacy `styles.css` claims and the "Coming soon" bento badges, and documented `set:html` for JSON-LD, the analytics gating, and the component/data split.
- [x] `README.md` — same corrections plus Node 22, `src/components`, `src/data`, `src/styles`.
- [x] `DEPLOY.md` — project structure brought in line with reality; added the mandatory `PUBLIC_GA_ID` setup step for Cloudflare Pages.

### Open

- [ ] `tests/` is still absent — the Playwright suite is being restored. `npm test` currently reports "No tests found".
- [ ] `playwright.config.js` has `webServer: npx serve . -p 3000`, which serves the repo root rather than the Astro output. Needs to point at `dist/client` or `astro preview` before any spec can load a page.
- [ ] `tsconfig.json` still carries a stale `@styles/*` → `./styles/*` alias pointing at a directory that no longer exists. Nothing imports through it.

---

## Session — 2026-04-07

### Completed

**CSS / bug fixes:**
- [x] Fixed root cause: all CSS edits previously went to `styles/` but Astro serves from `public/styles/`. All changes now applied directly to `public/styles/`.
- [x] Added `overflow-x: hidden` to `html` and `body` in `foundation.css` — fixes horizontal scroll on mobile
- [x] Added `overflow: hidden` to `.section` in `layout.css` — prevents child overflow bleed
- [x] Fixed `var(--font-mono)` undefined in `components.css` → replaced with `var(--mono)`

**Status model page (`/status-model/`) — full redesign:**
- [x] Replaced 2-col `doc-hero` + `doc-grid` with 5 boxy cards → full-width editorial layout
- [x] New structure: large clean h1, 4 coloured status badges (OK/SLOT_EMPTY/CHALLENGE_DETECTED/BLOCKED), 3-col status table rows, left-border callout note, numbered recovery steps
- [x] Added complete `.sm-*` CSS to `public/styles/pages.css`

**Homepage (`/`) — conversion improvements:**
- [x] Removed duplicate stats block (`.proof__stats`) from social-proof section — same stats already in stats-bar after hero
- [x] Renamed social-proof section: now "Where teams reach for AdsChecks" with a proper section heading and intro line
- [x] Removed entire "Who uses AdsChecks" (`#use-cases`) section — redundant with the scenario cards
- [x] Moved mid-page CTA to after social-proof scenarios (was before — too early in the flow)
- [x] Improved features section h2: "What you get" → "Everything you need for repeatable ad slot QA"
- [x] Improved sample-output section h2: "What you get after each check" → "Structured proof on every run"
- [x] Expanded FAQ from 3 to 6 questions (added: BLOCKED/CHALLENGE_DETECTED explanation, result speed, multi-client usage)
- [x] Added `Coming soon` badge + `.bento__item--soon` (dimmed opacity) to Webhook notifications and API access bento cards — these features are not yet live

**Docs / repo:**
- [x] Added `.wrangler/` to `.gitignore`
- [x] Updated `README.md` — now reflects Astro stack, correct commands, correct project structure
- [x] Updated `CLAUDE.md` — full rewrite: Astro architecture, two-CSS-directory warning, homepage section order, key CSS variables

---

## Status snapshot — 2026-03-13

### Completed

- CSS decomposition is complete.
- All public pages now use `styles/index.css` as the only stylesheet entrypoint.
- The stylesheet has been split into:
  - `styles/foundation.css`
  - `styles/layout.css`
  - `styles/components.css`
  - `styles/hero.css`
  - `styles/pages.css`
  - `styles/utilities.css`
- Legacy `styles.css` is no longer part of the active cascade.
- Dead CSS blocks were removed:
  - old report-preview/proof bundle styles
  - old `bg-scanner*` block
- Header is unified across public pages.
- Hero scanner/map block has been restored and stabilized after the split.

### Final system QA summary

Checked after the split:

- Viewports:
  - `1280`
  - `1024`
  - `390`
  - `320` (homepage partial spot-check)
- Pages:
  - `/`
  - `/pricing/`
  - `/privacy-policy/`
  - `/faq/`
  - `/404.html`

Verified:

- No horizontal overflow on checked pages.
- Homepage CTA invariant holds:
  - `>=641px` → CTA in one row
  - `<=640px` → CTA stacked, full-width
- Hero media remains centered on mobile.
- Pricing grid remains stable after the CSS split.
- FAQ and doc pages render correctly through `pages.css`.

Note:

- Browser QA was executed through devtools tooling because Playwright CDP was not available in this session.

---

## CSS architecture — final structure

```text
styles/
  index.css
  foundation.css
  layout.css
  components.css
  hero.css
  pages.css
  utilities.css
```

### Layer responsibilities

#### `styles/index.css`

- Single entrypoint referenced by all HTML pages
- Declares cascade order with `@layer`
- Imports all active CSS layers

#### `styles/foundation.css`

- `:root`
- base document styles
- global typography foundations
- shared element rules
- container sizing primitives

#### `styles/layout.css`

- header shell
- nav shell
- section wrappers
- footer shell
- layout-level responsive overrides

#### `styles/components.css`

- buttons
- pills
- cards
- pricing cards
- CTA blocks
- FAQ items
- reusable marketing/product components

#### `styles/hero.css`

- homepage hero
- scanner/map scene
- hero-specific responsive logic

#### `styles/pages.css`

- pricing page specifics
- doc/legal page specifics
- about/faq specifics
- page-scoped variants

#### `styles/utilities.css`

- helper classes
- accessibility helpers
- low-level typography helpers
- reduced-motion overrides

---

## Current backlog after split

### Optional follow-up

- Re-run a wider manual cross-browser pass in Safari and Firefox after the next content/design iteration.
- Remove the now-empty `styles.css` file entirely if there is no operational need to keep it in the repo.
- Decide whether legacy alias routes should stay public or be retired after deployment.

---

## Resolved or obsolete items

These items no longer require work:

- **BUG-03** — `.cards` now follow `3 → 2 → 1`
- **BUG-05** — global `h1` now uses `var(--h1)`
- **BUG-06** — non-standard component font weights were normalized
- **BUG-01** — Nav no longer wraps due to reduced, unified public-page nav
- **BUG-02** — Old `.slots` issue is obsolete with the removed legacy preview block
- **BUG-04** — Old `.hero__meta` issue is obsolete after the hero redesign
- **BUG-07** — Old `bg-scanner` transform issue is obsolete after block removal
- **BUG-08** — Nav is unified across public pages
- **BUG-10** — mobile reorder fallback for `.compare__mid` was removed
- **BUG-12** — `.faq-list` is now centered
- **BUG-13** — `scroll-margin-top` was adjusted from measured header height
- **BUG-14** — desktop header/nav no longer wrap
- **BUG-15** — navigation `aria-hidden` now reflects actual compact-nav state and has a safe initial value in markup
- **BUG-16** — `og.png` exists in the repository root
- **BUG-18** — `pricing-usage/` and `refunds-disputes/` now use the current header/footer layout system

---

## Deferred

- Testimonials / reviews block
- Further visual design polish after engineering cleanup is complete
- Cross-browser manual pass in Safari and Firefox

---

## Landing audit — 2026-04-01

Full audit: SEO, conversion, compliance, messaging, Astro migration readiness.

---

### Phase 0 — App onboarding (blocker for landing CTA change, target: week 1–2)

Signup → app flow is broken: user registers with `plan='free'`, lands on `/app`, hits 402 errors silently.
Must be fixed before landing CTAs can point to `/signup`.

**App side (`app.adschecks.com`):**

- [ ] **[APP]** Add plan guard to `app/app/layout.tsx` — if `plan === 'free'` redirect to `/app/billing`
- [x] **[APP]** `/app/billing` page exists — Starter $39 / Growth $79 / Standard $149 / Custom; Paddle integrated
- [ ] **[APP]** Store `?plan=` query param in `httpOnly` cookie before Google OAuth redirect; read after callback to pre-select plan on `/app/billing`
- [ ] **[APP]** Remove "Free Trial" plan from `/app/billing` — currently contradicts landing messaging ("no trial"); deferred, do after guard is in place

**Landing side (after app is ready):**

- [x] **[CONV]** Replace all primary CTAs with `https://app.adschecks.com/signup`; Custom plan stays `mailto:`
- [x] **[CONV]** Plan card CTAs: `/signup?plan=starter`, `/signup?plan=growth`, `/signup?plan=standard`; Custom stays `mailto:`
- [x] **[CONV]** Nav CTA renamed "Get started"; "Log in" kept
- [x] **[CONV]** Remove dead `initEarlyAccessForm()` from `script.js` — no `data-form` elements in any page; removed function and call
- [x] **[PERF]** `<link rel="preconnect" href="https://app.adschecks.com">` added to `BaseLayout.astro`

---

### Phase 1 — Critical fixes (current stack, target: week 1–2)

- [x] **[GDPR]** Add cookie section to Privacy Policy: Cloudflare sets `__cf_bm` / `_cfuvid` cookies; not documented anywhere
- [x] **[SEO]** Rewrite homepage H1 — current: `"Verify what's on the page at the time of the check."` → target: `"Verify your ad slots with screenshot proof — across any GEO and device."`
- [x] **[A11Y]** Remove `aria-hidden="false"` from nav HTML in all pages — explicit `false` is an anti-pattern; let JS manage the attribute only
- [x] **[SEO]** Add `<meta name="theme-color" content="#0a0e13">` to all pages
- [x] **[SEO]** Update `sitemap.xml` — add `/terms-and-conditions/`, `/refund-policy/`, `/legal-notice/`, `/privacy-policy/`
- [x] **[GDPR]** Change Privacy Policy `robots` from `noindex` to `index, follow` (also fixed terms, refund-policy, legal-notice)

### Phase 2 — Design: hero & layout fixes (target: week 2–3)

Findings from visual audit (screenshots taken 2026-04-01 at 1440px and 390px).

**Hero section:**

- [x] **[DESIGN]** Remove excess whitespace between navbar and hero content — reduced `padding-top` from `var(--space-64)` to `var(--space-32)`, reduced `min-height`
- [x] **[DESIGN]** Reduce H1 to 2–3 lines max — removed global `max-width: 11.5ch` constraint from `h1` in `foundation.css`; layout constrains width naturally
- [x] **[DESIGN]** Make map visualization meaningful in static/no-animation state — `prefers-reduced-motion` block added: b1/b3 show at full opacity, geo-point dots visible, scanlines/pointers hidden, all animations stopped
- [x] **[DESIGN]** Mobile map (390px): map visualization replaced with `.hero__status-card` — compact slot verification result (3 slots, OK/SLOT_EMPTY statuses, GEO/device/UTC meta)

**Pricing page:**

- [x] **[DESIGN]** Fix Custom plan card layout — added `plan-card--wide` class; Custom card now spans full width with 3-column internal layout on pricing page

**Page rhythm & components:**

- [x] **[DESIGN]** Break card monotony — numbered circles (`.flow__num`) + visible connector on flow items; `.section--accent` added; `.cards--flat` modifier strips bg from feature cards; icons added to feature + use case cards
- [x] **[DESIGN]** Activate dead CSS components as feature showcase — new `#product` section "See it in action" uses `.schedule`, `.toggle`, `.history__row`, `.status--ok/bad`, `.compare`, `.compare__row` with real mock data (slot drop + restore scenario)
- [x] **[DESIGN]** Add iconography — SVG icons added to all 6 feature cards and 3 use case cards

**Background:**

- [x] **[DESIGN]** Simplify `body::before` background — reduced from 7 stacked gradients + 2 grid patterns to 2 radial gradients

**Section banding (чередование фонов):**

- [x] **[DESIGN]** Текущий `section--alt` визуально не работает — исправлено: теперь использует teal/blue tint `rgba(var(--accent-2-rgb), 0.042)` с видимой рамкой `rgba(var(--accent-2-rgb), 0.13)`
- [x] **[DESIGN]** Ввести реальный контраст между секциями — сделано через `.section--alt`
- [x] **[DESIGN]** Акцентная секция `.section--accent` с radial glow spotlight — Features (#features) использует её

**Scroll-triggered entrance animations (появление при скролле):**

- [x] **[DESIGN]** Реализовать reveal-анимации через Intersection Observer API — `initRevealAnimations()` в `script.js`; класс `.reveal` + `.is-visible` в `utilities.css`; разметка добавлена на `index.html`
- [x] **[DESIGN]** Применить stagger к карточкам — `.reveal-group > .reveal:nth-child(2/3/4)` с задержкой 80/160/240ms
- [x] **[DESIGN]** Заголовок секции появляется первым — `section__head` получает `reveal` отдельно от группы карточек
- [x] **[DESIGN]** Pricing-числа ($39, $79, $149) count-up при входе в viewport — `initCountUp()` в `script.js`, `data-count` на span внутри `.plan-card__price`
- [x] **[DESIGN]** Уважать `prefers-reduced-motion` — анимации обёрнуты в `@media (prefers-reduced-motion: no-preference)`
- [x] **[DESIGN]** Не анимировать hero-секцию — `reveal` классы добавлены только на секции ниже hero

---

### Phase 3 — Content and conversion (target: week 3–5)

- [x] **[CONV]** Add Features section after "How it works" — Discovery scan, Scheduled runs, GEO-routed proxy, Webhook notifications, Result diff, API access (6 `list-card` in 3-col grid)
- [x] **[COPY]** Rewrite hero lead paragraph — benefit-first: "Know exactly what runs on your pages — verified with screenshots, status codes, and JSON metadata captured in real GEO and device context."
- [x] **[UX]** Reorder homepage sections: Use cases now before Pricing
- [x] **[COPY]** Rename Use case roles: Affiliate QA → Advertiser, Media buying QA → Ad-ops / Agency, Publisher audits → Publisher; section renamed "Who uses AdsChecks"
- [x] **[SEO]** Add `FAQPage` JSON-LD schema to homepage
- [x] **[SEO]** Rewrite H2 tags: "Problem" → "Why ad slot QA fails without proof", "Plans and policy" → "Pricing plans"
- [x] **[COPY]** Add competitive positioning: "No sales call. No enterprise contract. Starts at $39/mo. Cancel any time." — in pricing section intro
- [x] **[TRUST]** Add sample output — at least one blurred/redacted screenshot of a real verification report (critical trust signal without trial)
- [x] **[COPY]** "Who uses AdsChecks" — Use cases section renamed and reordered above pricing
- [x] **[SEO]** Add `priceSpecification` with `billingIncrement` and `unitCode: MON` to SoftwareApplication `offers` in JSON-LD
- [x] **[SEO]** Add `og:image:width="1200"` and `og:image:height="630"` meta tags

### Phase 4 — Astro migration (target: week 5–9)

- [x] Init Astro project with Cloudflare Pages adapter (`@astrojs/cloudflare`)
- [x] Create `BaseLayout.astro` — wraps head, header, footer, global meta props via frontmatter
- [x] Nav inlined in `BaseLayout.astro`; `initMobileNav()` in `script.js` via public/
- [x] Map viz inlined in `index.astro`; JS in `public/script.js`
- [x] Cookie disclosure banner added to `BaseLayout.astro` — inline script + localStorage dismiss; CSS in `layout.css`
- [x] JSON-LD schemas inlined per-page via `<Fragment slot="head">`
- [x] Port all pages to `.astro` format maintaining current URL structure
- [x] Configure `@astrojs/sitemap` — auto-generates sitemap from `pages/`
- [x] Move `_redirects` to `public/_redirects`
- [x] CSS served from `public/styles/` (source of truth: `styles/`)
- [x] Set up Lighthouse CI in GitHub Actions for Core Web Vitals regression guard

### Phase 6 — Visual Redesign 2.0

#### Stage A — Foundation (highest ROI, do first)
- [x] **[DESIGN]** Scroll Color Journey — `data-scene-bg`/`data-scene-accent` на каждой секции; `initScrollColorJourney()` в script.js; `html { background-color: var(--scene-bg); transition: 0.8s }`; `.section--alt`/`.section--accent` и eyebrow используют `var(--scene-accent)` через `color-mix()`
- [x] **[DESIGN]** Full-bleed layout — section padding: `clamp(56px, 8vw, 112px) 0`; body background transparent; html bg управляется через `--scene-bg`
- [x] **[DESIGN]** Typography upgrade — Inter via Bunny Fonts в BaseLayout; `.u-grad-text` утилита; H1 hero использует `<span class="u-grad-text">`

#### Stage B — Section redesigns
- [x] **[DESIGN]** Hero — 4 floating proof chips (SLOT_VERIFIED, GEO, size, evidence) staggered entrance + bob loop; reduced-motion: static
- [x] **[DESIGN]** "How it works" → Vertical timeline — `.timeline` с gradient line слева, circle 56×56 с scene-accent, hover glow ring, translateX reveal
- [x] **[DESIGN]** Features → Bento grid — mixed-size 12-col grid: большая карточка (span 7) + средняя (span 5) + 4 малых (span 3); top gradient line на каждой
- [x] **[DESIGN]** Use Cases → Horizontal list — `.use-row` с `64px icon | 1fr copy | 32px arrow`; arrow slides on hover; dividers между строками

#### Stage C — New elements
- [x] **[DESIGN]** Stats bar — узкая full-bleed полоса между hero и problem; 4 стата (честные/округлённые); без fabricated точных чисел
- [x] **[DESIGN]** Reading progress bar — CSS-only, `animation-timeline: scroll()` с `@supports` fallback
- [x] **[DESIGN]** Diagonal section separators — `clip-path` на alternating секциях с компенсацией padding

---

### Phase 5 — Growth (ongoing after Astro launch)

- [x] **[TRUST]** Social proof block — `#social-proof` section added between Features and Use Cases: 4 stat numbers (GEO regions, slots/check, run time, uptime) + 3 anonymous role-based quotes
- [x] SEO: dedicated landing page targeting `"ad slot verification tool"` with long-form content — `/ad-slot-verification/`
- [x] Add `/docs/` section — overview + 5 guides: Quickstart, Webhooks, Prebid.js, Direct ad tags, CI/CD integration
- [x] Add `/api/` reference page — REST API docs: auth, rate limits, 5 endpoints (POST /checks, GET /checks/{id}, /results, /evidence, list), errors table, webhooks
- [x] Add Cloudflare Web Analytics — auto-injected by CF Pages; already collecting data (confirmed 2026-04-01)
- [x] Add Changelog page — `/changelog/` with 4 entries from initial launch to present
- [x] Blog for long-tail SEO — `/blog/` с Content Collections (Astro v6 glob loader); 3 статьи: "ad slot QA checklist", "how to verify prebid ad slots", "ad verification vs ad fraud detection"

---

### Onboarding flow (target state)

```
Landing plan card "Get started"
        ↓
app.adschecks.com/signup?plan=starter
        ↓  save plan to httpOnly cookie
Google OAuth
        ↓
OAuth callback → create account plan='free' → read cookie
        ↓
/app/billing?plan=starter  (pre-selected)
        ↓
Paddle checkout
        ↓
Paddle webhook → plan='starter' → redirect /app
        ↓
Dashboard (accessible)
```

---

### Audit findings reference

| ID | Category | Issue | Severity |
|----|----------|-------|----------|
| A-01 | Conversion | All CTAs are `mailto:` — no self-serve signup path | CRITICAL |
| A-02 | App UX | After signup: 402 errors silently, no plan selection, no paywall | CRITICAL |
| A-03 | GDPR | No cookie consent or cookie documentation | CRITICAL |
| A-04 | SEO | H1 has zero target keywords | CRITICAL |
| A-05 | Messaging | Discovery scan, Webhooks, API, Result diff not mentioned anywhere | HIGH |
| A-06 | GDPR | Privacy Policy set to `noindex` | HIGH |
| A-07 | SEO | FAQ page schema missing on homepage | MEDIUM |
| A-08 | SEO | Terms/Refund/Legal pages missing from sitemap | MEDIUM |
| A-09 | A11Y | `aria-hidden="false"` explicit attribute on nav in HTML | MEDIUM |
| A-10 | Conversion | Use case ICP roles don't match product audience names | MEDIUM |
| A-11 | SEO | `SoftwareApplication` offers lack `billingPeriod` in schema | LOW |
