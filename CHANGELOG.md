# Changelog

## [Unreleased]

### Added
- Slide order in the carousel editor. Every content slide in the rail has move up, move down, duplicate, add a blank slide after, and delete, and a content slide can be dragged onto another to move it. The hook and the close stay where they are. A deck keeps between 1 and 10 content slides. Delete takes two clicks (the trash arms it, Confirm does it, and the arm lapses after four seconds) because the editor has no undo. A slide's background image and its notes and graphic history move with it. The controls are disabled while a slide or graphic is regenerating, since those results are written back by position.
- Bullets, numbered lists, paragraph space and line spacing in Edit text. The formatting is carried in the body text itself (`• `, `1. `, a blank line), so it survives save, the share page, the PNG export and the rewrite routes without a schema change, and all six presets draw it with a hanging indent through one shared `FormattedBody`. A body with no line breaks and no list lines renders exactly as before. Line spacing is per slide (`lineSpacing`, 0.8 to 2x the preset's own leading) and reaches the headless export. The essay preset already had lists; it now also reads `1.` lines as items.
- Delete from the carousel library in one click: a trash button on every card (still behind the confirm dialog), and Select, which picks any number of carousels, or all of them, and deletes them with a single confirm.

### Fixed
- The editor assumed three content slides. The CTA's icon slot was hardcoded as index 3 and the content and takeaway checks as slides 1 to 3 and 4, so on a deck with four content slides the fourth slide's icon controls edited the CTA's graphic, and the takeaway lost its Edit text. All of it now counts from the deck.
- A failed library delete removed the card anyway. The response was never checked, so the carousel vanished from the grid and came back on reload. The card now stays and says it could not be deleted.
- Deleting several carousels at once could bring some of them back. The library is one stored list that each delete reads, filters and writes whole, so two deletes in flight race and the last write restores the other's carousel. Reproduced locally: two parallel deletes left one of the two behind. Bulk delete now runs them one after another.

### Fixed
- The Did you know editor answered a control after seconds, and got worse the longer it stayed open. Every change rebuilt both export PNGs, and each `toPng` call made html-to-image resolve the brand's web fonts from scratch. The Google Fonts `<link>` is cross-origin, so `sheet.cssRules` throws and the library's fallback refetches the stylesheet and INSERTS every rule it parses into the first same-origin stylesheet in the document. Measured on the real editor: 47 font files refetched per rebuild, the page's stylesheet growing by 256 rules per edit (260 → 516 → 772 …), and a rebuild going 3.3s → 4.6s → 5.6s as it grew. The fonts are now resolved once per page and handed back as `fontEmbedCSS` (`src/lib/font-embed.ts`), keyed by the families a slide actually uses so the formats do not share one another's faces. Same editor after: fonts fetched on the first export and never again, the stylesheet flat at 132 rules, and a seven-tick slider drag with no long task at all.
- The PNGs are also no longer rebuilt in the background on a device that has no use for it. Pre-building exists because iOS opens the share sheet inside the gesture that asked for it and closes the window long before two 1080x1350 slides are ready; a plain download has no such window. A desktop browser now builds on the click instead, so moving a slider costs nothing, and Download is live immediately rather than disabled behind "Preparing PNGs 0/2" after every change. (DESIGN.md, 2026-07-23: `disabled` is reserved for genuinely unavailable actions.)
- Choosing a different pen colour and pressing Download handed back the default version. The effect that rebuilds the cached PNGs listed its dependencies by hand and `paper.pen` was not among them, so a new colour redrew the preview, left the files alone, and Download preferred the cache. Proven on the exported pixels: after selecting the red pen the downloaded slide had 0 red pixels, and 18,426 once any other control was nudged. Both two-slide steps now key that effect on `slideExportSignature(...)` over the whole render input, which cannot be half-written the way a list can, and the same fix covers Chartbook and Primer.
- Font size was never saved. The slider moved the preview and reached the export, but `fontScale` was not in the saved record, so reopening a piece from the library put it back to 100% and everyone who followed the share link saw and downloaded it at 100%. It is stored on the carousel now, bounded on the way in and clamped to the slider's range on the way out, and the Did you know, Chartbook and Primer share pages render at the size the piece was saved at.
- Carousel generation died with "e.graphic.trim is not a function". A slide's `graphic` is typed as a string and the prompt asks for a GraphicSpec JSON string, but the model sometimes sends the object itself. Three readers then called `.trim()` on an object: the essay pass, the graphic validator, and the structure reader used by duplicate-and-vary. The essay pass ran before any normalising, so one bad field killed the whole generation. `normalizeGraphic` now turns whatever arrived into a string (an object is stringified rather than discarded, since the encoding was wrong but the content was not) and runs on every slide and the CTA the moment the model's JSON is parsed. All three readers were hardened too, so a saved or hand-edited deck cannot crash them either.

### Added
- Delete all, beside Approve all on every subject group in the Facts screen, for a subject that is not worth keeping. It takes two clicks on the same button rather than a dialog: the first arms it, the second does it, and the armed label names how many of them you had verified. Clearing subjects is a pass of many decisions and a modal per subject turns a rhythm into a slog, so the guard is inline instead. Only one button is armed at a time and it disarms itself after a few seconds, so a stray click never sits loaded. The single-fact delete keeps its dialog. `DELETE /api/facts` takes a set of ids and filters the ledger once: deleting one at a time through the per-id route read and rewrote the whole ledger per fact, so clearing a subject of five rewrote a few thousand rows five times. Capped at 500 ids per request.

### Removed
- Batch research. `/api/facts/research-batch` is gone, and with it the "Research the next 2 now" button. The screen promised that three subjects were researched every night, which was never true: no cron was ever scheduled for it in `vercel.json`, so the line described work the deployment did not do.
- Research at write time. `ledgerBlockFor` used to research a subject with nothing on file before writing. A write is not the moment to spend a minute and a web search filling a gap, and the cost arrived without anyone choosing it. The gate now reads the ledger and nothing else, and reaches no network at all. A subject with nothing on file is written from what the writer knows, and the brief's material gate decides whether that is publishable. Filling a gap is deliberate now: Research a subject, one at a time, on the Facts screen.

### Added
- Subject corrections. Where the research on file says a subject line is not true as written, the library rewrites the line to what the studies show, so a false premise stops seeding every future deck. One button on the Subject library runs the whole pass; it is a single explicit run rather than a background rewrite, because it edits the content library. The old wording moves to `priorText`, so every change is listed with a before and after, can be copied out as plain text, and can be undone one subject at a time. A caveat subject (safe with a qualifier) is left alone.
- `claimCorrection` is written as a frame for the writer, not as a subject line, and comes back anywhere between one clean sentence and a paragraph of methods and sample sizes. Anything already subject-shaped goes in verbatim; anything carrying a sample size, a bracketed age range, a semicolon, or more than 110 characters is condensed to a line first on the draft tier. A condensed line that comes back unusable leaves the subject alone, since a mangled subject is worse than an uncorrected one.

### Fixed
- The Facts screen read "0 of 496 subjects have facts on file" with 2201 facts in the ledger. A fact carries the subject id it was filed under, and those ids go stale when the subject library is reseeded: the ids change, the wording does not. `coverageOf` resolved with `f.subjectId ?? text`, which short-circuited on the stale id and never tried the wording, so every fact fell through. It now resolves by id only when that id still names a subject. This was not cosmetic: the nightly research job skips subjects that already have facts, so a coverage of zero had it re-researching the whole library every night at three subjects a run, which is the spend that got fact checks paused in the first place.

### Added
- Recast: argue the same subject a different way behind the cover the deck already has. A structure is chosen from a topic line before any words exist, which is the worst moment to judge what shape an argument wants, and the mistake only shows on the finished deck. The Brief rail now offers every other structure, with Keep the hook and Keep the image as separate toggles. The piece is written again under the new structure's value move, so it is a real rewrite rather than the old slides reshuffled, and `keptCoverBlock` tells the writer which cover it has to open out of. The kept cover goes back on after the editor read, so nothing downstream can rewrite the hook the user asked to keep. Keeping the image skips image generation entirely, so a recast costs one text generation.

### Fixed
- The hook slide exported as a plain coloured square on a phone: the ground and the wash with no photograph between them. Two causes, both in `compositeSlideWithImages`. Every image was re-fetched through the proxy at export time even though the `<img>` was already decoded on the page, so a slow connection or one bad proxy response lost the picture the user could see in the preview. And both failure paths were a bare `continue`, so an image that could not be loaded or decoded was dropped without a word while the export reported success.
- The live `<img>` is now the draw source and the fetch is the fallback, which removes a network round trip from the export and matters most on iOS, where the share sheet's activation window closes within seconds of the tap. Painting moved ahead of the foreground capture, because that capture blanks each `src` and restores it, and a just-restored `src` is not reliably decoded again in time.
- Anything still undrawn throws `MissingSlideImagesError`, which the callers no longer swallow into a plain `toPng`. Falling through to `toPng` was what produced the silent square in the first place, since it is exactly the path that drops `<img>` contents on mobile. The user sees a sentence naming what happened instead of a broken slide.
- A live element drawn without CORS taints the canvas and the pixels cannot be read back. That case is detected and repainted from data URLs, which are same-origin, rather than failing the export.

### Added
- Deck mandates: the reason a deck exists, decided before the piece is written. Seven of them in `src/lib/deck-mandates.ts` (Correction, Unknown claim, Connection, Naming, Finding, Rule, Question), each carrying the test it must pass and the way it goes wrong. The brief now opens on PART ZERO, weighs two or three mandates against the subject, applies each one's own test, and writes the piece to deliver the winner. The chosen mandate, the turn and the material are stored on the brief and carried into the cut and the editor read.
- The brief can decline a subject. When no mandate passes its test there is no deck, and the brief returns a reason with three topic lines on the same ground that would pass. The route answers 422 and the builder shows it. Until now every stage improved the deck it was handed and nothing could say no, so a weak subject always became a well-made forgettable deck.
- The turn and the material. The turn is the one sentence the reader will believe afterwards and does not believe now; the material is the study, threshold, mechanism or scene it rests on. A turn a reader would nod at sends the brief back to the mandate menu, and a turn with no material cannot be published.
- The slide-by-slide spec in `craftBlock`: six named jobs (Moment, Recognition, Crack, Turn, Cost, Move) each with the test it passes, used where a structure does not set its own running order. Plus three rules on every deck: specificity increases slide to slide, one new thing per slide, and the swap test (a sentence that would read fine in a deck on another subject belongs to no deck).
- Mandate mix memory. The last eight decks' mandates reach the brief, so an account does not run six corrections in a row. It governs the mix only and never bars a mandate the subject needs.

### Fixed
- The value move reached the slide-cutting prompt but never the brief, so the piece was written to explain the topic and the cut was then told to flip a belief the piece did not contain. `writeBrief` now passes the structure's value move and hook job into `BRIEF_PROMPT`, one stage earlier, where it can still change what the deck says.
- The editor read only tested whether the deck answered its title. It now also names the slide that delivers the mandate, and the slide carrying the turn, and rewrites the nearest slide when neither exists.
- Carousel generation, the longest call in the app, reported an edge timeout as a JSON parse error. It reads through `readJsonResponse` now.

### Added
- Hook spread: twelve labelled hook ANGLES (Symptom, Paradox, Tell, Wrong door, Myth bust, Mechanism, Evidence, Stakes, Scale, Relief, Threshold, Confession) in `src/lib/hook-angles.ts`. An angle is the entry point into the topic, not a synonym for a tone. `POST /api/carousel-v2/hook-spread` writes one hook per selected angle against the same fixed deck, tags each with its angle and a one-line note on what it does, and appends them to the pool. Angle chips and the spread button are in the Brief rail of PreviewStep and in the rewrite panel of HookStep; every hook card shows the angle it came from.
- `Hook.angle` and `Hook.angleNote` on the carousel content type. Optional, so hooks written before the spread are untouched.
- Anti-machine block in the spread prompt: no invented precision (a clock time, a percentage or a count appears only if the piece has it), no hollow aphorisms, no drifting off the deck's subject onto a downstream symptom, no borrowed cadence (colon headlines, "here is why", "it is not X, it is Y").

### Fixed
- "More hooks" surfaced `Unexpected token 'A', "An error o"... is not valid JSON` when the function timed out at the edge. `readJsonResponse` (`src/lib/fetch-json.ts`) now reads the body once and reports what actually happened, and HookStep no longer reports every failure as a network error.
- Hook pool raised from 12 to 24, since one spread can write eight at a time.

## [0.3.0] - 2026-04-08

### Added
- `iconLayout` graphic component: display 1–4 icons per content slide in four layout modes — Row, Column, Grid, and Scattered (absolute-positioned). Picker UI with multi-select + layout toggle in both ContentStep and PreviewStep.
- "Mind" icon category with 12 new icons (focus, meditation, clarity, mindfulness, awareness, journaling, breathwork, visualization, affirmations, gratitude, neuroplasticity, intention)
- 44 new icons total across all categories (Sleep +8, Health +8, Lifestyle +8, Fitness +8, Mind +12)
- Lunia Life watermark toggle (On/Off) in PreviewStep and ContentStep, replacing the wave decoration toggle

### Changed
- Hook slide: removed wave decoration pattern (`HookDecoration`) — hook slides now render clean text-only backgrounds
- `regenerate-graphic` API: `iconLayout` added to `VALID_COMPONENTS` allowlist so regeneration requests return valid icon layouts instead of falling back to `callout`
- `IconLayout.tsx`: stable `key={ic.id}` used for all map renders (was `key={i}`)

### Fixed
- `getIconById` called once per icon in scattered/column layout renders (was called twice — once for SVG, once for label)

## [0.2.2] - 2026-03-25

### Added
- Smart Graphic System v2: 3-tier routing for carousel content slides — DATA tier (≥2 real numbers → existing 27 data components), LAYOUT tier (3-6 structured concepts → 6 new layout infographics), CONCEPT tier (emotional/metaphorical → vector illustration with mood)
- HubSpokeGraphic: central hub with 3-5 radiating spokes for category/pillar relationships
- IcebergGraphic: horizontal waterline split showing 1-3 visible vs 2-4 hidden elements
- BridgeGraphic: left-to-right arc connecting a problem block to a result block with optional label
- CircularCycleGraphic: 3-5 nodes on a clockwise ring with step badges for process/cycle content
- BentoTiles: 2-4 tiled icon grid (icon + label + optional body) in 2/3/4-tile bento layouts
- ConceptFlowGraphic: 3-5 horizontal pill-shaped nodes showing mechanisms/sublabels in a linear flow
- VectorIllustration mood parameter: `calm` | `energetic` | `scientific` | `playful` — adjusts opacity to express emotional tone

### Changed
- `carousel-prompts.ts`: Claude now classifies slide content before choosing a graphic component, improving selection accuracy for conceptual wellness slides with no hard numbers
- `REGENERATE_GRAPHIC_PROMPT`, `REGENERATE_SLIDE_PROMPT`, `REGENERATE_VECTOR_PROMPT` all updated with 3-tier routing logic and mood guidance

## [0.2.1] - 2026-03-25

### Added
- Vector illustration library expanded from 10 to 29 themes covering the full Lunia Life wellness topic range (stress, meditation, gut, immune, vitamin, inflammation, hydration, workout, breathing, mood, sunlight, cold, hormone, dopamine, tension, growth, prevention, weight, aging, microbiome, nutrition, posture, recovery, focus)
- Hook image prompt generator now returns 3 distinct creative directions (macro/close-up, environmental, abstract/symbolic) — displayed as clickable alternatives in both HookStep and PreviewStep refine panel
- Hook slide previews in HookStep now show clean text-only (no geometric decoration) so copy is easier to evaluate

### Changed
- Content slide graphic zone reduced from 440px min-height to 180px, freeing ~80% more vertical space for text
- Body font sizes raised significantly: 25–38px → 34–58px (text-only) and 25–32px → 34–46px (with graphic); headline caps raised from 38–60px to 46–72px
- "↺ Prompt only" button in PreviewStep refine panel now labeled "↺ 3 directions" to reflect the new multi-prompt response

### Fixed
- `blood` keyword now correctly resolves to the `heart` vector theme (regression introduced when splitting the old combined regex)
- Adversarial: `handleVectorGraphic` now guards against undefined slide index
- Adversarial: `alternatives` state cleared when user switches hook selection (prevented stale prompts from one hook appearing on another)
- Adversarial: `guidelines` field capped at 400 chars at API layer to prevent prompt injection
- Adversarial: `regenerate-graphic` route now exports `maxDuration = 30` to prevent Vercel timeout leaving the button in permanent loading state

## [0.2.0] - 2026-03-25

### Added
- Vector illustration toggle per content slide (↺ vector button) — switches any slide's graphic to an AI-generated SVG illustration; button highlights when slide is already in vector mode (derived from actual graphic data, not ephemeral state)
- Separate "↺ Prompt only" button in hook image refine panel — rewrites the image prompt without triggering a new image generation
- `REGENERATE_VECTOR_PROMPT` for dedicated vector illustration generation
- `forceVector` flag on `/api/carousel/regenerate-graphic` route

### Changed
- Content slide body copy: first sentence now renders bold (700 weight), remaining sentences regular (400 weight) — matching reference design
- Font sizes recalibrated: body capped at 32px (with graphic) / 38px (text-only), headline at 52–60px, citation at 18px
- AI prompt rules updated: body copy reduced from 3–5 sentences to 2–3 sentences MAX (under 60 words)
- Template density map: `dense` now 3–4 sentences; override wording unified

### Removed
- Test mode (⚡ button, mock content, skip-to-design shortcut) — removed entirely
- Library button from carousel builder header — accessible via sidebar nav
