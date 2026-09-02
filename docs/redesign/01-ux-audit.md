# Phase 1 UX Audit: Lunia Studio

Scope: the carousel flow and the email flow, audited against Nielsen's ten heuristics and the reference bar
in the brief (Figma, Canva, Linear, Notion). Evidence is a file and line, or a screenshot in
`docs/redesign/recon/shots/`. Severity scale: blocker, major, minor, polish.

Decision already made: chrome palette follows the brief (cool neutral, no brand colour in the chrome).
DESIGN.md is superseded for this work and will be rewritten in Phase 2.

Summary of severities: 4 blockers, 17 major, 14 minor, 8 polish. Grouped into nine themes below.

---

## Theme A. Information architecture and mental model

The app is organised by product line and by pipeline step, not by the document the user is making. A
creator thinks "my GABA carousel", the app thinks "tab: carousel-v2, step: 4".

| # | Issue | Where | Why it hurts | Severity |
|---|---|---|---|---|
| A1 | Documents have no address. Navigation is a 23-value `useState`; the URL never changes. Refresh, back button, and a second tab all lose the document. | `src/app/page.tsx:34,165,252` | Breaks the most basic recovery path (reload) and makes links, bookmarks, and "open in new tab" impossible. Heuristic: user control and freedom. | Blocker |
| A2 | The builder is a two-page wizard: a long brief form, then a studio. The brief cannot be revisited without "Start over", which discards the document. | `CarouselView.tsx:16-18`, `PreviewStep.tsx` bottom "Start over", shot `d1440-23` | Every parameter chosen at the start is frozen. Changing tone or style means regenerating from nothing. | Major |
| A3 | Twenty nav items across six sections sit beside the editor. Script, Batch, Subjects, UGC, Business and Assets compete with the two flows that matter. | `page.tsx:107-161`, shot `d1440-00-home` | Dilutes the two primary jobs. The brief calls everything else supporting cast. | Major |
| A4 | Carousel and email are separate silos with a hidden bridge ("convert to campaign" on a library card). | `CarouselLibraryView.tsx:313` | The real workflow (a proven concept becomes a carousel and an email) has no first-class path. | Major |
| A5 | Editor tabs auto-collapse the sidebar to zero width; the only way back is a small unlabeled glyph top-left. | `page.tsx:163-196`, shot `d1440-23` top-left | Users lose the map of the app while inside the editor. Heuristic: recognition over recall. | Minor |
| A6 | "Library" appears three times in the nav with the same label and icon (Script, Carousel, Assets). | `page.tsx:107-161` | Ambiguous targets; a search filter is needed to tell them apart. | Minor |
| A7 | Two library screens use different card designs, different delete confirmations (inline vs native), and different open affordances. | `CarouselLibraryView.tsx:136-370` vs `CampaignLibraryView.tsx:85-120`, shots `*-22`, `*-07` | Inconsistency. Heuristic: consistency and standards. | Minor |

**Recommended IA.** One document model with two types (Carousel, Email). A home that is a library of
documents, not a stats dashboard. Each document at `/c/:id` or `/e/:id`. Inside a document: canvas
centre, filmstrip or block list on the left, properties on the right, brief and generation settings in a
collapsible drawer that stays editable. Supporting cast (Subjects, Assets, Batch, UGC, Business) moves
under a single "More" area and into the command palette. The script flow stays as is.

---

## Theme B. Canvas and direct manipulation

| # | Issue | Where | Why it hurts | Severity |
|---|---|---|---|---|
| B1 | The carousel canvas is about 660 px wide on a 1920 screen because the content column is capped at about 1,160 px. The artwork is neither the largest nor the most central object. | `PreviewStep.tsx` layout, shot `d1920-23` | Violates the brief's first principle. The tool chrome (title, brief, fact check) takes the top 470 px before the slide appears. | Blocker |
| B2 | Slide text is edited in a side panel reached through a thumbnail click and an "Edit text" button. Nothing on the slide is clickable. | `PreviewStep.tsx:1962-2000`, shot `d1440-24` | Every edit is an act of translation between the panel and the artwork. Three actions before typing. | Blocker |
| B3 | No drag to reorder slides, no duplicate slide, no delete slide, no multi-select. Slide count is fixed by the generator. | `PreviewStep.tsx` filmstrip (buttons only), shot `d1440-23` | The filmstrip is a selector, not an editor. | Major |
| B4 | Email blocks reorder via handle in the rail, not in the preview. Clicking a block in the preview only focuses its rail card 600 px away. | `CampaignEditor.tsx:680` (selectable iframe), shot `d1440-33` | The live preview looks editable and is not. | Major |
| B5 | The hook headline has no on-canvas handle either; it is edited through "Refine image" and "Overlays" panels. | `PreviewStep.tsx` hook toolbar, shot `d1440-25-carousel-panel-overlays` | Same translation cost for the most important slide. | Major |
| B6 | Per-slide toolbar sits under the canvas and changes shape by slide type (4 buttons on the hook, 7 on content slides, wrapping to two rows). | shot `d1440-24` vs `d1440-23` | Buttons move under the cursor as you switch slides. | Minor |
| B7 | The "IG feed" preview is a decorative phone mock with fake likes and comments rather than a true 1080 by 1350 render at Instagram scale. | `PreviewStep.tsx` IG feed view, shot `d1440-26` | Simulates the wrong thing. A true-size, true-crop preview is what a creator checks. | Minor |
| B8 | Hook thumbnail renders the headline as garbled glyphs at thumbnail scale. | shot `d1440-23`, top thumb | Looks broken in the first thing the user sees after generation. | Minor |

---

## Theme C. Feedback, latency and the generation moment

| # | Issue | Where | Why it hurts | Severity |
|---|---|---|---|---|
| C1 | Generation replaces the whole page with a loader for 100 to 210 seconds. Nothing arrives until everything arrives. | `api/carousel-v2/generate/route.ts` (JSON), `CarouselView.tsx:43-88`, `CampaignView.tsx:99-135` | The longest wait in the product is a blank wall. No hooks to read while slides are written, no slide 1 while slide 5 is written. | Blocker |
| C2 | The carousel loader is a timer, not progress. It reached "Almost there" at 35 s and stayed for 65 s. | `CarouselView.tsx:20-29` (8 messages at 4.2 s) | Fake progress that stalls reads as a hang. Heuristic: visibility of system status. | Major |
| C3 | Loaders are throttled in a background tab because they are `setInterval` driven, so the elapsed counter froze at 0:08 while 170 s passed. | pane observation, `campaign/Loaders.tsx:25` | The user switches tabs during a two-minute wait and comes back to a lie. | Minor |
| C4 | Two flows, two loader personalities: serif "Writing your carousel" versus a green-on-black "LUNIA.EXE" terminal with a fake five-step bar. | `CarouselView.tsx:43`, `campaign/Loaders.tsx:59`, shots `e02-loading-1` | The product does not feel like one product. The terminal pastiche is the opposite of quiet chrome. | Major |
| C5 | Save state is invisible in the carousel until you press Save; in the email it is a small "Saved" label inside the Actions section at the bottom of a 3,490 px rail. | `PreviewStep.tsx:2791`, `CampaignEditor.tsx:3118-3146` | The user cannot tell whether work is safe. | Major |
| C6 | Image loading has no skeletons. Sixteen `<img>` elements in the studio render blank until loaded; the hook image is a 5 MB PNG. | `PreviewStep.tsx` (16 `<img>`, no `onLoad`), dev log "items over 2MB can not be cached" | Layout pops and blank canvases during the most visual moment. | Minor |
| C7 | No toast system. Success feedback is a button label swap ("Copy HTML" to "Copied") that reverts after 2 s; errors are inline text under the button that raised them. | `CampaignEditor.tsx:1411`, `PreviewStep.tsx:2958` | Feedback is easy to miss and inconsistent. | Minor |
| C8 | Per-element regeneration exists but the busy state is a spinner on the button only; the element being replaced does not change. | `PreviewStep.tsx:1318-1440`, `CampaignEditor.tsx:2185` | The user does not know what will change. | Polish |

---

## Theme D. Error recovery and reversibility

| # | Issue | Where | Why it hurts | Severity |
|---|---|---|---|---|
| D1 | No undo or redo in the carousel editor. Every settings change, text edit, and regeneration is final. | `CarouselView.tsx`, `PreviewStep.tsx` (only a hook-image ring buffer at `:512`) | Confidence to experiment is what separates a creator tool from a data-entry tool. | Blocker |
| D2 | Carousel drafts live in `localStorage` only; the server copy is manual. A cleared cache or a second device loses the draft. | `CarouselView.tsx:155-224` | Silent data loss path. | Major |
| D3 | Likely duplicate on save: `savedId` is seeded once at `PreviewStep` mount from `initialSavedId`. When a saved carousel is opened from the library while a draft is already mounted, the button shows "Save" not "Update", which creates a second library entry. Observed in recon (shot `d1440-23` shows "Save" for a saved carousel). | `PreviewStep.tsx:337`, `CarouselView.tsx:601`, `:112-124` | Library fills with duplicates; the user cannot tell which is current. Needs a repro before fixing, but the mechanism is visible in code. | Major |
| D4 | Native `confirm()` for delete in six views; `window.prompt()` for naming snippets and shapes. | `CampaignLibraryView.tsx:29`, `EmailFlowsLibrary.tsx:40`, `CampaignEditor.tsx:536,1185` and others | Unstyled browser dialogs, no undo alternative, blocks the thread. | Major |
| D5 | "Start over" and "New" discard the document with no confirmation and no way back. | `PreviewStep.tsx` bottom link, header "New" | One misclick loses two minutes of generation and any edits. | Major |
| D6 | No `beforeunload` guard for dirty carousel or campaign state (only UGC has one). | `UGCCampaignView.tsx:52` is the only instance | Closing the tab mid-edit loses unsaved work silently. | Minor |
| D7 | Generation errors are a red sentence and a "try again" link; the brief inputs are gone by then because the form unmounted. | `CarouselView.tsx:539-549` | The user retypes a custom topic after a network error. | Minor |
| D8 | No version history or named checkpoints. Regenerating a slide overwrites the previous copy. | `TODOS.md` P3 item | A good earlier version cannot be recovered. | Minor |

---

## Theme E. Density, typography and spacing

| # | Issue | Where | Why it hurts | Severity |
|---|---|---|---|---|
| E1 | No type scale. In the two editors alone: 167 uses of 11 px, 145 of 12 px, 82 of 10 px, 21 of 9 px, and 47 dynamic sizes, all as inline literals. | grep of `fontSize:` in `carousel/`, `campaign/`, `CarouselView.tsx` | Nothing lines up, and 9 to 10 px labels are below the readable floor on a 1x display. | Major |
| E2 | No spacing scale. Padding and gaps are ad hoc numbers in 3,535 inline style objects. | `src/components` grep | Rhythm drifts from screen to screen; this is what reads as "unfinished". | Major |
| E3 | Uppercase, letter-spaced labels are used for section headers, field labels, button labels, and badges alike (SETTINGS, EDIT TEXT, HOOK, SLIDE 2, BRANDING AND FORMAT). | shot `d1440-25-carousel-panel-settings` | Everything shouts at the same volume; hierarchy collapses. | Major |
| E4 | The email block card exposes 30 controls per block (weight 100 to 400, XS to XL, B I U AA, six colour words) as tiny segmented pills. 105 buttons on screen for three blocks. | `CampaignEditor.tsx:2182-2262`, shot `e03-editor-ready-full` | A properties panel should show the properties of the selection, not every property of every block at once. | Major |
| E5 | Page header (serif "Carousel builder" plus subtitle plus document title plus slide count) consumes 220 px before any content. | shot `d1440-23` | Chrome outranks canvas. | Minor |
| E6 | Content column is capped at about 1,160 px; at 1920 the editor floats in the left two thirds with a large empty right margin. | shot `d1920-23` | Wasted space exactly where a wider canvas and rails would go. | Minor |
| E7 | Colour words as swatches ("Ivory", "Aqua", "Yellow", "Navy", "Slate", "Muted") instead of swatches. | `CampaignEditor.tsx` block toolbar, shot `e03` | Recall instead of recognition. | Polish |
| E8 | Serif display type (Cormorant) for page titles, Inter for UI, Fira Code for numbers: three families in the chrome. | `layout.tsx:22`, `globals.css` | Adds visual noise to a tool that should be recessive. Resolved by the palette decision: the chrome goes neutral and single-family. | Polish |

---

## Theme F. Colour and contrast (WCAG 2.1 AA)

Computed from the tokens in `globals.css`.

| Token pair | Light | Dark | AA (4.5:1 body, 3:1 large) |
|---|---|---|---|
| text on bg | 16.8 | 16.0 | pass |
| muted on bg | 5.07 | 4.13 | light pass, dark fail |
| muted on surface | 4.66 | 3.85 | light pass, dark fail |
| subtle on bg | 2.87 | 2.09 | fail both |
| subtle on surface | 2.64 | 1.94 | fail both |
| border on bg | 1.51 | 1.32 | below the 3:1 non-text floor |

| # | Issue | Where | Severity |
|---|---|---|---|
| F1 | `--subtle` fails AA everywhere it carries text (category tags on subject rows, thumbnail labels, timestamps). Dark `--muted` also fails. | `globals.css:81-140`, shot `d1440-20` right column | Major |
| F2 | Borders at 1.5:1 make card and input edges invisible to low-vision users and on cheap displays. | `globals.css` | Minor |
| F3 | Brand aqua is used as the selected-card tint in the topic step; brand navy is the library card placeholder. Brand colour has leaked into chrome. | `TopicStep.tsx` selected card style, `CampaignLibraryView.tsx:98`, shot `d1440-20` | Minor (but a direct violation of the brief) |
| F4 | Slide components hardcode off-palette colours (`#1E6B8C`, `#9ab0b8`, `#6b7280`, `#EFEFF4`, `#1a2535`) and the email theme has `#4d6a7d`, `#dcd7c6`, `#0c3354`. | `src/components/carousel/slides/*`, `src/lib/campaign-theme.ts` | Major (output palette is supposed to be closed) |
| F5 | Green check marks in the email editor status row use a colour not in either palette. | `CampaignEditor.tsx` status row, shot `e03` | Polish |

---

## Theme G. Keyboard, focus and accessibility

| # | Issue | Where | Severity |
|---|---|---|---|
| G1 | Subject rows in both brief steps are `div onClick`. Not focusable, not announced, no Enter handling. The primary input of both flows is mouse-only. | `campaign/BriefStep.tsx:133-135`, `TopicStep.tsx` list | Blocker |
| G2 | Keyboard shortcuts exist only in the email editor (five). None in the carousel. No cheat sheet. | `CampaignEditor.tsx:656-676` | Major |
| G3 | The shortcut effect has no dependency array, so the listener is removed and re-added on every render. | `CampaignEditor.tsx:676` | Minor (correctness risk, not UX) |
| G4 | Focus rings exist only on `.btn`, `.ui-btn`, `.ui-icon-btn`. Inputs set `outline: none` and rely on a border colour change. Segmented buttons, cards, thumbnails, and the filmstrip have no visible focus state. | `globals.css:171,199,228,241-246` | Major |
| G5 | No `prefers-reduced-motion` handling anywhere. | `globals.css` grep | Minor |
| G6 | ARIA coverage: 18 `aria-label`, 6 `aria-pressed`, 3 `aria-live`, 9 `role=` across all components. No `role="dialog"`, no `aria-modal`, no focus trap, no `aria-selected` on the filmstrip, no `tablist` on view toggles. | `src/components` grep | Major |
| G7 | Icon-only buttons rely on `title` (hover only) rather than `aria-label`. | `ui/IconButton.tsx` | Minor |
| G8 | Custom select (category filter) is a native `<select>` styled inline; fine for a11y, but inconsistent with every other control. | `TopicStep.tsx` | Polish |

---

## Theme H. Every state designed

| State | Carousel | Email | Severity |
|---|---|---|---|
| Empty (new document) | A 2,190 px form with 369 rows. No "start from a template" or "paste a topic" moment. Time to first draft is one scroll, three clicks and two minutes. | A 1,700 px form. Same. | Major |
| Loading (library, subjects) | "Loading subjects…" text, no skeleton. | Same. | Minor |
| Generating | Timer loader, whole page replaced. | Terminal loader, whole page replaced. | Blocker (see C1) |
| Error | Red sentence plus underlined "try again". Inputs lost. | Same pattern. | Minor |
| Saved | Button label swap. | "Saved" label at the bottom of the rail. | Major (see C5) |
| Offline | Nothing. `SessionGuard` redirects on 401 only. | Nothing. | Minor |
| Conflict (two tabs) | Last write wins; `localStorage` draft overwrites. | Autosave last write wins. | Polish |
| Destructive confirm | Inline confirm on library cards; nothing on Start over. | Native `confirm()`. | Major (see D4, D5) |

---

## Theme I. Mobile and tablet

| Width | Observation | Shot |
|---|---|---|
| 834 (tablet) | Both editors become single column. The carousel filmstrip plus a 600 px canvas fit; the toolbar wraps. The email rail stacks under the preview and becomes a 4,000 px scroll. | `tablet-23`, `tablet-32` |
| 390 (phone) | Carousel canvas is about 160 px wide beside the filmstrip; toolbar wraps to four rows. Email editor is 5,731 px of stacked controls. | `mobile-23`, `mobile-32` |

**Recommendation.** The phone gets a review-and-approve view: read the slides at full width, swipe
through them, read the caption, approve, comment, or request a regeneration, and download. No property
editing on the phone. Tablet keeps the full editor with the properties rail as a bottom sheet. This is
cheaper than making 105 controls work at 390 px and matches how a creator actually uses a phone (checking
work, not making it). If you want editing on the phone anyway, say so and it becomes a Phase 5 slice.

---

## Blocker list, in the order they should fall

1. C1 Generation is a blank wall. Streaming or progressive reveal.
2. B1 and B2 Canvas is small and not editable in place.
3. D1 No undo in the carousel.
4. A1 Documents have no URL.
5. G1 Primary input is mouse-only.

All five are addressed by the editor shell and document model proposed in Phase 3, which is why the
shell comes before either editor in the implementation order.

## What this audit did not cover

Script, Batch, Subjects, UGC, Business, and Assets views (supporting cast). Safari specifics. Screen
reader testing with VoiceOver, which is deferred to the Phase 5 polish slice where the fixes land.
