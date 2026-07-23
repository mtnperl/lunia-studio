import { z } from "zod";
import type { CampaignBlock } from "./types";

// Uses the Web Crypto global (available in both Node and the browser), not
// Node's `crypto` module — this file is imported from a client component
// (CampaignEditor.tsx) as well as server routes, and a Node built-in import
// won't bundle for the client.
const randomUUID = () => crypto.randomUUID();

/** Suggested block shapes for the AI layout-suggestion feature. Mirrors
 *  `GraphicSpecSchema` (src/lib/types.ts:114) — a real zod
 *  `discriminatedUnion` keyed on kind, not the flat/optional-fields shape
 *  `CampaignBlock` uses internally. This schema is the LLM output contract;
 *  `suggest-layout`'s route maps a validated result onto real `CampaignBlock`s. */
export const LayoutBlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), body: z.string(), align: z.enum(["left", "center"]).optional() }),
  z.object({ kind: z.literal("stat"), statValue: z.string(), statLabel: z.string() }),
  z.object({
    kind: z.literal("discount"),
    discountCode: z.string().optional(),
    discountDescription: z.string().optional(),
    originalPrice: z.string().optional(),
    newPrice: z.string().optional(),
  }),
  z.object({ kind: z.literal("checklist"), items: z.array(z.string()).min(2).max(6) }),
  z.object({
    kind: z.literal("testimonial"),
    testimonialQuote: z.string(),
    testimonialAuthor: z.string(),
    testimonialStars: z.number().min(1).max(5).optional(),
  }),
  z.object({
    kind: z.literal("timeline"),
    timelineRows: z.array(z.object({ label: z.string(), text: z.string() })).min(2).max(6),
  }),
  z.object({
    kind: z.literal("trustgrid"),
    trustItems: z.array(z.object({ caption: z.string() })).min(2).max(4),
  }),
  z.object({
    kind: z.literal("comparison"),
    comparisonLeftLabel: z.string(),
    comparisonLeftPrice: z.string().optional(),
    comparisonLeftPerk: z.string().optional(),
    comparisonRightLabel: z.string(),
    comparisonRightPrice: z.string().optional(),
    comparisonRightPerk: z.string().optional(),
  }),
  z.object({
    kind: z.literal("ingredients"),
    ingredientHeading: z.string().optional(),
    ingredientItems: z.array(z.object({ name: z.string(), dose: z.string() })).min(1).max(8),
    ingredientFootnote: z.string().optional(),
  }),
]);

export const LayoutSuggestionSchema = z.object({
  topBanner: z.string().optional(),
  promoBand: z.string().optional(),
  ctaLabel: z.string().optional(),
  blocks: z.array(LayoutBlockSchema).min(1).max(8),
});

export type LayoutBlock = z.infer<typeof LayoutBlockSchema>;
export type LayoutSuggestion = z.infer<typeof LayoutSuggestionSchema>;

const LUNIA_VOICE_SPEC = `Lunia Life brand voice: Aspirational, minimal, wellness-science grounded. Tone: calm confidence. No hype. No FOMO manipulation. Language: clear, direct, sophisticated. Target reader: health-conscious adult, 28-45, optimizing their sleep. Write like a trusted expert friend, not a marketer. Lunia Life sells a sleep supplement (magnesium glycinate, L-theanine, apigenin. Transparent dosing. Melatonin-free).

HARD BRAND RULE — NEVER use em dashes (—) or en dashes (–) ANYWHERE in any field you return. Use commas, periods, semicolons, parentheses, or short sentences instead.`;

const KIND_SCHEMA_EXAMPLES = `Each block in "blocks" must be ONE of these exact shapes (the "kind" field selects which):

{ "kind": "text", "body": "string, may include **bold** and {{ merge_tag }}", "align": "left" | "center" }
{ "kind": "stat", "statValue": "e.g. '558 reviews'", "statLabel": "e.g. '91% five-star'" }
{ "kind": "discount", "discountCode": "e.g. 'SLEEP20'", "discountDescription": "e.g. '20% off your first order'", "originalPrice": "e.g. '$87.99'", "newPrice": "e.g. '$29.20'" }
{ "kind": "checklist", "items": ["one line per benefit, 2-6 items"] }
{ "kind": "testimonial", "testimonialQuote": "the review text", "testimonialAuthor": "e.g. 'Sarah K., verified customer'", "testimonialStars": 5 }
{ "kind": "timeline", "timelineRows": [{ "label": "e.g. '30 DAYS'", "text": "e.g. '85% felt more energy'" }] }
{ "kind": "trustgrid", "trustItems": [{ "caption": "one short trust point" }] }
{ "kind": "comparison", "comparisonLeftLabel": "e.g. 'One-time'", "comparisonLeftPrice": "e.g. '$34.99'", "comparisonLeftPerk": "e.g. 'Ships once'", "comparisonRightLabel": "e.g. 'Subscribe'", "comparisonRightPrice": "e.g. '$29.20'", "comparisonRightPerk": "e.g. 'Save 15%, cancel anytime'" }
{ "kind": "ingredients", "ingredientHeading": "e.g. 'What's inside'", "ingredientItems": [{ "name": "Magnesium Glycinate", "dose": "400mg" }, { "name": "L-Theanine", "dose": "200mg" }, { "name": "Apigenin", "dose": "50mg" }], "ingredientFootnote": "e.g. 'Melatonin-free, third-party tested'" }

Pick the kinds that actually fit the subject line's angle. A discount-announcement subject should probably use a "discount" block. A results/story subject fits "timeline" or "testimonial". Don't force every kind in — 2 to 5 blocks is typical, only go to 8 for a genuinely dense brief.`;

function stripDashes(s: string): string {
  return s
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Maps one validated LayoutBlock onto a real CampaignBlock. Only the
 *  kind-specific fields for that kind are set; `body`/`align` always exist
 *  since CampaignBlock's `body` field is required. */
export function layoutBlockToCampaignBlock(b: LayoutBlock): CampaignBlock {
  const base: CampaignBlock = { id: randomUUID(), body: "", align: "left", kind: b.kind };
  switch (b.kind) {
    case "text":
      return { ...base, body: stripDashes(b.body), align: b.align ?? "left" };
    case "stat":
      return { ...base, statValue: stripDashes(b.statValue), statLabel: stripDashes(b.statLabel) };
    case "discount":
      return {
        ...base,
        discountCode: b.discountCode ? stripDashes(b.discountCode) : undefined,
        discountDescription: b.discountDescription ? stripDashes(b.discountDescription) : undefined,
        originalPrice: b.originalPrice,
        newPrice: b.newPrice,
      };
    case "checklist":
      return { ...base, items: b.items.map(stripDashes) };
    case "testimonial":
      return {
        ...base,
        testimonialQuote: stripDashes(b.testimonialQuote),
        testimonialAuthor: stripDashes(b.testimonialAuthor),
        testimonialStars: b.testimonialStars ?? 5,
      };
    case "timeline":
      return { ...base, timelineRows: b.timelineRows.map((r) => ({ label: stripDashes(r.label), text: stripDashes(r.text) })) };
    case "trustgrid":
      return { ...base, trustItems: b.trustItems.map((t) => ({ caption: stripDashes(t.caption) })) };
    case "comparison":
      return {
        ...base,
        comparisonLeftLabel: stripDashes(b.comparisonLeftLabel),
        comparisonLeftPrice: b.comparisonLeftPrice,
        comparisonLeftPerk: b.comparisonLeftPerk ? stripDashes(b.comparisonLeftPerk) : undefined,
        comparisonRightLabel: stripDashes(b.comparisonRightLabel),
        comparisonRightPrice: b.comparisonRightPrice,
        comparisonRightPerk: b.comparisonRightPerk ? stripDashes(b.comparisonRightPerk) : undefined,
      };
    case "ingredients":
      return {
        ...base,
        ingredientHeading: b.ingredientHeading ? stripDashes(b.ingredientHeading) : "What's inside",
        ingredientItems: b.ingredientItems.map((it) => ({ name: stripDashes(it.name), dose: it.dose })),
        ingredientFootnote: b.ingredientFootnote ? stripDashes(b.ingredientFootnote) : undefined,
      };
  }
}

export function buildLayoutSuggestionPrompt(subject: string, topic: string): string {
  return `${LUNIA_VOICE_SPEC}

Given this email's subject line, suggest a block-by-block structure for the body of a Lunia Life marketing email.

Subject line: ${subject}
${topic ? `Additional context / topic: ${topic}` : ""}

${KIND_SCHEMA_EXAMPLES}

Also suggest:
- "topBanner": a short (2-8 word) uppercase-style top banner line, or omit if not needed.
- "promoBand": a short promo strip line, or omit if this isn't a promotional email.
- "ctaLabel": the CTA button label, e.g. "Start Sleeping Better".

Return ONLY valid JSON, no markdown fences, matching:
{ "topBanner"?: string, "promoBand"?: string, "ctaLabel"?: string, "blocks": [ ...block objects as shown above... ] }`;
}
