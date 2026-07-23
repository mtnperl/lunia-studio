# TODOS — Lunia Script Studio

## UX overhaul — next screens (from 2026-07-23 CEO review)

### Carousel builder UX overhaul
**Priority:** P2
**What:** Apply the same overhaul the campaign editor got to the carousel builder (`CarouselViewV2.tsx`): adopt the `src/components/ui/` primitives (Button/IconButton/Label/Section), one hero action per zone, comfortable hit targets, SVG icons (keep `✨` only on AI actions), `--muted`/`--text` contrast (no `--subtle` on interactive text).
**Why:** User-designated next screen. The app-wide theme revert (2026-07-23) already re-themed its tokens; this is the deeper control-level pass so the whole studio reads as one system.
**Context:** The editor overhaul (this PR) is the reference implementation — mirror its `ui/` adoption and Fork-B grouping. See `~/.gstack/projects/mtnperl-lunia-studio/ceo-plans` / the approved plan `rosy-moseying-karp`.
**Effort:** M (CC ~40min). **Depends on:** `ui/` primitives (shipped this PR).

### Script creator UX overhaul
**Priority:** P2
**What:** Same treatment for the script creator (`GenerateView.tsx` and the script `EditorView.tsx`): `ui/` primitives, hierarchy, hit targets, SVG icons, contrast fixes.
**Why:** User-designated next screen, alongside the carousel builder.
**Context:** Same reference implementation as above.
**Effort:** M (CC ~40min). **Depends on:** `ui/` primitives (shipped this PR).

### Split CampaignEditor.tsx into sub-components (deferred from this PR)
**Priority:** P3
**What:** Split the ~1900-line `CampaignEditor.tsx` into an orchestrator + `CampaignLivePreview/HeaderFields/BlocksPanel/ImagesPanel/ActionsBar`, orchestrator owning shared state.
**Why:** Approved in the 2026-07-23 plan but deferred at implementation: a blind 6-file split done in the same pass as an app-wide theme revert has un-bisectable, non-compiler-checkable prop-threading risk (undo/redo, autosave, insertHook, keyboard effect) for zero user-visible value. Safer in its own PR, verified in isolation. State transforms are already extracted + tested in `campaign-editor-state.ts`, which de-risks the split.
**Context:** See the "Failure Modes Registry" in the `rosy-moseying-karp` plan.
**Effort:** M (CC ~40min). **Depends on:** nothing (state module already extracted).

## Campaign Editor — Capability Expansion (deferred from 2026-07-21 CEO review)

### Full version history / snapshot timeline
**Priority:** P3
**What:** A restorable timeline of every save (not just the in-session undo/redo shipped 2026-07-21), with named/dated snapshots and a scrub-back-and-restore UI.
**Why:** In-session undo/redo covers "I just made a bad edit"; it doesn't cover "I want to see what this campaign looked like yesterday" or survive a closed tab. Real value, but a much bigger lift.
**Pros:** The strongest "nothing is ever truly lost" guarantee available; natural extension of the save pipeline already in place.
**Cons:** Needs a snapshot store (new KV collection or versioned blob), a restore UI, and a retention/pruning policy — none of which the lighter undo/redo needed.
**Context:** See `ceo-plans/2026-07-21-campaign-editor-tools.md` (Scope Decision #4) for the full reasoning — the user picked in-session undo/redo instead for now.
**Effort:** L (human: ~2-3 days / CC: ~4-6h)

### Split CampaignEditor.tsx into sub-components
**Priority:** P3
**What:** Split the ~1800-line `CampaignEditor.tsx` into `CampaignHeaderFields.tsx`, `CampaignBlocksPanel.tsx`, `CampaignImagesPanel.tsx`, `CampaignActionsBar.tsx` per `ceo-plans/2026-07-22-editor-ai-redesign.md` (deliverable 7), with the orchestrator holding shared state (content, commit, undo/redo, autosave, insertHook, pendingSuggestion) and passing it down as props.
**Why:** Committed to in the 2026-07-22 plan, but deferred during execution as a pragmatic scope call — the file-split is an internal-only refactor with real regression risk (autosave/undo-redo/snippets/AI-suggestion state all threading through it) and delivers no user-visible value on its own. Every user-facing deliverable from that plan (AI layout suggestion, collapsible sections, drag-and-drop reorder, completion indicator, keyboard shortcuts, loaders/staged-reveal/save-pulse) shipped without it.
**Pros:** Smaller files, easier to review/extend block-kind-specific UI in isolation.
**Cons:** Pure refactor risk with no functional payoff; needs careful prop-threading to avoid behavior drift in the already-shipped autosave/undo-redo/snippets code.
**Context:** `ceo-plans/2026-07-22-editor-ai-redesign.md`, deliverable 7.
**Effort:** M (human: ~1 day / CC: ~2-3h)

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

## Campaign Builder — Klaviyo Import

### Test the index-reconciliation logic in convertEmail
**Priority:** P2
**What:** Extract the image-index reconciliation block in `convertEmail` (`src/app/api/campaign/from-klaviyo/route.ts:132-153` — mapping the LLM's `heroImageIndex`/`secondaryImageIndexes` back to real extracted URLs, plus the "images the model didn't place get auto-appended" fallback loop) into a standalone, named function, and add unit tests for out-of-range indexes, duplicate indexes, `heroImageIndex: -1` with images present, and more than 5 images.
**Why:** This is the highest-complexity, zero-test-coverage part of the Klaviyo import pipeline. A bug here silently misassigns which image becomes the hero or drops images — the deterministic extraction helpers (`extractImages`/`extractHrefs`/`htmlToText`) are already tested in `campaign-import.test.ts`, but the reconciliation step that consumes their output isn't.
**Pros:** No live LLM call needed to test it — feed a fixed `LlmStructure` fixture and assert the resulting `CampaignImageSlot[]`; closes the one real coverage gap flagged in the `/plan-ceo-review` audit (2026-07-21).
**Cons:** Requires factoring the logic out of `convertEmail` first — small refactor, not just a test file.
**Context:** From the CEO review of the Klaviyo-import feature. See Section 6 (Tests) / Section 2 (Error & Rescue Map) of that review for the full failure-mode analysis.
**Effort:** S (human: ~2h / CC: ~15min)

### Flag emails that used the deterministic fallback structuring
**Priority:** P2 — **Shipped 2026-07-21**, see Completed.

### Fix rate-limit bucket + hero-override bugs
**Priority:** P2 — **Shipped 2026-07-21**, see Completed.

### SSRF allowlist + CTA redirect resolution
**Priority:** P1 — **Shipped 2026-07-21**, see Completed.

### Flag or avoid silent truncation of long source emails
**Priority:** P3
**What:** `buildKlaviyoImportPrompt` (`src/lib/campaign-import-prompts.ts:170`) truncates the visible email text fed to the LLM at 6000 characters with no signal back to the caller. A long post-purchase or education email can silently lose its tail from the imported blocks.
**Why:** Surfaced by an independent outside-voice review during the 2026-07-21 CEO review. The import looks clean (no `flagged`, no `usedFallback`) even though content was dropped — the one silent-degradation path not already covered by the `usedFallback` flag shipped this session.
**Pros:** Cheap to detect (`text.length > 6000`); can reuse the same `usedFallback`-style flagging UI already built in `FlowDeck.tsx`.
**Cons:** Doesn't fix the truncation itself, just makes it visible — raising the limit or chunking the LLM call is a separate, bigger decision.
**Context:** From the outside-voice pass of the Klaviyo-import CEO review (2026-07-21).
**Effort:** XS (human: ~1h / CC: ~10min)

### Parallelize per-message Klaviyo API calls in getFlow
**Priority:** P3
**What:** `getFlow` (`src/lib/klaviyo.ts:251-305`) fetches flow → actions → per-action message-relationships → per-message (message + template) fully sequentially, each hop with its own retry/backoff. A flow with 6-8 emails can produce 15-20+ serial round trips.
**Why:** Surfaced by an independent outside-voice review (2026-07-21): a couple of rate-limited or slow calls could push total latency close to the route's 300s `maxDuration`, killing the import mid-flow with no partial save. Not yet observed in practice, but the math is close enough to be worth tracking.
**Pros:** Would meaningfully cut import latency for larger flows.
**Cons:** `getFlow` is shared with the separate Email Review feature — touching its control flow needs care not to regress that path; adds concurrency-cap complexity against Klaviyo's own rate limits.
**Context:** From the outside-voice pass of the Klaviyo-import CEO review (2026-07-21).
**Effort:** M (human: ~3h / CC: ~30min)

### Extend image extraction beyond `<img>` tags
**Priority:** P3
**What:** `extractImages` (`src/lib/campaign-import-prompts.ts:44-62`) only matches `<img>` tags. ESP-built emails sometimes use table `background="..."` attributes or VML `<v:image>` fills for full-bleed Outlook-safe hero banners — those are invisible to extraction entirely, with no flag raised.
**Why:** Surfaced by an independent outside-voice review (2026-07-21). Worth confirming first whether any of Mathan's actual Klaviyo flows use this pattern before investing in it — Klaviyo's own code/drag-drop editors lean heavily on plain `<img>` tags.
**Pros:** Closes a real (if unconfirmed-in-practice) content-loss gap.
**Cons:** VML/background-image parsing is meaningfully more complex than the current regex approach; risk of false positives (decorative background colors misread as images).
**Context:** From the outside-voice pass of the Klaviyo-import CEO review (2026-07-21).
**Effort:** M (human: ~3h / CC: ~30min) — pending confirmation this actually affects real flows

### Clearer error when a picked Klaviyo flow has no email messages
**Priority:** P3
**What:** `/api/campaign/from-klaviyo` returns a generic `"missing or empty flow"` 400 when `flow.emails` is empty — including when the picked flow is SMS-only (Klaviyo's `getFlow` correctly filters to email-channel messages only, so an SMS-only flow legitimately yields `emails: []`). Detect this case and return a message that says so.
**Why:** Klaviyo accounts commonly run mixed SMS + email flows; picking an SMS-only one today just says "missing or empty" with no indication why, which reads as a bug rather than an expected no-op.
**Pros:** One conditional, clearer string — no new data needed, the flow object already distinguishes trigger type.
**Cons:** None real; purely additive.
**Context:** From the CEO review of the Klaviyo-import feature (2026-07-21). `src/app/api/campaign/from-klaviyo/route.ts:199-201`.
**Effort:** XS (human: ~30min / CC: ~5min)

### Fix dead emailCount in the Klaviyo flow picker
**Priority:** P3
**What:** `listFlows()` (`src/lib/klaviyo.ts:202-220`) always returns `emailCount: 0` — the comment says "for v1 we shortcut to 0 and populate during getFlow detail," but nothing ever writes an updated count back, so the `· N emails` badge in `KlaviyoFlowPicker.tsx:196` never renders even though the check for it (`f.emailCount > 0`) is live in the code.
**Why:** Confirmed dead/broken intended feature via direct read of both the picker's render check and the summary builder — not a hunch.
**Pros:** Small, isolated fix.
**Cons:** Doing it "right" means either an extra Klaviyo call per flow in the list view (rate-limit budget cost — the existing comment explicitly called this out as the reason it was skipped for v1) or a lazy/cached count populated after the first `getFlow` detail fetch. Needs a design call on which tradeoff to take before implementing.
**Context:** From the CEO review of the Klaviyo-import feature (2026-07-21).
**Effort:** XS (human: ~1h / CC: ~10min)

### Unify the two divergent email-CTA brand systems (and the wider background/body scheme)
**Priority:** P2
**What:** Three different "the brand CTA" definitions currently live in this repo: the brand handbook (`lunia-brand-guidelines.ts:334-348`) specifies white text on Rich Navy `#01253F` and explicitly says Signal Yellow is "not for email CTAs"; the Campaign Builder template (`campaign-email-html.ts`, built 2026-05-22 — after the handbook) actually ships navy text on Cream `#f5f5e9`; the separate Email Review writeback feature (`email-typography.ts`) ships navy text on Signal Yellow `#FFD800` — the exact color the handbook says not to use. **Broader than just the CTA** (per an independent outside-voice pass, 2026-07-21): the handbook specifies Soft Ivory `#F7F4EF` as the default light email background with dark `#1A1A1A` body text; the shipped Campaign Builder template is unconditionally Rich Navy background with white body text throughout, every email, no light variant. So this isn't a CTA-only mismatch — it's the whole template's color scheme vs. the documented design system. Pick one canonical treatment (background + body + CTA together) and update the handbook and both code paths to match.
**Why:** Left as-is deliberately during the 2026-07-21 CEO review (not urgent), but worth a documented decision before a third Klaviyo-touching feature invents a fourth variant. Also: `email-typography.ts`'s yellow CTA is a direct, unambiguous violation of the handbook's own explicit instruction, independent of whichever treatment ends up canonical.
**Pros:** One consistent, documented brand answer instead of three; closes a real (if low-severity) brand-consistency gap.
**Cons:** Touches two independently-maintained files plus the handbook doc; needs a real design decision (which color is "right") before any code changes, not just an implementation task.
**Context:** From the CEO review of the Klaviyo-import feature and email template (2026-07-21), scope widened by its outside-voice pass. See that review's Section 11 (Design & UX) for the full comparison.
**Effort:** M (human: ~3h / CC: ~30min — mostly the design decision, not code volume)

## Completed

### Flag emails that used the deterministic fallback structuring (2026-07-21)
Imported emails that fell back to deterministic structuring (no LLM response, or an unparseable one) now show an amber `~` badge on their deck tab and a banner in the editor, distinct from the existing red `!` "empty email" flag. Threaded `usedFallback` from `convertEmail` → `/api/campaign/from-klaviyo` → `DeckEmail` → `FlowDeck`.

### Fix rate-limit bucket + hero-override bugs (2026-07-21)
`/api/campaign/from-klaviyo` was rate-limited against the unrelated `"email-review"` bucket instead of the already-existing, unused `"klaviyo"` bucket (`kv.ts:144`) — now uses the correct one. Separately, an explicit `heroImageIndex: -1` ("no hero") from the LLM was being silently overridden by the leftover-image sweep, which always promoted the first unplaced image to hero if no hero slot existed yet — the sweep now respects an explicit no-hero decision.

### SSRF allowlist + CTA redirect resolution (2026-07-21)
`mirrorImageToBlob` (`blob-mirror.ts`) now refuses to fetch non-http(s) URLs, private/loopback/link-local IP literals, and `localhost`/`.local`/`.internal` hostnames before republishing to a public Blob URL, and validates the upstream response is actually `image/*` under a 10MB cap before mirroring. Imported campaigns' CTA links are now resolved from Klaviyo's click-tracking redirect to their real destination at import time (`resolveRedirectUrl`, best-effort, same allowlist), instead of reusing the original flow's tracking URL verbatim.
