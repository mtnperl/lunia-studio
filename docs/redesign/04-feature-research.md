# Phase 4 feature research

What would make Lunia Studio feel like a professional creator tool, judged against Figma, Canva,
Linear, Notion, Klaviyo and the current wave of AI writing tools, and against how Lunia actually works:
one creator, a proven concept that becomes a carousel and an email, regulated claim language, a closed
palette.

Effort scale, for a working build inside the new editor: **S** up to 2 days, **M** 3 to 5 days, **L** 1 to
2 weeks. Impact is the expected change in time-to-finished-asset, error rate, or reuse, for this one
user.

## What is already in the code and shapes the answers

- `src/lib/banned-terms.ts`: drug claims, banned badges, inflection handling, with tests. Used by the
  UGC compliance check today, not by the editors.
- `/api/verify`: streaming fact check with per-claim verdicts and suggested fixes. Carousel only.
- `carousel-templates` API and KV collection: reference-image templates that steer generation, not
  starting layouts.
- Email shapes: eleven layouts plus saved ones, with restructure and a before-and-after diff.
- Snippets: saved email blocks. Asset library with folders, search, descriptions, and AI choose.
- Undo and redo with coalescing in the email editor (`campaign-editor-state.ts`, tested). None in the
  carousel.
- `TODOS.md` already lists version history as a wanted P3 with the storage concerns spelled out.

## Baseline, not features

These are part of the editor shell and editor slices in Phase 5, so they are not scored here. They
are the floor a professional tool starts from.

Command palette · undo and redo in both editors · autosave with visible state · multi-select and bulk
edit across slides · keyboard shortcuts with a discoverable sheet · streaming generation · per-element
regenerate · documents with URLs.

## Candidates

| # | Feature | User problem it solves | Effort | Depends on | Impact | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Duplicate and vary** | The core Lunia loop is variants of a winning concept. Today that means rebuilding from the brief and losing the structure that worked. One action: keep the structure, style and graphic types, change the angle, tone or topic, get N variants as new documents. | M | A `structureFrom` parameter on `carousel-v2/generate` and `campaign/generate` (backend, small, flagged). Document model from slice 2. | Very high | **Build** |
| 2 | **Templates and brand presets** | Every carousel starts from a layout that already converted. Today the email has shapes and the carousel has three presets; neither can save a finished document as a starting point with its settings. Save as template, start from template, template picker in the New sheet. | M | KV collection for templates (reuse `carousel-templates`), New sheet from slice 2. | High | **Build** |
| 3 | **Inline AI editing on selection** | Rewrite, shorten, punch up the hook, make it compliant, without regenerating the slide. Today: shorten slide and regenerate slide exist, but nothing is selection-scoped. Select text on the canvas, get a small menu. | M | One endpoint, `rewrite-selection`, with an instruction enum (backend, small, flagged). Uses the on-canvas editing from slice 3. | High | **Build** |
| 4 | **Brand compliance linting** | Banned claim language and off-palette colour caught while typing, not at review. `banned-terms.ts` exists; the fact check exists; neither runs in the editor. Adds a palette aligner that snaps drawn colours to the closed six and a lint that fails on hex literals outside it. | M | `banned-terms.ts` (exists). Palette aligner in `brand-tokens.ts` (new, pure). No backend. | High | **Build** |
| 5 | **Version history with named checkpoints** | Undo covers "I just made a bad edit". It does not cover "yesterday's version was better" or survive a closed tab. Snapshots on every save, name a checkpoint, restore any. | M | A versions KV collection with a retention rule (30 versions, checkpoints kept). Autosave from slice 2. `TODOS.md` already scopes this. | High | **Build** |
| 6 | Visible undo timeline | A scrubbable list of undo steps. Nice, rarely used once checkpoints exist. | S | 5 | Low | Park |
| 7 | Asset library search | Exists with folders, search and descriptions. The gap is inside the editor: pick from the library without leaving the rail. | S | Editor slices | Medium | Park, folded into slice 3 and 4 as the rail picker |
| 8 | Export presets per channel | IG carousel and story exist. Email hero and Meta static ad from a slide would need two renderers and a crop model. | L | Slide renderer refactor | Medium | Park |
| 9 | Comments and review mode | One creator today. The phone review view covers approve and request a change for a second person. Threaded comments need identity and notifications. | L | Auth for a second user | Low today | Park |
| 10 | Multi-select and bulk edit | In the carousel editor slice already. | S | Slice 3 | High | Baseline |
| 11 | Keyboard shortcuts and cheat sheet | In the shell slice already. | S | Slice 2 | High | Baseline |
| 12 | Paste a study link to start | Start a carousel from a paper URL: fetch, extract claims, pre-fill the brief and citations. | M | A fetch and extract endpoint (backend, new). | High for the science-first content | Park for this cycle, revisit next |
| 13 | Scheduled daily batch | Memory notes this was designed and deferred, blocked on middleware secret support. Not an editor feature. | M | Cron auth | Medium | Park, unchanged |

## Impact and effort grid

```
            Low effort              Medium effort               High effort
High     │ 10 bulk edit (baseline) │ 1 duplicate and vary     │
impact   │ 11 shortcuts (baseline) │ 2 templates and presets  │
         │                          │ 3 inline AI on selection │
         │                          │ 4 compliance linting     │
         │                          │ 5 version history        │
         │                          │ 12 paste a study link    │
─────────┼──────────────────────────┼──────────────────────────┼──────────────────────
Medium   │ 7 library picker in rail │ 13 scheduled batch       │ 8 export presets
─────────┼──────────────────────────┼──────────────────────────┼──────────────────────
Low      │ 6 undo timeline          │                          │ 9 comments
```

The rendered grid is on the Phase 4 artifact page.

## The shortlist, in build order

1. **Brand compliance linting with the palette aligner.** Smallest backend surface (none), protects
   every other feature, and the aligner is needed by slice 3 anyway to close the palette.
2. **Inline AI editing on selection.** Rides on the on-canvas editing from slice 3. One small endpoint.
3. **Templates and brand presets.** Needs the New sheet and the document model; makes the empty state
   real.
4. **Duplicate and vary.** The highest value item. Built after templates because a variant is a
   template applied to a new angle, so the two share the structure extraction.
5. **Version history with named checkpoints.** Last because it needs autosave stable in production
   first, and it is the one that touches storage.

## What each shortlisted feature needs from the backend, stated plainly

The brief says backend changes must be called out. These are the only ones:

- `generate` routes accept an optional `structureFrom: { documentId }` and honour slide count, graphic
  types and style settings from it. Additive, no data model change.
- A `rewrite-selection` route: text in, instruction in, text out. Mirrors `shorten-slide`.
- A `versions` KV collection: `{ documentId, savedAt, name?, snapshot }` with pruning to 30 unnamed
  versions. Additive.
- Templates reuse the existing `carousel-templates` collection with a `kind: "layout"` discriminator,
  and a new `email-templates` collection shaped like saved shapes plus settings. Additive.

Nothing in the shortlist changes an existing data model or an integration.

## Parked, explicitly

Visible undo timeline, export presets per channel, comments and review mode, paste a study link,
scheduled daily batch. Each has a line above saying why and what would unblock it. They stop being
ambient scope until the shortlist ships.
