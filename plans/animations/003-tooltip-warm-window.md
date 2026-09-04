# 003 Tooltips are instant while the pointer is moving between toolbar buttons

Commit: 3af6941. Severity: MEDIUM. Category: easing and duration, frequency.

## Finding

Every tooltip waits 400 ms and then fades in for 150 ms, independently. Moving along the slide toolbar (PNG, Style, Refine image, Overlays) or the top bar icon buttons means paying the delay on each button. macOS and Radix both use a warm window: after one tooltip has shown, the next one within a short interval appears immediately.

Evidence:
- `src/components/ui/Tooltip.tsx:11` `delay = 400` per instance.
- `src/components/ui/Tooltip.tsx:34` `timer.current = window.setTimeout(() => setOpen(true), delay)`.
- `src/app/ui.css:176-180` `.ui-tooltip { … animation: ui-fade-in var(--ui-dur-2) var(--ui-ease-out); }`

## Change

In `src/components/ui/Tooltip.tsx`:

1. Add a module-level clock shared by all tooltips, above the component:

```ts
/** When a tooltip last closed. Within WARM_MS of it, the next opens at once. */
let lastClosedAt = 0;
const WARM_MS = 300;
```

2. In `show`, compute the effective delay:

```ts
const warm = Date.now() - lastClosedAt < WARM_MS;
timer.current = window.setTimeout(() => setOpen(true), warm ? 0 : delay);
```

3. In `hide` (the function that sets `open` to false), record the close:

```ts
lastClosedAt = Date.now();
```

4. When a tooltip opens in the warm state, skip its fade: set `data-warm="true"` on the tooltip element while `warm` is true, and add to `src/app/ui.css` directly after the `.ui-tooltip { … }` block:

```css
.ui-tooltip[data-warm="true"] { animation: none; }
```

Keep the 400 ms first delay and the 150 ms fade for a cold open; both are inside the 125 to 200 ms tooltip budget.

## Verify

1. Hover PNG under the slide, wait for the tooltip, then slide the pointer to Style and Refine image. Each following tooltip must appear the instant the pointer arrives, with no fade.
2. Move away for a second, hover again: the 400 ms delay and fade are back.
3. Keyboard focus still opens tooltips as before.

## Scope

Tooltip.tsx and one CSS rule. Do not change the delay prop default.
