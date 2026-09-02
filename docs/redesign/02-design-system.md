# Lunia Studio design system

Rendered reference: `/styleguide` in the app. Source of truth: `src/app/tokens.css` (values) and
`src/app/ui.css` (primitive styles). Components: `src/components/ui/`.

## The one rule

**Neutral tool, branded output.** The application chrome uses only the `--ui-*` tokens: cool neutral
grays, one functional blue for focus and selection, three status colours. The Lunia Life palette lives in
the `--lunia-*` tokens and in `BRAND_COLORS` in `src/lib/brand-tokens.ts`, and is used only when rendering
carousel slides, email blocks and their previews. If you find yourself reaching for navy in a sidebar,
stop.

## Token families

| Family | Purpose | Examples |
|---|---|---|
| `--ui-bg`, `--ui-bg-sunken`, `--ui-surface`, `--ui-surface-2`, `--ui-surface-3` | Grounds, from page to hover. Sunken is the canvas backdrop behind the artwork. | |
| `--ui-text`, `--ui-text-2`, `--ui-text-3` | Primary, secondary, tertiary text. Text-3 is only legal on `bg` and `surface`. | |
| `--ui-border`, `--ui-border-strong` | Dividers and card edges (1.3:1); control edges (3:1). | |
| `--ui-ink`, `--ui-on-ink`, `--ui-ink-hover` | The primary action fill. Ink, not colour. One primary button per view. | |
| `--ui-focus`, `--ui-focus-ring`, `--ui-focus-tint` | The only hue in the chrome. Focus rings, selection outlines, links. | |
| `--ui-selection-tint`, `--ui-selection-tint-2` | Neutral tints for selected and pressed states. | |
| `--ui-success`, `--ui-warning`, `--ui-danger` and `-tint` | Status only. Never decorative. | |
| `--ui-elev-1..3` | Shadows for popover, dialog, toast. Cards and rails have none. | |
| `--ui-text-11..36`, `--ui-lh-*`, `--ui-weight-*`, `--ui-tracking-*` | Type scale, whole pixels, paired line heights. | |
| `--ui-space-1..12` | 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64. | |
| `--ui-radius-1..4`, `--ui-radius-full` | 4, 6, 8, 12. | |
| `--ui-control-sm/md/lg` | 28, 32, 40 px control heights. | |
| `--ui-dur-1..4`, `--ui-ease-*` | 80, 150, 220, 350 ms. Enter eases out, exit eases in, move eases in and out. | |
| `--ui-z-*` | rail, sticky, popover, dialog, toast, tooltip. | |
| `--lunia-*` | The six closed brand colours plus the brand font. Output only. | |

Legacy names (`--bg`, `--surface`, `--muted`, `--accent`, `--r-md`, and so on) are aliases at the bottom of
`tokens.css`. They exist so the 3,500 existing inline styles keep working. Do not add new consumers.

## Themes

`[data-theme="light"]` and `[data-theme="dark"]` on `<html>`. Light is the default and is fully defined on
`:root`; dark redefines only the colour and elevation tokens. Both were checked numerically:

| Pair | Light | Dark |
|---|---|---|
| text on bg | 18.1 | 15.7 |
| text-2 on bg | 6.1 | 8.0 |
| text-3 on bg | 4.9 | 6.0 |
| border-strong on bg | 3.0 | 3.1 |
| focus on bg | 4.7 | 7.4 |

`prefers-reduced-motion: reduce` sets every duration token to zero and stops keyframe animations.

## Primitives

All in `src/components/ui/`, exported from `src/components/ui/index.ts`.

| Component | Notes |
|---|---|
| `Button` | Variants primary, secondary, ghost, danger, selected. Sizes sm, md, lg. `busy` overlays a spinner and keeps width. `icon` for a leading glyph. Accepts `ref`. |
| `IconButton` | `title` is required and becomes `aria-label`. `active` sets `aria-pressed`. `outlined` for toolbars on a busy ground. |
| `Field` | Label, hint, error. Render-prop child receives `id`, `aria-describedby`, `aria-invalid`. |
| `Input`, `Textarea`, `Select` | Native elements with the system chrome. Select is native on purpose. |
| `Toggle` | `role="switch"`, real button. |
| `Slider` | Native range with a mono value readout and `aria-valuetext`. |
| `Tooltip` | Hover and focus, delayed, never on touch. Wraps its child in `display: contents`. `shortcut="mod+s"` renders key caps. |
| `Popover` | Anchored floating panel. Escape and outside click close it; focus returns to the opener. |
| `Menu`, `useContextMenu` | Roving focus, type-ahead, separators, headings, shortcuts, danger items. Right-click via `useContextMenu().bind`. |
| `Dialog`, `ConfirmProvider`, `useConfirm` | Native `<dialog>` for the focus trap and inert background. `useConfirm` replaces `window.confirm` with a promise. |
| `ToastProvider`, `useToast` | Bottom-right stack, polite live region, one optional action (Undo), pause on hover. |
| `Tabs` | `role="tablist"`, arrow keys move and select. Segmented or underline. |
| `Panel`, `PanelSectionTitle` | Rail surface with optional collapse; the header is a real button. |
| `CardButton` | Option cards as real radios or toggles. Replaces `div onClick`. |
| `Badge` | Neutral by default; tone only for state. |
| `EmptyState`, `Skeleton`, `SkeletonText`, `Spinner` | Designed nothing, shaped loading, and a busy indicator that honours reduced motion. |
| `CommandPalette` | Cmd K. Grouped, filtered, keyboard-driven. Takes a `Command[]`. |
| `Kbd`, `Shortcut` | Key caps; `Shortcut keys="mod+shift+z"` maps mod to the platform. |

Every focusable primitive shows the same two-layer ring (`--ui-focus-ring`) on `:focus-visible`.

## How to extend

1. **Need a value?** Add a token to `tokens.css`, in both themes if it is a colour, with a comment saying
   where it is used. Never write a hex in a component.
2. **Need a variant?** Add a modifier class in `ui.css` (`.ui-btn--tertiary`) and a prop on the component.
   Cover rest, hover, active, focus-visible, disabled.
3. **Need a new primitive?** One file in `src/components/ui/`, styles in `ui.css` under a `.ui-<name>`
   prefix, export from `index.ts`, and a section on `/styleguide` showing every state. A primitive without
   a style guide entry is not finished.
4. **Need brand colour in the chrome?** You do not. Put it on the canvas.

## Deliberately left for later slices

- The `.display` serif classes and `--font-serif` stay defined until the shell slice replaces the page
  headers. New chrome does not use them.
- Existing views still read the legacy aliases and inline styles. They re-theme automatically but are not
  yet built from the primitives; that is what the editor slices do.
- Icon set: the 15 stroke icons in `icons.tsx` are kept. The shell slice adds the ones the editor needs.
