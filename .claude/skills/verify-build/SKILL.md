---
name: verify-build
description: Verify a front-end change by measuring the built output, not the source. Use before reporting any change to src/, public/ or src/styles/ as working, and before any commit or push that touches them. Also use when asked "does it work", "готово?", "проверь", or when a change looks correct in the source but has not been run. Astro silently drops expressions inside script tags and computed-style spot checks miss whole property families, so reading the source is not verification.
---

# Verify a build

## The rule this exists for

**Source is not evidence. The built output is.**

Two failures in this repository were invisible in the source and only surfaced when the build was
measured. Both looked completely correct in the `.astro` files:

1. **Unevaluated expressions.** Astro does not evaluate `{...}` inside `<script>` element content.
   `<script type="application/ld+json">{JSON.stringify({...})}</script>` shipped the literal source
   text — braces, function call and all. 32 of 34 schema.org blocks were invalid for months and no
   crawler ever parsed them. The fix is `set:html`.
2. **A property family nobody listed.** After a CSS cleanup, computed styles were compared across a
   list of properties containing `background-color` but not `background-image`. The world map is a
   `background:` shorthand. A vanished background would have passed the check silently; the owner
   caught it by eye.

The lesson generalises: **do not check a hand-maintained list of things that might break. Check that
what the page claims is true.**

## Ladder

Pick the rung that matches the change. Do not skip to a lower rung to save time on a change that
touches layout or CSS.

| Rung | When | Cost |
|---|---|---|
| **fast** | Copy, content, a single component, docs | ~40 s |
| **full** | Anything in `src/styles/`, layout, markup structure, `public/script.js` | ~3 min |
| **deep** | Before a push, after a redesign step, when a11y or performance could move | ~6 min |

## fast

```bash
npm run build && npm run budgets
```

`scripts/check-budgets.mjs` is a static gate over `dist/client` that runs in about a second. It
fails on: literal `JSON.stringify(` in HTML, any ld+json block that does not parse, more or fewer
than one first-party stylesheet, a stylesheet outside `/_astro/`, `@import` in the bundle, CSS gzip
over its ceiling, an unexpected third-party origin, and `.DS_Store` in the output.

If the change touched copy on a page that carries FAQ markup, also confirm the JSON-LD still matches
the visible text — Google requires them to be identical, and they are maintained by hand.

## full

```bash
npm run build && npm run budgets && npm test
```

`npm test` builds and serves the real production output through wrangler, so `public/_headers` and
`public/_redirects` are live and asserted during the run.

If the run times out waiting for the web server, a stale preview is holding port 4321:

```bash
lsof -ti:4321 | xargs kill -9
```

## deep

Everything in **full**, plus:

```bash
npm run typecheck
npm run lighthouse
```

Then measure by hand what the suite cannot assert. Serve the build and check the things that are
cheap to lose and expensive to notice:

- idle `getBoundingClientRect` calls with the hero off-screen (should be 0 — an animation loop that
  never stops used to cost 252 per second)
- the largest asset actually requested above the fold
- zero requests to Google before the consent banner is answered

## Reporting

Report numbers and deltas, never a retelling of the log. The useful shape is:

```
budgets ok — CSS 15.6 KB gzip (ceiling 16), 34/34 ld+json valid, 16 routes
tests 190 passed
typecheck 0 errors
```

If something failed, name the check, the file and the measured value. Do not say "should work now"
without a green run behind it.

## When a new class of silent failure appears

Add it to `references/silent-failures.md` in this skill, and — if it is mechanically detectable —
add a check to `scripts/check-budgets.mjs` or a spec in `tests/`. A failure that was found once by
hand and not encoded will be found again by hand.
