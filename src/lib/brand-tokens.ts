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

// ONE family list for the whole app. It used to be two — this constant for the
// headless capture, and a pair of `@import url(...)` lines at the top of
// globals.css for everything else — with a comment asking whoever touched
// either to keep them in lockstep.
//
// They were not in lockstep. They were not even both loading. Tailwind v4's
// bundler drops remote `@import`s, so the shipped CSS carried no @import, no
// @font-face and no mention of gstatic: every webfont in the app silently fell
// back to a system face, while the capture path — which uses a <link> and so
// was unaffected — rendered the real ones. The preview and the export had
// quietly disagreed about metrics the whole time.
//
// A <link> in the root layout is what the render page already does, so both
// surfaces now load fonts the same way, from the same list, and there is
// nothing left to keep in step by hand.
const GOOGLE_FONTS_FAMILIES =
  "?family=Inter:wght@300;400;500;600;700" +
  "&family=Jost:wght@400;500" +
  "&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600" +
  "&family=Fira+Code:wght@400;500" +
  "&family=Outfit:wght@500;700" +
  // Free Press preset.
  "&family=Archivo+Narrow:wght@600;700" +
  "&family=Playfair+Display:ital,wght@0,700;0,800;1,400" +
  // Essay preset: a condensed display face for the headline and a script for
  // the byline. Approved as a departure from the Inter/Cormorant/Fira set on
  // 2026-09-06 (see the DESIGN.md decisions log).
  "&family=Anton" +
  "&family=Caveat:wght@500;600";

/** Render target. `display=block` so fallback metrics can never paint into a
 *  capture — a PNG exported mid-swap is wrong forever. */
export const GOOGLE_FONTS_CSS_URL =
  "https://fonts.googleapis.com/css2" + GOOGLE_FONTS_FAMILIES + "&display=block";

/** App UI. Same faces, same metrics; `swap` because a dashboard that blanks
 *  its own text for up to three seconds is worse than one brief reflow. */
export const GOOGLE_FONTS_CSS_URL_UI =
  "https://fonts.googleapis.com/css2" + GOOGLE_FONTS_FAMILIES + "&display=swap";

// ─── Free Press preset tokens ───────────────────────────────────────────────
// A text-led editorial look: the body slide carries no image and no graphic,
// just one large centred block of copy. Modelled on The Free Press's carousel
// grammar, rendered in Lunia's palette and mark.
//
// Two faces, each doing one job:
//   FP_SERIF  display only. Covers and the italic source line.
//   FP_SANS   every word of body copy. Condensed and heavy so a 60-word
//             paragraph still sets at 66px without wrapping into a wall.
export const FP_SERIF = "'Playfair Display', 'Cormorant Garamond', Georgia, serif";
export const FP_SANS = "'Archivo Narrow', 'Inter', system-ui, sans-serif";

export const FP_COLORS = {
  /** Slide ground. brand softIvory, not FP's own cream. */
  paper: BRAND_COLORS.softIvory,
  /** Body ink. Deliberately a warm near-black rather than a navy: the
   *  indicator below it is navy, and navy-on-navy would erase the one
   *  accent the layout has. */
  ink: "#171612",
  inkMuted: "rgba(23,22,18,0.50)",
  inkHairline: "rgba(23,22,18,0.13)",
  /** The single accent. Replaces The Free Press's red with Lunia's navy. */
  indicator: BRAND_COLORS.richNavy,
} as const;

/** Type scale for the Free Press preset (px at the 1080-wide artboard).
 *
 *  `body` is the size SHORT copy gets; the slide's auto-fit steps it down from
 *  here when there is more. Measured off The Free Press's own 1080x1350
 *  slides: a 37-word slide sets on a 92px line pitch (~81px type) and a
 *  70-word slide on a 76px pitch (~67px). The starting point was 66, which is
 *  their FLOOR, so every slide rendered at the size they reserve for their
 *  wordiest one and the preset never got its headline-sized copy. */
export const FP_TYPE = {
  coverHeadline: 84,
  coverKicker: 25,
  body: 82,
  // 24, not 27. The Free Press's attribution is a byline and always sets on one
  // line; a real academic citation runs to three, and every line of it comes
  // straight out of the copy's height budget. Smaller keeps most references to
  // two lines and hands the room back to the type that matters.
  source: 24,
  indicator: 25,
  takeawayKicker: 25,
  takeawayPoint: 54,
} as const;

// ─── Essay preset tokens ────────────────────────────────────────────────────
// The look of a deck written by one person: paper with grain, a heavy
// condensed headline with ONE word boxed in the accent, a script byline, and
// serial chrome (handle, counter, essay number, date). Modelled on the
// "essay" carousels that read as hand-made, in Lunia's palette.

export const ESSAY_DISPLAY = '"Anton", "Impact", "Arial Narrow", sans-serif';
export const ESSAY_SCRIPT = '"Caveat", "Bradley Hand", cursive';
export const ESSAY_TEXT = BRAND_FONT_FAMILY;

export type EssayAccent = "yellow" | "red";

export const ESSAY_COLORS = {
  paper: BRAND_COLORS.softIvory,
  ink: BRAND_COLORS.deepNavy,
  inkMuted: "rgba(16,38,53,0.55)",
  inkHairline: "rgba(16,38,53,0.16)",
  /** The boxed word and the emphasis phrase. Yellow is the brand book's
   *  Signal Yellow; red is the essay-poster red, offered as an option. */
  accent: {
    yellow: { fill: BRAND_COLORS.signalYellow, onFill: BRAND_COLORS.deepNavy, text: "#B8930A" },
    red: { fill: "#D8321E", onFill: BRAND_COLORS.softIvory, text: "#D8321E" },
  },
} as const;

/** Tileable grain multiplied onto the paper. Generated by scripts, checked in. */
export const ESSAY_PAPER_TEXTURE = "/textures/paper.png";

/** Type scale (px at the 1080-wide artboard). */
export const ESSAY_TYPE = {
  coverHeadline: 150,
  coverSubline: 40,
  headline: 84,
  body: 40,
  chrome: 22,
  byline: 44,
  citation: 22,
  takeawayPoint: 44,
} as const;

/** Paper ground settings a slide can carry: grain opacity and vignette
 *  strength, both 0..1. Essay ships its original values; the styles built
 *  from the Highlighter review (Did you know, Billboard, Chartbook, Primer)
 *  default to half grain and no vignette, the phone-scale call of 9 Sep 2026.
 *  Every one of them exposes both as sliders (PaperControls). */
/** The paper ground of the new styles. `pen` is the colour of the
 *  hand-drawn underline on the pen-and-paper formats (Did you know,
 *  Chartbook, Primer); absent means the navy pen. */
export type PaperSettings = { grain: number; vignette: number; pen?: string };
/** Pen colours offered as swatches; any hex is accepted beside them. */
export const PEN_PRESETS = [
  { name: "Navy", hex: "#102635" },
  { name: "Ochre", hex: "#B8930A" },
  { name: "Red", hex: "#D8321E" },
  { name: "Aqua", hex: "#4FCFC8" },
  { name: "Slate", hex: "#2C3F51" },
] as const;
export const PAPER_DEFAULTS = {
  essay: { grain: 0.9, vignette: 0.07 },
  highlighter: { grain: 0.45, vignette: 0 },
  billboard: { grain: 0.45, vignette: 0 },
  chartbook: { grain: 0.45, vignette: 0 },
  primer: { grain: 0.45, vignette: 0 },
} as const satisfies Record<string, PaperSettings>;

// ─── Pen and paper tokens (Chartbook and Primer) ────────────────────────────
// The third grammar from the @reputeforge reference: a serif carries the
// words, numerals are Inter tabular (Cormorant's figures are too light and a
// display serif's 1 reads as l), key words get a hand-drawn navy pen
// underline, one phrase per slide takes the yellow marker swipe, and the
// chrome is a handle and an arrow. One ink, one accent.
export const PEN_SERIF = "'Cormorant Garamond', Georgia, serif";
export const PEN_SANS = "Inter, system-ui, sans-serif";
export const PEN_COLORS = {
  paper: BRAND_COLORS.softIvory,
  ink: BRAND_COLORS.deepNavy,
  inkMuted: "rgba(16,38,53,0.6)",
  inkSoft: "rgba(16,38,53,0.85)",
  hairline: "rgba(16,38,53,0.32)",
  pen: "rgba(16,38,53,0.85)",
  yellow: BRAND_COLORS.signalYellow,
  /** Bars are ink; the one bar the title is about is the accent. */
  bar: BRAND_COLORS.deepNavy,
  barAccent: BRAND_COLORS.signalYellow,
} as const;
/** Type scale (px at the 1080-wide artboard), at or above the review's
 *  legibility floor: 30 for text, 28 for sources, 24 for chrome. */
export const PEN_TYPE = {
  coverQuestion: 118,
  coverKicker: 30,
  numeral: 400,
  title: 88,
  kicker: 30,
  value: 36,
  label: 36,
  source: 28,
  row: 35,
  rowNumber: 28,
  body: 40,
  chrome: 24,
  arrow: 44,
} as const;
export const PEN_LAYOUT = {
  padX: 84,
  chromeBottom: 84,
  titleTop: 120,
  /** The figure or the rows start here on the second slide: clear of a
   *  two-line title and its kicker. */
  bodyTop: 400,
  bodyBottom: 220,
} as const;
/** Slider ceiling for the vignette: the Essay value is 0.07, so the control
 *  runs 0..0.2 and maps the whole range onto something visible. */
export const PAPER_VIGNETTE_MAX = 0.2;

// ─── Did you know (Highlighter) tokens ──────────────────────────────────────
// The frozen two-slide fact card, redesigned 2026-09-09 after the
// @reputeforge reference: paper, a serif italic question, Inter light body,
// one boxed phrase per paragraph and navy pen underlines on the rest, small
// tracked chrome. Approved treatments: V6 (navy box) and V8 (yellow box).
export const DYK_SERIF = "'Cormorant Garamond', Georgia, serif";
export const DYK_COLORS = {
  paper: BRAND_COLORS.softIvory,
  ink: BRAND_COLORS.deepNavy,
  inkMuted: "rgba(16,38,53,0.6)",
  inkHairline: "rgba(16,38,53,0.16)",
  /** The pen: navy at 85% so it reads as a stroke over paper, not a rule. */
  pen: "rgba(16,38,53,0.85)",
  yellow: BRAND_COLORS.signalYellow,
  /** The counter's slash, a darker yellow that survives on ivory. */
  yellowText: "#B8930A",
} as const;
/** Type scale (px at the 1080-wide artboard). Chrome is 24, not the Essay
 *  22: the phone shows the slide at 0.36, and 24 is the floor the review set
 *  for the new styles. */
export const DYK_TYPE = {
  header: 150,
  body: 44,
  chrome: 24,
} as const;
export const DYK_LAYOUT = {
  padX: 84,
  bodyX: 110,
  headerTop: 320,
  bodyTop: 580,
  chromeTop: 110,
  chromeBottom: 58,
} as const;
/** Right-hand chrome label on both slides. */
export const DYK_CHROME_LABEL = "Sleep & longevity";

// ─── Billboard preset tokens ────────────────────────────────────────────────
// Approved 2026-09-08 after the @reputeforge watermark covers: paper, an
// outlined LUNIA watermark peeking above and below the type, four pillar
// labels in the corners with the deck's pillar lit, and every headline set
// as a thin tracked line over a heavy condensed line. Rich navy is the only
// ink; contrast comes from weight, never from a second colour.
export const BILLBOARD_COLORS = {
  paper: BRAND_COLORS.softIvory,
  ink: BRAND_COLORS.richNavy,
  inkMuted: "rgba(1,37,63,0.55)",
  inkHairline: "rgba(1,37,63,0.14)",
  /** Stroke-only watermark. 4px at 14% is the floor the review set so it
   *  survives the phone without hatching the headline. */
  watermark: "rgba(1,37,63,0.14)",
  /** The fallback photo band and the caption scrim. */
  band: BRAND_COLORS.richNavy,
} as const;
export const BILLBOARD_FONTS = {
  thin: "Inter, system-ui, sans-serif",
  heavy: "'Archivo Narrow', 'Arial Narrow', sans-serif",
  watermark: "Anton, 'Arial Narrow', sans-serif",
} as const;
/** Type scale (px at the 1080-wide artboard). */
export const BILLBOARD_TYPE = {
  coverThin: 82,
  coverHeavy: 126,
  thin: 56,
  heavy: 104,
  body: 40,
  cite: 28,
  corner: 24,
  caption: 26,
  watermark: 300,
} as const;
export const BILLBOARD_LAYOUT = {
  padX: 84,
  cornerY: 72,
  /** Cover photo band: full bleed, its top edge and height. Reels grows it. */
  band: { top: 480, height: 520, reelsHeight: 760 },
  /** Content slides: the headline pair starts here (the review moved it up
   *  from 400 so the phone's first frame is not paper). */
  contentTop: 280,
} as const;
/** The four corner labels, in reading order: top-left, top-right,
 *  bottom-left, bottom-right. */
export const BILLBOARD_PILLARS = ["Sleep", "Recovery", "Nutrition", "Longevity"] as const;
/** The heavy line may hold about 14 uppercase characters at 126px in the
 *  safe width; the thin line about 22 at 82px. The generator is told the
 *  same numbers; the renderer steps the size down once when a line is over. */
export const BILLBOARD_LINE_MAX = { heavy: 14, thin: 22 } as const;

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
