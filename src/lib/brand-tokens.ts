// ─── Lunia Life output-brand design tokens ─────────────────────────────────
// Single source of truth for every rendered deliverable (carousel slides,
// infographics, campaign email images/HTML). This is the OUTPUT brand — the
// look of the content Lunia publishes — not the studio app UI (see DESIGN.md
// for that). Safe to import from client and server code.
//
// Ground truth: brand constraints supplied by Mathan (July 2026).
//   - No purple, magenta, or lavender anywhere in rendered output.
//   - Headers use sentence case, not title case.

// ─── Color ──────────────────────────────────────────────────────────────────
export const BRAND_COLORS = {
  /** Primary text / headers on light surfaces. */
  deepNavy: "#102635",
  /** Dark backgrounds (email shell, dark slides). */
  richNavy: "#01253F",
  /** Secondary text, rules, citations. */
  slateBlue: "#2C3F51",
  /** Light background / light ink on dark surfaces. */
  softIvory: "#F7F4EF",
  /** Accent — use sparingly (data highlights). */
  aqua: "#BFFBF8",
  /** Accent — promo highlights only. */
  signalYellow: "#FFD800",
} as const;

/** Hue ranges that must never appear in rendered output. Visual QA and the
 *  regression harness treat any hit as a hard failure. */
export const FORBIDDEN_HUES = ["purple", "magenta", "lavender"] as const;

/** Ink resolution for arbitrary backgrounds (mirrors src/lib/color.ts usage). */
export const INK = {
  onDark: BRAND_COLORS.softIvory,
  onLight: BRAND_COLORS.richNavy,
  onDarkMuted: "rgba(247,244,239,0.88)",
  onLightMuted: "rgba(1,37,63,0.78)",
  onDarkSubtle: "rgba(247,244,239,0.55)",
  onLightSubtle: "rgba(1,37,63,0.55)",
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
// Inter is the brand face. Weights per brand spec: 600 headings, 400
// subheadings/overlays, 300 body. The carousel editorial preset additionally
// uses a light display cut for oversized headlines (approved look, see the
// reference carousels) — that is a *display* exception, not a heading rule.
export const BRAND_FONT_FAMILY = "Inter, system-ui, -apple-system, sans-serif";

export const FONT_WEIGHT = {
  heading: 600,
  subheading: 400,
  body: 300,
  /** Oversized editorial display headlines only (≥72px). */
  display: 300,
} as const;

/** Every Inter weight any renderer may touch — the render page and the email
 *  pipeline must load exactly this set so headless and in-app metrics match.
 *  (Weight 200 is intentionally absent: it was never loaded in headless
 *  renders and caused synthesized-metric drift. Use 300.) */
export const INTER_WEIGHTS = [300, 400, 500, 600, 700] as const;

export const GOOGLE_FONTS_CSS_URL =
  "https://fonts.googleapis.com/css2" +
  "?family=Inter:wght@300;400;500;600;700" +
  "&family=Jost:wght@400;500" +
  "&family=Cormorant+Garamond:ital,wght@0,400;1,400" +
  "&family=Outfit:wght@500;700" +
  "&display=block"; // block: never paint fallback metrics in a render target

// ─── Carousel slide geometry ────────────────────────────────────────────────
export const SLIDE = {
  width: 1080,
  height: { carousel: 1350, reels: 1920 },
  /** Content padding — nothing but full-bleed imagery may cross it. */
  pad: { x: 72, y: 80 },
  /** Editorial preset padding. */
  editorialPad: { x: 84, y: 88 },
  sectionGap: 32,
  /** Cap for in-column infographics (FitBox scales down to fit). */
  graphicMaxHeight: { carousel: 360, reels: 440 },
  /** Hard safe zone: rendered text/graphic boxes must stay inside
   *  [safeZone, width - safeZone] horizontally and clear of top/bottom pad. */
  safeZone: 48,
} as const;

/** Type scale for slides (px at 1080-wide artboard). */
export const SLIDE_TYPE = {
  headline: { carousel: 56, reels: 72 },
  editorialHeadline: 96,
  body: { carousel: 34, reels: 40 },
  editorialBody: 38,
  citation: 18,
  editorialCitation: 22,
} as const;

// ─── Email geometry ─────────────────────────────────────────────────────────
export const EMAIL = {
  shellWidth: 600,
  shellPadX: 24,
  heroAspect: "4:5" as const,
  secondaryAspect: "1:1" as const,
  /** Exact pixel targets the email layout is designed around. Generated
   *  images MUST come back at these aspects (cropped server-side if the
   *  model can't produce them natively). */
  imageSizes: {
    "4:5": { width: 1024, height: 1280 },
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1280, height: 720 },
  },
} as const;

/** Native output sizes GPT Image models actually support. Anything else must
 *  be generated at the nearest-containing native size, then center-cropped to
 *  the target — never requested directly (the model silently snaps size and
 *  breaks the email layout). */
export const GPT_IMAGE_NATIVE_SIZES = {
  square: { width: 1024, height: 1024 },
  portrait: { width: 1024, height: 1536 },
  landscape: { width: 1536, height: 1024 },
} as const;

/** The three campaign image slots every generated campaign ships with —
 *  hero + two secondaries, each tied to a text block and a DISTINCT visual
 *  mood so no two images in one email read as the same style. Mood ids come
 *  from carousel-visual-moods.ts; all three are brand-safe (no purple /
 *  magenta / lavender style blocks). */
export const CAMPAIGN_IMAGE_MOOD_TRIO = [
  "lifestyle-health", // hero — bright, warm, human
  "organic-natural",  // secondary 1 — earthy textures
  "cinematic-dark",   // secondary 2 — moody navy contrast
] as const;
