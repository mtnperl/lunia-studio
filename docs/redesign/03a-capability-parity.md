# Capability parity: today's editors vs the proposal

Source: an exhaustive read of both editors (242 carousel items, 229 email items, with file and line;
the raw list is in the session transcript and will be checked into `docs/redesign/inventory/` with
Phase 5). Every item below is either placed in the new editor, or flagged. Nothing is silently dropped.

Legend for the recommendation column: **Keep** unchanged. **Move** same control, new home. **Merge**
folded into another control with no loss. **Simplify** fewer steps for the same result. **Ask** I think
it should go or change, your call.

Live: `/proposal/carousel` and `/proposal/email` on the preview URL. Rail tabs are now Slide, Style,
Brief, Caption, Check (carousel) and Block, Email, Images, Brief (email). The primary button opens an
export menu.

## The three you caught

| You saw | Cause | Fixed |
|---|---|---|
| Could not copy the caption | Caption was buried in a collapsed panel under Brief | Own Caption tab with Copy, Rewrite, Add SEO line, character and word counts. Also in the Export menu and Cmd K. |
| Last slide was a different colour | My mock made the takeaway navy. In the Editorial preset today's takeaway is ivory (`TakeawaySlide.tsx:57-61`). | Takeaway is ivory. Dark only when Style, Slide background is set to Dark, same as today's "Slides bg" control. |
| Top banner and promo band missing | Not modelled | Email tab, Header panel: top banner with Suggest, show logo, promo band with Suggest and colour, exactly the fields and AI actions that exist today. |

---

## A. Carousel

### A1. Brief and generation

| Today | Proposal | Rec. |
|---|---|---|
| Subject library, search, 14 categories, used/unused counter, add custom topic, custom topic (500 chars) | New carousel sheet: search or type; full library with categories opens from Brief tab, Change subject | Keep |
| Try sample subject | Not shown | **Ask**: demo affordance, remove from the production editor, keep in the style guide. |
| Suggest topics (AI) | Brief tab, Suggest topics | Move |
| Format Standard / Engagement / Did you know, engagement sub-type Reveal / Diagnostic | Brief tab | Move |
| Hook tone (8) with recommender top pick and "also strong" chips | Brief tab select with top pick marked; sheet has the select | Simplify: recommender runs silently and marks the pick, no banner. |
| Style preset Default / Editorial / Free press | Style tab, Preset | Move |
| Contrast Standard / High (image generation only) | Hook slide, Image panel, next to the prompt it affects | Move |
| Hook image style (4) | Hook slide, Image panel, and Style tab | Move |
| Content length Standard / Concise | Brief tab | Move |
| Brand SEO line checkbox | Brief tab toggle, plus Caption tab Add SEO line | Keep |
| Generate button, generation loader, failed panel with Try again, image retry | Streaming generation in the rail, hooks first; errors as toasts with Retry on the affected slide only | Simplify |
| Regenerate 3 hooks, hook variants list, switch hook keeps image | Hook slide panel: Hook variants list with Regenerate hooks | Keep. Note: today the regenerate action is only reachable in the legacy HookStep; the proposal restores it. |
| Restored draft banner, Discard and start over, localStorage draft | Autosave to server with save state in the top bar; Discard in export menu with undo | Simplify. Draft recovery becomes reload the URL. |
| New (reset builder), Start over | Cmd N new document; Discard in export menu. Start over is gone because the brief stays editable. | Merge |
| Did you know preview step (variant select, font scale slider, reset, copy caption, download, link, save) | Not built in the prototype | Move: same rail with a Variant field and Text scale slider. Flagged for Phase 5 slice 3. |

### A2. Document actions

| Today | Proposal | Rec. |
|---|---|---|
| Save / Update, Saved flash | Top bar Save to library / Update, plus autosave state | Keep |
| Copy link (after save) | Top bar copy icon after save; export menu; Brief tab Document panel | Keep |
| Download all (N PNGs), iOS share sheet, border colour by verification status, Download blocked | Export menu, Download all; blocked state explained in the toast and on the Check tab | Keep |
| PDF guide (engagement) | Export menu, enabled in engagement format | Keep |
| fal.ai status badge, Generating visuals indicator | Save state and per-slide skeletons | Merge |
| Warning banner (style refs applied) | Toast | Merge |
| Turn into campaign (from library card) | Export menu, Turn into an email; Brief tab | Move |

### A3. Views and canvas

| Today | Proposal | Rec. |
|---|---|---|
| Editor / IG feed (TikTok in reels), prev and next, slide counter | Top bar tabs Editor / Instagram preview; true-size render, arrows | Keep |
| Filmstrip, click to focus, active ring | Filmstrip with numbers, drag reorder, multi-select, context menu, add slide | Keep and extend |
| Canvas auto-scale | Fit plus zoom slider, true dimensions readout | Keep and extend |
| Click element to inspect, double-click to edit on canvas, Enter commits, Shift Enter newline, Escape cancels | Single click edits in place; same keys | Simplify |
| Busy overlays (graphic, image) | Skeleton on the slide and in the filmstrip | Keep |

### A4. Per-slide toolbar and panels

| Today | Proposal | Rec. |
|---|---|---|
| PNG (this slide), Preview HD, HD modal with download | Slide tab, Export this slide; export menu | Move |
| Settings panel (branding and format, decoration, text and content) | Style tab | Move |
| Refine image: style chips, full prompt accordion with override and reset, prompt, guidelines, suggested concepts, model Auto / GPT Image 2, direction, subject, paper tone, contrast, image history (8), 3 directions, New image, Generate other weights, more directions | Hook slide, Image panel: every one of these, same order | Keep |
| Overlays: reset, editorial frame (colour, opacity), vignette, colour grade, film grain, wash mode, colour, opacity, style | Hook slide, Overlays panel, collapsed by default | Keep |
| Edit text (content): headline, body | Slide tab, Copy panel, plus on canvas | Keep |
| Element inspector: headline size (4), body size (6), citation text, size (4), citation visibility | Copy panel: size segments under each field | Keep |
| Takeaway panel: headline, points (max 3, move, remove, add), interaction type and label, follow line | Takeaway panel, identical | Keep |
| Graphic menu: Icons, Type, Data, Regenerate | Graphic panel: Type select, Change type, Edit data, Icons, Regenerate with comment and session counter | Keep |
| Icons panel: Suggest 3, auto-suggest, chips, use these, labels, position, clear, layout, categories, 4 max | Graphic panel, Icons drawer, all present | Keep |
| Graphic type picker (32 thumbnails, tiers, Current badge, limit) | Change type opens the picker as a dialog | Keep |
| Graphic data editor (schema form, arrays, validation, revert) | Edit data opens it as a dialog | Keep |
| Regen slide, session cap 5, avoid list | Copy panel Regen slide, counter shown | Keep |
| AI background, Regen background, Clear, dim slider | Background panel | Keep |
| Icons button on CTA slide (Editorial) | Takeaway panel gains Icons when preset is Editorial | Keep |
| Toolbar badge dot (hook weight drifted) | Hook weight note in the panel, badge on the Image panel | Keep |

### A5. Settings panel controls

| Today | Proposal | Rec. |
|---|---|---|
| Logo size S/M/L/XL, arrows size, watermark on/off | Style tab, Branding | Keep |
| Format 4:5 / 9:16 | Style tab, Format | Keep |
| Arrows, numbers, citations bar show/hide | Style tab, Decoration | Keep |
| Slides bg Dark / Light / custom picker / clear, bg dim | Style tab, Slide background and Text and content, as today | Keep |
| Hook weight Default / Medium / Bold / Black with instant swap and regenerate warning | Style tab, Text and content, as today | Keep |

### A6. Fact check

| Today | Proposal | Rec. |
|---|---|---|
| Pre-save placeholder, Verify, Re-check, live run rows and timer, status header, notices, groups (needs a decision, not checked, clean), per-claim verdict and source, I verified this, Mark wrong, Undo override, Look this up, auto-draft fixes, Apply fix with diff, Discard drafts, show other claims, gating statement | Check tab with the same states and actions | Keep. Prototype shows one contradiction; production reuses `VerificationPanel` as is. |

### A7. Caption

| Today | Proposal | Rec. |
|---|---|---|
| Caption block, Copy, read-only text | Caption tab: editable, Copy, Rewrite, Add SEO line, counts; Copy also in export menu and Cmd K | Keep and extend |

---

## B. Email

### B1. Brief and generation

| Today | Proposal | Rec. |
|---|---|---|
| Subject library / custom, search, occasion, offer, CTA link, tone (4), layout shape picker with saved shapes, Generate, Test (no AI) | New email sheet with all fields; Test (no AI) in the footer; Brief tab keeps them editable | Keep |
| Import from Klaviyo, flow picker, FlowDeck (shape for the flow, Make it all visual, Stop, progress rows, retry, Save all, email switcher with markers, banners) | Entry in the empty state, sheet and Brief tab. Deck itself is not prototyped. | Keep. Deck becomes the same shell with an email switcher in the left rail. Flagged for slice 4. |
| Seed from a carousel | Carousel export menu, Turn into an email | Keep |
| Shape second pass, restructure error, dropped-blocks note | Streaming steps show Laying out the offer | Keep |

### B2. Header

| Today | Proposal | Rec. |
|---|---|---|
| Top banner input, bold pill, Suggest, error line | Email tab, Header: input with Suggest | Keep |
| Show logo | Email tab | Keep |
| Three subject lines, select, Copy each, Regenerate subjects, hint chips | Email tab: radios with length and hint, copy per line, Regenerate | Keep |
| Preview text, Copy | Email tab | Keep |
| Promo band input, Suggest, error line, colour Theme plus role swatches | Email tab | Keep |
| Section auto-collapse rule | Not needed; tabs replace collapse | Merge |

### B3. Body, document level

| Today | Proposal | Rec. |
|---|---|---|
| Theme Navy / Cream with note | Email tab | Keep |
| Spacing None / Tight / Default / Roomy / Loose | Email tab | Keep |
| Shapes gallery (thumbnails, pick, restructure, before and after diff, per-block include, Replace body / Add blocks, Save this layout, Remove saved) | Email tab Shapes button opens the gallery dialog; review stays a dialog with the diff | Keep |
| Pending suggestion review | Same dialog | Keep |
| Add block menu (15 kinds), Snippets, Personalize, Brand facts | Left rail Add menu lists all 15 plus the three inserters; also Cmd K | Keep |
| New blocks pre-filled as Sample with Keep / Clear | Sample badge in list and Block tab with Keep / Clear | Keep |

### B4. Per-block controls

| Today | Proposal | Rec. |
|---|---|---|
| Drag reorder (rail and inside the preview with autoscroll) | Drag in the left rail; in the preview in production | Keep |
| Save as snippet, Copy text, Regenerate (3 alternates, pick a version, cancel), Delete | Block tab header icons; alternates list inline | Keep |
| Header size S/M/L/XL and align L/C/R | Block tab | Keep |
| Text: align, italic, weight 100 to 400, body with bold, links, merge tags | Block tab | Keep |
| Inline style toolbar: XS/S/L/XL, B, I, U, AA, colours, Clear, selection-driven | Block tab, under the text field | Keep. **Ask**: today it is a floating toolbar over the textarea; the proposal pins it in the rail. |
| Kind-specific fields for stat, discount, imagetext, imagebullets, grid, headerimage, table, checklist, testimonial, timeline, trustgrid, comparison, image, ingredients | Block tab. Text, stat, checklist, promo, cta, hero, testimonial are built; the other kinds show their field list and get built in slice 4 | Keep |
| BlockImageControl: URL, prompt, prompt model Fast / Craft / Best, image model GPT / FLUX / Seedream, standing instructions, Library, Upload, Rewrite prompt, Choose from library, Generate, Edit crop, Clear, auto centre-crop | Block tab, Block image drawer, all present | Keep |
| Image cropper: drag, zoom, slider, readout, reset, 3 by 3 focal grid, apply, cancel | Dialog from Edit crop | Keep |
| Asset picker: folders, back, search, grid, states | Dialog from Library and Choose asset | Keep |

### B5. Images section

| Today | Proposal | Rec. |
|---|---|---|
| Slots, hero plus up to 5 secondary, Add image, Remove, selection ring from preview click | Images tab; preview click jumps there | Keep |
| Source Generated / Asset / Upload, prompt, Regenerate prompt, mood chips, Generate, Choose file, Generate new, Choose asset | Images tab per slot | Keep |
| Generated URL lock | Internal, unchanged | Keep |
| CTA label, link, button colour, hero overlay colour, bottom button Cream / Navy, hero overlay Cream / Navy, Show CTA on hero, nudge pad with Shift, reset, lock, readout | Email tab, Call to action, plus drag the CTA directly on the hero | Keep and extend. **Ask**: with direct drag on the hero, the nudge pad can go. |

### B6. Actions

| Today | Proposal | Rec. |
|---|---|---|
| Save / Saved, autosave pill, checkmark pulse | Top bar save state and Save / Update | Keep |
| Undo, Redo, coalescing | Top bar, shortcuts | Keep |
| Export HTML, Copy HTML | Export menu | Keep |
| Improve with Claude, Revert | Export menu and Brief tab | Keep |
| Push to Klaviyo, Open in Klaviyo | Primary button and export menu | Keep |
| Shortcuts: Cmd Z, Cmd Shift Z, Cmd Shift N, Cmd D, Cmd S, Shift nudge | Same, plus Cmd K, Cmd E, Backspace, arrows | Keep and extend |

---

## Suggested removals and edits, for your call

1. **Try sample subject.** A demo affordance. Remove from the editor.
2. **Hook tone recommendation banner.** Keep the recommender, drop the banner: mark the top pick in the select and pre-select it. **Approved 2026-09-02.**
3. **Start over.** Gone. The brief is always editable and Discard lives in the export menu with undo.
4. **Restored draft banner.** Gone. Autosave to the server and URLs make it unnecessary.
5. **Separate Edit text panel and element inspector.** Merged into one Copy panel with sizes under each field. Same fields, one place.
6. Hook weight and bg dim: proposed a move, **rejected 2026-09-02**, they stay in the Style tab.
8. **Section auto-collapse rules in the email editor.** Replaced by tabs.
9. **Inline style toolbar as a floating bar.** Pinned under the text field instead. **Approved 2026-09-02.**
10. **CTA nudge pad.** Keep for keyboard users, but dragging the CTA on the hero is the primary way. **Approved 2026-09-02.**
11. **Legacy HookStep and ContentStep.** Already unreachable. Delete the files in slice 3. **Approved 2026-09-02.**
12. **Off-palette colours in slide renderers.** `#EFEFF4`, `#1E6B8C`, `#9ab0b8` and others become the closed palette during slice 3. Under discussion: a palette aligner (snap to nearest palette colour, with a lint) rather than hand edits.

Nothing else is proposed for removal.
