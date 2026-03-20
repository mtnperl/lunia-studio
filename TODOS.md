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

## Completed
