# Carousel structures

One axis owns how a deck argues. It replaced the hook-tone picker and the Standard format on 2026-09-05. Look (Editorial, Free Press, Viral) is a separate axis; any structure can wear any look. Did You Know is untouched: its own frozen two-slide flow. Engagement decks (comment keyword) keep their own generator for now and do not take a structure.

The table lives in `src/lib/carousel-structures.ts`. The generator prompt is built from it and the checklist reads the same table, so a deck's shape lives in exactly one place.

## What a structure declares

- The value move. Every deck exists to do one of three things, and the hook must show it: make a hard thing simple; take a thing everyone knows and add the research; or flip a thing everyone believes and does. A hook the reader nods along to has failed.
- The hook's job, one sentence.
- Slots, in order, for a 5-slide and a 10-slide deck. Each slot names its job, what the last line must do (a job, never a line to copy), the beat of the story spine it serves, its tone on the Viral look, and whether it may carry a graphic, must carry a citation, or may name the product.
- The minimum share of cited slides. No single source may carry more than two slides.

## The nine

| Structure | Value move | Hook's job |
|---|---|---|
| Educational | simplify | The one thing they will understand by the end, in their words |
| List | add research | The number, the set, and what the ranking is based on |
| Mistakes | flip | The mistake as something they did tonight |
| How-to | simplify | The outcome and the time it takes |
| Before and After | add research | The before and the after as two moments they recognise |
| Myth vs Fact | flip | The myth as they would say it, then the turn |
| Study story | add research | The study's result as a plain surprise, never the journal |
| Unpopular opinion | flip | The opinion, bluntly, as a position |
| Story | flip | The moment, the scene, not the lesson |

## Invariants, every structure

Plain language (`src/lib/plain-language.ts`), the story spine and the relay (`src/lib/story-spine.ts`), the accuracy rules, the closed palette, and the retention rules: every slide ends owing the reader something in words that fit the topic, no stock lines, no wordplay, no word whose referent is not on the slide, one idea per slide.

## Old decks

Saved decks without a structure are read through `structureFromLegacy(hookTone, format, stylePreset)`: myth-bust and paradox become Myth vs Fact, symptom and tell become Mistakes, clickbait becomes Unpopular opinion, personal-story and the Viral look become Story, science-backed becomes Study story, everything else Educational. Nothing changes on a saved deck until it is regenerated.
