# 001 Command palette opens with no animation

Commit: 3af6941. Severity: HIGH. Category: purpose and frequency.

## Finding

The command palette is a keyboard action (Cmd K) hit dozens of times a day. It renders through the shared Dialog, which plays `ui-pop-in` for 220 ms and fades its backdrop for 220 ms. Every open waits a fifth of a second before the input is fully there. Raycast and Linear open theirs instantly; that is the bar.

Evidence:
- `src/components/ui/CommandPalette.tsx:27` renders `<Dialog open={open} onClose={onClose} className="ui-cmdk" ariaLabel="Command palette">`.
- `src/app/ui.css:298` `.ui-dialog { … animation: ui-pop-in var(--ui-dur-3) var(--ui-ease-out); }`
- `src/app/ui.css:301` `.ui-dialog::backdrop { … animation: ui-fade-in var(--ui-dur-3) var(--ui-ease-out); }`

## Change

In `src/app/ui.css`, directly after the `.ui-cmdk { … }` rule at line 331, add:

```css
/* Keyboard-opened, dozens of times a day: no entrance motion. The dialog's
   pop-in and backdrop fade are for occasional modals, not this. */
.ui-cmdk, .ui-cmdk::backdrop { animation: none; }
```

No other file changes. Do not touch the Dialog component or the generic `.ui-dialog` rule; other dialogs keep their motion.

## Verify

1. `npm run dev`, open any page, press Cmd K three times in a row. The palette must appear on the same frame as the keypress, with no scale or fade.
2. Open an ordinary dialog (Export menu, Version history) and confirm it still pops in.
3. `npx eslint src/app/ui.css` is not applicable; run `npx tsc --noEmit -p .` to be safe.

## Scope

Only the two selectors above. Do not change durations or tokens.
