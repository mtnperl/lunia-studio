# Before and after

Measured the same way as the Phase 0 baseline: happy path from Home, default options, dev build at 1440 by 900. Baseline numbers come from `00-recon.md`. After numbers were taken on 2026-09-04 at commit b9033dc.

## Carousel: Home to a saved carousel with PNGs and a caption on the clipboard

| Measure | Before | After | Note |
|---|---|---|---|
| Clicks | 6 | 8 | New carousel, subject, Generate, Save, Export, Download all, Caption tab, Copy. Two more because download and caption moved behind the Export menu and a tab. The trade: every export and every AI action is now in one place, and nothing sits below the canvas. |
| Scrolls to reach Generate | 1 long scroll, about 1,700 px | same | The brief screen was not rebuilt. It is the largest remaining item. |
| Scrolls to reach the caption | 1 | 0 | Caption is a rail tab. |
| Distinct screens | 4 | 4 | Topic, writing, images, studio. |
| Editor page height | canvas plus rail below the fold | 900 px, no page scroll | The studio fills the viewport; rails scroll on their own. |
| Visible buttons on the editor, default tab | not measured | 38 | 5 of them in the right rail. |
| Edit one headline | 3 actions, not in place | 2 | Click the text, double-click to type on the slide. Ask AI sits under the field. |
| Wait, copy generation | 100 s | not remeasured | Model and prompt length unchanged for the standard preset. |

## Email: Home to exported HTML

| Measure | Before | After | Note |
|---|---|---|---|
| Clicks | 4 | 5 | New email, subject, Generate, Export, Export HTML. One more for the menu. |
| Distinct screens | 3 | 3 | |
| Editor page height | 3,490 px | 900 px, no page scroll | Preview on the canvas, controls in tabs. |
| Visible controls, editor | 105 buttons, 3 textareas | 85 buttons, of which 53 in the rail's default Email tab, 7 inputs | The 105 were all on one page; the 53 are one tab of four. |
| Distance between the thing you click and the thing you edit | 600 px | 0 | Clicking a block in the preview opens its tab in the rail. |
| Save | automatic, status in the Actions section | automatic, status in the top bar | |

## What changed that the numbers do not show

1. Every AI action is visible: regenerate subjects, banner, promo band, block, image, hook image, rewrite selection, improve with Claude. The parity matrix in `03a-capability-parity.md` lists all 471 capabilities and where each went; none was dropped.
2. Every figure now has a home. The claims ledger quotes verified facts into generation, the fact check files passed claims back, and a contradiction arrives with its rewrite drafted.
3. Documents have URLs and a history. `/c/:id` and `/e/:id` open directly, and every save is a version.
4. The palette is closed. Chrome is neutral, brand colours live on the canvas, and the brand handbook v2.1 drives the prompts.

## Deliberately not done

| Item | Why |
|---|---|
| Brief screens as a sheet with streaming generation | Needs the generate routes to stream JSON. The brief still scrolls 1,700 px; the biggest remaining click-cost. |
| Scheduled daily batch | Skipped by decision on 2026-09-04 for API cost. Cron auth is in place if it is wanted later. |
| Brand compliance linting while typing | Removed from scope by decision. The Viral checklist and the fact check cover it at publish time. |
| Legacy HookStep and ContentStep deletion | Approved but not done; they are unused by the v2 flow and cost nothing to keep until the brief is rebuilt. |
| 1080 by 1440 as the default slide size | Explicitly declined. It stays an optional export frame with the type inside the 1350 safe zone. |
| Email hero export preset | The hero comes from the image itself; the slot's own controls export it. |
| Batch view, scripts views, Klaviyo deck strip on the primitives | Re-themed through the aliases, not rebuilt. |
| Facts coverage | 22 of 433 subjects. The remaining 390 run through the Claude app prompt and import through `api/facts`. |
| Three motion opportunities | Listed in `plans/animations/README.md`. |

## Open on your side

- Approve the pending facts on the Facts screen as batches import.
- Set Soft Ivory as the editorial CTA background default if the off-palette grey should go.
- Re-verify the 1440 export frame against a real profile grid before a large run.
