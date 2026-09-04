# Animation plans

Audit of the app shell, primitives and both editors at commit 3af6941. Motion already lives on tokens (`--ui-dur-1..4`, `--ui-ease-out/in/in-out`) with reduced motion zeroing every duration, which is the right foundation. The findings below are the places the foundation is not yet used well.

| Order | Plan | Severity | Depends on | Status |
|---|---|---|---|---|
| 1 | 001-command-palette-no-animation | HIGH | none | done |
| 2 | 002-popover-origin-follows-placement | HIGH | none | done |
| 3 | 003-tooltip-warm-window | MEDIUM | none | done |
| 4 | 004-toast-enter-exit-transitions | MEDIUM | none | done |
| 5 | 005-press-feedback-and-editor-tokens | LOW | none | done |

Missed opportunities, not planned:
- Applying a fact-check fix rewrites the slide text with no signal on the canvas. A 300 ms background tint on the edited field, fading out, would show where the change landed.
- Restoring a version remounts the editor cold. A 150 ms fade of the canvas over the swap would turn a jump into a change.
- The first hook image arriving replaces a shimmer on one frame. A 220 ms opacity crossfade would soften it.
