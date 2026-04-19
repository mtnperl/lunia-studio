# TODOS — Lunia Script Studio

## UGC Tracker — Post-v1

### Performance loop hook
**Priority:** P2
**What:** Given `postedUrl` on each UGC creator row, pull Meta ad metrics + Shopify attribution for that post and show per-creator ROAS. Closes the loop from "paid X to creator" to "earned Y from the angle" — next month's invites become data-driven instead of taste-driven.
**Why:** The whole reason the UGC tracker exists is to eventually replace ad generation with ad *selection*. Until posted-URL → earned-revenue is visible per creator, the tracker is a nicer sheet, not a decision tool.
**Pros:** Uses existing Meta + Shopify integrations; `postedUrl` field reserved on `UGCCreator` from day one; compounds with each month of data.
**Cons:** Meta attribution at the ad level is imperfect; Shopify UTM tagging discipline required upstream.
**Context:** Gated on UGC tracker v1 shipped + 30 days of real usage. See `docs/postmortems/ads-2026.md` "Signal for the third attempt."
**Effort:** M (human: ~2 days / CC: ~45min)
**Depends on:** UGC tracker v1 shipped + stable

## Analytics Dashboard

### KPI Period-over-Period Deltas
**Priority:** P2
**What:** Each KPI card shows % change vs the prior equivalent period (e.g., ROAS 3.2x ↑12% vs prior 30d).
**Why:** Trending direction is more actionable than absolute numbers — knowing ROAS improved matters more than the raw number.
**Pros:** Immediate signal on whether campaigns are improving; no UI redesign needed; KPICard prop scaffolding is trivial.
**Cons:** Doubles API calls (parallel prior-window fetch); adds complexity to DashboardView state.
**Context:** Requires parallel Meta + Shopify calls for the prior window (e.g., days 31-60 when current is 1-30). The KPICard `suffix` prop can show the delta. Build after Analytics v1 is stable in production.
**Effort:** S (human: ~3h / CC: ~15min)
**Depends on:** Analytics Dashboard shipped

### Copy Brief Button
**Priority:** P2
**What:** One-click copies a Markdown summary (KPIs + top campaigns + insights) to clipboard.
**Why:** Eliminates the Monday-morning screenshot/copy-paste workflow that this dashboard was built to replace.
**Pros:** Pure client-side `navigator.clipboard`; ~20 lines in DashboardView; huge daily time save.
**Cons:** Minimal — clipboard API needs HTTPS (already the case on Vercel).
**Context:** Add a "Copy Brief" button next to the Refresh button in the header. Format: date range, 5 KPIs, top 3 campaigns, all insights. Plain Markdown that pastes cleanly into Slack/Notion.
**Effort:** XS (human: ~1h / CC: ~5min)
**Depends on:** Analytics Dashboard shipped

### Budget Pacing Indicator
**Priority:** P3
**What:** Badge on the Spend KPI card showing whether spend is on-pace, over, or under vs a monthly budget target.
**Why:** Prevents end-of-month overspend surprises.
**Pros:** No new API calls; just math on current spend vs days elapsed; hidden when env var not set.
**Cons:** Requires optional `META_MONTHLY_BUDGET` env var; only meaningful mid-month.
**Context:** Add optional env var `META_MONTHLY_BUDGET` (USD). If set, compute: expected_spend = budget * (day_of_month / days_in_month). Badge: on-pace (±10%), over (red), under (amber). Displayed inline in KPICard below the value.
**Effort:** XS (human: ~1h / CC: ~10min)
**Depends on:** Analytics Dashboard shipped

## Completed
