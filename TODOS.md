# TODOS — Lunia Script Studio

## Compliance & Quality

### Brand compliance scanner
**Priority:** P2
**What:** After generation, scan the output for brand rule violations: em dashes,
medical claim language ("cures", "treats", "prevents"), missing softeners ("may support").
Show a green/amber/red badge in the GenerateView results area.
**Why:** Makes brand guardrails structural — you know before sending to a creator
whether the script is compliant. Catches cases where Claude deviates from the prompt.
**Pros:** Immediate confidence signal; catches format violations; no extra API calls
**Cons:** Regex-based, will have false positives; doesn't catch subtler tone violations
**Context:** Accepted scope items (rate limiting, KV, share link) ship first.
Build this after creator workflow is in place. Client-side regex scan — no new infrastructure.
**Effort:** S (human: ~3h / CC: ~8min)
**Depends on:** None

## Engineering Health

### Test infrastructure
**Priority:** P2
**What:** Add vitest (or jest) + a handful of critical unit tests covering the generate route happy path, JSON retry logic, and character counter validation.
**Why:** Zero test coverage means every code change is a blind deployment. The generate route has the most complex branching (Claude retry, fal.ai fallback, skipImage flag) and is the most likely to regress.
**Pros:** Safety net for future changes; catches regressions; unblocks further testing investment.
**Cons:** Requires mocking Anthropic SDK + fal.ai client; some setup overhead.
**Context:** Identified in /plan-eng-review for ads feature. No test files, no test deps in package.json. Start with vitest (native ESM support, no babel config needed). Key test targets: `src/app/api/ads/generate/route.ts` (unit), `src/lib/kv.ts` (saveAd/getAds/deleteAdKv).
**Effort:** S (human: ~4h / CC: ~20min)
**Depends on:** None

## Ads Feature — Post-v1

### A/B copy variants
**Priority:** P2
**What:** Generate 2-3 copy variations in one click (different angle/emotion combos), shown side by side so you can pick the strongest before saving.
**Why:** Makes creative testing a first-class workflow — instead of guessing which angle works, you see options and choose.
**Pros:** High value for creative decision-making; generate endpoint already takes angle/emotion as params — run 3x in parallel trivially; no new infrastructure.
**Cons:** 3x Claude API cost per generation session; UI layout gets more complex.
**Context:** Deferred from ads v1. The `/api/ads/generate` route is already parameterized for angle+emotion. v1.1 candidate.
**Effort:** M (human: ~1 day / CC: ~20min)
**Depends on:** Ads v1 shipped

### Download preview as image
**Priority:** P3
**What:** "Download" button on the Meta feed phone mockup that exports the preview as a PNG.
**Why:** Lets you send the ad preview directly to a designer or client without screenshotting.
**Pros:** Useful for async creative review; no backend needed (html2canvas or similar).
**Cons:** html2canvas has quirks with CSS; adds a JS dependency.
**Context:** Deferred from ads v1. The phone mockup is pure CSS — rendering to canvas is straightforward.
**Effort:** S (human: ~2h / CC: ~15min)
**Depends on:** Ads v1 shipped

## Completed
