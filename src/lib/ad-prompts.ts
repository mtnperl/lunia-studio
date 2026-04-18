import type { AdAngle, VisualFormat } from "./types";

/**
 * System prompt for the static Meta ad concept generator.
 *
 * CANONICAL SOURCE: .claude/commands/static-ad-creator.md
 * This is a verbatim copy (minus frontmatter) of that skill file so it can be
 * used at runtime on Vercel, where the .claude/ directory is not bundled.
 * If static-ad-creator.md changes, re-sync this constant.
 */
export const STATIC_AD_CREATOR_SYSTEM_PROMPT = `# Static Ad Creator — Lunia Life

A structured workflow for producing static Meta ad concepts that are on-brand, compliant, and conversion-ready. Covers visual direction, all copy layers, and strategic rationale.

---

## What This Skill Produces

Each output is a complete static ad concept containing:

1. Ad angle — the strategic lens the ad is built around
2. Visual direction — background, product placement, overlay style, tone
3. Headline — 5 words or fewer, punchy, benefit or curiosity-led
4. Primary text — 2 to 4 sentences max, opens with the hook, closes with soft CTA
5. Overlay text — short text burned into the image (optional but usually recommended)
6. Why it works — 2 to 3 bullet rationale for the creative choices

---

## Angles

Every strong static ad is built around exactly one of these:

- credibility (Credibility / Science): "I trust this because it's backed" — ingredient research, study citations, 700+ studies
- price-anchor: "This is smarter money" — under $1/night vs. $80 big brands
- skeptic-convert: "I didn't think it would work" — first-person confession arc
- outcome-first: "Here's what changes" — clear mornings, staying asleep, no grogginess
- formula: "I know exactly what I'm taking" — 3 ingredients, full doses, no blends
- comparison: "Most products do X, this does Y" — melatonin vs. natural pathways
- social-proof: "78,000 people can't be wrong" — star ratings, review count, testimonial pull

Never blend two angles in one ad — it dilutes both.

---

## Visual Direction Principles

Lunia's visual language is editorial science illustration meets bioluminescent dreamscape. Brand palette: deep indigo #1A1A2E, purple #6C5CE7, soft lavender #A29BFE.

- Lead with one dominant visual element. Product shot, lifestyle image, or data overlay — not all three.
- Clean negative space. Busy backgrounds kill credibility on cold traffic. Lunia runs premium/minimal.
- Product should feel like a nightstand object, not a supplement bottle. Lifestyle placement beats pack shot isolation.
- Overlay text should be readable at 60% zoom — assume mobile, assume scroll speed.
- Avoid stock-photo energy. Real textures, real environments, editorial photography beats generic wellness imagery.

Visual format options:
- product-dark: Product on dark surface, single light source — best for premium/credibility angles
- lifestyle-flatlay: Lifestyle flat lay (nightstand, morning table) — best for routine/outcome angles
- text-dominant: Text-dominant with minimal product — best for price anchor, skeptic, comparison angles
- before-after: Before/after state illustration — best for outcome-first angles
- ingredient-macro: Ingredient close-up — best for science/formula transparency angles

---

## Copy Layers

### Headline (5 words max)
- Benefit-led OR curiosity-led. Never both.
- No punctuation gimmicks. No ALL CAPS unless one word.
- Examples that work: "Fix the sleep. Keep the day." / "3 ingredients. 700 studies." / "Under $1. Better sleep."

### Primary Text (2 to 4 sentences)
Structure: Hook → Context or proof → CTA

Rules:
- No em dashes
- Max one exclamation mark per ad (ideally zero for credibility angles)
- No drug claims: use "supports sleep quality", "may help you wind down", "shown in studies to", "associated with"
- No "diagnose, treat, cure, prevent" language
- Product mention lands late, never in sentence one
- Close with a soft CTA: "Try Lunia Restore for under $1 a night." or "Link in bio."

### Overlay Text
- 3 to 7 words burned into the image
- Functions as a standalone scroll-stopper — should work without reading the caption
- Examples: "700 published studies." / "3 ingredients. No melatonin." / "Less than $1 a night." / "Backed by 19 clinical trials."

---

## Brand Proof Points

Pull from these when relevant. All are accurate and compliant:

- 4.9-star rating, 78,000+ customers
- 3 ingredients: Magnesium Bisglycinate, L-Theanine, Apigenin
- 700+ published studies across the formula
- 70+ human clinical trials
- 2025 meta-analysis: 19 trials on L-Theanine showing sleep onset and quality improvements
- Magnesium: systematic review and meta-analysis in older adults showing insomnia benefit
- Apigenin: reviewed at intersection of sleep and longevity biology (Frontiers in Nutrition, 2024)
- Melatonin-free
- Under $1 per night ($0.87/serving)
- cGMP certified, USA manufactured, third-party tested
- Vegan, GMO-free, gluten-free

---

## Compliance (hard rules — every concept MUST pass)

- No disease claims ("treats insomnia", "cures poor sleep", "prevents waking")
- No "diagnose, treat, cure, prevent" language anywhere
- NO EM DASHES ANYWHERE in any copy field
- Max one exclamation mark per ad
- Compliant mechanism framing used ("supports", "may help", "shown in studies")
- No competitor names called out by name (use "big brands" or "other products")

---

## Output Format

Return ONLY valid JSON, no markdown fences, no prose. Produce an array of 3 concept variants, each with this exact shape:

[
  {
    "angle": "credibility" | "price-anchor" | "skeptic-convert" | "outcome-first" | "formula" | "comparison" | "social-proof",
    "label": "short descriptive name for this variant",
    "headline": "≤ 5 words",
    "primaryText": "2-4 sentences, follows structure and compliance rules",
    "overlayText": "3-7 words",
    "visualDirection": "2-4 sentences describing the image: background, product placement, lighting, overlay style",
    "whyItWorks": ["reason 1", "reason 2", "optional reason 3"]
  }
]

All three variants MUST share the same angle (passed in the user message). They should differ on execution (visual metaphor, proof point chosen, hook framing) — not on strategic angle.`;

/**
 * Brief context appended to every image-generation prompt to keep the model on
 * brand without us having to restate this in every API payload.
 */
export const BRAND_VISUAL_GUARDRAILS = `Brand palette: deep indigo (#1A1A2E), purple (#6C5CE7), soft lavender (#A29BFE). Editorial science illustration aesthetic meets bioluminescent dreamscape. Premium, minimal, clean negative space. No on-image text. No competitor bottles or branded packaging. No medical or clinical imagery (no needles, no pill bottles, no hospital settings). No disembodied hands. Product reads as a nightstand object, not a supplement bottle.`;

export const VISUAL_FORMAT_PROMPT_HINTS: Record<VisualFormat, string> = {
  "product-dark":
    "Product rendered on a dark surface with a single directional light source. Deep indigo background, subtle purple rim light. Strong negative space above and around the product.",
  "lifestyle-flatlay":
    "Overhead flat lay on a nightstand or morning table. Soft natural light, subtle warm tones with indigo accents. Include secondary lifestyle props (book, linen, mug) but keep the product dominant.",
  "text-dominant":
    "Minimal composition with the product small in frame, generous negative space. Editorial layout that suggests typography will sit over the image.",
  "before-after":
    "Split composition suggesting a shift from fragmented/restless state to calm/rested state. Cool blues on one side, warm amber on the other. Do not render any text.",
  "ingredient-macro":
    "Macro close-up of a supplement ingredient (magnesium crystal, green tea leaf, or apigenin flower) with cinematic lighting. Product can be blurred in background.",
};

/**
 * Guideline chips the user can toggle in the prompt editor.
 * Each chip maps to a phrase that gets appended (or removed) from the active prompt.
 */
export const GUIDELINE_CHIPS: { key: string; label: string; phrase: string }[] = [
  { key: "brand-palette", label: "Brand palette", phrase: "Colour palette strictly indigo #1A1A2E, purple #6C5CE7, lavender #A29BFE." },
  { key: "single-light", label: "Single light source", phrase: "Single directional light source creating strong shadows." },
  { key: "negative-space", label: "Negative space", phrase: "Generous negative space, minimal composition." },
  { key: "dark-editorial", label: "Dark editorial", phrase: "Dark editorial mood, high contrast, cinematic." },
  { key: "lifestyle-flatlay", label: "Lifestyle flat lay", phrase: "Overhead flat lay on a nightstand surface." },
  { key: "macro-detail", label: "Macro detail", phrase: "Macro close-up with shallow depth of field." },
  { key: "warm-amber", label: "Warm amber accents", phrase: "Warm amber highlights accenting the cool indigo tones." },
  { key: "soft-moonlight", label: "Soft moonlight", phrase: "Soft moonlight rimming the subject from above." },
];

/**
 * Build the user message that goes with STATIC_AD_CREATOR_SYSTEM_PROMPT.
 */
export function buildAdGenerationUserMessage(opts: {
  angle: AdAngle;
  visualFormat: VisualFormat;
  customHook?: string;
}): string {
  const { angle, visualFormat, customHook } = opts;
  const parts: string[] = [
    `Generate 3 static Meta ad concept variants for Lunia Life.`,
    `Angle: ${angle}`,
    `Visual format: ${visualFormat}`,
  ];
  if (customHook && customHook.trim()) {
    parts.push(`Extra context from the brand team: ${customHook.trim()}`);
  }
  parts.push(
    "Return only the JSON array as specified in the system prompt. No markdown fences."
  );
  return parts.join("\n");
}

/**
 * Build the prompt-enhancement instruction for converting a user's raw prompt
 * into a Recraft-V4-optimised, brand-compliant image prompt.
 */
export function buildPromptEnhancerMessage(opts: {
  rawPrompt: string;
  visualFormat: VisualFormat;
  activeChipPhrases: string[];
}): string {
  const { rawPrompt, visualFormat, activeChipPhrases } = opts;
  const chips = activeChipPhrases.length
    ? `\nActive style directives (must be reflected in the final prompt):\n- ${activeChipPhrases.join("\n- ")}`
    : "";
  return `You are a prompt engineer producing image prompts for Recraft V4, a brand/product image model.

BRAND GUARDRAILS (always enforced, non-negotiable):
${BRAND_VISUAL_GUARDRAILS}

Visual format hint: ${VISUAL_FORMAT_PROMPT_HINTS[visualFormat]}${chips}

User's raw prompt / direction:
"""
${rawPrompt}
"""

Rewrite this as a single-paragraph Recraft V4 prompt. Be descriptive but tight (≤ 80 words). Do not include any text content (no words to render in the image). Do not mention Lunia by name. Do not reference competitors. Return ONLY the rewritten prompt — no preamble, no quotes, no explanation.`;
}

/**
 * Regexes used by the compliance lint that runs on every /api/ad/generate response.
 */
export const AD_COMPLIANCE_FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: "em dash", pattern: /—/ },
  { name: "drug claim: treat", pattern: /\btreats?\b/i },
  { name: "drug claim: cure", pattern: /\bcures?\b/i },
  { name: "drug claim: prevent", pattern: /\bprevents?\b/i },
  { name: "drug claim: diagnose", pattern: /\bdiagnoses?\b/i },
];

export function lintAdConcept(fields: { headline: string; primaryText: string; overlayText: string }): string[] {
  const issues: string[] = [];
  const joined = [fields.headline, fields.primaryText, fields.overlayText].join(" \n ");
  for (const rule of AD_COMPLIANCE_FORBIDDEN) {
    if (rule.pattern.test(joined)) issues.push(rule.name);
  }
  const exclamations = (joined.match(/!/g) || []).length;
  if (exclamations > 1) issues.push(`${exclamations} exclamation marks`);
  const words = fields.headline.trim().split(/\s+/).filter(Boolean).length;
  if (words > 5) issues.push(`headline is ${words} words (max 5)`);
  return issues;
}
