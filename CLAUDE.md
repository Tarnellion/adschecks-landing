# CLAUDE.md

Guidance for AI assistants working with this repository.

## Project Overview

AdsChecks is a marketing website for an ad slot verification SaaS, built with **Astro SSG** and deployed on **Cloudflare Pages**. This is not plain HTML — it uses Astro with `src/pages/`, a build step, and `public/` as the static asset root.

The product itself (sign-up, checkout, dashboard) lives at `app.adschecks.com` and is **not** part of this repository. Every CTA here links out to it.

## Commands

```bash
npm install                  # install dependencies
npm run dev                  # dev server → http://localhost:4321  ← use this, not npx serve
npm run build                # production build → dist/client
npm run preview              # preview production build
npm test                     # Playwright tests (headless)
npm run test:ui              # Playwright interactive UI
npm run test:headed          # Playwright headed mode
npm run test:debug           # Playwright debug mode
```

Node **22** is required (`.node-version`); Astro 6 will not run on 18.

## Verification contract

**Source is not evidence. The built output is.** Two failures in this repo were invisible in the
source files and only showed up when the build was measured:

- Astro does not evaluate `{...}` inside `<script>` element content. `<script type="application/ld+json">{JSON.stringify({...})}</script>`
  shipped literal source text to the browser; 32 of 34 schema.org blocks were invalid for months.
  Every block now uses `set:html` — see the structured data section.
- A computed-style comparison after a CSS cleanup listed `background-color` but not `background-image`,
  so a disappearing background would have passed. `tests/assets-resolve.spec.js` now checks that
  everything a page *references* actually resolves, rather than a hand-maintained property list.

Do not report a front-end change as working until the built site has been measured. Run the gate
before any commit that touches `src/`, `public/` or `src/styles/`.

## Budgets

Current actuals — a budget above reality catches nothing, so tighten these when they improve.

| | Now | Ceiling |
|---|---|---|
| CSS bundle, gzip | 15.6 KB | 16 KB |
| Fonts (6 × woff2, latin only) | 145 KB | 145 KB |
| First-party stylesheets per page | 1 | 1 |
| Third-party origins | 0 | 0 |
| Routes | 15 | — |
| Valid ld+json blocks | 34 | all |

## Adding a route

`ROUTES` in `tests/_helpers.js` is a hand-written list. **A page that is not registered there is
invisible to five specs and roughly 40 assertions.** When adding a page or post: create it under
`src/pages/` (`trailingSlash: 'always'`, `build.format: 'directory'`), pass the required `BaseLayout`
props, emit any JSON-LD with `set:html`, register it in `ROUTES`, link it from nav or footer, add a
`_redirects` entry if a URL changed, then run the gate.

## Deploy reality

Pushing to `main` **is** the production build — Cloudflare Pages builds from the GitHub integration
and there is no staging. Branch pushes get a preview at `*.pages.dev`, where analytics is disabled by
a host check in the consent script. Rollback is a dashboard action; see `DEPLOY.md`.

Never `git add .` — the working tree carries `.playwright-mcp/`, `dist/` and a gitignored `README.md`.
Stage explicit paths. Commit messages follow Conventional Commits with a scope and a real sentence.
Do not commit or push without being asked.

## Docs map

| File | What it is | Language |
|---|---|---|
| `CLAUDE.md` | Rules and invariants for the assistant | English |
| `DEPLOY.md` | Cloudflare procedure, written for a human | Russian |
| `ROADMAP.md` | History and backlog — read it when asking "why is it like this" | Mixed |
| `.claude/skills/*` | Procedures: verification, visual review, design system, copy | English |
| `README.md` | Local, gitignored, not a source of truth | English |

## Known traps

- `overflow-x: hidden` on `html`, `body` and `.section` makes clipping silent. Use
  `findHorizontalOverflow`, never `scrollWidth > clientWidth`.
- `.playwright-mcp/` is scratch output, not evidence.
- `scripts/generate-social-images.py` is broken (hardcoded macOS Arial paths, writes to the wrong
  path, uses the wrong font) and is wired to nothing. Do not rely on it.
- `initCountUp()` writes `textContent` into `.pt-card__num`, destroying any nested markup.

## Architecture

### Framework
Astro SSG (`output: 'static'`) with the `@astrojs/cloudflare` adapter and `@astrojs/sitemap`. `trailingSlash: 'always'`, `build.format: 'directory'`. All pages live in `src/pages/` as `.astro` files. The shared shell (head, nav, footer, cookie banner) is `src/layouts/BaseLayout.astro`. Blog posts use Astro Content Collections defined in `src/content.config.ts`, with markdown in `src/content/blog/`.

Path aliases come from `tsconfig.json`: `@/*` → `src/*`, `@components/*` → `src/components/*`, `@layouts/*` → `src/layouts/*`.

### CSS lives in `src/styles/` and is bundled by Astro
CSS is **not** a static asset. `BaseLayout.astro` imports it as a module:

```astro
---
import '../styles/index.css';
---
```

Astro therefore bundles, minifies, and emits it as a single content-hashed file under `/_astro/` (e.g. `dist/client/_astro/BaseLayout.<hash>.css`, ~86 KB). There is exactly **one** render-blocking stylesheet request in production, and the filename changes whenever the CSS changes — which is why `/_astro/*` is served `immutable` in `public/_headers`.

Consequences to keep in mind:
- Edit files in `src/styles/`. Nothing else is a stylesheet source.
- There is no `public/styles/` and no root `styles/` directory. Do not recreate them — a file dropped into `public/` is copied verbatim and would bypass the bundler.
- Do not add a `<link rel="stylesheet" href="/styles/...">` anywhere; the import is the only wiring.
- `tsconfig.json` still carries a stale `@styles/*` → `./styles/*` alias pointing at a directory that no longer exists. Nothing imports through it.

### CSS Architecture
`src/styles/index.css` is the only entrypoint. It declares the layer order and imports 7 files into named `@layer`s:

```css
@layer foundation, layout, components, hero, pages, utilities;
```

| File | Purpose |
|------|---------|
| `fonts.css` | Self-hosted Inter `@font-face` rules (see below) |
| `foundation.css` | `:root` CSS variables, typography, base resets, `overflow-x: hidden` on html/body |
| `layout.css` | Header, nav, section shells (`.section`, `.section--alt`), stats bar, cookie disclosure bar, diagonal separators, footer |
| `components.css` | Buttons, pills, cards, bento grid, timeline, prob-list, check-grid, pricing cards, CTA, FAQ, proof scenarios, trust bar |
| `hero.css` | Homepage hero section and map/scanner visualization (`.map-viz*`) |
| `pages.css` | Per-page styles: blog index and post, sample output, pricing, legal/docs, status-model (`.sm-*`) |
| `utilities.css` | Gradient text, `.skip-link` (WCAG 2.4.1 bypass block), `.reveal` / `.is-visible` animations, accessibility, reduced-motion |

### Analytics is consent-gated and environment-aware

GA4 loads only after the visitor presses **Accept**. Nothing reaches Google before that — not even a cookieless ping, which is why this does not use Google Consent Mode.

The measurement id lives in `.env.production` (`PUBLIC_GA_ID=G-XGQWL529CS`). It is a public identifier, served in the HTML of every page, so it is committed rather than kept in the deploy dashboard. A real environment variable overrides the file if one is ever set in Cloudflare.

Three layers decide whether analytics exists at all:

1. **No `PUBLIC_GA_ID`** — neither the banner nor any gtag code is rendered. `.env.production` is only read by `astro build`, so `npm run dev` never has analytics.
2. **Host ends in `.pages.dev`** — the consent script returns immediately. Cloudflare preview deployments would otherwise report into the production GA property.
3. **Stored consent** — `consent-analytics` in localStorage, set by the banner or cleared by the footer's *Cookie settings* control.

`tests/analytics-consent.spec.js` pins all of this: it intercepts and aborts every Google request, so the suite never contacts Google while still asserting that a request *would* have been made.

### Fonts are self-hosted — do not re-add a CDN

Inter ships from `src/styles/fonts/*.woff2` (6 weights, `latin` subset only, ~145 KB total). Vite fingerprints them into `/_astro/`, so they inherit the `immutable` cache rule in `public/_headers`.

There is deliberately **no** `fonts.bunny.net` / Google Fonts link in `BaseLayout.astro`. Self-hosting removes a third-party origin from the critical path and stops visitor IPs reaching a font CDN before any consent is given.

Only the `latin` subset is shipped. An audit of every built page found no character outside it that Inter actually covers — the four exceptions on the site (`→ ← ✓ 🔒`) are absent from *every* Inter subset and render from the system fallback either way. If content ever adds accented, Greek, or Cyrillic text, pull the matching subset files rather than switching back to a CDN.

### Components and data
- `src/components/PricingCards.astro` — renders the `.pt-grid` of plan cards. Props: `headingLevel` (`h2` on `/pricing/`, `h3` on the homepage — pick the level that keeps the outline valid), `reveal`, `featureWording`.
- `src/components/PricingCustomRow.astro` — the "Custom" strip below the grid; `description` differs per page.
- `src/data/plans.ts` — **single source of truth for pricing**. Starter $39 / Growth $79 / Standard $149 (featured). It also exports `offersWithPriceSpecification()` and `offersWithVolumeDescription()`, which build the schema.org `offers` arrays. Change a price here and it propagates to every card and every JSON-LD block.

### structured data (schema.org)
JSON-LD is emitted with `set:html`, never as an expression inside the script body:

```astro
<script type="application/ld+json" set:html={JSON.stringify({ ... })} />
```

This is load-bearing. Astro does **not** evaluate `{...}` expressions inside `<script>` element content — writing `<script type="application/ld+json">{JSON.stringify({...})}</script>` ships the literal source text to the browser and the block is silently invalid. All 34 rendered blocks currently use `set:html`. Keep it that way when adding new ones.

### JavaScript
`public/script.js` — vanilla JS, no framework, loaded with `<script src="/script.js" defer>`. It is a static asset (not bundled). Functions, in call order at the bottom of the file:
- `initScrollColorJourney()` — updates `--scene-bg` / `--scene-accent` as the user scrolls through sections carrying `data-scene-bg` / `data-scene-accent`
- `initMotionMode()` — `?shot` query param adds `.is-shot` to `<body>` (screenshot mode)
- `initMobileNav()` — hamburger menu, overlay, header-offset hash scrolling, compact-nav detection at ≤1024px
- `initMapConnectors()` — positions the hero map connector lines. The rAF loop runs **only** while `.map-viz__inner` is in the viewport (IntersectionObserver, `rootMargin: 128px`), stops on `visibilitychange`, and never starts under `prefers-reduced-motion: reduce`. Do not reintroduce an unconditional loop — it cost ~252 `getBoundingClientRect()` calls/sec while idle.
- `initPageDiagnostics()` — `?check` query param writes viewport/scrollWidth/overflow onto `documentElement.dataset` for layout tests
- `initRevealAnimations()` — IntersectionObserver for `.reveal` → `.is-visible`
- `initCountUp()` — animates pricing numbers (`data-count`) on scroll into view

### Testing
`playwright.config.js`: Chromium only, `testDir: './tests'`, `baseURL: http://localhost:4321`. The
`webServer` runs `npm run build && npm run preview`, so the suite tests a **real production build
served through wrangler** — `public/_headers` and `public/_redirects` are live during the run and
are themselves asserted. `PUBLIC_GA_ID` defaults to `G-TEST12345` so the consent banner exists in
the test build; Google hosts are intercepted and aborted, so the suite never contacts Google.

| Spec | Protects |
|------|----------|
| `responsive-overflow.spec.js` | No element spills past the viewport — 16 routes × 7 widths |
| `assets-resolve.spec.js` | Every `url()`, `src`, `srcset` and icon a page references actually resolves |
| `a11y.spec.js` | axe-core across every route at 375 and 1280 |
| `structured-data.spec.js` | Every ld+json block parses; no unevaluated Astro expression in the HTML |
| `delivery-and-seo.spec.js` | Redirects, security headers, cache policy, robots, sitemap, canonicals |
| `analytics-consent.spec.js` | Zero Google requests before consent; Decline and Accept both persist |
| `pricing.spec.js` | Card prices match the JSON-LD offers; heading semantics on `/pricing/` |
| `layout-invariants.spec.js` | CTA row/column, grid track counts, mobile nav |
| `head-assets.spec.js` | Exactly one first-party stylesheet; no `@import`; `@layer` order intact |
| `skip-link.spec.js` | Skip link is the first tab stop and reaches `#main` |

**Reuse `tests/_helpers.js` before writing a new spec.** It exports `ROUTES` (the canonical route
list), `WIDTHS`, `blockExternalFonts`, `waitForFonts`, `useReducedMotion`, `findHorizontalOverflow`
and `gridColumnCount`.

`findHorizontalOverflow` deliberately does **not** use `scrollWidth > clientWidth`: `foundation.css`
sets `overflow-x: hidden` on both `html` and `body` and `.section` adds `overflow: hidden`, so
clipping is silent — it shows up neither as a scrollbar nor in `scrollWidth`. The helper walks the
box tree instead, skipping `[aria-hidden="true"]` subtrees and anything inside a scrollable ancestor.

Layout invariants the suite pins (changing these requires changing the tests in the same commit):
- `.hero__actions` — `row` at ≥641px, `column` below
- `.check-grid` — 1 track at 375px, 2 at 1280px; `.pt-grid` — 1 and 3. `gridColumnCount` reads
  `grid-template-columns` as a string, so replacing grid with flex fails even if the result looks identical
- `/pricing/` — exactly one `h1` and exactly three `h2`, all three being `h2.pt-card__name`

### Responsive Breakpoints
Viewports to check when reviewing a layout change: **320px, 375px, 430px** (mobile), **768px** (tablet), **1024px, 1280px, 1440px** (desktop).

Those are review viewports, not the CSS breakpoints. The media queries actually used in `src/styles/` cluster at **480, 640/641, 700, 768, 860, 900, 980, 1024, 1120** px — `640/641` and `980` carry the most weight.

### Deployment
Cloudflare Pages via GitHub. Build command: `npm run build`. Output: `dist/client`. Env var `PUBLIC_GA_ID` must be set in the Pages project for analytics to exist. See `DEPLOY.md`.

Files in `public/` that ship as-is:
- `_redirects` — retired aliases (`/pricing-usage`, `/refunds-disputes`), `/sitemap.xml` → `/sitemap-index.xml`, and `.html` → directory canonicalization.
- `_headers` — `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS; plus immutable one-year caching for `/_astro/*` and `/assets/*`.
- `robots.txt` — points at `https://adschecks.com/sitemap-index.xml` (the sitemap integration emits an index, not a flat `sitemap.xml`).

CI: `.github/workflows/lighthouse.yml` runs Lighthouse CI on Node 22 for pushes and PRs to `main`.

### Forms
There are none. The marketing site has no `<form>` element and no form backend. Sign-up and checkout happen at `app.adschecks.com` (payments via Paddle); "contact us" links are `mailto:contact@adschecks.com`.

### Local cache
`.wrangler/` is a Cloudflare Wrangler local cache (KV/Cache API SQLite emulation). It is in `.gitignore`. Do not commit it.

## Homepage Section Order (index.astro)

1. Hero (`#hero`) — map viz + status card
2. Stats bar — 12+ GEO regions, 5 slots per check, <2 min average run time, JSON + PNG evidence bundle
3. Problem (`#problem`) — "Why ad slot QA fails without proof" — `.prob-list`, 3 items
4. What we check (`#what-we-check`) — `.check-grid`, 4 numbered items (2×2)
5. How it works (`#how-it-works`) — `.timeline`, 3 steps (Template / Run / Evidence); horizontal desktop, vertical mobile
6. Sample output (`#sample-output`) — "Structured proof on every run" — JSON + screenshot preview
7. Features (`#features`) — "Everything you need for repeatable ad slot QA" — `.bento` grid, 4 cards: Slot discovery scan, Scheduled runs, GEO-routed proxy, Result diff
8. Social proof (`#social-proof`) — "Where teams reach for AdsChecks" — `.proof__scenarios`, 3 columns
9. Mid-page CTA
10. Pricing (`#terms-overview`) — "Pricing plans" — `<PricingCards>` + `<PricingCustomRow>`
11. FAQ (`#faq`) — 6 `<details class="faq-item">`
12. Final CTA (`#get-started`) — "Start verifying your ad slots" + `.trust-bar`

> There is **no free trial**. The promise was removed from all 88 places it appeared in `b95c36c`
> because the product does not offer one. Do not reintroduce "free trial" / "try free" wording —
> the Free plan exists only for registration and stays locked until a plan is paid for.

## Key CSS Variables

```css
--scene-bg        /* current section background (JS-controlled) */
--scene-accent    /* current section accent colour (JS-controlled) */
--text-rgb        /* base text colour as R G B components */
--accent-rgb      /* primary accent as R G B components */
--accent-2-rgb    /* secondary accent as R G B components */
--surface-rgb     /* surface colour as R G B components */
--space-*         /* spacing scale: 4 8 10 12 16 20 24 28 32 40 48 64 */
--mono            /* monospace font stack */
```
