# 004 Toasts enter and leave with interruptible transitions

Commit: 3af6941. Severity: MEDIUM. Category: interruptibility.

## Finding

Toasts enter with a keyframe (`ui-slide-up`, 220 ms) and leave by unmounting, so a toast vanishes on one frame. When two toasts arrive in quick succession, the region reflows and the first toast jumps to its new slot with no motion, while the second replays the keyframe from zero. Keyframes cannot retarget mid-flight; transitions can.

Evidence:
- `src/app/ui.css:268-272` `.ui-toast { … animation: ui-slide-up var(--ui-dur-3) var(--ui-ease-out); }`
- `src/components/ui/Toast.tsx:35` dismissal is `window.setTimeout(() => dismiss(rec.id), ms)`, and `dismiss` removes the item from state, which unmounts it.

## Change

1. In `src/app/ui.css`, replace the `animation` line in `.ui-toast` with a transition and a starting style. Keep every other property of the rule:

```css
.ui-toast {
  /* existing properties stay */
  opacity: 1; transform: none;
  transition: opacity var(--ui-dur-3) var(--ui-ease-out), transform var(--ui-dur-3) var(--ui-ease-out);
}
@starting-style { .ui-toast { opacity: 0; transform: translateY(8px); } }
.ui-toast[data-leaving="true"] { opacity: 0; transform: translateY(8px); transition-duration: var(--ui-dur-2); }
```

`@starting-style` is supported in Chrome 117+ and Safari 17.5+, which covers the studio's two browsers. Do not add a JS mounted flag.

2. In `src/components/ui/Toast.tsx`, make `dismiss` two-phase. Add `leaving?: boolean` to the toast record type, then:

```ts
const dismiss = useCallback((id: string) => {
  setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
  window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 160);
}, []);
```

160 ms matches `--ui-dur-2` (150 ms) with a small margin. Render `data-leaving={t.leaving || undefined}` on the toast element at `src/components/ui/Toast.tsx:56`.

3. Reduced motion needs nothing extra: the duration tokens are already zero under `prefers-reduced-motion` in `src/app/tokens.css:183-189`, so both phases become instant.

## Verify

1. Trigger two toasts within a second (copy the caption twice from the Export menu). The first must slide to its new slot, the second must slide up, nothing should jump.
2. Let a toast time out: it fades and drops 8 px over 150 ms instead of vanishing.
3. Hover a toast while it is leaving: it keeps leaving. That is acceptable; do not add hover cancel to the leaving phase.

## Scope

Toast.tsx and the `.ui-toast` rules. Do not change the toast region layout or durations elsewhere.
