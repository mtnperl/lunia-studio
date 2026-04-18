/**
 * Ad Creative Brief — Framework #4
 *
 * The structured output from Claude Opus that drives everything downstream:
 *   - background image prompt  → /api/ad/background (Recraft V4)
 *   - canvas composition zones → AdCompositor.tsx
 *   - copy layers             → headline / primary text / overlay
 *   - compliance pre-check    → enforced before brief is accepted
 *
 * Design principle: Claude is the creative director. The schema constrains its
 * output to fields the canvas engine can act on directly — no free-text layout
 * descriptions that require interpretation. The model reasons from the
 * /static-ad-creator skill knowledge and the product asset tags to fill these.
 */

import { z } from "zod";
import type { AdAngle, VisualFormat } from "./types";
import type { AccentElement, BackgroundTone } from "./ad-typography";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const AdCompositionSchema = z.object({
  /**
   * Where the product image is anchored in the frame.
   * The canvas engine scales and positions it here.
   */
  productAnchor: z.enum([
    "center",         // dominant center — lifestyle / hero
    "right",          // product right, text bleeds left
    "left",           // product left, text bleeds right
    "bottom-right",   // product in corner, generous top space for text
    "bottom-left",    // product in corner, generous top space for text
    "bottom-center",  // product sits at base, text fills top 40%
  ]),

  /**
   * Product image height as a fraction of canvas height.
   * 0.25 = small accent; 0.55 = mid-frame hero; 0.80 = near full-bleed.
   */
  productScale: z.number().min(0.20).max(0.85),

  /**
   * Where the text block cluster (headline + caption) lives.
   * Must not overlap productAnchor. Claude chooses the complementary zone.
   */
  textAnchor: z.enum([
    "top",          // text at top, product below
    "bottom",       // text at bottom, product above
    "left-third",   // text in left 1/3, product right
    "right-third",  // text in right 1/3, product left
    "top-left",     // text top-left corner block
    "top-right",    // text top-right corner block
  ]),

  /**
   * Background color tone — used as the canvas fill beneath the AI background
   * image (also the fallback if image load fails), and to determine whether
   * text renders in ivory (dark tone) or navy (light tone).
   */
  backgroundTone: z.enum(["dark-navy", "soft-ivory", "mid-slate"] satisfies [BackgroundTone, ...BackgroundTone[]]),

  /**
   * Small accent element placed near the headline.
   * aqua-rule: 2px thin horizontal rule in #bffbf8 above the headline.
   * yellow-dot: 6px filled circle in #ffd800 used as editorial punctuation.
   * none: no accent.
   */
  accentElement: z.enum(["aqua-rule", "yellow-dot", "none"] satisfies [AccentElement, ...AccentElement[]]),

  /**
   * Plain-language description of the negative-space zone to communicate to
   * Recraft: where the AI background must leave empty, uncluttered space so
   * the canvas text and product sit cleanly over it.
   * e.g. "upper-left third", "lower 40% of frame", "right half"
   */
  negativeSpaceZone: z.string().max(80),
});

export type AdComposition = z.infer<typeof AdCompositionSchema>;

export const AdCopySchema = z.object({
  headline:    z.string().max(50),   // ≤ 5 words (validated in compliance)
  primaryText: z.string().max(600),  // 2-4 sentences
  overlayText: z.string().max(60),   // 3-7 words, scroll-stopper
  whyItWorks:  z.array(z.string().max(200)).min(2).max(3),
});

export type AdCopy = z.infer<typeof AdCopySchema>;

export const AdMoodboardSchema = z.object({
  lightingMood:   z.string().max(80),  // e.g. "single overhead halogen, deep shadows"
  surfaceTexture: z.string().max(80),  // e.g. "dark linen, aged wood grain"
  era:            z.string().max(60),  // e.g. "contemporary editorial, 2026"
});

export type AdMoodboard = z.infer<typeof AdMoodboardSchema>;

export const AdComplianceSchema = z.object({
  noDiseaseClaims:           z.boolean(),
  noEmDashes:                z.boolean(),
  exclamationCount:          z.number().int().min(0).max(1),
  headlineWordCount:         z.number().int().min(1).max(5),
  noCompetitorNames:         z.boolean(),
  compliantMechanismFraming: z.boolean(),
});

export type AdCompliance = z.infer<typeof AdComplianceSchema>;

export const AdBriefSchema = z.object({
  /** Descriptive name — e.g. "Credibility, Product Dark, Science Angle" */
  label: z.string().max(120),

  angle:        z.string() as z.ZodType<AdAngle>,
  visualFormat: z.string() as z.ZodType<VisualFormat>,

  copy:        AdCopySchema,
  composition: AdCompositionSchema,
  moodboard:   AdMoodboardSchema,

  /**
   * Recraft V4 background-only prompt.
   *
   * Rules enforced by the brief generator:
   *   - No product visible (we composite that ourselves)
   *   - No text or typography rendered in the image
   *   - Negative space zone explicitly described so Recraft leaves room
   *   - Brand colors from brand book (#102635 navy, #2c3f51 slate, #F7F4EF ivory)
   *   - ≤ 120 words
   */
  backgroundPrompt: z.string().min(20).max(700),

  /** Pre-run compliance gate — brief is rejected if any field is false or > limits */
  compliance: AdComplianceSchema,
});

export type AdBrief = z.infer<typeof AdBriefSchema>;

// ─── Compliance Validator ─────────────────────────────────────────────────────

/**
 * Returns an array of violation strings. Empty = pass.
 * Run server-side before returning the brief to the client.
 */
export function validateBriefCompliance(brief: AdBrief): string[] {
  const violations: string[] = [];
  const c = brief.compliance;

  if (!c.noDiseaseClaims)           violations.push("disease claims detected");
  if (!c.noEmDashes)                violations.push("em dash found in copy");
  if (c.exclamationCount > 1)       violations.push(`${c.exclamationCount} exclamation marks (max 1)`);
  if (c.headlineWordCount > 5)      violations.push(`headline is ${c.headlineWordCount} words (max 5)`);
  if (!c.noCompetitorNames)         violations.push("competitor name called out by name");
  if (!c.compliantMechanismFraming) violations.push("non-compliant mechanism framing");

  // Double-check copy directly with regex (LLM self-reporting is fallible)
  const allCopy = [brief.copy.headline, brief.copy.primaryText, brief.copy.overlayText].join(" ");
  if (/—/.test(allCopy))                                     violations.push("em dash in copy (regex)");
  if (/\b(treats?|cures?|prevents?|diagnoses?)\b/i.test(allCopy)) violations.push("drug claim in copy (regex)");
  const excl = (allCopy.match(/!/g) ?? []).length;
  if (excl > 1)                                              violations.push(`${excl} exclamation marks in copy (regex)`);

  return violations;
}

// ─── Claude Opus Prompt Builder ───────────────────────────────────────────────

export function buildBriefSystemPrompt(): string {
  return `You are a senior creative director for Lunia Life, a premium science-backed sleep supplement brand. Your output drives a programmatic canvas compositor — every field must be precise and machine-readable.

# Brand Color Book (non-negotiable)
- Deep Navy: #102635 — primary text, dark backgrounds
- Slate Blue: #2c3f51 — secondary text, mid-depth surfaces
- Soft Ivory: #F7F4EF — backgrounds, inverse text on dark
- Aqua Accent: #bffbf8 — rare highlights only (≤10% of any layout)
- Signal Yellow: #ffd800 — CTA elements only
- NO purple. NO gradients. NO neon. NO warm gold. Flat, clean, editorial.

# Typography (informational — you don't render this, the compositor does)
- Display headline: Cormorant Garamond, weight 300, ~80px
- Body/caption: Inter, weight 400, ~32px
- Overlay call-out: Inter, weight 700, ~48px

# Brand Feel
Every design must feel: calm, clean, scientific, premium, understated.
If it feels loud, trendy, or overly colorful — it is off-brand.

# What You Produce
Return a single valid JSON object (no markdown fences, no prose) matching this schema exactly:

{
  "label": "string — concise concept name, e.g. 'Science Authority, Dark Navy'",
  "angle": "credibility" | "price-anchor" | "skeptic-convert" | "outcome-first" | "formula" | "comparison" | "social-proof",
  "visualFormat": "product-dark" | "lifestyle-flatlay" | "text-dominant" | "before-after" | "ingredient-macro",
  "copy": {
    "headline": "≤ 5 words. Benefit-led or curiosity-led. No em dashes.",
    "primaryText": "2-4 sentences. Hook → proof → soft CTA. No em dashes. No disease claims.",
    "overlayText": "3-7 words. Scroll-stopper. Works standalone without the caption.",
    "whyItWorks": ["reason 1", "reason 2", "optional reason 3"]
  },
  "composition": {
    "productAnchor": "center" | "right" | "left" | "bottom-right" | "bottom-left" | "bottom-center",
    "productScale": 0.20–0.85 (fraction of canvas height),
    "textAnchor": "top" | "bottom" | "left-third" | "right-third" | "top-left" | "top-right",
    "backgroundTone": "dark-navy" | "soft-ivory" | "mid-slate",
    "accentElement": "aqua-rule" | "yellow-dot" | "none",
    "negativeSpaceZone": "plain-language description, e.g. 'upper-left third of frame'"
  },
  "moodboard": {
    "lightingMood": "e.g. 'single halogen overhead, deep shadows, no fill'",
    "surfaceTexture": "e.g. 'dark linen weave, subtle grain'",
    "era": "e.g. 'contemporary editorial, 2026'"
  },
  "backgroundPrompt": "Recraft V4 prompt for the background image ONLY. Rules: (1) no product visible — we composite the product over this in post; (2) absolutely no text, words, or typography in the image; (3) explicit negative space in [the zone from composition.negativeSpaceZone] — leave that area clean and uncluttered; (4) brand colors from brand book; (5) matches the lighting and surface from moodboard; (6) ≤ 120 words.",
  "compliance": {
    "noDiseaseClaims": true/false,
    "noEmDashes": true/false,
    "exclamationCount": 0 or 1,
    "headlineWordCount": integer 1-5,
    "noCompetitorNames": true/false,
    "compliantMechanismFraming": true/false
  }
}

# Compliance Rules (hard — never violate)
- No em dashes anywhere in any copy field
- Max 1 exclamation mark total across all copy
- No disease claims: never use "treats", "cures", "prevents", "diagnoses"
- Use "supports sleep quality", "may help you wind down", "shown in studies to", "associated with"
- No competitor names (use "big brands" or "other products")
- Product mention lands late — never in sentence one of primaryText
- Headline ≤ 5 words exactly

# Proof Points (accurate, use when angle-appropriate)
- 4.9-star rating, 78,000+ customers
- 3 ingredients: Magnesium Bisglycinate, L-Theanine, Apigenin
- 700+ published studies across the formula
- 2025 meta-analysis: 19 trials on L-Theanine showing sleep onset and quality improvements
- Melatonin-free. Under $1 per night ($0.87/serving).
- cGMP certified, USA manufactured, third-party tested
- Vegan, GMO-free, gluten-free`;
}

export function buildBriefUserMessage(opts: {
  angle: AdAngle;
  visualFormat?: VisualFormat;
  customHook?: string;
  productTags?: string[];       // from Haiku auto-tagging of the product asset
  productKind?: string;         // "product" | "logo" | "reference"
}): string {
  const { angle, visualFormat, customHook, productTags, productKind } = opts;

  const parts: string[] = [
    `Generate a creative brief for a Lunia Life static Meta ad.`,
    `Angle: ${angle}`,
  ];

  if (visualFormat) {
    parts.push(`Visual format: ${visualFormat}`);
  } else {
    parts.push(
      `Choose the visual format that best serves the angle. Options: product-dark (credibility/formula), lifestyle-flatlay (outcome/routine), text-dominant (price-anchor/comparison/skeptic), ingredient-macro (formula/science).`
    );
  }

  if (productTags && productTags.length > 0) {
    parts.push(`Product asset tags from vision analysis: [${productTags.join(", ")}]`);
    parts.push(
      `Use these tags to inform the composition (e.g. if 'white-bg' tag suggests product has transparent/white background — choose a dark-navy backgroundTone so the product pops). If tags suggest '3-4-angle' or 'hero', position the product accordingly.`
    );
  }

  if (productKind) {
    parts.push(`Product asset kind: ${productKind}`);
  }

  if (customHook && customHook.trim()) {
    parts.push(`Brand team direction: ${customHook.trim()}`);
  }

  parts.push(
    `Return ONLY the JSON object as specified. No markdown fences. No explanation. Self-report the compliance fields accurately — they will be regex-verified.`
  );

  return parts.join("\n\n");
}
