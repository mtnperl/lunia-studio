# Carousel rows

One reviewed spreadsheet row is one six-slide Instagram carousel. The row
library replaced the 496-line subject library and the claims ledger on
2026-09-22, and with them the idea that the writer invents both the topic and
the numbers.

The table lives in `src/lib/carousel-rows.ts`. The deck mapping lives in
`src/lib/carousel-row-deck.ts`. The generator reads both, so a row's shape
lives in exactly one place.

## What the sheet carries

Seventeen columns. The importer rejects a file missing any of them rather than
importing half of it.

| Column | What it is | Where it goes |
|---|---|---|
| Subject | Internal working title | Search, the deck's `topic`. Never printed |
| Carousel type | Editorial category | Filtering and grouping only. Not a layout, not proof |
| Evidence | 1 to 5 research strength | Shown on the row. Triage, not approval |
| Story | 1 to 5 scroll-worthiness | Shown on the row. Judgement, not a forecast |
| Build | YES or NO | Carried verbatim. A NO row imports and cannot be built |
| Why | One-sentence rationale | Internal. Shown in the library, never on a slide |
| Citation | Full citation, usually with a URL | Internal, for review. The URL is lifted out on import |
| Visual system | Concept-level art direction | Image prompts. Never caption text |
| Hook option A / B / C | Three cover headlines | The builder's three-hook picker, defaulting to A |
| Slide 1 to 6 | The deck itself | Copied onto the slides |

Every YES row in the current export has a citation with a URL, and slide 1's
headline is Hook option A.

## A slide cell

Labelled lines, parsed by `parseSlideCell`:

```
Headline: More caffeine needs more runway
Body: For a 107 mg coffee, the modeled window was 8.8 hours.
On-slide source: Gardiner et al., 2023
```

Four labels mean anything: `Headline`, `Body`, `On-slide source`, `Brand mark`.
A line that does not open with one of them is appended to the label above it,
so a wrapped body arrives whole. Text before the first label is discarded
rather than guessed into a slot. A colon inside body copy is not a label.

`Brand mark` is a production instruction on slide 6, not copy to print.

## The six slides, and what the deck does with them

| Row slide | Job | In the deck |
|---|---|---|
| 1 | Hook | The cover. Its body is the cover's support line; its headline is the selected hook |
| 2 | Setup | Content slide |
| 3 | Turn or payoff | Content slide |
| 4 | Consequence or limitation | Content slide |
| 5 | Practical interpretation | Content slide |
| 6 | Summary | **Guidance only.** The deck writes its own takeaway slide |

Slide 6 is the one place the sheet is advisory. The deck's last slide is the
takeaway the app has always built — a headline, three lines, one ask — because
that is the slide a reader screenshots. The row's slide 6 goes into the prompt
as where the argument should land, never as copy to reuse.

A takeaway replaces the CTA slide at render time, so a row becomes six slides
and not seven. `cta` is still populated for layouts that predate the takeaway.

## What the model still writes

Two things, in one call: the caption, and the takeaway. That is all.

The prompt (`ROW_FINISH_PROMPT`) is handed the finished deck and told it is not
writing or rewriting the slides. It may not introduce a number, study, author
or year that is not already on a slide, and it may not name a source at all:
the sources that belong on the deck are already printed on it.

If that call fails, the deck is still returned. Six reviewed slides are the
valuable part and are not thrown away because a caption did not come back; the
editor gets a warning and writes the close by hand.

## Citations

Per-slide citations come from `On-slide source` and from nowhere else. Most
slides have none, and none is the correct result: 52 of 864 slides in the
current export carry one. The deck-level `Citation` is internal, for review.

Nothing in this path invents a citation, and nothing backfills one. That rule
is the reason the claims ledger was removed rather than kept alongside.

## Import

`POST /api/carousel-rows/import`, the file as the raw body, CSV or XLSX.
`?dryRun=true` reports what the file would do and writes nothing; the library
screen always dry-runs first and asks before committing.

Re-import is a merge on the subject line. An edited sheet updates the row in
place and keeps its id, chosen hook, status and build history. Rows the new
file does not mention are left alone, so a partial export can never read as a
deletion.

## What this does not cover

The sheet has no posting date, alt text, image asset, approval owner or
publication status. `status` on a row (draft, in production, published,
parked) is the app's, not the sheet's. Imported means draft, never approved.

## The old field guide

The Word field guide describes a 16-column export with no `Citation` column,
and an earlier CSV used a different slide format entirely (`"headline";
visual direction`, no body copy). Neither matches what the app reads. This
document describes the file the importer actually parses.

## There is no fact check

The per-slide fact check was deleted on 2026-09-22, with its routes, its
panel, its gating config and the `verification` record on a saved deck. It
hashed every unit, sent each claim to a grounded model with web search, and
coloured the export button by the verdict. Two carousel sessions had already
taken a quarter of a month's API credits, and it had been switched off behind
a constant since 2026-09-05.

Deleting it is only safe because of what replaced the writer. A row's claims
were reviewed before they reached the app, and the source is printed on the
slide that states the figure. The check was re-checking somebody else's work
at Opus prices.

What this means for the free-typed topic path, which still writes its own
slides: nothing downstream checks them. The prompts say so in as many words,
because telling a writer a safety net exists when it does not is worse than
telling it nothing. Decks saved before this date keep their stored
`verification` object; it is no longer read, and nothing strips it.
