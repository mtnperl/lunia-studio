# Phase 3 proposal: the new editor

Live at `/proposal` on the `redesign/phase-2-design-system` branch. Clickable prototypes on mocked
data, built from the Phase 2 tokens and primitives. Nothing calls the backend; generation, regenerate
and export are simulated with realistic timing.

Routes: `/proposal` (index and rationale), `/proposal/carousel`, `/proposal/carousel?state=empty`,
`/proposal/email`, `/proposal/email?state=empty`, `/proposal/review` (phone).

## The shell

One shell for both editors: `src/components/proposal/Shell.tsx`, styles in `src/app/shell.css`.

| Region | Owns | Why it is there |
|---|---|---|
| Top bar (48 px) | Back, document type, editable title, save state, view tabs, undo and redo, Cmd K, one primary export | Identity, safety and exit in one line. Views sit in the middle because they change what the canvas shows, not what the document is. |
| Left rail (232 px) | The document as a list: filmstrip or block list. Reorder by drag, select, multi-select, context menu, add. Generation progress. | Structure is what you scan and reorder. New slides appear here, so progress belongs here. |
| Canvas | The artwork at true size on a sunken ground, fit to the space. Every text run is editable in place. Bulk bar and floating toolbar are the only chrome allowed on top. | The brief's first principle. |
| Right rail (300 px) | Three tabs: the selection, the whole document's style, the brief. | What is selected and what can be done to it. The brief stays editable after generation. |
| Zoom bar | Fit, zoom slider, true dimensions and position | Confirms the canvas is the real thing. |

Responsive: below 1100 px the rails narrow; below 900 px (tablet portrait) the left rail hides and the
right rail becomes a bottom sheet; below 700 px the phone gets `/proposal/review` instead.

## Carousel editor

- Filmstrip with true-scale thumbnails, numbers, drag to reorder, shift and cmd click to multi-select,
  right click for duplicate, regenerate copy, regenerate graphic, delete.
- Bulk bar under the canvas when more than one slide is selected: regenerate, duplicate, delete.
- Canvas at 1080 by 1350 fit to view. Click any text to edit it there. Selection outline is the only
  chrome colour on the artwork. Zoom slider and Fit.
- Right rail: Slide tab (eyebrow, headline with character count, body, citation, graphic type, hook
  image with prompt, per-slide regenerate, shorten, punch up, check claims), Style tab (aspect, preset,
  logo size, arrows, numbers, citation bars, the closed palette), Brief tab (topic, tone, length,
  regenerate from brief, caption).
- Instagram preview: true 1080 by 1350 render in a feed frame with the real caption.
- Keyboard: arrows move, Cmd D duplicates, Backspace deletes with undo toast, Cmd A selects all,
  Cmd Z and Cmd Shift Z, Cmd K, Cmd E exports, ? opens the palette.

## Email editor

- Block list with drag to reorder, add menu (text, stat, list, promo, hero, button), right click.
- Canvas is the email at 600 px or 375 px. In production this is the exported HTML in an iframe with
  block ids, which already exists; the prototype draws the blocks in React so they can be edited in
  place.
- Right rail: Block tab (heading, text with word count, items, align, size, shorten, check claims,
  personalise, rewrite this block), Email tab (three subject lines as radios with lengths, preheader,
  theme, spacing), Brief tab.
- Primary action is Push to Klaviyo; Copy HTML, Export HTML and Send a test live in the palette.

## The generation moment

**Before.** A sheet, not a page: topic (search or type), tone, style, length. Every other option moved
to the Style tab where its effect is visible.

**During.** The document exists from the first second with its title and a progress list of real
steps in the left rail. Hooks arrive after about three seconds as three real slides to pick from; the
body slides keep writing while you choose and land one at a time in the filmstrip with a skeleton for
the one in progress. The hook image renders last; the slide is editable while it does.

**After.** A toast says what arrived. Nothing is in the library until you keep it. Every slide, graphic,
image, block and subject line has its own regenerate, with undo.

## Onboarding and empty states

Empty document: one sentence, a primary New action, Open a recent one, and three starts (template,
duplicate a winner, paste a study link). Time to a first draft from an empty editor in the prototype is
one click, one pick, one Generate, about 12 seconds simulated. In production the copy takes about 100
seconds, but the first hook appears in a few seconds and the user is editing while the rest arrives.

## Two open decisions

Switchable live from the top bar, Directions.

1. **Where slide text is edited.** A: rail plus on canvas. B: floating toolbar on the canvas only.
   **Recommend A.** The rail keeps every field of a slide scannable for a consistency pass and hosts
   the character count and claim check. Both keep on-canvas editing.
2. **Where the brief lives after generation.** A: Brief tab in the rail, always editable. B: a sheet
   that is gone once generated. **Recommend A.** Removes Start over entirely.

## Settled

Canvas centre with rails; neutral chrome; documents with URLs; streaming generation with per-element
regenerate; undo, autosave and shortcuts in both editors; phone review view; the email canvas is the
exported HTML.

## Prototype limits

Slides use a simplified renderer, not the production slide components. One placeholder image. Native
HTML drag (production uses pointer events for touch). Nothing persists across reload.
