# Phase 0 Recon: Lunia Studio

Captured 2026-09-02 against the local dev build (`next dev`, port 3030, current `main` at 4d6508a).
Screenshots: `docs/redesign/recon/shots/` (130 files, five widths) and one contact sheet per width in
`docs/redesign/recon/contact-*.png`. File names encode width and screen, for example
`d1440-23-carousel-studio.png`. The `e0*` files are the timed email generation run.

No design work was done in this phase. This document is the baseline the redesign is measured against.

## 1. Codebase map

| Area | Finding |
|---|---|
| Framework | Next 16.2, React 19.2, TypeScript strict. App Router, but the whole product is one client page. |
| Routing | `src/app/page.tsx` holds `useState<Tab>` with 23 tab values. The URL never changes between views. Refresh drops you back to Home. The only deep link is `?openScript=`. No URL for a carousel or a campaign in the editor. |
| Shell | Sidebar is inline in `page.tsx:300-395` (workspace header, filter box, Create button, 6 nav sections, theme toggle). Editor tabs (`campaign`, `carousel-v2`, `editor`, `video`) auto-collapse the sidebar to zero width (`page.tsx:163-196`). |
| Auth | Cookie middleware (`src/middleware.ts`), password login page. Dev passes through when `APP_PASSWORD` is unset. |
| Styling | CSS variables in `src/app/globals.css` (381 lines, light and dark blocks). Components are styled with inline style objects: 3,535 `style={{` vs 114 `className=` in `src/components`. Tailwind 4 is installed and effectively unused. Fonts via a Google Fonts `<link>` in `layout.tsx`, not `next/font`. |
| Existing primitives | `src/components/ui/`: Button (5 variants), IconButton, AutoTextarea, Label, PageHeader, Section (collapsible), 15 stroke icons. No select, toggle, slider, tooltip, popover, tab, toast, dialog, skeleton, context menu, or command palette. |
| Carousel state | All `useState` in `src/components/CarouselView.tsx` (topic, variants, style preset, contrast, images, format, and more). Two-step machine: brief and studio. Draft persisted to `localStorage` on every change with quota fallback. Server save is manual. No undo or redo. |
| Email state | `src/components/CampaignView.tsx` (step 1 brief, step 2 editor). `CampaignEditor.tsx` is 3,199 lines with debounced autosave (2.5 s), undo and redo (depth 50, pure reducers in `src/lib/campaign-editor-state.ts`), and five keyboard shortcuts. |
| Slide rendering | `src/components/carousel/slides/*` (9 slide types) plus 35 infographic components. The on-screen preview, the client PNG export (`html-to-image`) and the server Puppeteer export (`/render/carousel-slide`) all mount the same components. This is a strong foundation for a canvas. |
| Email rendering | `src/lib/campaign-email-html.ts` produces the table HTML. The editor preview is the same HTML in an iframe at 600 px, CSS-scaled. Not an approximation. 15 block kinds in `src/lib/types.ts:763`. |
| AI generation | All request and response JSON. No streaming in either flow (`api/carousel-v2/generate`, `api/campaign/generate`). Loaders are timer-driven guesses. Per-element regeneration already exists on the server and in the UI for slides, graphics, hook images, email blocks, subject lines. |
| Live vs legacy | `api/carousel-v2` is live; `api/carousel` v1 survives for the library list, share page and image proxy. `EditorView.tsx` is the script editor, not a carousel editor. A whole unused `api/email/*` tree has no client caller. |
| Brand tokens | `src/lib/brand-tokens.ts` holds the six brand hexes. Slide components hardcode the hexes as literals and also use off-palette values (`#1E6B8C`, `#9ab0b8`, `#6b7280`, `#EFEFF4` and others). Email theme in `src/lib/campaign-theme.ts` has `#4d6a7d`, `#dcd7c6`, `#0c3354`. |
| Dialogs and feedback | Native `confirm()` in six library views, `window.prompt()` twice in the campaign editor, no toast system, no shared modal, no `role="dialog"`, no focus trap. |
| Keyboard | Shortcuts exist only in the campaign editor (undo, redo, new block, duplicate, save). Effect at `CampaignEditor.tsx:676` has no dependency array so the listener re-attaches every render. Subject rows in both brief steps are `div onClick`, not focusable. |

One thing to settle before Phase 2: `DESIGN.md` in the repo prescribes a warm near-black dark mode, a gold
accent, and Cormorant Garamond display type. The brief for this redesign asks for cool neutral grays that sit
next to navy and forbids painting the chrome in brand colour. Those two documents disagree. I will propose
the resolution in Phase 2, not silently pick one.

## 2. Screen inventory

### Shell

- Sidebar: workspace switcher, search filter, Create button, 6 sections, 20 nav items (Video hidden by flag), theme toggle.
- Top bar: hamburger or collapse toggle, uppercase page title, avatar.
- Home: greeting, 4 stat tiles, 3 quick-start cards, recent scripts table, recent carousels table.
- Mobile: sidebar becomes a drawer behind a hamburger below 700 px.

### Carousel flow

| Screen or state | What is on it | Shot |
|---|---|---|
| Topic step | Mode toggle (Subject library, Custom topic, Try sample, Suggest topics), search box, category select, 369 subject rows rendered inline (page is 2,190 px tall), Add custom topic, Format (3), Hook tone (8 cards, one pre-marked TOP PICK), Style (3), Contrast (2), Hook image style (4), Content length (2), Caption SEO checkbox, Generate button. About 30 controls plus the list. | `*-20-carousel-topic-step` |
| Custom topic | Textarea replaces the list. | `*-21` |
| Generating | Serif card "Writing your carousel" with an 8-message timer. Copy took about 100 s; the timer reached "Almost there" at 35 s and sat there for 65 s. Then a second card "Rendering your slides" for the hook image with a fal.ai badge. | pane observations, `CarouselView.tsx:20-88` |
| Studio | Title, slide count, Save, Download all, collapsed Brief accordion, Fact check panel, View toggle (Editor, IG feed), vertical filmstrip of 5 thumbs, 4:5 canvas at about 660 px, per-slide toolbar, Instagram caption block with Copy, Start over. | `*-23` |
| Hook slide toolbar | PNG, Settings, Refine image, Overlays. | `*-25-*` |
| Content slide toolbar | PNG, Preview HD, Settings, Edit text, Graphic (menu: change type, edit data), Regen slide, AI background. | `*-24` |
| Settings panel | Right rail: logo size, arrow size, Lunia Life toggle, format 4:5 or 9:16, arrows, numbers, citations bar, slide background (dark, light, custom), hook weight (4). | `*-25-carousel-panel-settings` |
| IG feed view | Phone mock with fake likes and comments. | `*-26` |
| Brief expanded | Hook, tone, and prompt details. | `*-27` |
| After Save | Save becomes Update, Copy link appears, Fact check gains a Verify button. | pane observation |
| Library | Card grid with copy, delete (inline confirm), convert to campaign. | `*-22` |

Observed but not yet explained: reopening the saved carousel from the library shows Save, not Update. Worth checking in Phase 1 whether that creates a duplicate.

Also observed: the hook thumbnail in the filmstrip renders the headline as garbled glyphs at thumbnail scale (`*-23`, top-left thumb).

### Email flow

| Screen or state | What is on it | Shot |
|---|---|---|
| Brief step | Import from Klaviyo, mode toggle, search, 433 subject rows in a 300 px scroll box, custom textarea, occasion, offer, CTA URL, tone (4), layout shape button opening a gallery of 11 shapes, Generate campaign, Test (no AI). | `*-30`, `*-31` |
| Generating | Retro terminal card "LUNIA.EXE", fake five-step progress bar, elapsed counter. 87 s to editor. | `e02-loading-*` |
| Editor | Live preview (iframe, Desktop and Mobile toggle) on the left; right rail of collapsible sections: Header, Body, Images, Actions. Body has email theme (2), spacing (5), Shapes, Block, Snippets, Personalize, Brand facts menus, then one card per block. Each block card: save as snippet, copy, regenerate, delete, align (2), italic, weight (4), size (4), B I U AA, six colour words, clear, textarea. Actions: Save, undo, redo, Export HTML, Copy HTML, Improve with Claude, Push to Klaviyo. 105 buttons on screen for a 3-block email. Page is 3,490 px tall at 1440 and 5,731 px on mobile. | `e03-editor-ready-full`, `*-32`, `*-34`, `*-35` |
| Library | Card grid with hero image, duplicate, delete (native confirm). | `*-07` |

## 3. Baseline numbers

Measured on the happy path from Home with default options, in the dev build. Generation times are one
run each and will vary.

### Carousel: Home to a saved carousel with PNGs and a caption on the clipboard

| Measure | Value |
|---|---|
| Clicks | 6 (Builder, subject row, Generate, Save, Download all, Copy caption) |
| Scrolls | 1 long scroll of about 1,700 px to reach Generate; 1 more to reach the caption |
| Page loads | 1 (single page app), 0 further |
| Distinct screens | 4 (topic form, writing loader, rendering loader, studio) |
| Wait, copy generation | 100 s to first content |
| Wait, hook image | about 30 s |
| Wall clock, measured | 3 min 29 s (tab was backgrounded for part of it, which throttled the client) |
| Wall clock, estimated foreground | about 2 min 30 s |
| Edit one headline | 3 actions minimum: click thumb, click Edit text, edit in side panel. Not in place. |

### Email: Home to exported HTML

| Measure | Value |
|---|---|
| Clicks | 4 (Campaign builder, subject row, Generate campaign, Export HTML or Push to Klaviyo) |
| Page loads | 1, 0 further |
| Distinct screens | 3 (brief, loader, editor) |
| Wait, generation | 87 s |
| Save | automatic, 2.5 s debounce, status shown in the Actions section only |
| Controls on the editor | 105 buttons, 3 textareas, 0 inputs visible for a 3-block email |
| Editor page height | 3,490 px at 1440, 5,731 px at 390 |

### Context switches

- Carousel: subject list at top, seven option groups below the fold, then a loader that replaces the whole page, then the studio where the caption lives below the canvas and slide text lives in a side panel.
- Email: brief form, full-page loader, then a two-column editor where the thing you click in the preview and the thing you edit in the rail are 600 px apart.

## 4. Responsiveness

| Width | Carousel studio | Email editor |
|---|---|---|
| 1920 | Content column capped at about 1,160 px; large empty margins. Canvas is about 660 px wide on a 1920 screen. | Same cap. Preview is 600 px, rail about 280 px. |
| 1440 | Comfortable. | Comfortable. |
| 1280 | Still works; settings rail squeezes the canvas to about 560 px. | Rail becomes cramped. |
| 834 tablet | Single column. Filmstrip plus canvas fit; toolbar wraps. | Preview stacks above the rail; rail is very long. |
| 390 mobile | Filmstrip and canvas share the width; the canvas is about 160 px wide. Toolbar wraps to four rows. Usable to look at, not to edit. | 5,700 px of stacked controls. Not realistically usable to edit. |

Honest answer to the brief's question: the phone should get a review-and-approve view, not the full editor. Tablet can keep the editor if the rail collapses. This is a Phase 1 recommendation, listed here because the screenshots make it obvious.

## 5. Things noticed during recon that Phase 1 should pick up

- The two loaders have different personalities (editorial serif card versus green-on-black terminal). Neither reports real progress.
- Brand aqua is used as the selection tint on option cards in the topic step. Brand colour has leaked into the chrome.
- Sidebar auto-collapses in editors with only a small top-left glyph to bring it back.
- Slide text editing is panel-based, not on the canvas.
- Native `confirm` and `prompt` dialogs remain in the flows.
- Dev server logs show fetch cache failures for slide PNGs over 2 MB. Cosmetic in dev, worth a look for export speed.
- Only Chrome (headless Chromium) was used for these captures. Safari verification is deferred to the implementation slices where it matters.

## 6. What I did not do

- Did not run the Batch, Subjects, UGC, Business, or Script flows beyond a single screenshot each. They are supporting cast per the brief.
- Did not time image generation for the email (this run pulled hero and gallery images from the asset library, so no image model was called).
- Did not test the Klaviyo push, PDF guide, or share link end to end. They call external services and are out of the redesign's scope unless a UI change requires them.
