export type Comment = {
  author: string;
  text: string;
  time: string;
};

export type FilmingNotes = {
  setting: string;
  energy: string;
  broll: string;
  director: string;
};

export type Suggestion = {
  id: string;
  startLine: number;       // inclusive index into Script.lines
  endLine: number;         // inclusive
  text: string;            // user-authored replacement; \n separates new lines
  author: string;
  createdAt: string;       // ISO
};

export type Script = {
  id: string;
  title: string;
  hook: string;
  lines: string[];
  comments: Record<number, Comment[]>;
  filmingNotes: Record<number, Partial<FilmingNotes>>;
  creator: string;
  status: "draft" | "review" | "locked";
  persona: string;
  angle: string;
  format: string;
  savedAt: string;
  subjectNotes?: string;   // background info on the subject
  instructions?: string;   // specific creative directives
  reviewEmails?: string[];
  suggestions?: Suggestion[];
};

// ─── Carousel types ───────────────────────────────────────────────────────────
export type HookTone =
  | "educational"
  | "clickbait"
  | "myth-bust"
  | "science-backed"
  | "personal-story"
  | "did-you-know"
  | "symptom"
  | "paradox"
  | "tell";
export type CarouselFormat = "standard" | "engagement" | "did_you_know";
export type EngagementSubType = "reveal" | "diagnostic";

// ─── Did You Know format ─────────────────────────────────────────────────────
import { z as zDyk } from 'zod';

export const DidYouKnowTokenSchema = zDyk.object({
  text: zDyk.string(),
  highlight: zDyk.boolean(),
});

export const DidYouKnowSlideContentSchema = zDyk.object({
  header: zDyk.string().min(1),
  body1: zDyk.array(DidYouKnowTokenSchema).min(1),
  body2: zDyk.array(DidYouKnowTokenSchema).min(1),
});

export const DidYouKnowContentSchema = zDyk.object({
  topic: zDyk.string().min(1),
  slide1: DidYouKnowSlideContentSchema,
  slide2: DidYouKnowSlideContentSchema,
  caption: zDyk.string().min(1),
  violations: zDyk.array(zDyk.string()).optional(),
});

export const DidYouKnowVariantsResponseSchema = zDyk.object({
  variants: zDyk.array(DidYouKnowContentSchema).min(1),
  warning: zDyk.string().optional(),
});

export type DidYouKnowToken = zDyk.infer<typeof DidYouKnowTokenSchema>;
export type DidYouKnowSlideContent = zDyk.infer<typeof DidYouKnowSlideContentSchema>;
export type DidYouKnowContent = zDyk.infer<typeof DidYouKnowContentSchema>;
export type DidYouKnowVariantsResponse = zDyk.infer<typeof DidYouKnowVariantsResponseSchema>;

export type Topic = {
  title: string;
  description: string;
  pillar: string;
};

export type Hook = {
  headline: string;
  subline: string;
  sourceNote?: string;
};

export type CarouselContentSlide = {
  headline: string;
  body: string;
  citation: string;
  graphic?: string; // GraphicSpec JSON string (new) or raw SVG string (legacy)
  graphicImagePrompt?: string; // fal.ai prompt for TIER B/C slides (AI-generated visual)
  graphicImageUrl?: string;    // fal.ai hosted URL once generated
};

// ─── GraphicSpec — curated infographic component selection ────────────────────
import { z } from 'zod';

const versusItem = z.object({ label: z.string(), value: z.string(), note: z.string().optional() });

export const GraphicSpecSchema = z.discriminatedUnion('component', [
  // ── Existing ──────────────────────────────────────────────────────────────
  z.object({
    component: z.literal('stat'),
    data: z.object({ stat: z.string(), label: z.string(), unit: z.string().optional() }),
  }),
  z.object({
    component: z.literal('bars'),
    data: z.object({ items: z.array(z.object({ label: z.string(), value: z.string() })).min(2).max(4) }),
  }),
  z.object({
    component: z.literal('steps'),
    data: z.object({ steps: z.array(z.string()).min(2).max(4) }),
  }),
  z.object({
    component: z.literal('dotchain'),
    data: z.object({ labels: z.array(z.string()).min(1).max(2) }),
  }),
  z.object({
    component: z.literal('wave'),
    // Optional — defaults to the classic sleep-stage labels for backward compat
    // with saved graphics generated before `labels` existed.
    data: z.object({ labels: z.array(z.string()).min(2).max(3).optional() }),
  }),
  z.object({
    component: z.literal('iconGrid'),
    data: z.object({ items: z.array(z.object({ label: z.string() })).min(1).max(4) }),
  }),
  // ── New ───────────────────────────────────────────────────────────────────
  z.object({
    component: z.literal('donut'),
    data: z.object({ value: z.string(), label: z.string(), sublabel: z.string().optional() }),
  }),
  z.object({
    component: z.literal('versus'),
    data: z.object({ left: versusItem, right: versusItem }),
  }),
  z.object({
    component: z.literal('timeline'),
    data: z.object({ events: z.array(z.object({ time: z.string(), label: z.string() })).min(2).max(6) }),
  }),
  z.object({
    component: z.literal('split'),
    data: z.object({ parts: z.array(z.object({ label: z.string(), percent: z.number(), value: z.string().optional() })).min(2).max(4) }),
  }),
  z.object({
    component: z.literal('checklist'),
    data: z.object({ items: z.array(z.string()).min(2).max(5) }),
  }),
  z.object({
    component: z.literal('callout'),
    data: z.object({ text: z.string(), source: z.string().optional() }),
  }),
  z.object({
    component: z.literal('table'),
    data: z.object({
      headers: z.array(z.string()).min(2).max(4),
      rows: z.array(z.array(z.string())).min(1).max(5),
    }),
  }),
  z.object({
    component: z.literal('pyramid'),
    data: z.object({ levels: z.array(z.string()).min(2).max(5) }),
  }),
  // ── New (Tier 1) ──────────────────────────────────────────────────────────
  z.object({
    component: z.literal('radial'),
    data: z.object({ value: z.string(), label: z.string(), sublabel: z.string().optional() }),
  }),
  z.object({
    component: z.literal('circleStats'),
    data: z.object({ items: z.array(z.object({ value: z.string(), label: z.string(), sublabel: z.string().optional() })).min(2).max(4) }),
  }),
  z.object({
    component: z.literal('spectrum'),
    data: z.object({ min: z.number(), max: z.number(), from: z.number(), to: z.number(), label: z.string(), unit: z.string().optional() }),
  }),
  z.object({
    component: z.literal('funnel'),
    data: z.object({ stages: z.array(z.object({ label: z.string(), value: z.string().optional(), percent: z.number().optional() })).min(2).max(5) }),
  }),
  z.object({
    component: z.literal('scorecard'),
    data: z.object({ score: z.string(), label: z.string(), sublabel: z.string().optional() }),
  }),
  z.object({
    component: z.literal('bubbles'),
    data: z.object({ items: z.array(z.object({ label: z.string(), size: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(), sublabel: z.string().optional() })).min(2).max(5) }),
  }),
  z.object({
    component: z.literal('iconStat'),
    data: z.object({ icon: z.string(), value: z.string(), unit: z.string().optional(), label: z.string(), sublabel: z.string().optional() }),
  }),
  // ── New (Tier 2) ──────────────────────────────────────────────────────────
  z.object({
    component: z.literal('matrix2x2'),
    data: z.object({ topLeft: z.string(), topRight: z.string(), bottomLeft: z.string(), bottomRight: z.string(), xLabel: z.string().optional(), yLabel: z.string().optional() }),
  }),
  z.object({
    component: z.literal('stackedBar'),
    data: z.object({ segments: z.array(z.object({ label: z.string(), percent: z.number(), value: z.string().optional() })).min(2).max(5), title: z.string().optional() }),
  }),
  z.object({
    component: z.literal('processFlow'),
    data: z.object({ steps: z.array(z.string()).min(2).max(5) }),
  }),
  z.object({
    component: z.literal('heatGrid'),
    data: z.object({ cells: z.array(z.object({ label: z.string(), value: z.number().int().min(1).max(3) })).min(2).max(12), title: z.string().optional() }),
  }),
  z.object({
    component: z.literal('vector'),
    data: z.object({
      keywords: z.string(),
      label: z.string().optional(),
      mood: z.enum(['calm', 'energetic', 'scientific', 'playful']).optional(),
    }),
  }),
  // ── Layout Infographics (Tier 3) ──────────────────────────────────────────
  z.object({
    component: z.literal('hubSpoke'),
    data: z.object({
      center: z.string(),
      spokes: z.array(z.object({ label: z.string() })).min(3).max(5),
    }),
  }),
  z.object({
    component: z.literal('iceberg'),
    data: z.object({
      surface: z.array(z.string()).min(1).max(3),
      hidden: z.array(z.string()).min(2).max(4),
      surfaceLabel: z.string().optional(),
      hiddenLabel: z.string().optional(),
    }),
  }),
  z.object({
    component: z.literal('bridge'),
    data: z.object({
      from: z.string(),
      to: z.string(),
      label: z.string().optional(),
    }),
  }),
  z.object({
    component: z.literal('circularCycle'),
    data: z.object({
      steps: z.array(z.object({ label: z.string() })).min(3).max(5),
    }),
  }),
  z.object({
    component: z.literal('bento'),
    data: z.object({
      tiles: z.array(z.object({ icon: z.string(), label: z.string(), body: z.string().optional() })).min(2).max(4),
    }),
  }),
  z.object({
    component: z.literal('conceptFlow'),
    data: z.object({
      nodes: z.array(z.object({ label: z.string(), sublabel: z.string().optional() })).min(3).max(5),
      title: z.string().optional(),
    }),
  }),
  z.object({
    component: z.literal('icon'),
    data: z.object({ id: z.string(), label: z.string().optional() }),
  }),
  z.object({
    component: z.literal('iconLayout'),
    data: z.object({
      icons: z.array(z.object({ id: z.string() })).min(1).max(4),
      layout: z.enum(['row', 'column', 'grid', 'scattered']),
      showLabels: z.boolean().optional(),
    }),
  }),
]);

export type GraphicSpec = z.infer<typeof GraphicSpecSchema>;

/** Editorial-only structured spec for the hook image. Populated by Claude
 *  during /api/carousel-v2/generate when stylePreset === "editorial-scientific".
 *  The carousel-v2/generate-image route assembles a poster-style prompt from
 *  this spec + the chosen hook's headline/subline (text baked into the image). */
/** Concept-only brief — we hand gpt-image-2 the topic concept + the exact
 *  text to bake and let the model interpret the scene. Older saved carousels
 *  may still carry the legacy subject/composition/sceneElements fields; the
 *  image route falls back to them when concept is missing. */
export type EditorialHookImageSpec = {
  /** One sentence (≤30 words) capturing the science / concept the hook is
   *  about. The visual interpretation is left to the image engine. */
  concept?: string;
  /** Optional short tagline (≤6 words) baked into the image as an editorial
   *  accent above the headline. */
  overlay?: string;
  /** Legacy fields — kept for backward compatibility with saved carousels
   *  generated before the concept-only framework. New generations leave them
   *  unset. */
  brandMood?: string;
  subject?: string;
  composition?: string;
  sceneElements?: string[];
};

export type CarouselContent = {
  hooks: Hook[];
  slides: CarouselContentSlide[];
  /** The closing CTA slide. `graphic` is optional — when set, it carries the
   *  same GraphicSpec JSON used by content slides (currently only iconLayout
   *  is rendered on the CTA). Lets the user attach a row of icons to the
   *  finish screen in the editorial preset. */
  cta: { headline: string; followLine: string; graphic?: string };
  /** Optional penultimate "payoff" slide (v2 standard format only). Recaps the
   *  deck into save-worthy takeaways and asks for one explicit interaction.
   *  Inserted BEFORE the CTA. Absent on engagement carousels and on saved
   *  carousels generated before this slide existed — renderers must guard. */
  takeaway?: {
    headline: string;                                  // short payoff headline (uppercase, ≤6 words)
    points: string[];                                  // 2-3 one-line recap takeaways
    interaction: { type: "save" | "send" | "comment"; label: string };
  };
  caption: string; // IG caption including hashtags
  imagePrompt?: string; // Claude-written Recraft V3 prompt for the hook slide background
  commentKeyword?: string; // engagement format: auto-generated keyword for comment CTA
  /** Editorial-scientific only: structured hook-image brief written by Claude. */
  hookImageSpec?: EditorialHookImageSpec;
  /** Verbatim prompt the user typed in the "Edit hook-image prompt" panel.
   *  When set, the image route bypasses its own assembly (editorial framework
   *  OR mood styleBlock) and sends this string to fal/gpt verbatim. Persisted
   *  on save so manual edits survive reload. Clear to fall back to assembled. */
  hookImagePromptOverride?: string;
};

export type GraphicStyle =
  | "wave"
  | "dotchain"
  | "bars"
  | "steps"
  | "stat"
  | "iconGrid"
  | "textOnly";

export type BrandStyle = {
  background: string;      // content + CTA slide background
  hookBackground: string;  // hook slide background (usually dark)
  headline: string;        // headline text on content/CTA slides
  hookHeadline: string;    // headline text on hook slide (usually light)
  body: string;            // body paragraph text
  accent: string;          // accent / highlight color
  secondary: string;       // muted / citation text
};

/** Carousel-wide style preset. "editorial-scientific" applies the Lunia brand
 *  palette, Inter normal/light typography, and routes image generation through
 *  gpt-image-2 with the matching visual mood. */
/** Hook-image value structure. "high" swaps the Editorial Scientific palette
 *  for a two-zone frame: a paper type band over a near-black subject ground
 *  with one luminous focal element. Only meaningful on that preset. */
export type CarouselContrastMode = "standard" | "high";

export type CarouselStylePreset = "default" | "editorial-scientific" | "free-press";

/** Hook slide headline boldness. "default" preserves the original weight (400 / 300 editorial). */
export type HookHeadlineWeight = "default" | "medium" | "bold" | "black";

export type CarouselConfig = {
  topic: string;
  content: CarouselContent;
  selectedHook: number;
  brandStyle?: BrandStyle;
  hookImageUrl?: string; // template image used as hook slide background overlay
  slideImages?: (string | null)[]; // fal.ai generated images: index 0=hook, 1-3=content, 4=CTA
  /** AI-generated background images for content slides 1-3 (indexed 0..2). Each entry may be null when no bg has been generated. */
  contentBgImages?: (string | null)[];
  /** 0..1 — opacity of the slide-color overlay on top of contentBgImages. Higher = image more muted. */
  contentBgOverlayOpacity?: number;
  /** Carousel-wide style preset. Default → "default". */
  stylePreset?: CarouselStylePreset;
};

/** v2 hook image overlay settings — inlined as a plain shape so types.ts stays free of UI imports. Mirrors HookOverlaySettings in components/carousel/shared/HookOverlays.tsx. */
export type SavedHookOverlays = {
  frame: { enabled: boolean; color: string; opacity: number; inset: number };
  vignette: { enabled: boolean; intensity: number };
  colorGrade: { enabled: boolean; intensity: number };
  grain: { enabled: boolean; opacity: number };
};

export type SavedCarousel = {
  id: string;
  topic: string;
  hookTone: HookTone;
  content: CarouselContent;
  selectedHook: number;
  graphicStyles?: [GraphicStyle, GraphicStyle, GraphicStyle]; // legacy
  brandStyle?: BrandStyle;
  hookImageUrl?: string;
  slideImages?: (string | null)[];
  showDecoration?: boolean;
  logoScale?: number;
  arrowScale?: number;
  darkBackground?: boolean;
  /** Free-form slide background hex; auto-derives ink from luminance. Overrides darkBackground when set. */
  slideBgColor?: string;
  /** AI-generated background images for content slides 1-3. */
  contentBgImages?: (string | null)[];
  /** 0..1 overlay opacity. */
  contentBgOverlayOpacity?: number;
  showLuniaLifeWatermark?: boolean;
  imageStyle?: string;     // "realistic" | "cartoon" | "anime" | "vector"
  format?: CarouselFormat; // "standard" (default) | "engagement" | "did_you_know"
  engagementSubType?: EngagementSubType; // "reveal" | "diagnostic" — only when format is "engagement"
  didYouKnowContent?: DidYouKnowContent; // present iff format === "did_you_know"
  reelsMode?: boolean;     // true = 9:16 Reels format
  citationFontSize?: number;
  headlineScale?: number;
  bodyScale?: number;
  /** Multiplier on rendered icon size for icon-layout graphics. */
  iconScale?: number;
  /** v2 hook image overlays (frame / vignette / color grade / grain). */
  hookOverlays?: SavedHookOverlays;
  /** Carousel-wide style preset (default → "default"). */
  stylePreset?: CarouselStylePreset;
  /** Decoration toggles — default true on every carousel for backward compat. */
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
  /** Hook slide headline boldness — "default" preserves today's weight (400 / 300 editorial). */
  hookHeadlineWeight?: HookHeadlineWeight;
  /** Editorial Scientific only — hook image URLs pregenerated per boldness level via
   *  "Generate other weights" (edit-based, same composition as the source image), so
   *  switching Hook weight in the editor can swap instantly instead of regenerating. */
  hookImagesByWeight?: Partial<Record<HookHeadlineWeight, string>>;
  /** Fact-verification result. Absent on carousels saved before verification
   *  existed and on any that have never been verified — treat absent as
   *  "unverified", never as "passed". */
  verification?: VerificationRecord;
  savedAt: string;
};

// ─── Content verification ─────────────────────────────────────────────────────
//
// Every hook, slide, email section and script line is a "unit". Each unit is
// hashed independently so editing slide 3 doesn't invalidate slides 1, 2, 4 and
// 5 and force a full re-verify.
//
// Verdicts are deliberately three-valued. A binary true/false would force every
// piece of framing ("YOUR 3AM WAKE-UP ISN'T RANDOM") into one bucket or the
// other, and either choice is wrong: calling it false is absurd, calling it true
// is a lie about what was checked.

/** What kind of claim this is, which decides whether it can be checked at all. */
export type ClaimCategory =
  /** A factual assertion that can be confirmed against a source. */
  | "checkable_factual"
  /** Framing, hooks, second-person address. Not checkable, not a defect. */
  | "subjective_framing"
  /** A drug/absolute/badge claim. Checked against banned-terms, not the web. */
  | "product_compliance";

export type ClaimVerdict =
  /** A real source supports it. */
  | "pass"
  /** Sources contradict it, or it is a compliance violation. */
  | "fail"
  /** No source found, or the claim is not the checkable kind. */
  | "unverifiable";

/** Traffic-light status for a unit or a whole piece of content. */
export type VerificationStatus = "green" | "amber" | "red";

/**
 * How much it costs to be wrong about this claim.
 *
 * Sorting by verifiability produced a wall of equal-weight dots: a call to
 * action and an invented dosage looked identical. This sorts by consequence
 * instead, which is the only question the user actually has.
 *
 * "high" — a specific number, dose, timing or percentage; a named study or
 *          institution; a health mechanism or causal claim; a compliance term.
 *          Always surfaced.
 * "low"  — directional or common-knowledge statements with no specifics.
 *          Checked and recorded, collapsed to a count in the UI.
 */
export type ClaimRisk = "high" | "low";

export type VerifiedClaim = {
  id: string;
  /** The atomic claim as extracted from the unit's text. */
  text: string;
  category: ClaimCategory;
  /** Absent on records written before risk scoring — treat as "high" so an
   *  older verdict is never silently downgraded into invisibility. */
  risk?: ClaimRisk;
  /** What the checker decided. Never overwritten by a human override. */
  verdict: ClaimVerdict;
  /** One-line justification for the verdict. */
  reasoning?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  /** The sentence from the source that actually supports the claim. */
  supportingQuote?: string;
  /** Set when a human overrules the checker. `verdict` is preserved alongside
   *  so you can always see what the machine originally said. */
  overriddenTo?: ClaimVerdict;
  overriddenAt?: string;
  overrideReason?: string;
};

/** The verdict in force: a human override when present, else the machine's. */
export function effectiveVerdict(claim: VerifiedClaim): ClaimVerdict {
  return claim.overriddenTo ?? claim.verdict;
}

export type VerifiedUnitKind = "hook" | "slide" | "takeaway" | "cta" | "caption" | "section" | "line";

export type VerifiedUnit = {
  /** Stable within a piece of content, e.g. "hook-0", "slide-2". */
  id: string;
  /** Human label for the UI, e.g. "Hook 1", "Slide 2". */
  label: string;
  kind: VerifiedUnitKind;
  /** SHA-256 of the unit's text at verification time. A mismatch against the
   *  live text means this unit was edited and its verdict is stale. */
  contentHash: string;
  claims: VerifiedClaim[];
  /** Set when this unit's verification failed outright (timeout, API error).
   *  A unit with an error is amber, never green. */
  error?: string;
};

/** Two units asserting different numbers for the same thing. */
export type VerificationConflict = {
  unitIds: string[];
  description: string;
};

export type VerificationRecord = {
  contentKind: "carousel" | "email" | "script";
  contentId: string;
  verifiedAt: string;
  units: VerifiedUnit[];
  conflicts: VerificationConflict[];
  /** True when the run ended early. `units` holds whatever completed. */
  partial?: boolean;
  /** How many units the run intended to check, for "N of M checked". */
  unitsPlanned?: number;
};

/**
 * One line of the NDJSON stream a verification run emits when the caller asks
 * for `stream: true`.
 *
 * The run already checks every unit in parallel and each `VerifiedUnit` is
 * self-describing, so reporting them as they settle costs nothing and lets the
 * UI show real progress instead of an invented percentage. `done` carries the
 * same payload the non-streaming response returns, so a client can ignore
 * every `unit` frame and still be correct.
 */
export type VerifyFrame =
  | { t: "start"; units: { id: string; label: string }[] }
  | { t: "unit"; unit: VerifiedUnit }
  /** Every unit is in; the cross-unit consistency pass is running. Without this
   *  the panel sits at "6 of 6" for the 5-20s that pass takes and looks hung. */
  | { t: "phase"; phase: "conflicts" }
  | {
      t: "done";
      record: VerificationRecord;
      status: VerificationStatus;
      summary: VerificationSummary;
      gating: SurfaceGating;
      warning?: string;
    }
  | { t: "error"; message: string };

/** Counts behind the panel header. Returned by `summarize`. */
export type VerificationSummary = {
  green: number;
  amber: number;
  red: number;
  total: number;
  overridden: number;
  findings: number;
  quiet: number;
};

// ─── Gating configuration ─────────────────────────────────────────────────────
//
// What each status does at a download / export / push button. Configurable
// rather than hardcoded so the rules can change without a redeploy — the
// initial amber-warns call was made with no data on real amber rates, and the
// first production run came back with 2 of 3 hooks unsourced.

export type GatingAction =
  /** Refuse the action outright. */
  | "block"
  /** Allow, but show the state on the control itself. */
  | "warn"
  /** Allow only after every flagged unit is explicitly acknowledged. */
  | "require_ack";

export type SurfaceGating = {
  amber: GatingAction;
  red: GatingAction;
};

export type GatingConfig = {
  carousel: SurfaceGating;
  email: SurfaceGating;
  script: SurfaceGating;
};

/**
 * Ships fully advisory: nothing blocks, everything is visible.
 *
 * Red blocked downloads until 2026-08-14. The user asked for that to stop, and
 * the reasoning holds: this is a single-operator tool where the operator is the
 * one reading the findings. A gate that refuses to hand you your own file is
 * paternalistic when the person it is protecting you from is you. The signal is
 * the product; the lock was never the point.
 *
 * The controls still carry their state (a red export is visibly a red export),
 * and blocking remains one config change away per surface if that ever changes.
 */
export const DEFAULT_GATING: GatingConfig = {
  carousel: { amber: "warn", red: "warn" },
  email: { amber: "warn", red: "warn" },
  script: { amber: "warn", red: "warn" },
};

export type CarouselTemplateImage = {
  id: string;
  url: string;
  slideName: string;
};

export type CarouselTemplate = {
  id: string;
  name: string;
  description?: string;
  contentDensity: "minimal" | "medium" | "dense";
  styleNotes?: string;
  images: CarouselTemplateImage[];
  brandStyle?: BrandStyle;
  uploadedAt: string;
};

export type Subject = {
  id: string;
  text: string;
  category: string;
  usedAt?: string;     // ISO date when last used for a carousel
  sourceUrl?: string;  // optional citation URL (set for "Latest Research" auto-pulls)
};

export type AssetType =
  | "logo"
  | "carousel-style"
  | "product-image"
  /** Hand-picked lifestyle photography — people, rooms, light, moments. The
   *  everyday stock the email chooser reaches for when a block is about a
   *  feeling or a routine rather than the product itself. */
  | "lifestyle"
  /** Younger-skewing imagery: phone-first framing, street and social settings,
   *  bolder colour. Separated from `lifestyle` because the two are rarely
   *  interchangeable in one email — a campaign is pitched at one audience or
   *  the other, and mixing them reads as a stock-photo grab bag. */
  | "gen-z"
  | "other"
  /** Auto-registered when a carousel is saved. Carries lifestyle / editorial
   *  images that the carousel produced (hooks + content backgrounds), so the
   *  email campaign picker can reuse them. Text-free only — editorial hooks
   *  with baked text are intentionally skipped. */
  | "carousel-generated"
  /** Auto-registered when an image is generated in the email campaign
   *  editor. Lifestyle scenes only (no product / no text), so they're safe
   *  to re-use as backgrounds anywhere. De-duped by URL so multiple
   *  campaigns sharing the same generated image only land once. */
  | "email-generated";

export type AssetMetadata = {
  id: string;
  url: string;
  name: string;
  type: string;        // MIME type
  assetType: AssetType; // usage classification
  uploadedAt: string;
  /** What is actually IN the picture, written by a vision call at upload.
   *  This is the only thing the model reads when it picks an image for a
   *  block: a filename like IMG_4821.jpg says nothing, so an asset without a
   *  description is effectively invisible to `/api/campaign/choose-asset`.
   *  Optional because captioning is best-effort — a failed or skipped caption
   *  (SVG, no API key) must never cost you the upload. */
  description?: string;
  /** Optional provenance — set on auto-registered carousel images so the
   *  picker can show context (topic + slide role). */
  source?: {
    carouselId?: string;
    topic?: string;
    role?: "hook" | "slide-bg";
  };
};

export type MultiVariantResponse = {
  variants: CarouselContent[];
  warning?: string; // e.g. "2 of 5 variants failed — showing 3"
};

// ─── Campaign builder (email campaigns) ──────────────────────────────────────

// Type-only import: campaign-theme imports CampaignContent from here, so a
// value import would be a cycle. `import type` is erased at compile time.
import type { BrandColorRole } from "./campaign-theme";

/** One image in a campaign email. Either AI-generated (lifestyle, no text/logo)
 *  or sourced from an uploaded asset (bottle / logo / product shots). */
export type CampaignImageSlot = {
  id: string;
  role: "hero" | "secondary";
  source: "generated" | "asset" | "upload";
  /** generated: gpt-image-2 lifestyle prompt — no text, no bottle, no logo. */
  prompt?: string;
  /** generated: visual mood id (from VISUAL_MOODS) steering the look. */
  mood?: string;
  /** "16:9" is the full-width/bleed banner aspect. All three have exact pixel
   *  targets in EMAIL.imageSizes and are center-cropped server-side, so a
   *  slot always comes back at the aspect the layout was designed around. */
  aspect: "4:5" | "1:1" | "16:9";
  /** asset: chosen uploaded asset id (from the asset library). */
  assetId?: string;
  /** Resolved final image url — mirrored blob url (generated), asset url,
   *  or (upload) a temp/-prefixed blob url that auto-expires after a few
   *  days (see /api/campaign/cleanup-temp-images) and is never added to the
   *  permanent asset library. */
  url?: string | null;
};

/** Every block kind, in one place. This array is the single source of truth:
 *  `CampaignBlockKind` derives from it, the editor's "+ Block" menu is keyed on
 *  it, and the renderer dispatches through a Record keyed on it — so a kind
 *  added here without a renderer is a compile error rather than a block that
 *  silently renders nothing.
 *
 *  Two registries deliberately do NOT derive from this:
 *   - The zod union in campaign-layout-prompts.ts (each variant carries
 *     different fields, and "image" is intentionally absent because the AI
 *     places copy, not image slots). It gets a runtime set-equality test with
 *     an explicit exclusion list instead.
 *   - `CampaignBlock` itself. The flat optional-field bag below is deliberately
 *     a different shape from that discriminated union; deriving one from the
 *     other would rewrite every consumer for no user-visible gain. */
export const CAMPAIGN_BLOCK_KINDS = [
  "text",
  "stat",
  "discount",
  "checklist",
  "testimonial",
  "timeline",
  "trustgrid",
  "comparison",
  "ingredients",
  "image",
  "table",
  "imagetext",
  "imagebullets",
  "grid",
  "headerimage",
] as const;

export type CampaignBlockKind = (typeof CAMPAIGN_BLOCK_KINDS)[number];

/** Kinds that own their whole table row rather than rendering inside the
 *  shared 24px-padded text wrapper. "image" needs this so its `bleed` layout
 *  can go edge-to-edge across the full 600px shell; "headerimage" needs it for
 *  the same reason, and additionally suppresses the hero row so it can be the
 *  actual top of the email rather than a divider below a 552px photo. */
export const FULL_ROW_BLOCK_KINDS = ["image", "headerimage"] as const;
export type FullRowBlockKind = (typeof FULL_ROW_BLOCK_KINDS)[number];
/** Kinds whose renderer returns an inner fragment for the padded wrapper. */
export type InnerBlockKind = Exclude<CampaignBlockKind, FullRowBlockKind>;

/** Relative type size for a block's HEADING — the block's own title line, as
 *  distinct from its body copy (which is sized per phrase by the inline style
 *  toolbar). A closed set rather than a free px value so a header can't be set
 *  to 9px or 90px, the same reason `weight` is an enum.
 *
 *  Unset is "m", which resolves to a scale of exactly 1, so every campaign
 *  saved before this control existed renders byte-for-byte unchanged. */
export const CAMPAIGN_HEADING_SIZES = ["s", "m", "l", "xl"] as const;
export type CampaignHeadingSize = (typeof CAMPAIGN_HEADING_SIZES)[number];

/** A crop, in FRACTIONS of the source image rather than pixels, so it survives
 *  the source being re-encoded at another size. `x`/`y` are the top-left of the
 *  kept region, `w`/`h` its size. The aspect the region must satisfy comes from
 *  the block kind, not from here. */
export type ImageCrop = { x: number; y: number; w: number; h: number };

export type CampaignBlock = {
  id: string;
  /** For kind "text" (or unset): the paragraph body — may contain inline
   *  `**bold**` / `[text](url)` markup and `{{ merge_tag }}` personalization
   *  tokens, both preserved verbatim by the "Improve with Claude" rewrite.
   *  For kind "stat"/"discount": unused (their content lives in the
   *  kind-specific fields below). For kind "checklist": unused, see `items`. */
  body: string;
  align: "left" | "center";
  italic?: boolean;
  /** Body font weight. "light" = Inter 300 (default, matches the template's
   *  original look); "normal" = Inter 400; "extralight" = Inter 200; "thin" =
   *  Inter 100. Unset is treated as "light" so campaigns saved before this
   *  control render identically. */
  weight?: "thin" | "extralight" | "light" | "normal";
  /** Size of this block's HEADER line, relative to that header's default.
   *  Which line counts as the header depends on the kind — the stat's number,
   *  the discount code, the ingredients panel title, the table's column
   *  headers, the imagetext/grid headings, the image overlay headline, the
   *  headerimage headline, the timeline row labels, the comparison column
   *  labels. Kinds with no header of their own (text, checklist, testimonial,
   *  trustgrid, imagebullets) ignore it and hide the control.
   *
   *  Unset is "m" — the size that header has always rendered at. */
  headingSize?: CampaignHeadingSize;
  /** Which way this block's HEADER line sits. Applies to the same line
   *  `headingSize` does, and like it, unset renders byte-for-byte what the
   *  block always did — each kind keeps whatever alignment it was designed
   *  with until you say otherwise.
   *
   *  The `table` kind is deliberately exempt: its column headers take their
   *  alignment from the columns, so overriding it would peel the headers off
   *  the numbers underneath them. */
  headingAlign?: "left" | "center" | "right";
  /** Block content type. Unset/"text" = the original free-prose paragraph
   *  (back-compat: every block saved before this field existed renders
   *  identically). All other kinds are structured callouts — see the
   *  kind-specific fields below. */
  kind?: CampaignBlockKind;
  /** kind "stat": the big number/headline, e.g. "558 reviews". */
  statValue?: string;
  /** kind "stat": the supporting caption, e.g. "91% five-star". */
  statLabel?: string;
  /** kind "discount": the code itself, e.g. "SLEEP20". */
  discountCode?: string;
  /** kind "discount": what it does, e.g. "20% off your first order". */
  discountDescription?: string;
  /** kind "discount": the struck-through original price, e.g. "$87.99". Renders
   *  alongside discountCode/discountDescription — the "was $X, now free/on
   *  sale" pattern, distinct from a coupon code. */
  originalPrice?: string;
  /** kind "discount": the new/free price shown next to originalPrice, e.g.
   *  "FREE" or "$29.20". */
  newPrice?: string;
  /** kind "checklist": one line per benefit/ingredient item. */
  items?: string[];
  /** kind "testimonial": the review/quote text. */
  testimonialQuote?: string;
  /** kind "testimonial": attribution, e.g. "Sarah K., verified customer". */
  testimonialAuthor?: string;
  /** kind "testimonial": star rating 1-5. Defaults to 5 when unset. */
  testimonialStars?: number;
  /** kind "timeline": ordered rows like { label: "30 DAYS", text: "85% felt
   *  more energy" } — a results-over-time progression. */
  timelineRows?: { label: string; text: string }[];
  /** kind "trustgrid": a 2-column grid of image + caption pairs for a
   *  "why we're different" trust argument. imageUrl is a plain pasted URL,
   *  not an asset-picker selection — caption is the required field, an
   *  image with no caption is dropped at render time. */
  trustItems?: { imageUrl?: string; caption: string }[];
  /** kind "comparison": fixed 2-column "one-time vs subscribe" shape. Renders
   *  only when both comparisonLeftLabel and comparisonRightLabel are set. */
  comparisonLeftLabel?: string;
  comparisonLeftPrice?: string;
  comparisonLeftPerk?: string;
  comparisonRightLabel?: string;
  comparisonRightPrice?: string;
  comparisonRightPerk?: string;
  /** kind "ingredients": a supplement-facts panel. `ingredientHeading` is the
   *  panel title (e.g. "What's inside"), `ingredientItems` the name+dose rows,
   *  `ingredientFootnote` an optional trust line (e.g. "Melatonin-free ·
   *  Third-party tested"). Renders only when at least one item has a name. */
  ingredientHeading?: string;
  ingredientItems?: { name: string; dose: string }[];
  ingredientFootnote?: string;
  /** kind "table": column headers, 2 to 4 of them. The header count defines
   *  the table's width; rows are padded or truncated to match at render time,
   *  so adding a column never leaves ragged rows behind. */
  tableHeaders?: string[];
  /** kind "table": one entry per body row. Renders only when there is at least
   *  one header and one row. */
  tableRows?: { cells: string[] }[];
  /** kind "table": 0-based index into `tableRows` of the row to emphasise (the
   *  recommended option in a pricing comparison). Out-of-range means no
   *  emphasis, so deleting the emphasised row degrades quietly. */
  tableEmphasisRow?: number;
  /** Editor-only: this block still holds the starter content it was created
   *  with. NEVER read by the renderer, so it cannot affect an email or change
   *  how any previously-saved campaign renders. Cleared only by an explicit
   *  Keep or Clear, not by the first keystroke: a table has twelve cells, and
   *  editing one of them does not make the other eleven yours. */
  isSample?: boolean;
  /** kinds "imagetext" / "imagebullets" / "headerimage": the picture. A plain
   *  URL, either pasted or produced by the block's own generate button. Unlike
   *  kind "image" this is NOT a slot in `content.images` — these blocks own
   *  their picture, so it travels with the block when it is moved, copied or
   *  banked as a snippet. */
  imageUrl?: string;
  /** The prompt that produced `imageUrl`, kept so regenerating is one click
   *  and so the user can edit it rather than retyping. */
  imagePrompt?: string;
  /** Which model tier rewrites this block's image prompt. Tiers, not raw model
   *  ids: the ids move, and a campaign lives in an un-migratable blob, so a
   *  saved id would eventually name a model that no longer exists.
   *  Unset = "craft", the tier the endpoint has always used. */
  promptModel?: "draft" | "craft" | "content";
  /** Standing instructions for this block's prompt rewrites — "shot on film",
   *  "no people", "show the product in use". Persisted on the block, so it
   *  survives a reorder and travels with the block into a snippet. */
  promptInstructions?: string;
  /** Where `imageUrl` was cropped FROM, and how.
   *
   *  Email HTML cannot crop — `height:auto` renders whatever shape the source
   *  is, which is how a square and a tall portrait ended up side by side in
   *  one grid row with the captions unable to line up. So the crop is baked
   *  into a new image and `imageUrl` points at that. These two keep the crop
   *  EDITABLE rather than baked-and-lost: the original to re-crop from, and
   *  the rect that produced the current one.
   *
   *  Unset means the image was never cropped (pasted, generated, or saved
   *  before this existed), which is exactly the case "Edit crop" exists for. */
  imageSourceUrl?: string;
  imageCrop?: ImageCrop;
  /** Which model DRAWS this block's picture — distinct from `promptModel`,
   *  which only picks who writes the words. A bare string rather than the
   *  engine's union: types.ts is imported by client components and the engine
   *  is server-only. Validated by resolveEmailImageModel at the route. */
  imageModel?: string;
  /** kinds "imagetext" / "imagebullets": which side the picture sits on.
   *  Unset is "left". On mobile both stack, image first. */
  imagePosition?: "left" | "right";
  /** kind "imagetext": an optional heading above the copy. The copy itself
   *  reuses `body`, so the text toolbar, AutoTextarea and paragraph rendering
   *  all work with no new plumbing. */
  imageHeading?: string;
  /** kind "imagebullets": one line per bullet. */
  bulletItems?: string[];
  /** kind "imagebullets": the marker colour, as a brand ROLE not a hex, so an
   *  off-brand or illegible colour is unrepresentable. Resolved per theme by
   *  resolveBrandColor, which substitutes when the pick would not be legible. */
  bulletColor?: BrandColorRole;
  /** kind "grid": 2-column cells of picture + heading + caption. Each cell can
   *  generate its own image from its own text. */
  gridCells?: {
    imageUrl?: string; imagePrompt?: string; heading?: string; caption?: string;
    /** Per cell, because each cell owns its own picture — and two cells with
     *  different source shapes is exactly the row that would not line up. */
    imageSourceUrl?: string; imageCrop?: ImageCrop;
  }[];
  /** kind "headerimage": "card" puts the headline in a panel overlapping the
   *  top of a full-bleed image; "pill" puts a highlighted eyebrow and headline
   *  above it. Unset is "card". */
  headerStyle?: "card" | "pill";
  headerHeadline?: string;
  /** kind "headerimage", style "pill": the highlighted eyebrow above the
   *  headline. */
  headerPillText?: string;
  /** kind "headerimage", style "card": an optional second card below the
   *  image, right-aligned. */
  headerSubcard?: string;
  /** kind "image": which slot in `content.images` this block places. The block
   *  owns POSITION and LAYOUT; the slot still owns the prompt/source/url, so
   *  generation, asset-picking and the save-route's blob mirroring all keep
   *  working unchanged. A slot referenced here is skipped by the legacy 2-up
   *  secondary grid — it renders here instead. */
  imageSlotId?: string;
  /** kind "image": how wide the image renders.
   *  "column" (default) — inset to the 552px content column, 8px radius.
   *  "bleed"            — edge-to-edge across the full 600px shell, no radius.
   *  "split"            — 50/50 image + copy row, stacks on mobile. */
  imageLayout?: "column" | "bleed" | "split";
  /** kind "image", layout "split": the copy beside the image, and which side
   *  the image sits on. Unset side = image left. */
  imageSplitText?: string;
  imageSplitSide?: "left" | "right";
  /** kind "image", layout "column"/"bleed": optional text laid OVER the image
   *  as real HTML (never baked into pixels, so it stays crisp and editable).
   *  Outlook drops position:absolute, so the same words also render in an
   *  mso-only caption bar beneath the image. */
  imageOverlayEyebrow?: string;
  imageOverlayHeadline?: string;
};

/** A reusable block, banked from any campaign so it can be dropped into any
 *  future one — a proven trust line, a standard sign-off, a review callout
 *  you write over and over. Captures the whole block shape (minus id), not
 *  just bare text, so a snippet is a complete, ready-to-drop block. */
export type CampaignSnippet = {
  id: string;
  name: string;
  block: Omit<CampaignBlock, "id">;
  createdAt: string;
};

export type CampaignContent = {
  subjectLines: string[];        // 3 options
  selectedSubject: number;
  previewText: string;           // preheader
  /** Thin top banner above the logo. Caps Inter rendered. Wrap a fragment
   *  with `**...**` to render it as a navy highlight pill. Empty/unset → hidden. */
  topBanner?: string;
  /** Resolved Lunia logo url (from the asset library, assetType "logo").
   *  Server sets this on generate. Renderer skips the logo strip if unset. */
  logoUrl?: string | null;
  /** When false, the logo strip is hidden even if logoUrl is set.
   *  Unset/true = shown (back-compatible with saves that predate the toggle). */
  showLogo?: boolean;
  promoBand?: string;            // crisp HTML band text, e.g. "MEMORIAL DAY WEEKEND SALE"
  /** The band's colour, as a brand ROLE. Unset follows the theme — cream on
   *  navy, and navy on cream, because a white strip on an ivory ground is not
   *  a strip. The label ink is derived from the chosen ground by measured
   *  contrast, so no role can produce an unreadable band. */
  promoRole?: BrandColorRole;
  /** Whole-email colour theme. Unset/"navy" is the original navy shell with
   *  white copy; "cream" is the handbook's Soft Ivory ground with dark ink.
   *  Back-compat: unset renders byte-identically to every campaign saved
   *  before this field existed. */
  theme?: "navy" | "cream";
  blocks: CampaignBlock[];       // ordered body text blocks
  /** Vertical gap BELOW each body block, in px — the whitespace between one
   *  block and the next. Unset is 16, the gap every campaign has always had,
   *  so old saves render byte-for-byte unchanged. Clamped to 0–48 at render
   *  time so a corrupt or hand-edited value can't blow the email apart.
   *  Scoped to blocks: the hero, promo band, image grid and CTA keep their own
   *  fixed rhythm, which is not "space between blocks". */
  blockSpacing?: number;
  /** style: "cream" (default, unset = cream) is the cream-pill/navy-text
   *  button used since launch. "navy" inverts it to a solid navy button
   *  with white text. `style` controls the bottom CTA button.
   *  `heroStyle` controls the hero-image CTA overlay independently; when
   *  unset it falls back to `style` (back-compat with saves that predate
   *  the split). `showOnHero: false` removes the overlay pill from the hero
   *  image entirely (the hero stays tappable via its wrapping link; the
   *  bottom CTA button is unaffected). Unset/true = shown. */
  cta: {
    label: string;
    url: string;
    style?: "cream" | "navy";
    heroStyle?: "cream" | "navy";
    /** Explicit CTA colour, as a brand ROLE. Overrides `style`/`heroStyle` and
     *  applies on BOTH themes — the cream theme forces navy when this is
     *  unset, which is why the colour could not always be changed. The label
     *  ink is derived from the chosen ground by measured contrast, so no role
     *  can produce an unreadable button.
     *
     *  `heroBgRole` falls back to `bgRole`, which falls back to the old
     *  style-based behaviour, so unset renders exactly as before. */
    bgRole?: BrandColorRole;
    heroBgRole?: BrandColorRole;
    showOnHero?: boolean;
    /** Position of the CTA pill over the hero image, as percentages of the
     *  hero. BOTH unset means "the original bottom-centre placement", and the
     *  renderer then emits the exact markup it always did, so every campaign
     *  saved before this existed renders byte-for-byte unchanged. Clamped by
     *  clampHeroCta so the pill cannot leave the image. */
    heroX?: number;
    heroY?: number;
    /** Editor-only guard against nudging the pill by accident. NEVER read by
     *  the renderer, so it cannot affect an email. */
    heroLocked?: boolean;
  };
  images: CampaignImageSlot[];   // 1 hero + 2–4 secondary
};

export type SavedCampaign = {
  id: string;
  topic: string;
  createdAt: string;
  content: CampaignContent;
};

// ─── Claims ledger ────────────────────────────────────────────────────────────
export type FactStatus = "verified" | "pending" | "retracted";

/** One sourced fact, keyed to a subject. See src/lib/facts.ts. */
export type Fact = {
  id: string;
  /** Subject library id when known. */
  subjectId?: string;
  /** Subject text, or the carousel topic the fact was verified under. */
  subjectText: string;
  /** One sentence carrying the figure. */
  statement: string;
  /** The figure on its own, for display: "8 mg per 200 ml cup". */
  value?: string;
  source: { citation?: string; url?: string; title?: string; quote?: string };
  status: FactStatus;
  origin: "verification" | "research" | "manual";
  /** Document it was verified in, when it came from a fact check. */
  contentId?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  /** Earlier statements, kept so an old value can be hunted down. */
  previous?: { statement: string; changedAt: string }[];
  note?: string;
};

// ─── Analytics / Dashboard ───────────────────────────────────────────────────

export type MetaCampaign = {
  campaignId: string;
  campaignName: string;
  campaignObjective?: string; // e.g. OUTCOME_SALES, OUTCOME_AWARENESS
  spend: number;           // USD
  revenue: number;         // from action_values[offsite_conversion.fb_pixel_purchase]
  roas: number;            // revenue / spend
  impressions: number;
  clicks: number;
  ctr: number;             // clicks / impressions * 100
  linkClicks: number;      // inline_link_clicks
  cpm: number;             // spend / impressions * 1000
  purchases: number;       // count from actions[offsite_conversion.fb_pixel_purchase]
};

export type MetaAd = {
  adId: string;
  adName: string;
  adsetName?: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  linkClicks: number;    // inline_link_clicks
  ctr: number;           // linkClicks / impressions * 100
  cpm: number;           // spend / impressions * 1000
  purchases: number;     // count from actions[offsite_conversion.fb_pixel_purchase]
};

export type MetaAdInsight = {
  date: string;            // YYYY-MM-DD
  spend: number;
  revenue: number;
};

export type MetaData = {
  summary: {
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
  };
  campaigns: MetaCampaign[];
  ads: MetaAd[];
  by_day: MetaAdInsight[];
  truncated?: boolean;  // true if pagination cap was hit and totals may be understated
};

export type ShopifyDayRow = {
  date: string;            // YYYY-MM-DD
  orders: number;
  revenue: number;
};

export type ShopifyProduct = {
  productTitle: string;
  variantTitle?: string;
  orders: number;
  revenue: number;
};

export type ShopifyData = {
  summary: {
    orders: number;
    /** Gross sales — line items × quantity BEFORE discounts. Matches Shopify "Gross sales". */
    revenue: number;
    /** Total discounts applied across countable orders. Matches Shopify "Discounts". */
    discounts: number;
    /** Refunded amount across countable orders (total_price − current_total_price). Matches Shopify "Returns" + return-related fees. */
    returns: number;
    /** revenue − discounts − returns. Matches Shopify "Net sales". */
    netRevenue: number;
    aov: number;                  // 0 if orders === 0 (guard against div/0)
    subscriptionRevenue: number;  // revenue from subscription orders
    onetimeRevenue: number;       // revenue from one-time purchase orders
    subscriptionOrders: number;   // count of subscription orders
    onetimeOrders: number;        // count of one-time purchase orders
  };
  by_day: ShopifyDayRow[];
  products: ShopifyProduct[];  // top products by revenue
  truncated?: boolean;         // true if pagination cap was hit and totals may be understated
};

export type ShopifyLTVData = {
  avgSubscriptionLTV: number;    // mean all-time revenue per subscription customer
  avgOnetimeLTV: number;         // mean all-time revenue per one-time customer
  subscriptionCustomerCount: number;
  onetimeCustomerCount: number;
};

export type ShopifyMtdData = {
  orders: number;              // countable orders since 1st of month (paid + refunded statuses)
  revenue: number;             // Gross sales — line items × qty BEFORE discounts (matches Shopify "Gross sales")
  discounts: number;           // Σ total_discounts (matches Shopify "Discounts")
  sessions: number;            // website sessions (0 if unavailable)
  cvr: number;                 // orders / sessions, 0 if sessions === 0
  sessionsAvailable: boolean;  // false if ShopifyQL not available on plan
  sessionsError?: string;      // human-readable reason if sessions unavailable
  // Checkout funnel (from read_checkouts — available on all plans)
  abandonedCheckouts: number;  // open/incomplete checkouts this month
  abandonedRevenue: number;    // value in abandoned checkouts
  checkoutCvr: number;         // orders / (orders + abandoned) * 100
  // Returning customers (from read_all_orders)
  returningOrders: number;     // orders from repeat customers
  returningRate: number;       // returningOrders / orders * 100
  // Refunds (from read_all_orders)
  refundedRevenue: number;     // Σ refunded amount per order (total_price − current_total_price)
  netRevenue: number;          // revenue − discounts − refundedRevenue (matches Shopify "Net sales")
  refundRate: number;          // % of orders with any refund
};

export type CombinedDayRow = {
  date: string;            // YYYY-MM-DD; sorts lexicographically
  spend: number;           // Meta spend
  shopifyRevenue: number;  // Shopify paid revenue; 0 if no orders that day
  shopifyOrders: number;
};

export type Insight = {
  title: string;
  body: string;
  type: 'positive' | 'warning' | 'neutral';
};

// ─── Video Ad types ───────────────────────────────────────────────────────────

export type VideoStyle = "cinematic" | "serene" | "bold";
export type VideoImageStyle = "realistic" | "cartoon" | "anime" | "vector";

export type VideoAdSceneType = "hook" | "science" | "product" | "proof" | "cta";

export type TextPosition = "top" | "center" | "bottom";

export type VideoAdScene = {
  type: VideoAdSceneType;
  durationFrames: number;   // at 30fps; hook=90, science=150, product=150, proof=150, cta=210
  headline: string;
  subline?: string;
  stat?: string;            // science + proof scenes only
  caption?: string;         // science scene: journal attribution
  textPosition?: TextPosition;
};

// How an image is fitted into the 9:16 frame
export type SceneImageFit = "cover" | "contain";

export type SceneImageConfig = {
  url: string;
  fit: SceneImageFit;
  // objectPosition for "cover" mode, e.g. "50% 30%". Defaults to "50% 50%"
  position?: string;
};

export type VideoTextStyle = {
  textBackdrop?: boolean;     // semi-transparent dark box behind text blocks
  textStroke?: boolean;       // dark outline around text for legibility
  fontWeight?: 700 | 900;     // 700 = bold, 900 = black/heavy
  allCaps?: boolean;          // UPPERCASE all headlines
  overlayOpacity?: number;    // 0–1; overrides the style-default image overlay
  lineBreakChars?: number;    // 0 = off; break headline at word boundary when line > N chars
};

export type VideoAdData = {
  topic: string;
  scenes: VideoAdScene[];   // exactly 5, one per type in order
  // Per-scene image assignment — any scene can have a background image
  sceneImages: Partial<Record<VideoAdSceneType, SceneImageConfig>>;
  fps: 30;
  durationFrames: number;   // sum of scene durationFrames
  logoUrl?: string;         // Lunia Life logo shown in CTA scene
  fontScale?: number;       // multiplier for all font sizes (default 1.0)
  videoStyle?: VideoStyle;
  videoFormat?: VideoFormat;
  textStyle?: VideoTextStyle;
};

export type SavedVideoAd = {
  id: string;
  topic: string;
  data: VideoAdData;
  renderUrl?: string;       // populated after Lambda render
  savedAt: string;
};

export type VideoAssetType = "product-image-vertical" | "lifestyle-image" | "product-video" | "logo";

export type VideoFormat = "brand-story" | "captions";

// ─── TikTok-style Captions composition ───────────────────────────────────────
export type VideoCaptionsData = {
  topic: string;
  captions: string[];          // 5-7 short sentences, shown word-by-word
  backgroundImageUrl?: string; // optional full-bleed background image
  logoUrl?: string;
  fontScale?: number;
  videoStyle?: VideoStyle;
  fps: 30;
  durationFrames: number;      // captions.length * 75
};

export type VideoAssetMetadata = {
  id: string;
  url: string;
  name: string;
  type: string;             // MIME type
  assetType: VideoAssetType;
  uploadedAt: string;
};

// ─── Email Intelligence types ─────────────────────────────────────────────────

export type StylePreset = 'minimal-modern' | 'story-driven' | 'bold-product-first';

export type EmailSection = {
  id: string;
  heading?: string;
  body: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageStyle?: "realistic" | "illustration" | "anime" | "vector";
};

export type EmailAnatomy = {
  subjectFormula: string;
  preheaderStrategy: string;
  visualStructure: string;
  inferredImageRatio: string; // heuristic: "heavy image", "text-first", "balanced"
  copyFramework: string;
  ctaType: string;
  hasPsLine: boolean;
};

export type SavedEmail = {
  id: string;
  competitorText: string;       // original pasted text (≤8000 chars, kept for side-by-side view)
  stylePreset: StylePreset;
  anatomy: EmailAnatomy;
  score: number;                // 1-10
  scoreDiagnosis: string;       // e.g. "Strong hook, weak CTA, no visual hierarchy"
  frameworkLabel: string;       // e.g. "Pattern Interrupt + PAS + Single CTA"
  sendTimingChip: string;       // e.g. "Educational → Tue/Wed 9am"
  generated: {
    subjectLines: string[];     // 3 variants in Lunia voice
    preheader: string;
    sections: EmailSection[];
    cta: string;
    ps: string;                 // always generated, non-optional
  };
  imageUrl?: string;
  imagePrompt?: string;         // shown in Image Zone, editable before generating
  savedAt: string;
};

// ─── Email Flow Review (v1 — replaces single-email rewriter UX with framework-driven flow review) ────

export type EmailFlowType =
  | "abandoned_checkout"
  | "browse_abandonment"
  | "welcome"
  | "post_purchase"
  | "replenishment"
  | "lapsed"
  | "campaign";

export type EmailFlowAsset = {
  id: string;
  position: number;             // E1 = 1, E2 = 2, ...
  /** Short label like "Day 0 — first touch". Set by create-flow; not present on Klaviyo/upload flows. */
  role?: string;
  subject: string;
  previewText: string;
  senderName: string;
  senderEmail: string;
  sendDelayHours: number;       // hours after trigger
  screenshotUrls?: string[];
  html?: string;
  bodyText?: string;
  metrics?: { openRate: number; clickRate: number; revenuePerRecipient: number };
};

export type EmailFlow = {
  id: string;
  source: "klaviyo" | "upload" | "carousel";
  klaviyoFlowId?: string;
  /** Set when source === "carousel" — the SavedCarousel.id this flow was generated from. */
  carouselId?: string;
  flowType: EmailFlowType;
  flowName: string;
  trigger: string;              // "Started Checkout event"
  emails: EmailFlowAsset[];
  fetchedAt: string;
};

export type FlowReviewSectionKey =
  | "headline"
  | "timing"
  | "subjects"
  | "rewrites"
  | "design"
  | "strategy";

export type FlowReviewFlag = {
  severity: "compliance" | "warning";
  text: string;
  emailId?: string;             // optional anchor to the offending email
};

export type FlowReviewSection = {
  key: FlowReviewSectionKey;
  title: string;
  bodyMarkdown: string;         // structured markdown rendered with the Lunia palette
  flags?: FlowReviewFlag[];
};

/**
 * Image engines for email-review image prompts. New reviews always use
 * "gpt-image-2" (OpenAI GPT Image 2 served via fal). The other engines are
 * kept in the union for back-compat with reviews saved before the switch —
 * generate-image will route them through gpt-image-2 on regenerate.
 */
export type FlowReviewImageEngine = "gpt-image-2" | "recraft" | "ideogram" | "flux2";

export type FlowReviewImagePrompt = {
  id: string;
  emailId: string;              // which EmailFlowAsset it replaces
  placement: "above_cta" | "below_cta" | "between_paragraphs" | "hero";
  aspect: "16:9" | "4:5" | "1:1";
  engine: FlowReviewImageEngine;
  prompt: string;               // 8-step structured prompt
  imageUrl?: string;
  status: "pending" | "generating" | "ready" | "error";
  errorMessage?: string;
  /**
   * Asset IDs (from AssetMetadata) Claude selected as references for this
   * image. The logo asset is always implicitly attached server-side; this
   * list is just the product/lifestyle picks for this specific email.
   */
  referenceAssetIds?: string[];
  /**
   * Extra reference image URLs the user attached manually (e.g. uploaded
   * one-off shots for this image only). Combined with referenceAssetIds
   * server-side before calling gpt-image-2/edit.
   */
  referenceImageUrls?: string[];
  // Set by /api/email-review/regen-suggestions before re-render. User picks one
  // → it overwrites prompt + engine + referenceAssetIds and triggers a fresh render.
  regenSuggestions?: { engine: FlowReviewImageEngine; prompt: string; rationale: string; referenceAssetIds?: string[] }[];
  // Previously rendered images stay accessible so the user can compare. Newest first.
  history?: { prompt: string; engine: FlowReviewImageEngine; imageUrl: string; renderedAt: string }[];
};

export type KlaviyoWritebackResult = {
  emailId: string;
  klaviyoMessageId: string;
  templateDraftId?: string;
  status: "queued" | "pushed" | "error";
  pushedAt?: string;
  errorMessage?: string;
  target: "body" | "subject" | "preview";
  contentVersion: string;       // "A" | "B" | "alt-1" etc.
};

export type FlowCompletenessGap = {
  currentCount: number;
  canonicalCount: number;
  gap: number;                   // canonicalCount - currentCount (negative = overbuilt)
  rationale: string;
  suggestedAdditions?: {
    position: number;
    role: string;
    sendDelayHours: number;
    purpose: string;
  }[];
};

export type AdditionalEmail = {
  id: string;
  position: number;
  role: string;
  sendDelayHours: number;
  subjectA: string;
  subjectAlts: string[];
  previewText: string;
  senderName: string;
  senderEmail: string;
  bodyMarkdown: string;          // uses [ HEADLINE ] [ BODY ] [ CTA BUTTON ] tags
  rationale: string;
  createdAt: string;
};

export type SavedFlowReview = {
  id: string;
  flow: EmailFlow;              // snapshot of inputs
  sections: FlowReviewSection[];
  imagePrompts: FlowReviewImagePrompt[];
  ifYouOnlyDoThree: string[];   // 3 bullets pulled out of the headline section
  frameworkVersion: string;     // e.g. "v1.0"
  writebacks?: KlaviyoWritebackResult[];
  /** Set by /api/email-review/analyze. Drives the "add more emails" banner. */
  flowCompleteness?: FlowCompletenessGap;
  /** Populated by /api/email-review/generate-additional-emails when the user clicks the banner button. */
  additionalEmails?: AdditionalEmail[];
  /** Section keys the user has marked done. Drives the collapse + "REOPEN" UI. */
  doneSectionKeys?: FlowReviewSectionKey[];
  /**
   * Per-section item done state. Key = FlowReviewSectionKey; value = array of
   * done item IDs (derived from the ⚠ line content in bodyMarkdown). When all
   * ⚠ items in a section are marked done the section auto-promotes to done.
   */
  doneSectionItems?: Record<string, string[]>;
  createdAt: string;
  // Optional cached docx export URL (on Vercel Blob)
  docxUrl?: string;
};

// ─── UGC Tracker ──────────────────────────────────────────────────────────────

export type UGCPipelineStage =
  | "invited"
  | "approved"
  | "delivered"
  | "edited-and-ready"
  | "posted"
  | "cancelled";

export const UGC_PIPELINE_STAGES: UGCPipelineStage[] = [
  "invited",
  "approved",
  "delivered",
  "edited-and-ready",
  "posted",
  "cancelled",
];

export const UGC_STAGE_LABELS: Record<UGCPipelineStage, string> = {
  invited: "Invited",
  approved: "Approved",
  delivered: "Delivered",
  "edited-and-ready": "Edited & ready",
  posted: "Posted",
  cancelled: "Cancelled",
};

export type UGCSourcingPlatform = "BACKSTAGE" | "upwork" | "other";

export type BriefStatus = "draft" | "approved" | "archived";

export interface BriefScript {
  videoHook: string;       // on-camera hook, first 1-2 seconds
  textHook: string;        // text overlay / caption hook
  narrative: string;       // main script body (multi-line)
  cta: string;             // closing line / call-to-action
}

export interface UGCBriefDoc {
  aboutBrand: string;          // Who Lunia Life is and why it matters
  whoWereLookingFor: string;   // Target creator profile
  theConcept: string;          // The content angle / concept
  theSetup: string;            // How the video should be structured
  whereToFilm: string;         // Location / environment guidance
  deliverables: string;        // What the creator must deliver
}

export interface BriefComplianceFlag {
  severity: "amber" | "red";
  rule: string;
  match: string;
}

// Meta Ads Manager CTA list — subset we support for Lunia's direct-response ads.
// Full list is long; these are the ones that make sense for a supplement DTC brand.
export type MetaCtaType =
  | "SHOP_NOW"
  | "LEARN_MORE"
  | "SIGN_UP"
  | "SUBSCRIBE"
  | "GET_OFFER"
  | "ORDER_NOW"
  | "SEE_MORE";

// Ad-copy pack for Meta Ads Manager. Per-brief: same concept → same copy set,
// shared across every creator delivering that brief.
export interface BriefAdPack {
  primaryTexts: string[];                     // up to 5 body-text variants (125–200 chars)
  headlines: string[];                        // up to 5 headlines (<40 chars)
  descriptions: string[];                     // up to 5 descriptions (<30 chars)
  cta: MetaCtaType;                           // suggested CTA button
  complianceFlags?: BriefComplianceFlag[];    // worst-case flags across the whole pack
  generatedAt: number;
}

export interface UGCBrief {
  id: string;
  publicBriefId: string;            // nanoid; used in public share URL
  angle: string;                    // AngleLibrary key (e.g. "perimenopause")
  conceptId: string | null;         // AngleConcept.id if generated from library; null if custom
  conceptLabel: string;             // display label (usually the concept's label)
  title: string;                    // brief title (angle + concept by default)
  doc: UGCBriefDoc | null;          // structured brief document sections (null on old briefs)
  script: BriefScript;
  caption: string;                  // social-media caption for the creator's own organic post
  adPack?: BriefAdPack | null;      // Meta Ads Manager copy pack (optional; generated on demand)
  complianceFlags: BriefComplianceFlag[];
  status: BriefStatus;
  creatorName: string | null;       // optional assigned creator
  createdAt: number;
  updatedAt: number;
  sharedAt: number | null;          // when the share link was first copied (controls revoke visibility)
  revokedAt: number | null;         // if set, public share link returns 410
}

export interface UGCCreator {
  id: string;
  name: string;
  angle: string;
  briefId: string | null;
  sourcingPlatform: UGCSourcingPlatform;
  cost: number;                 // USD
  goodsShipped: boolean;
  stage: UGCPipelineStage;
  versionsDelivered: number;
  caption1: string;
  caption2: string;
  notes: string;
  postedUrl: string | null;     // reserved for future perf-loop tie-in
  createdAt: number;
  updatedAt: number;
}

export interface UGCCampaign {
  id: string;                   // "2026-04"
  label: string;                // "April 2026"
  month: number;                // 1-12
  year: number;
  creators: UGCCreator[];
  schemaVersion: 1;
  createdAt: number;
  updatedAt: number;
}
