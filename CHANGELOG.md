# Changelog

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
