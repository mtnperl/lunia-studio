# Visual regression suite

Screenshot-diffs the two rendered deliverables against approved baselines and
asserts hard layout invariants that catch the overflow class of bug directly.

## What it covers

- **Carousel infographic slides** (`carousel-slides.visual.test.ts`) — drives the
  headless render page (`/render/carousel-slide`), waits for the settle-and-fit
  loop, and asserts `window.__SLIDE_FIT.settled === true` (nothing painted past
  the 1080×H slide bounds, nothing clipped) **and** a pixel match.
- **Campaign emails** (`campaign-emails.visual.test.ts`) — renders
  `renderCampaignEmail()` HTML at the 600px shell, asserts no horizontal
  overflow **and** a pixel match. Images are exact-aspect data-URI placeholders,
  so it verifies layout geometry with no network/fal calls.
- **Crop math** (`src/lib/email-image-engine.test.ts`, in the default `npm test`
  run) — proves every email aspect maps to an exact target size contained by a
  native GPT-Image size, and that the sharp crop yields exact dimensions.

## Running

The browser suites need the app served (dev or `next start`) at
`VISUAL_BASE_URL` (default `http://localhost:3030`).

```bash
# compare against baselines
VISUAL_BASE_URL=http://localhost:3030 npm run test:visual

# regenerate baselines after an INTENTIONAL visual change, then commit the PNGs
VISUAL_BASE_URL=http://localhost:3030 npm run test:visual:update
```

CI runs this on PRs touching the renderer, slide components, brand tokens, or
email HTML (`.github/workflows/visual-regression.yml`). Diff images for failures
are uploaded as the `visual-diffs` artifact.

## Adding a fixture

Add a case to `fixtures/carousel-slides.ts` or `fixtures/campaign-emails.ts`
(cover a new graphic type or a new copy-length edge), run
`test:visual:update`, eyeball the new baseline PNG, and commit it. When a real
overflow bug is found, add the triggering input as a fixture so the baseline
locks the fix in.

## Baselines are platform-sensitive

Font rasterization differs across OSes, so baselines are captured and checked on
macOS (matching the CI runner and the dev machine). Regenerate on the same
platform CI uses.
