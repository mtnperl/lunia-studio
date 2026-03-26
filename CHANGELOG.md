# Changelog

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
