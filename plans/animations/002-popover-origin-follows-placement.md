# 002 Popovers and menus scale from their trigger

Commit: 3af6941. Severity: HIGH. Category: physicality and origin.

## Finding

Every popover and menu plays `ui-pop-in` (scale 0.98 to 1) with a fixed `transform-origin: top left`. Menus anchored to the right edge, for example the Export menu in both editors (`placement="bottom-end"`) and the card menu in the carousel library, therefore grow from the corner farthest from the button. The motion says "this came from the left" when the trigger is on the right.

Evidence:
- `src/app/ui.css:195-199` `.ui-popover { … animation: ui-pop-in var(--ui-dur-3) var(--ui-ease-out); transform-origin: top left; }`
- `src/components/ui/usePosition.ts:15-45` computes `side` and `align` from the placement and writes `top` and `left` with `setProperty`, but never records the placement on the element.
- `src/components/shell/EditorShell.tsx:75` `<Menu … placement="bottom-end" …>`

## Change

1. In `src/components/ui/usePosition.ts`, where `top` and `left` are written (around line 43), also write the resolved placement as a data attribute so CSS can read it:

```ts
el.setAttribute("data-side", side);
el.setAttribute("data-align", align ?? "start");
```

Use the `side` variable after any flip logic has run, so a menu that flipped to open upward reports `top`.

2. In `src/app/ui.css`, replace the single `transform-origin: top left;` line inside `.ui-popover` with these rules placed directly after the `.ui-popover { … }` block:

```css
/* Grow from the trigger, whichever edge the popover hangs from. */
.ui-popover[data-side="bottom"][data-align="start"] { transform-origin: top left; }
.ui-popover[data-side="bottom"][data-align="end"]   { transform-origin: top right; }
.ui-popover[data-side="top"][data-align="start"]    { transform-origin: bottom left; }
.ui-popover[data-side="top"][data-align="end"]      { transform-origin: bottom right; }
.ui-popover[data-side="right"]                      { transform-origin: left center; }
.ui-popover[data-side="left"]                       { transform-origin: right center; }
.ui-popover:not([data-side])                        { transform-origin: top left; }
```

Keep the keyframe as it is (`ui-pop-in` at `src/app/ui.css:371`): scale 0.98 with a 2 px lift is the right size for a 220 ms menu.

## Verify

1. Open a carousel, click Export (top right). Slow the animation with DevTools Animations panel at 10 percent. The menu must grow out of its top-right corner toward the bottom-left.
2. Open the add-block menu in the email editor's left rail head (`placement="bottom-end"`) and the block list card menu in the carousel library: same check.
3. Open a tooltip and the Style tab popovers: left-anchored ones still grow from top-left.

## Scope

Two files. Do not change durations, easings or the keyframe.
