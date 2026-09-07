# Human-made carousels + magnetic storytelling

Status: steps 1 to 3 SHIPPED 2026-09-06 on redesign/phase-2-design-system. Decisions: new "essay" preset (not a change to Editorial Scientific); Anton + Caveat approved (DESIGN.md log); accent is Signal Yellow by default with a red option per deck (essayAccent). Step 4 (benchmark deck) and step 5 remain.

## Diagnosis (from the reference screenshots vs. our decks)

What reads as AI in ours:
- Photoreal "premium DTC wellness" hook images, ivory + navy, Inter 300/200, huge negative space.
- Takeaway = numbered list of facts. CTA = "READ MORE AT LUNIALIFE.COM" on an empty slide.
- Viral preset's open loops are canned strings reused across decks ("Here is why the usual fix fails.").

What reads as human in theirs (Rishi, thebami):
- Visible medium: paper/plaster texture, grain, engraved illustration, hand-script byline.
- ONE word boxed in red/yellow inside the hook. Heavy condensed display type.
- Serial chrome: "ESSAY 093", "04.05.26", "(PART 3)".
- Illustration overlaps the headline (the snake) so the picture changes the sentence.
- Every slide ends with a specific unanswered question ("Did they?" / "What did she ask?").
- Specific numbers and objects: six weeks, 3 sales, $500. Never "didn't go well".
- Hook names WHO it is for and takes a side. Slide 2 is a second hook.

## Steps

1. Storytelling lint + prompt (about half a day)
   - src/lib/carousel-prompts.ts STORY_BLOCK: add SPECIFICITY (one concrete number/object per slide), OPEN LOOP (last line of every content slide is the question the next slide answers, written per deck, never canned), SECOND HOOK (slide 2 must stand alone as a hook), AUDIENCE (hook names who it is for).
   - src/lib/story-spine.ts storyCheck: fail a slide with no concrete detail, no closing loop, or a loop the next slide does not answer.
   - src/lib/carousel-style-presets.ts VIRAL_SLOTS.openLoop: model writes it; the string becomes a fallback only.
   - Takeaway slide: three lines that pay the loop, not three facts. CTA carries the returning image and one line, never bare "read more".

2. "Essay" look preset (about 1 day)
   - New CarouselStylePreset "essay". Existing decks untouched (parity rule).
   - Paper texture background (tiled PNG in public/), heavy condensed display face, one red box word in the hook (reuse the viral yellow-phrase mechanism), script byline, "ESSAY NNN" + date footer, "(PART N)" when a series.
   - Needs font approval: DESIGN.md has Inter/Cormorant/Fira only. Decision goes in the DESIGN.md log.

3. Illustration lane instead of photos (about 1 day)
   - src/app/api/carousel-v2/generate-image/route.ts: new lanes "engraving", "ink sketch", "risograph". No photoreal for the essay preset.
   - Subject cut out (fal remove-background or Recraft transparent) and layered so it overlaps the headline in HTML.

4. Benchmark deck + visual baselines (about half a day)
   - Regenerate the sleep-paralysis deck (the one posted to TikTok) in essay preset. Add baselines in tests/visual.
   - Side-by-side old vs new for a go/no-go.

5. Later, not now
   - Series numbering persisted in Redis. Per-topic byline variants. Comment-CTA slide as a loop, not a plea.

## Open questions
- New preset or replace Editorial Scientific? Recommend new.
- Display font: Anton / Bebas style condensed, or stay Inter 800? Recommend condensed.
- Red accent on an ivory ground, or Signal Yellow from the viral preset? Recommend red for this preset only.
