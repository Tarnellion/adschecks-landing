# Silent failures

Classes of defect that are invisible in the source and do not announce themselves at runtime.
Each entry: what happened, why the obvious check missed it, and what now catches it.

Append to this file whenever a new one is found by hand. An unencoded lesson gets relearned.

---

## 1. Astro does not evaluate expressions inside `<script>`

**Symptom.** 32 of 34 schema.org blocks shipped to production as literal source text —
`{JSON.stringify({ "@context": ... })}` including the braces and the function call. Invalid to every
crawler. The site's entire structured-data layer had never worked.

**Why it was missed.** The `.astro` source is completely idiomatic and looks right. Nothing errors at
build time. The page renders normally because an invalid `application/ld+json` block is simply
ignored by the browser. It is only visible when the *built HTML* is parsed.

**Correct form.**

```astro
<script type="application/ld+json" set:html={JSON.stringify({ ... })}></script>
```

**Now caught by.** `scripts/check-budgets.mjs` (literal `JSON.stringify(` in HTML, and every ld+json
block must `JSON.parse`) and `tests/structured-data.spec.js`.

---

## 2. Checking a property list instead of the claim

**Symptom.** After removing 124 unused CSS classes, computed styles were compared between the old and
new build across a list of ~50 properties. The list contained `background-color`. It did not contain
`background-image`. The world map is declared as a `background:` shorthand, so if the rule had been
deleted the comparison would have reported "identical" and the map would have vanished unnoticed.

**Why it was missed.** The check was only as complete as a list someone wrote by hand, and that list
is guaranteed to lag reality.

**The generalisation.** Do not enumerate what might break. Assert what the page claims: every URL a
page references — in `background-image`, `mask-image`, `border-image-source`, `content`, `src`,
`srcset`, `poster`, favicons, `og:image` — must actually resolve with a plausible content type and a
non-trivial body.

**Now caught by.** `tests/assets-resolve.spec.js`.

---

## 3. `overflow-x: hidden` makes clipping silent

**Symptom.** Blog article bodies were 577px wide inside a 375px viewport. Roughly half of every line
was cut off and unreachable on every phone. It shipped and stayed unnoticed.

**Why it was missed.** `foundation.css` sets `overflow-x: hidden` on both `html` and `body`, and
`.section` adds `overflow: hidden`. So `documentElement.scrollWidth` never exceeds `clientWidth` — the
standard overflow check is vacuous on this site, and there is no scrollbar to notice either.

**Now caught by.** `findHorizontalOverflow` in `tests/_helpers.js`, which walks the box tree rather
than reading `scrollWidth`, skipping `[aria-hidden="true"]` subtrees and scrollable ancestors.

---

## 4. A stale server makes a test run meaningless

**Symptom.** `npm test` timed out waiting for its web server; a preview left over from an earlier run
still held port 4321. Playwright started a second server on 4322 and then could not reach it.

Related: a preview server rejects requests with a foreign `Host` header ("Blocked request"). A test
that fakes a hostname against `astro preview` silently measures an error page, so a guard keyed on
hostname appears to work in both branches. Serve the static build directly when a real hostname is
needed.

**Now caught by.** Nothing automatic. `lsof -ti:4321 | xargs kill -9` before a suspicious run.

---

## 5. axe returns `incomplete`, and discarding it looks like a pass

**Symptom.** The accessibility gate reported zero violations on the homepage while **197 nodes** —
most of the text on the page — had never been evaluated. axe refuses to judge colour contrast when
an ancestor carries a large absolutely-positioned pseudo element or a gradient background; it
returns `incomplete` rather than a verdict. The spec destructured only `{ violations }`, so those
197 nodes silently vanished.

**What it hid.** Flattening the decorative layers for the audit exposed four `.check-item__note`
elements at 3.24:1 and three in-text links distinguished from their surrounding text by colour
alone at 1.31–1.5:1. All were real WCAG AA failures sitting in production.

**Why it is dangerous.** A gate that cannot evaluate something and reports nothing is
indistinguishable from a gate that evaluated it and found it clean. This is the same shape as
failure #2: absence of a finding was read as absence of a problem.

**Now handled by.** `tests/a11y.spec.js` injects `DECORATIVE_LAYERS_OFF` before analysing, so axe
computes against the solid token background the reader actually perceives.

**Residual hole, measured not assumed.** Flattening reduces the unresolved set on `/` from 197 to
166 nodes; nested gradients elsewhere still defeat axe. Those are recorded as a
`contrast-unresolved` annotation on each test rather than asserted to zero — a red gate nobody can
satisfy gets disabled, and then it protects nothing. Closing the remainder means computing contrast
against sampled rendered pixels, which has not been built.
