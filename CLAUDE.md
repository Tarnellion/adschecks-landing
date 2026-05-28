# CLAUDE.md

Guidance for AI assistants working with this repository.

## Project Overview

AdsChecks is a marketing website for an ad slot verification SaaS, built with **Astro SSG** and deployed on **Cloudflare Pages**. Despite what older files may say, this is NOT plain HTML — it uses Astro with `src/pages/`, a build step, and `public/` as the static asset root.

## Commands

```bash
npm install                  # install dependencies
npm run dev                  # dev server → http://localhost:4321  ← use this, not npx serve
npm run build                # production build → dist/
npm run preview              # preview production build
npm test                     # Playwright tests (headless)
npm run test:ui              # Playwright interactive UI
npm run test:headed          # Playwright headed mode
npm run test:debug           # Playwright debug mode
```

## Architecture

### Framework
Astro SSG (`output: 'static'`). All pages live in `src/pages/` as `.astro` files. The shared shell (head, nav, footer, cookie banner) is `src/layouts/BaseLayout.astro`. Blog posts use Astro Content Collections in `src/content/blog/`.

### CRITICAL — Two CSS directories
There are **two CSS directories**. This is the most common source of confusion:

| Directory | Role |
|-----------|------|
| `public/styles/` | **Served by the browser. This is what actually runs.** Edit here. |
| `styles/` | Source mirror. Keep in sync with `public/styles/` manually. |

**Always edit `public/styles/` files.** Editing only `styles/` will have no visible effect.

### CSS Architecture
CSS is split into 6 semantic `@layer` files, all imported via `public/styles/index.css`:

| File | Purpose |
|------|---------|
| `foundation.css` | `:root` CSS variables, typography, base resets, `overflow-x: hidden` on html/body |
| `layout.css` | Header, nav, section shells (`.section`, `.section--alt`), footer |
| `components.css` | Buttons, pills, cards, bento grid, timeline, prob-list, check-grid, pricing cards, CTA, FAQ, proof scenarios, trust bar, coming-soon badge |
| `hero.css` | Homepage hero section and map/scanner visualization |
| `pages.css` | Per-page styles: pricing, legal, docs, status-model (`.sm-*`) |
| `utilities.css` | Helper classes, `.reveal` / `.is-visible` animations, accessibility, reduced-motion |

`styles.css` at project root is legacy and inactive — do not edit it.

### JavaScript
`public/script.js` — vanilla JS only, no framework. Key functions:
- `initMobileNav()` — hamburger menu
- `initRevealAnimations()` — IntersectionObserver for `.reveal` → `.is-visible`
- `initScrollColorJourney()` — updates `--scene-bg` and `--scene-accent` CSS vars as user scrolls through sections with `data-scene-bg` / `data-scene-accent` attributes
- `initCountUp()` — animates pricing numbers (`data-count`) on scroll into view

### Responsive Breakpoints
Design and tests target: **320px, 375px, 430px** (mobile), **768px** (tablet), **1024px, 1280px, 1440px** (desktop).

Critical invariants enforced by Playwright tests:
- CTA row at ≥641px, column layout at ≤640px
- Feature grid: 2-column desktop, 1-column mobile
- No horizontal overflow at any breakpoint

### Deployment
Cloudflare Pages via GitHub. Build command: `npm run build`. Output: `dist/client`. See `DEPLOY.md`.

`_redirects` (in `public/`) handles URL canonicalization and retired route redirects.

### Forms
Contact/trial forms use Formspree. No backend.

### Local cache
`.wrangler/` is a Cloudflare Wrangler local cache (KV/Cache API SQLite emulation). It is in `.gitignore`. Do not commit it.

## Homepage Section Order (index.astro)

1. Hero (`#hero`) — map viz + status card
2. Stats bar — 12+ GEOs, 5 slots, <2min, JSON+PNG
3. Problem (`#problem`) — "Why ad slot QA fails without proof" — `.prob-list`
4. What we check (`#what-we-check`) — `.check-grid` 2×2
5. How it works (`#how-it-works`) — `.timeline` (horizontal desktop, vertical mobile)
6. Sample output (`#sample-output`) — JSON + screenshot preview
7. Features (`#features`) — `.bento` grid; Webhook + API cards have `.bento__item--soon` + `Coming soon` badge
8. Social proof (`#social-proof`) — "Where teams reach for AdsChecks" — `.proof__scenarios` 3-col
9. Mid-page CTA
10. Pricing (`#terms-overview`) — `.pt-grid` 3 cards + custom row
11. FAQ (`#faq`) — 6 questions
12. Final CTA (`#get-started`)

## Key CSS Variables

```css
--scene-bg        /* current section background (JS-controlled) */
--scene-accent    /* current section accent colour (JS-controlled) */
--text-rgb        /* base text colour as R G B components */
--accent-rgb      /* primary accent as R G B components */
--accent-2-rgb    /* secondary accent as R G B components */
--surface-rgb     /* surface colour as R G B components */
--space-*         /* spacing scale: 4 8 12 16 20 24 28 32 40 48 64 */
--mono            /* monospace font stack */
```
