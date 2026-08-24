---
title: "Ad Slot QA Checklist: 12 Things to Verify Before a Campaign Goes Live"
description: "A practical ad slot QA checklist covering GEO coverage, device testing, selector validation, SLOT_EMPTY handling, and evidence documentation before launch."
pubDate: 2026-03-20
tags: ["qa", "checklist", "ad-ops"]
---

Running ad slot QA manually is error-prone. Teams skip steps under deadline pressure, documentation is inconsistent, and results are hard to compare across campaigns. This checklist covers the 12 most common failure points — use it before any campaign goes live.

## Before you start: define the check scope

Before running any verification, document what you're checking and why. This context is what makes results usable later.

- **Target URL** — the exact page URL where slots should render
- **Ad slot selectors** — CSS selectors for each slot (up to 5 per check run)
- **GEO targets** — which regions need to be verified
- **Device types** — desktop, mobile, or both
- **Expected status** — what should each slot return (OK, or is SLOT_EMPTY expected in some GEOs)?

Without a defined scope, verification produces results with no baseline to compare against.

---

## The checklist

### 1. Validate CSS selectors before the first run

CSS selectors change. A slot that was at `#div-gpt-ad-header-0` last month may have been renamed or removed after a CMS update. Before running a full GEO sweep, confirm that each selector still resolves on the page.

**How to check:** Run a single verification from your primary GEO and review the status per slot. Any `SLOT_EMPTY` on a slot that should be delivering is a signal to re-inspect the selector, not assume the slot is unfilled.

### 2. Verify at least two GEO regions

Ad delivery is GEO-dependent. A slot rendering correctly in US may be blocked or empty in DE or JP due to:

- CDN or WAF geo-restrictions
- Different demand partners active per region
- Floor price mismatches in specific markets

**Minimum:** verify in your primary target market and at least one secondary market. If campaign budget is split across regions, verify each.

### 3. Check both desktop and mobile viewports

Layout breakpoints affect which slots render. A 970×250 leaderboard may not render on mobile viewports. A sticky footer unit may behave differently across viewport widths.

**What to document:** slot dimensions and visibility state at each device context. Screenshot evidence confirms whether the slot is present and visible or collapsed.

### 4. Confirm that SLOT_EMPTY is intentional

`SLOT_EMPTY` is a valid outcome — it means the selector was found but no ad creative was present at check time. But it can also indicate:

- No demand for that GEO/device context
- A floor price preventing fill
- A misconfigured selector that matches a container but not the ad slot itself
- A race condition where the ad loaded after the check

If you expect `OK` and see `SLOT_EMPTY`, investigate before launch — not after spend begins.

### 5. Document BLOCKED and CHALLENGE_DETECTED results

`BLOCKED` and `CHALLENGE_DETECTED` are not tool errors — they are verified evidence of what the page returned in a specific context. Document them with the associated screenshot and timestamp.

These statuses are particularly important for dispute preparation: if a publisher claims full delivery in a region where your checks consistently return `BLOCKED`, you have timestamped proof of the access failure.

### 6. Run checks at representative times of day

Ad fill rates vary by time of day and day of week. A check at 03:00 UTC in a low-traffic window may not reflect delivery during peak campaign hours.

**Recommendation:** run at least one check during expected peak hours for each target market. For campaigns running across time zones, verify at the local peak for each region.

### 7. Compare current results against a baseline

If this is a recurring campaign, compare results against the previous run. Differences that matter:

- A slot that was `OK` last cycle is now `SLOT_EMPTY`
- A GEO that was delivering is now `BLOCKED`
- A new slot was added but isn't rendering in secondary markets

Diff comparison is the fastest way to catch regressions introduced by publisher-side CMS updates, CDN configuration changes, or demand partner changes.

### 8. Verify slots on the actual campaign landing page

Verification should run on the exact URL users will see, not a staging URL or a related page. This matters because:

- Staging environments may have different ad configurations
- The production URL may have different A/B test variants active
- Canonical URL parameters can affect which ad units are served

**Check:** confirm the URL used for verification matches the URL in the media plan.

### 9. Check for anti-bot challenge pages

If your target URL is protected by Cloudflare, hCaptcha, or another bot detection layer, checks may return `CHALLENGE_DETECTED` instead of the actual page content. This is not a tool failure — it documents that the verification environment was challenged by the publisher's infrastructure.

If you see repeated `CHALLENGE_DETECTED` for a specific GEO, review the screenshot evidence — it shows exactly what the check environment received. Contact the publisher to confirm whether their bot protection is configured to allow verification traffic.

### 10. Export and archive the evidence bundle

Screenshots and JSON metadata are only useful if they're retained. Before launch, export the evidence bundle from each critical check:

- Download the ZIP bundle for each pre-launch verification run
- Store it with the campaign brief or insertion order
- Note the check timestamp and GEO context alongside the files

If a dispute arises later, you need a timestamped record from before the campaign started, not a retroactive check.

### 11. Set up scheduled runs during the campaign

Pre-launch verification is a snapshot. Delivery can change during the campaign due to:

- Publisher infrastructure updates
- Floor price adjustments
- Seasonal demand fluctuations
- CDN configuration changes

Schedule recurring checks at campaign start. Weekly checks for ongoing campaigns, daily for high-value placements. Diff reports will flag changes between runs without manual review.

### 12. Document who reviewed the results and when

QA is only useful if it creates a record. For each pre-launch check:

- Record who reviewed the results
- Note the check date and GEO context
- Flag any anomalies and document the resolution (e.g., "SLOT_EMPTY in JP resolved after selector update on 2026-03-18")

This record is the basis for any future dispute conversation with publishers or ad networks.

---

## Summary

| Step | What to check | Output |
|------|---------------|--------|
| 1 | CSS selectors valid | Status per slot |
| 2 | Two or more GEO regions | Per-GEO slot status |
| 3 | Desktop and mobile viewports | Screenshot per device |
| 4 | SLOT_EMPTY is intentional | Investigated or accepted |
| 5 | BLOCKED / CHALLENGE_DETECTED documented | Screenshot + timestamp |
| 6 | Representative time of day | Multiple run timestamps |
| 7 | Baseline comparison | Diff report |
| 8 | Correct production URL | Verified URL match |
| 9 | Anti-bot challenge assessed | Challenge screenshot if present |
| 10 | Evidence bundle archived | ZIP per critical check |
| 11 | Scheduled runs configured | Recurring check schedule |
| 12 | Review documented | QA record with owner |

A structured verification run before campaign launch takes minutes. A billing dispute resolved without evidence takes weeks.

---

*AdsChecks runs geo-routed ad slot verification with screenshot proof. [Get started →](https://app.adschecks.com/signup)*
