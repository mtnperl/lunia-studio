# Design System — Lunia Studio

## Product Context
- **What this is:** Internal creator productivity suite for the Lunia Life health/wellness brand
- **Who it's for:** Single user — the Lunia Life founder/creator (Mathan)
- **Space/industry:** Premium health & wellness content creation
- **Project type:** Web app / internal tool — used daily for Instagram content production

## Aesthetic Direction
- **Direction:** Apple-Inspired Studio — White default, Dark toggle
- **Brand reference:** Apple (light mode energy) × Linear (information density) — pure white, black CTAs, no color accent in light mode
- **Decoration level:** Minimal — typography and structure do all the work
- **Mood:** A premium single-user content studio. White, clean, exclusive. The tool itself should feel as considered as the output it produces. Not a SaaS dashboard, not Canva. Think Apple product page meets creator tool.
- **First 3-second reaction:** "This feels expensive."

### Apple Constraints (non-negotiable)
- No box-shadows in light mode. Elevation = background color shift only.
- No translateY/lift hover effects. Hover = border-color + background change only.
- No emoji in functional UI chrome (buttons, toggles, nav).
- Type scale uses whole pixels only — no 9.5px, 10.5px.
- Color accent in light mode is `#1D1D1F` (near-black). No warm gold in light mode.
- Gold accent `#C8A96E` reserved for dark mode only — it reads premium there, not in light.

## Typography
- **Display/Hero:** Cormorant Garamond — high-contrast luxury serif, weight 300–400, italic in gold for greetings. Used for dashboard greeting, section headers, card titles, empty states. At 48px it rivals editorial magazine typography.
- **UI/Navigation/Labels:** Inter — clean geometric sans with excellent readability at small sizes. Section labels in all-caps at 0.14em tracking. Nav items in 13px/400–500 weight.
- **Data/Metrics:** Fira Code — monospace for numbers, dates, batch data, carousel metadata. `font-variant-numeric: tabular-nums` always on.
- **Loading strategy:** Google Fonts CDN — `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap`
- **Scale:**
  - xs: 9px / 10px / 11px
  - sm: 12px / 13px
  - base: 14px
  - md: 16px / 18px / 20px
  - lg: 24px / 28px
  - xl: 36px / 48px (display/hero — Cormorant, weight 300)

## Color
- **Approach:** Restrained — gold accent is rare and meaningful. Color is earned, not decorative.

### Light Mode (default)

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background — pure white |
| `--surface` | `#F5F5F7` | Cards, sidebar, panels — Apple gray |
| `--surface-r` | `#EBEBED` | Modals, dropdowns, raised layers |
| `--surface-h` | `#E3E3E8` | Hover state for interactive surfaces |
| `--text` | `#1D1D1F` | Primary text — Apple near-black |
| `--muted` | `#6E6E73` | Secondary text, labels, captions |
| `--subtle` | `#98989D` | Tertiary — nav section labels, timestamps |
| `--accent` | `#1D1D1F` | Black — CTAs, active states, focus rings |
| `--accent-dim` | `rgba(0,0,0,0.06)` | Active nav bg, input focus area |
| `--accent-mid` | `rgba(0,0,0,0.16)` | Badge borders, focus ring |
| `--border` | `#D2D2D7` | Default border |
| `--border-strong` | `#BCBCC5` | Stronger border for interactive elements |
| `--success` | `#1C7A3A` | Saved, published, completed states |
| `--warning` | `#B86040` | Alerts, in-review states |
| `--error` | `#C40000` | Errors, delete confirmation |

### Dark Mode

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0D0C0A` | Page background — warm near-black |
| `--surface` | `#171512` | Cards, sidebar, panels |
| `--surface-r` | `#201E1B` | Modals, dropdowns, raised layers |
| `--surface-h` | `#252219` | Hover state for interactive surfaces |
| `--text` | `#EDE8DF` | Primary text — warm cream |
| `--muted` | `#7A7268` | Secondary text, labels, captions |
| `--subtle` | `#4A4640` | Tertiary — nav section labels, timestamps |
| `--accent` | `#C8A96E` | Gold — CTAs, active states, focus rings, badges |
| `--accent-dim` | `rgba(200,169,110,0.12)` | Active nav bg, badge bg, input focus area |
| `--accent-mid` | `rgba(200,169,110,0.30)` | Badge borders, focus ring |
| `--border` | `#2A2723` | Default border — barely visible |
| `--border-strong` | `#332F2B` | Stronger border for interactive elements |
| `--success` | `#5F9E75` | Saved, published, completed states |
| `--warning` | `#C47A5A` | Alerts, in-review states |
| `--error` | `#B85C5C` | Errors, delete confirmation |

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable (not compact, not airy)
- **Scale:** 2(2px) 4(4px) 6(6px) 8(8px) 12(12px) 16(16px) 20(20px) 24(24px) 32(32px) 40(40px) 48(48px) 64(64px)

## Layout
- **Approach:** Grid-disciplined — fixed sidebar, predictable content column
- **Sidebar:** 240px fixed, sticky, full height. Section labels in 9.5px all-caps 0.14em tracking. Nav items full words, no icons as primary. Active item: gold left border + accent-dim bg.
- **Main content max-width:** 960px, 48px horizontal padding
- **Border radius:** sm:4px, md:6px, lg:8px, xl:10px, full:9999px — restrained, not bubbly
- **Grid:** Single column within content area; stat grid uses auto-fill

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Panel transitions:** 220ms ease-out
- **Hover states:** 120–150ms ease
- **No:** bounce, spring physics, decorative entrance animations, scroll-driven effects
- **Easing:** enter → ease-out, exit → ease-in, move → ease-in-out
- **Duration reference:** micro(50ms) short(150ms) medium(220ms) long(350ms)

## 21st.dev Component Integration

Install pattern: `npx shadcn@latest add "https://21st.dev/r/[component-name]"`

| Area | Component | Source | Notes |
|---|---|---|---|
| Navigation | Collapsible Sidebar | `21st.dev/r/sidebar` | 240px → icon rail collapse. Adapt labels to all-caps Geist. |
| Navigation | Command Palette | `21st.dev/r/command` | ⌘K shortcut. Jump between Builder / Script / Library. |
| Cards | Metric / Stat Tiles | `21st.dev/s/dashboard` | Dashboard stat grid. Geist Mono numerals, warm surface bg. |
| Cards | Library Grid Cards | `21st.dev/s/card` | Saved carousel cards. Topic in Instrument Serif + hover lift. |
| Inputs | Ghost / Outline Button | `21st.dev/s/outline-button` | "Save", "← Change hook". 1px border, no fill. |
| Inputs | Text Input | `21st.dev/s/input` | Topic entry. Gold focus ring (`box-shadow: 0 0 0 3px var(--accent-dim)`). |
| Loading | Skeleton / Shimmer | `21st.dev/s/loader` | Slide thumbnails during fal.ai generation. Warm shimmer, not cold grey. |
| Loading | Spinner | `21st.dev/s/spinner-loader` | "Generating visuals…". 1.5px ring, gold accent, no bounce. |

## Design Risks (intentional departures)
1. **Instrument Serif for display** — No creator tool uses a serif. It signals editorial authority. Every heading and greeting uses it.
2. **Warm near-black `#0D0C0A` not navy** — Disconnects from generic dark SaaS. The current `#0a1628` navy reads as "startup template"; this reads as "atelier."
3. **All-caps spaced text labels, no icons in primary nav** — Magazine index, not dashboard. Full words only.
4. **Gold accent `#C8A96E` not blue/teal** — Unusual for a health tool. Connects to the physical product (supplements, capsules). Earns more meaning because it's used less.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-25 | Initial design system created | /design-consultation — Warm Atelier Dark direction |
| 2026-03-25 | Gold accent #C8A96E chosen over teal | User preferred warm gold; more distinctive, connects to supplement brand |
| 2026-03-25 | Instrument Serif chosen for display | Editorial authority, no other creator tool uses a serif — memorable |
| 2026-03-25 | 21st.dev chosen as component source | Shadcn-adjacent, installable primitives, full dark mode support |
| 2026-04-11 | Light mode redesigned — Apple direction | Replaced warm cream + #A07830 gold with pure white #FFFFFF + #1D1D1F black accent. "White and exclusive." Gold accent retained in dark mode only. |
| 2026-04-11 | Removed box-shadows from all cards | Apple constraint: elevation via background color only, never shadows in light mode |
| 2026-04-11 | Removed hover lift (translateY) | Apple constraint: hover = border + bg change only, no movement |
