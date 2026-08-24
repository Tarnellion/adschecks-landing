---
title: "How to Verify Prebid Ad Slots: What to Check and What the Results Mean"
description: "A practical guide to verifying Prebid.js ad slots with screenshot proof. Covers selector patterns, SLOT_EMPTY vs unfilled impressions, GEO-specific delivery, and evidence documentation."
pubDate: 2026-03-27
tags: ["prebid", "verification", "how-to"]
---

Prebid.js runs client-side header bidding and renders ads into DOM containers after auction completion. This makes slot verification different from standard ad tag verification: the slot selector exists before any bid wins, but the creative only populates the container after the auction resolves. Understanding this sequence is essential for interpreting verification results correctly.

## How Prebid slots work in the DOM

A typical Prebid.js setup creates a div container for each ad unit:

```html
<div id="div-gpt-ad-1234567890-0"></div>
```

The container is present in the DOM from page load. The ad creative is injected into it after the header bidding auction completes and Google Publisher Tag (GPT) renders the winning bid. Verification checks need to account for this timing.

### The render sequence

1. Page loads → Prebid.js initialises
2. Bid requests go to demand partners (50–300ms)
3. Auction resolves → winning bid selected
4. GPT renders creative into container (variable latency)
5. Slot is visible and measurable

A check that fires before step 4 completes will see the container but no creative — which returns `SLOT_EMPTY`, not a delivery failure.

---

## Identifying Prebid slot selectors

Prebid slot containers follow predictable naming conventions depending on how the publisher configured their GAM (Google Ad Manager) integration.

**Common patterns:**

```
#div-gpt-ad-[timestamp]-[index]
#div-gpt-ad-[adunit-code]-0
#[custom-prefix]-[size]
```

To find the correct selector for a slot:

1. Open the page in a browser with DevTools
2. Use the GPT Prebid Analyzer (browser extension) or inspect the `window.googletag.pubads().getSlots()` output in the console
3. Match each slot to its DOM element ID
4. Confirm the element is present before bid completion and populated after

Use these confirmed IDs as your verification selectors.

---

## What SLOT_EMPTY means for Prebid slots

`SLOT_EMPTY` in a Prebid context can mean several different things:

| Cause | Explanation |
|-------|-------------|
| No bid won | All demand partners passed or bids were below floor price |
| Auction timeout | Bids arrived after the page timeout threshold |
| GEO restriction | No active demand for this region at check time |
| Check fired too early | Creative hadn't rendered by the time the check ran |
| Selector mismatch | The selector matched a wrapper but not the actual creative container |

The screenshot captured with each check is the fastest way to distinguish between these cases. If the slot container is present but empty in the screenshot, it confirms the auction completed without fill. If the page itself didn't load fully, the screenshot will show an incomplete page state.

### When SLOT_EMPTY is expected

Some Prebid configurations use lazy loading — slots below the fold only request bids when they approach the viewport. A check that loads the full URL without scrolling will see these slots as `SLOT_EMPTY` even when they deliver correctly in real user sessions.

Document this expected behavior in your verification baseline so that `SLOT_EMPTY` on lazy-loaded slots doesn't trigger false alerts in diff reports.

---

## GEO-specific Prebid delivery issues

Prebid slot verification is particularly useful for identifying GEO-specific delivery gaps because header bidding demand varies significantly by region.

**Common GEO-specific patterns:**

- **US/UK slots returning `OK`, EU slots returning `SLOT_EMPTY`** — demand partners may not have active campaigns for the EU region at the floor price set by the publisher. This is a real delivery gap, not a configuration error.
- **DE returning `BLOCKED`** — some publishers have WAF rules or CDN configurations that block verification traffic from certain regions. The BLOCKED status with its screenshot confirms this is an access issue, not a demand issue.
- **APAC slots returning `CHALLENGE_DETECTED`** — anti-bot layers may be more aggressive for traffic originating from certain proxy ranges in APAC. The screenshot shows exactly what the check environment received.

Run checks from each target GEO before asserting that a Prebid setup is delivering correctly. A single check from the primary market gives an incomplete picture.

---

## Verifying Prebid slots across device types

Prebid configurations are often device-aware. Publishers define separate ad units for desktop and mobile with different size mappings, floor prices, and demand partner configurations. A slot that is correctly configured for desktop may:

- Have no mobile size defined (renders nothing on mobile viewport)
- Have a different selector on mobile due to responsive layout changes
- Fail to load due to viewport-conditional script loading

For each Prebid placement you're verifying, run checks with both desktop and mobile device context and compare the results. The slot status and screenshot at each viewport confirm whether both configurations are working.

---

## Setting up a repeatable Prebid verification workflow

One-off verification is a snapshot. For Prebid integrations that are subject to publisher updates, demand fluctuations, or floor price changes, a repeatable workflow produces a more useful record.

### Recommended setup

1. **Define a check template per slot group** — group slots by page type (homepage, article, category) rather than verifying individual pages. Each template covers the same selectors across the same URL pattern.

2. **Set baseline results** — run an initial verification across all target GEOs and device types. Document the expected status for each slot. Any future check that differs from baseline is a candidate for investigation.

3. **Schedule weekly runs** — configure recurring checks at a consistent time of day. Weekly is sufficient for most campaigns; daily for high-value placements or active dispute situations.

4. **Use diff reports for regression detection** — compare each week's run against the previous. A slot that was `OK` last week and is `SLOT_EMPTY` this week warrants immediate investigation.

5. **Archive evidence bundles at campaign start and end** — download the ZIP bundle at campaign launch (pre-spend baseline) and at campaign close (delivery confirmation). These two bundles are the core evidence record for any commercial review.

---

## Using verification results in publisher conversations

Prebid slot verification produces structured, shareable evidence. When a delivery discrepancy arises with a publisher:

- **Share the screenshot** — it shows the page state at check time, in the specific GEO and device context
- **Reference the timestamp** — verification results include a UTC timestamp that can be cross-referenced with the publisher's delivery logs
- **Cite the status code** — `SLOT_EMPTY` vs `BLOCKED` vs `CHALLENGE_DETECTED` each point to different root causes and different remediation paths
- **Show the GEO context** — a result from DE residential proxy with a screenshot of a blocked page is specific, documented evidence of a regional access failure

Verification results don't replace delivery logs, but they provide an independent, third-party record of page state that delivery logs alone can't produce.

---

## Summary

Verifying Prebid ad slots requires understanding the render sequence (DOM container appears before bid wins) and interpreting results in that context. Key points:

- `SLOT_EMPTY` for Prebid slots may indicate no bid, auction timeout, lazy loading, or a check firing before render completes — the screenshot clarifies which
- GEO-specific delivery gaps are common in header bidding setups — verify from each target region
- Desktop and mobile configurations should be verified separately — size mappings and demand partner activity often differ by device
- Repeatable weekly runs with diff comparison catch regressions that one-off checks miss
- Evidence bundles (screenshot + JSON + timestamp) provide structured proof for publisher conversations

---

*AdsChecks supports Prebid slot verification with GEO-routed checks, screenshot proof, and JSON metadata. [Get started →](https://app.adschecks.com/signup)*
