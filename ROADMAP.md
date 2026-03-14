# ROADMAP

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
