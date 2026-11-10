// A SHAPE is a named layout for an email.
//
// Two things in one object, because an email arrives in one of two states:
//   - `guidance` — a layout instruction, used when the email already HAS copy.
//     It goes to the restructure prompt, which rearranges the user's own words.
//   - `starter`  — blocks with real copy, used only when the email is empty.
//
// Replaces CampaignLayoutPreset, which could only do the second and therefore
// always injected placeholder copy the user then had to rewrite.
//
// SECURITY: `guidance` is interpolated into an LLM prompt, so it must never
// come from the network. The restructure route takes a shapeId and resolves
// guidance HERE. See resolveShapeGuidance.
import type { LayoutBlock } from "./campaign-layout-prompts";
import { PRODUCT } from "./lunia-brand-guidelines";
import type { CampaignContent, CampaignBlockKind, EmailPresetSettings } from "./types";

export type CampaignShape = {
  id: string;
  name: string;
  /** One line, shown under the name in the gallery. */
  description: string;
  /** Applied when the shape is used. ABSENT means leave content.theme alone —
   *  it does not mean navy. */
  theme?: CampaignContent["theme"];
  topBanner?: string;
  promoBand?: string;
  ctaLabel?: string;
  /** Saved shapes carry a brand preset; built-ins do not. */
  settings?: EmailPresetSettings;
  /** Layout instruction for the restructure prompt. Empty means "let the model
   *  choose", which is the plain Make-it-visual behaviour. */
  guidance: string;
  /** Starter blocks for an EMPTY email. Absent for shapes that only make sense
   *  applied to copy you already have (a saved shape, or "let the model
   *  choose"). LayoutBlock has no imageUrl and no "image" variant, so a shape
   *  can never place a user asset slot; starter image blocks land with a prompt
   *  and no picture, by design. */
  starter?: LayoutBlock[];
};

/** The dense, image-led shape the big DTC supplement brands use, in Lunia's
 *  own voice. Was a hardcoded branch in buildRestructurePrompt; it is data now,
 *  which is what lets every other shape exist. */
const EDITORIAL_GUIDANCE = `EDITORIAL MODE. Build the image-led shape a premium DTC supplement brand uses,
in Lunia's own voice. Concretely:

1. OPEN with a "headerimage" block. Use headerStyle "card" when the source has
   one strong headline, "pill" when it has a short label plus a headline.
2. Then a "lead": the one sentence the email is about, set large and light.
3. Then ALTERNATE "imagetext" blocks, imagePosition "left", then "right".
   Two of them, only for copy with a concrete subject a camera could show.
   This alternation is the single most recognisable part of the look,
   so do not emit them all on one side.
4. Between or after them, set the best line as a "pullquote".
5. Then EITHER one "imagebullets" block for the strongest short list (with
   bulletColor "aqua" or "yellow") OR one "grid" when the source has three or
   more parallel points. Not both.
6. Close with "badges", and a "product" card when the email asks for a purchase.
7. Use "table" only for prices. NO bare "text" blocks unless one short line is
   needed to connect two sections.
8. Aim for 6 to 9 blocks.

This shape allows up to FIVE picture blocks (the header counts as one). Every
block that holds a picture MUST come with its own imagePrompt or a "picture"
ref, and they must be different scenes from each other.`;

/** Shared tail for guidance strings that name an opening block. */
const KEEP_IT_HONEST = `Body copy comes from the source and the verified product facts only; short eyebrows, section headlines and button labels may be written. If the source cannot fill a block this shape asks for honestly, drop that block rather than inventing content for it.`;

export const CAMPAIGN_SHAPES: CampaignShape[] = [
  {
    id: "auto",
    name: "Let the model choose",
    description: "Read the copy and pick whatever layout fits it",
    // Empty guidance is the plain "Make it visual" behaviour: the base prompt
    // already carries the design rules. No starter: with nothing to
    // restructure there is nothing for the model to choose between.
    guidance: "",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Header image, a large lead, alternating picture rows, a pull quote",
    theme: "cream",
    guidance: EDITORIAL_GUIDANCE,
    starter: [
      { kind: "headerimage", headerStyle: "card", headerHeadline: "Stronger mornings start the night before", imagePrompt: "A bedroom just after waking, low winter light through a gap in the curtains, bedding pushed back, nobody in frame yet." },
      { kind: "lead", body: "Better sleep is rarely about the worst night. It is about what every night has in common." },
      { kind: "imagetext", imageHeading: "Three pathways, one capsule", body: "Magnesium bisglycinate, L-theanine and apigenin work on different parts of the same problem. Doses printed on the label, so you know what you are taking.", imagePosition: "left", imagePrompt: "Loose botanical material and pale powder on a plain stone surface, macro, flat daylight from one side." },
      { kind: "pullquote", body: "Built for every night, not for the worst one." },
      { kind: "imagebullets", bulletItems: ["Melatonin-free", "No proprietary blends", "Every dose on the label"], bulletColor: "aqua", imagePosition: "right", imagePrompt: "A laboratory bench, gloved hands weighing a sample, clean daylight, no branding anywhere." },
      { kind: "badges", badges: ["Melatonin-free", "No proprietary blends", "Every dose on the label"] },
    ],
  },
  {
    id: "discount",
    name: "Discount announcement",
    description: "The offer up front, the product, then why it is worth taking",
    guidance: `Lead with the offer. Open with a "lead" that states it, then a "discount" block ONLY if the source contains a real code or price. Follow with a "product" card, then an "imagebullets" or "beforeafter" for the reasons to act, then "badges" just before the close. Use a "table" only if the source has plan pricing. ${KEEP_IT_HONEST}`,
    promoBand: "LIMITED TIME",
    ctaLabel: "Claim your discount",
    starter: [
      { kind: "lead", eyebrow: "This week", body: "Twenty percent off your first order of Lunia Restore." },
      { kind: "discount", discountCode: "SLEEP20", discountDescription: "20% off your first order", originalPrice: "$38.93", newPrice: "$29.20" },
      { kind: "product", productName: "Lunia Restore", productPrice: "$38.93", productComparePrice: "$59.90", productNote: "60 capsules, 30 nights", buttonLabel: "Shop now", imagePrompt: "A single amber glass jar on a linen surface by a window, soft morning light, nothing else in frame." },
      { kind: "imagebullets", bulletItems: ["Melatonin-free", "Doses printed on the label", "Cancel anytime"], bulletColor: "yellow", imagePosition: "left", imagePrompt: "A kitchen counter at night, a glass of water and a paperback beside it, one warm lamp out of frame." },
      { kind: "badges", badges: ["Melatonin-free", "No proprietary blends", "Every dose on the label"] },
    ],
  },
  {
    id: "educational",
    name: "Educational",
    description: "One idea explained: a lead, a section heading, steps and a picture",
    guidance: `Teach one idea. Open with a "lead" that states it plainly. Then a "heading" for the explanation, then EITHER "steps" (when the source describes a sequence) OR two "imagetext" blocks, imagePosition "left" then "right". Set the clearest line as a "pullquote". Use "ingredients" only if the source names doses. Never two "text" blocks in a row. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "lead", body: "Most people think of sleep as one thing. It is closer to three, and they fail in different ways." },
      { kind: "imagetext", imageHeading: "Falling asleep", body: "The wind-down window is roughly the two hours before bed. Light, food and stress all push against it.", imagePosition: "left", imagePrompt: "A living room in the last hour before bed, low lamplight, a book face down on the arm of a chair." },
      { kind: "imagetext", imageHeading: "Staying asleep", body: "Waking at three in the morning is usually about how deeply you went under, not about how tired you were.", imagePosition: "right", imagePrompt: "A dark bedroom at three in the morning, a bedside clock out of focus, moonlight on the wall." },
      { kind: "pullquote", body: "The hour before bed does more than the hours in it." },
      { kind: "ingredients", ingredientHeading: "What's inside", ingredientItems: [{ name: "Magnesium Bisglycinate", dose: "500 mg" }, { name: "L-Theanine", dose: "300 mg" }, { name: "Apigenin", dose: "50 mg" }], ingredientFootnote: "Melatonin-free, third-party tested" },
    ],
  },
  {
    id: "proof-led",
    name: "Proof-led",
    description: "Numbers first, then the reviews and badges behind them",
    guidance: `Lead with evidence. Open with a "stat" (the source's number, or the verified review count), then a "grid" of parallel proof points, then "reviews" or a "testimonial" ONLY if the source contains verbatim quoted customer text, then "badges", then a "product" card. Never invent a number or a quote. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "stat", statValue: `${PRODUCT.reviewCount} reviews`, statLabel: `${PRODUCT.fiveStarPct}% five-star` },
      { kind: "grid", gridCells: [
        { heading: "Melatonin-free", caption: "No grogginess, nothing to taper off.", imagePrompt: "An empty unmade bed in morning light, curtains open, nobody in frame." },
        { heading: "Transparent dosing", caption: "Every milligram printed on the label.", imagePrompt: "A clipboard and a pen on a laboratory bench, clean daylight, no text legible." },
      ] },
      { kind: "testimonial", testimonialQuote: "Replace this with a real review before sending.", testimonialAuthor: "Sample, not a real customer", testimonialStars: 5 },
      { kind: "badges", badges: ["Melatonin-free", "No proprietary blends", "Every dose on the label"] },
    ],
  },
  {
    id: "welcome",
    name: "Welcome",
    description: "Who you are, what happens next, and the first step",
    guidance: `Introduce the brand. Open with a "headerimage", style "card", then a "lead". Follow with "steps" for what to expect next (or a "checklist" when the source has no order), one "imagetext" on what the product is for, and "badges". Use "founder" ONLY if the source contains a first-person note. ${KEEP_IT_HONEST}`,
    ctaLabel: "Start your first night",
    starter: [
      { kind: "headerimage", headerStyle: "card", headerHeadline: "Welcome to Lunia", imagePrompt: "A quiet bedroom doorway at dusk, warm light spilling from inside, seen from the hall." },
      { kind: "lead", body: "Two capsules before bed, built for every night rather than for the worst one." },
      { kind: "steps", steps: [
        { title: "Up to 2 capsules", text: "30 to 60 minutes before bed" },
        { title: "Keep the last hour dim", text: "Bright light is the main thing pushing back" },
        { title: "Give it a full week", text: "Judge it on night seven, not night one" },
      ] },
      { kind: "imagetext", imageHeading: "What it is for", body: "Falling asleep without lying there planning tomorrow, and fewer 3am wake-ups.", imagePosition: "left", imagePrompt: "A bedside table with a glass of water and a small dish, one lamp lit, late evening." },
      { kind: "badges", badges: ["Melatonin-free", "No proprietary blends", "Every dose on the label"] },
    ],
  },
  {
    id: "urgency",
    name: "Last call",
    description: "Short: one line, the offer, the product",
    guidance: `Keep it very short, four blocks at most. Open with a "lead", then "discount" ONLY if the source has a code or price, then a "product" card. No grid, no ingredients, no paragraphs. Urgency comes from brevity, not from adjectives. ${KEEP_IT_HONEST}`,
    promoBand: "ENDS TONIGHT",
    ctaLabel: "Before it ends",
    starter: [
      { kind: "lead", body: "Last night to take the offer.", align: "center" },
      { kind: "discount", discountCode: "SLEEP20", discountDescription: "20% off your first order" },
      { kind: "product", productName: "Lunia Restore", productPrice: "$38.93", productNote: "60 capsules, 30 nights", buttonLabel: "Shop now", imagePrompt: "A single amber glass jar on a linen surface by a window, soft morning light, nothing else in frame." },
    ],
  },
  {
    id: "ingredient-deep-dive",
    name: "Ingredient deep dive",
    description: "One ingredient at a time, each with its own picture",
    theme: "cream",
    guidance: `Take the formula apart. Open with a "heading", then one "imagetext" per ingredient the source discusses, alternating imagePosition. Close with an "ingredients" panel (verified doses are allowed) and "badges". ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "heading", eyebrow: "Inside the capsule", headline: "Three ingredients, three jobs" },
      { kind: "imagetext", imageHeading: "Magnesium bisglycinate", body: "A chelated form, chosen because it is absorbed well and is gentle on the stomach.", imagePosition: "left", imagePrompt: "Pale mineral powder in a small dish on a plain surface, macro, soft daylight from the left." },
      { kind: "imagetext", imageHeading: "L-theanine", body: "An amino acid from green tea, associated with relaxation without sedation.", imagePosition: "right", imagePrompt: "Loose green tea leaves scattered on unglazed ceramic, overhead, flat natural light." },
      { kind: "ingredients", ingredientHeading: "What's inside", ingredientItems: [{ name: "Magnesium Bisglycinate", dose: "500 mg" }, { name: "L-Theanine", dose: "300 mg" }, { name: "Apigenin", dose: "50 mg" }], ingredientFootnote: "Melatonin-free, third-party tested" },
      { kind: "badges", badges: ["Melatonin-free", "No proprietary blends", "Every dose on the label"] },
    ],
  },
  {
    id: "subscribe-vs-once",
    name: "Subscribe or one-time",
    description: "The pricing question, answered in a table and an FAQ",
    guidance: `Answer the pricing question. Open with a "lead", then a "table" of the plans (verified prices are allowed), then an "imagebullets" of what a subscription actually changes, then an "faq" for the doubts the source raises (skipping, cancelling), then a "product" card. ${KEEP_IT_HONEST}`,
    ctaLabel: "See the plans",
    starter: [
      { kind: "lead", body: "Same capsules either way. The difference is what you pay and how often you think about it." },
      { kind: "table", tableHeaders: ["Path", "Per bottle", "Per night"], tableRows: [
        { cells: ["One bottle at a time", "$38.93", "$1.30"] },
        { cells: ["Subscription", "$29.20", "$0.97"] },
        { cells: ["3 month plan", "$19.99", "$0.67"] },
      ], tableEmphasisRow: 2 },
      { kind: "imagebullets", bulletItems: ["Skip or cancel anytime", "Arrives before you run out", "Same formula, lower price"], bulletColor: "aqua", imagePosition: "right", imagePrompt: "A cardboard parcel on a doormat inside a front door, morning light through the glass." },
      { kind: "faq", faqs: [{ q: "Can I skip a month?", a: "Yes. Skip or cancel anytime." }] },
    ],
  },
  {
    id: "wind-down-story",
    name: "Wind-down story",
    description: "Walk through an evening, hour by hour",
    theme: "cream",
    guidance: `Tell one evening as a sequence. Open with a "headerimage" style "pill", then a "lead". Then a "timeline" ONLY if the source has time labels, otherwise "steps". Set the best line as a "pullquote" and close with a "product" card. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "headerimage", headerStyle: "pill", headerPillText: "The last two hours", headerHeadline: "What your evening is actually deciding", imagePrompt: "A kitchen at dusk seen from the doorway, one lamp on, the window still faintly blue." },
      { kind: "lead", body: "Most of tonight's sleep is decided before you get into bed." },
      { kind: "timeline", timelineRows: [
        { label: "TWO HOURS OUT", text: "Core temperature starts to fall" },
        { label: "ONE HOUR OUT", text: "Bright light is the main thing pushing back" },
        { label: "LIGHTS OUT", text: "How deeply you go under is mostly already set" },
      ] },
      { kind: "pullquote", body: "The hour before bed does more than the hours in it." },
    ],
  },
  {
    id: "why-different",
    name: "Why we're different",
    description: "Us against the usual option, then the formula",
    guidance: `Make the difference argument. Open with a "lead", then a "beforeafter" (the usual option against Lunia), then a "grid" of three or more parallel points, then "ingredients" (verified doses are allowed) and "badges". Avoid "checklist" here. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "lead", body: "Most sleep supplements are melatonin and a proprietary blend. This is neither." },
      { kind: "beforeafter", beforeLabel: "Most sleep aids", afterLabel: "Lunia Restore", beforeItems: ["Melatonin", "Proprietary blend", "Doses you cannot see"], afterItems: ["Melatonin-free", "Three named ingredients", "Every dose on the label"] },
      { kind: "grid", gridCells: [
        { heading: "Melatonin-free", caption: "No grogginess, no vivid-dream rebound.", imagePrompt: "A morning bedroom with the curtains just opened, bedding thrown back, empty." },
        { heading: "Every dose printed", caption: "Nothing hidden behind a blend.", imagePrompt: "A supplement label photographed at a steep angle so no words are readable, plain background." },
        { heading: "Third-party tested", caption: "Checked by someone who does not work for us.", imagePrompt: "A laboratory bench with sample vials in a rack, gloved hand reaching in, cool daylight." },
      ] },
      { kind: "badges", badges: ["Melatonin-free", "No proprietary blends", "Every dose on the label"] },
    ],
  },

  // ── DTC flow shapes (2026-11) ──────────────────────────────────────────────
  // The five emails every DTC supplement flow sends that the set above did not
  // cover. Each one puts a second place to click (a product card) mid-email and
  // its proof just before the close, the two patterns that move click-through
  // most on long emails.
  {
    id: "product-launch",
    name: "Product launch",
    description: "Header, the one-line promise, us against the usual, the product card",
    theme: "cream",
    guidance: `Announce something new. Open with a "headerimage" style "pill" (the pill is the news, the headline is the promise), then a "lead". Follow with a "beforeafter" (what people use now against this), one "imagetext" on the most concrete detail, a "product" card, and "badges" last. ${KEEP_IT_HONEST}`,
    ctaLabel: "Try it tonight",
    starter: [
      { kind: "headerimage", headerStyle: "pill", headerPillText: "New", headerHeadline: "A sleep supplement without the melatonin", imagePrompt: "A bedside table at night, a single lamp, a glass of water, the rest of the room in shadow." },
      { kind: "lead", body: "Three named ingredients, every dose printed on the label, and nothing to taper off." },
      { kind: "beforeafter", beforeLabel: "Most sleep aids", afterLabel: "Lunia Restore", beforeItems: ["Melatonin", "Proprietary blend"], afterItems: ["Melatonin-free", "Every dose on the label"] },
      { kind: "product", productName: "Lunia Restore", productPrice: "$38.93", productComparePrice: "$59.90", productNote: "60 capsules, 30 nights", buttonLabel: "Shop now", imagePrompt: "A single amber glass jar on a linen surface by a window, soft morning light, nothing else in frame." },
      { kind: "badges", badges: ["Melatonin-free", "No proprietary blends", "Every dose on the label"] },
    ],
  },
  {
    id: "replenishment",
    name: "Running low",
    description: "A reorder nudge timed to the bottle running out",
    guidance: `A replenishment reminder. Open with a short "lead" (the bottle is nearly done), then a "product" card straight away. Follow with a "comparison" or "table" of one-time against subscription (verified prices are allowed), an "faq" for skipping and cancelling ONLY if the source mentions it, and "badges". Keep it to five blocks. ${KEEP_IT_HONEST}`,
    ctaLabel: "Reorder",
    starter: [
      { kind: "lead", body: "Your bottle is nearly done. Thirty nights goes faster than it sounds." },
      { kind: "product", productName: "Lunia Restore", productPrice: "$38.93", productNote: "60 capsules, 30 nights", buttonLabel: "Reorder", imagePrompt: "A single amber glass jar on a linen surface by a window, soft morning light, nothing else in frame." },
      { kind: "comparison", comparisonLeftLabel: "One-time", comparisonLeftPrice: "$38.93", comparisonLeftPerk: "Ships once", comparisonRightLabel: "Subscribe", comparisonRightPrice: "$29.20", comparisonRightPerk: "Arrives before you run out" },
      { kind: "badges", badges: ["Melatonin-free", "Cancel anytime", "Every dose on the label"] },
    ],
  },
  {
    id: "post-purchase",
    name: "How to use it",
    description: "Post-purchase: the routine in steps, the doubts in an FAQ",
    theme: "cream",
    guidance: `Onboard a new customer. Open with a "heading", then "steps" for how to take it (verified dose is allowed), a "pullquote" for the one habit that matters most, an "faq" for the questions a first-week customer has, and one "imagetext". No discount, no hard sell. ${KEEP_IT_HONEST}`,
    ctaLabel: "Read the full guide",
    starter: [
      { kind: "heading", eyebrow: "Your first week", headline: "How to get the most from it" },
      { kind: "steps", steps: [
        { title: "Up to 2 capsules", text: "30 to 60 minutes before bed" },
        { title: "Keep the last hour dim", text: "Bright light is the main thing pushing back" },
        { title: "Give it a full week", text: "Judge it on night seven, not night one" },
      ] },
      { kind: "pullquote", body: "Same time every night matters more than the dose." },
      { kind: "faq", faqs: [
        { q: "Does it contain melatonin?", a: "No. It is melatonin-free, so there is nothing to taper off." },
        { q: "Can I take it every night?", a: "It is built for every night rather than for the worst one." },
      ] },
      { kind: "imagetext", imageHeading: "The wind-down window", body: "The two hours before bed decide more than the hours in it.", imagePosition: "right", imagePrompt: "A living room in the last hour before bed, low lamplight, a book face down on the arm of a chair." },
    ],
  },
  {
    id: "objection-faq",
    name: "Answer the doubts",
    description: "For the undecided: the questions they are asking, answered",
    guidance: `Win over someone who has not bought. Open with a "lead" that names the hesitation, then an "faq" of the doubts the source answers (two to four), a "beforeafter", "reviews" ONLY if the source has verbatim customer quotes, then a "product" card. ${KEEP_IT_HONEST}`,
    ctaLabel: "Try it tonight",
    starter: [
      { kind: "lead", body: "Not sure a sleep supplement is for you? Fair. Here is what people ask first." },
      { kind: "faq", faqs: [
        { q: "Does it contain melatonin?", a: "No. It is melatonin-free, so no grogginess and nothing to taper off." },
        { q: "What is actually in it?", a: "Magnesium bisglycinate, L-theanine and apigenin, every dose on the label." },
        { q: "How do I take it?", a: "Up to 2 capsules, 30 to 60 minutes before bed." },
      ] },
      { kind: "beforeafter", beforeLabel: "Most sleep aids", afterLabel: "Lunia Restore", beforeItems: ["Melatonin", "Proprietary blend"], afterItems: ["Melatonin-free", "Every dose on the label"] },
      { kind: "product", productName: "Lunia Restore", productPrice: "$38.93", productNote: "60 capsules, 30 nights", buttonLabel: "Shop now", imagePrompt: "A single amber glass jar on a linen surface by a window, soft morning light, nothing else in frame." },
    ],
  },
  {
    id: "founder-story",
    name: "Founder note",
    description: "A signed note from a person, then the product",
    theme: "cream",
    guidance: `A personal note. Open with a "founder" block ONLY if the source contains a first-person note (otherwise a "lead"), then a "pullquote" of its best line, one "imagetext", and a "product" card. Keep it warm and short; no tables, no stats. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "founder", body: "Replace this with a few lines in your own voice: why you started Lunia, and what you want this email to do.", attribution: "Your name, founder" },
      { kind: "pullquote", body: "Built for every night, not for the worst one." },
      { kind: "imagetext", imageHeading: "Why melatonin-free", body: "No grogginess the next morning, and nothing to taper off.", imagePosition: "left", imagePrompt: "A bedroom just after waking, curtains open, bedding thrown back, morning light." },
      { kind: "product", productName: "Lunia Restore", productPrice: "$38.93", productNote: "60 capsules, 30 nights", buttonLabel: "Shop now", imagePrompt: "A single amber glass jar on a linen surface by a window, soft morning light, nothing else in frame." },
    ],
  },
];

/** Built-in shape by id. */
export function getShape(id: string): CampaignShape | undefined {
  return CAMPAIGN_SHAPES.find((s) => s.id === id);
}

/** Resolve a shape id to its layout guidance.
 *
 *  This is the ONLY way guidance reaches buildRestructurePrompt from a request.
 *  Returns undefined for an unknown id so the caller can 400 rather than
 *  silently restructuring with no shape. */
export function resolveShapeGuidance(id: string | undefined): string | undefined {
  if (!id) return "";
  return getShape(id)?.guidance;
}

// ─── Saved shapes ────────────────────────────────────────────────────────────
//
// You build an email that works, and bank its LAYOUT so you can lay other
// emails out the same way.
//
// It captures STRUCTURE, never copy. Two reasons, and the second matters more:
//   1. Copy is what a shape is supposed to leave alone. A saved shape applied
//      to a different email must rearrange THAT email's words.
//   2. Guidance is interpolated into an LLM prompt. If a saved shape stored a
//      free-text instruction, that text would be user input reaching the model.
//      Deriving it from a structural record instead means nothing typed by a
//      human ever lands in a prompt.
//
// The consequence, stated up front: a saved shape has no starter copy, so it
// cannot render a real thumbnail. The gallery draws it as a block-order
// schematic instead.

/** One captured block. Structure only: no body, no headline, no imagePrompt. */
export type ShapeBlockRecord = {
  kind: CampaignBlockKind;
  imagePosition?: "left" | "right";
  headerStyle?: "card" | "pill";
  bulletColor?: string;
  /** Which row a table emphasised, so the recreated table emphasises one too. */
  emphasisRow?: number;
  /** How many cells a grid had, so the shape asks for the same density. */
  cells?: number;
};

export type SavedShape = {
  id: string;
  name: string;
  createdAt: string;
  theme?: CampaignContent["theme"];
  blocks: ShapeBlockRecord[];
  /** Brand preset: spacing, logo, band and CTA colours. Absent on shapes
   *  saved before presets existed. */
  settings?: EmailPresetSettings;
};

/** The document-level settings of an email, as a preset. */
export function capturePresetSettings(content: CampaignContent): EmailPresetSettings {
  const out: EmailPresetSettings = {};
  if (typeof content.blockSpacing === "number") out.blockSpacing = content.blockSpacing;
  if (content.showLogo !== undefined) out.showLogo = content.showLogo;
  if (content.promoRole) out.promoRole = content.promoRole;
  if (content.cta.style) out.ctaStyle = content.cta.style;
  if (content.cta.heroStyle) out.ctaHeroStyle = content.cta.heroStyle;
  if (content.cta.bgRole) out.ctaBgRole = content.cta.bgRole;
  if (content.cta.heroBgRole) out.ctaHeroBgRole = content.cta.heroBgRole;
  if (content.cta.showOnHero !== undefined) out.ctaShowOnHero = content.cta.showOnHero;
  return out;
}

/** Apply a preset to an email. Only the keys the preset carries change. */
export function applyPresetSettings(content: CampaignContent, s: EmailPresetSettings | undefined): CampaignContent {
  if (!s) return content;
  const cta = { ...content.cta };
  if (s.ctaStyle !== undefined) cta.style = s.ctaStyle;
  if (s.ctaHeroStyle !== undefined) cta.heroStyle = s.ctaHeroStyle;
  if (s.ctaBgRole !== undefined) cta.bgRole = s.ctaBgRole;
  if (s.ctaHeroBgRole !== undefined) cta.heroBgRole = s.ctaHeroBgRole;
  if (s.ctaShowOnHero !== undefined) cta.showOnHero = s.ctaShowOnHero;
  return {
    ...content,
    ...(s.blockSpacing !== undefined ? { blockSpacing: s.blockSpacing } : {}),
    ...(s.showLogo !== undefined ? { showLogo: s.showLogo } : {}),
    ...(s.promoRole !== undefined ? { promoRole: s.promoRole } : {}),
    cta,
  };
}

/** Read the layout of an email, discarding everything else. */
export function captureShapeStructure(content: CampaignContent): Omit<SavedShape, "id" | "name" | "createdAt"> {
  return {
    theme: content.theme,
    settings: capturePresetSettings(content),
    blocks: content.blocks.map((b) => {
      const rec: ShapeBlockRecord = { kind: b.kind ?? "text" };
      if (b.imagePosition) rec.imagePosition = b.imagePosition;
      if (b.headerStyle) rec.headerStyle = b.headerStyle;
      if (b.bulletColor) rec.bulletColor = b.bulletColor;
      if (typeof b.tableEmphasisRow === "number") rec.emphasisRow = b.tableEmphasisRow;
      if (b.gridCells?.length) rec.cells = b.gridCells.length;
      return rec;
    }),
  };
}

/** How each kind reads in a derived instruction. */
const KIND_PHRASE: Record<CampaignBlockKind, string> = {
  text: "a plain paragraph",
  stat: "a stat callout",
  discount: "a discount callout",
  checklist: "a checklist",
  testimonial: "a testimonial",
  timeline: "a timeline",
  trustgrid: "a trust grid",
  comparison: "a two-column comparison",
  ingredients: "an ingredients panel",
  image: "an image",
  table: "a table",
  imagetext: "a picture beside copy",
  imagebullets: "a picture beside bullets",
  grid: "a grid",
  headerimage: "a header image",
  lead: "a large light lead paragraph",
  heading: "a section heading",
  pullquote: "a pull quote",
  steps: "numbered steps",
  faq: "an FAQ",
  beforeafter: "a before and after comparison",
  badges: "a row of trust badges",
  product: "a product card",
  reviews: "a stack of reviews",
  founder: "a signed note from the founder",
};

/** Build the layout instruction from a captured structure.
 *
 *  Generated, never stored, so a saved shape cannot carry text into a prompt.
 *  Reads as an ordered description of the layout, which is exactly what the
 *  built-in shapes' hand-written guidance also is. */
export function deriveShapeGuidance(shape: Pick<SavedShape, "blocks">): string {
  if (shape.blocks.length === 0) return "";
  const steps = shape.blocks.map((b, i) => {
    const bits: string[] = [KIND_PHRASE[b.kind] ?? "a block"];
    if (b.imagePosition) bits.push(`with the picture on the ${b.imagePosition}`);
    if (b.headerStyle) bits.push(`in the "${b.headerStyle}" style`);
    if (b.cells) bits.push(`of about ${b.cells} cells`);
    if (typeof b.emphasisRow === "number") bits.push("with one row emphasised");
    if (b.bulletColor) bits.push(`with ${b.bulletColor} bullets`);
    return `${i + 1}. ${bits.join(", ")}`;
  });
  return `SAVED SHAPE. Rebuild this layout with the source copy, in this order:

${steps.join("\n")}

Follow the order and the block kinds as closely as the source copy allows. If the
copy cannot fill one of these blocks honestly, drop that block rather than
inventing content for it, and never add a block the list does not name.`;
}

/** Present a saved shape through the same interface as a built-in one, so the
 *  gallery and the apply path never branch on where a shape came from. */
export function savedShapeToCampaignShape(saved: SavedShape): CampaignShape {
  return {
    id: `saved:${saved.id}`,
    name: saved.name,
    description: `Your saved layout, ${saved.blocks.length} blocks${saved.settings && Object.keys(saved.settings).length ? ", with its brand settings" : ""}`,
    theme: saved.theme,
    settings: saved.settings,
    guidance: deriveShapeGuidance(saved),
    // No starter: a saved shape captures no copy, so it has none to show.
    starter: undefined,
  };
}

/** True for an id that names a saved shape rather than a built-in. */
export function isSavedShapeId(id: string): boolean {
  return id.startsWith("saved:");
}

/** The raw uuid behind a `saved:` id. */
export function savedShapeIdOf(id: string): string {
  return id.slice("saved:".length);
}
