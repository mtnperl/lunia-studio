# 005 Press feedback on buttons, and editor transitions on the shared tokens

Commit: 3af6941. Severity: LOW. Category: physicality, cohesion and tokens.

## Finding

1. No button in the system reacts to being pressed. `.ui-btn` transitions background, border and colour on hover (`src/app/ui.css:31`) but has no `:active` transform, so a click reads as a colour blink.
2. The two editors carry their own hand-typed easings and durations that almost match the tokens: `130ms ease` and `120ms ease` in `src/components/campaign/CampaignEditor.tsx:1768-1770, 1806, 3162`, `transition: "opacity 120ms ease-out"` at `:1567`, a private `fadeIn 220ms ease-out` keyframe at `:2894`, and `120ms ease` in `src/components/carousel/steps/PreviewStep.tsx:2988`. The tokens are `--ui-dur-1` 80 ms, `--ui-dur-2` 150 ms, `--ui-dur-3` 220 ms with `--ui-ease-out: cubic-bezier(0.2, 0, 0, 1)`.

## Change

1. In `src/app/ui.css`, inside the `.ui-btn` rule at line 31, extend the transition and add a press state directly after the rule:

```css
.ui-btn { /* existing properties stay */
  transition: background var(--ui-dur-1) var(--ui-ease-out), border-color var(--ui-dur-1) var(--ui-ease-out), color var(--ui-dur-1) var(--ui-ease-out), transform var(--ui-dur-2) var(--ui-ease-out);
}
.ui-btn:not(:disabled):active { transform: scale(0.97); }
```

Apply the same two lines to `.ui-icon-btn` (the rule at `src/app/ui.css:67`). Do not add press feedback to tabs, menu items or list rows.

2. Replace the hand-typed values with tokens. Exact substitutions:
   - `CampaignEditor.tsx:1768` `.blk-seg{ transition: background 130ms ease, color 130ms ease; }` becomes `.blk-seg{ transition: background var(--ui-dur-2) var(--ui-ease-out), color var(--ui-dur-2) var(--ui-ease-out); }`
   - `CampaignEditor.tsx:1770` same pattern for `.blk-icon`, three properties.
   - `CampaignEditor.tsx:1806` and `:3162` `transition: "border-color 120ms ease"` becomes `transition: "border-color var(--ui-dur-2) var(--ui-ease-out)"`.
   - `CampaignEditor.tsx:1567` `transition: "opacity 120ms ease-out"` becomes `transition: "opacity var(--ui-dur-2) var(--ui-ease-out)"`.
   - `CampaignEditor.tsx:2894` `animation: "fadeIn 220ms ease-out both"` becomes `animation: "ui-slide-up var(--ui-dur-3) var(--ui-ease-out) both"`; keep the existing `animationDelay` stagger on the next line, it is already within the 30 to 80 ms band. Delete the private `fadeIn` keyframe if it is defined in that file and nothing else uses it.
   - `PreviewStep.tsx:2988` `transition: "border-color 120ms ease, background 120ms ease"` becomes `transition: "border-color var(--ui-dur-2) var(--ui-ease-out), background var(--ui-dur-2) var(--ui-ease-out)"`.

## Verify

1. Click any primary or secondary button and hold: it shrinks to 97 percent over 150 ms and springs back on release. Disabled buttons do not move.
2. In the email editor, click block cards and the segmented controls: hover colour changes still feel the same speed.
3. Accept a pending layout review: the block rows still stagger in.
4. `npx tsc --noEmit -p .` and `npx eslint` on the two editor files.

## Scope

Three files. Do not change any duration token or add motion to rows, tabs or menu items.
