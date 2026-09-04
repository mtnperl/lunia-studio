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
2. Then ALTERNATE "imagetext" blocks, imagePosition "left", then "right", then
   "left". Two or three of them. This alternation is the single most
   recognisable part of the look, so do not emit them all on one side.
3. Include ONE "imagebullets" block for the strongest short list, with
   bulletColor "aqua" or "yellow".
4. Include ONE "grid" when the source has three or more parallel points.
5. Use "table" only when the source already contains prices or plan numbers.
6. Keep bare "text" blocks to AT MOST ONE. In this mode a paragraph on its own
   is a last resort; almost everything should carry a picture.
7. Aim for 5 to 8 blocks.

Every block that can hold a picture MUST come with its own imagePrompt, and
they must be different scenes from each other. Repeating the same scene across
blocks is the failure mode this layout exposes most.`;

/** Shared tail for guidance strings that name an opening block. */
const KEEP_IT_HONEST = `Every block must use only words from the source copy. If the source cannot fill a block this shape asks for, drop that block rather than inventing content for it.`;

export const CAMPAIGN_SHAPES: CampaignShape[] = [
  {
    id: "auto",
    name: "Let the model choose",
    description: "Read the copy and pick whatever layout fits it",
    // Empty guidance is the plain "Make it visual" behaviour. No starter: with
    // nothing to restructure there is nothing for the model to choose between.
    guidance: "",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Header image, alternating picture-and-copy rows, almost no bare text",
    theme: "cream",
    guidance: EDITORIAL_GUIDANCE,
    starter: [
      { kind: "headerimage", headerStyle: "card", headerHeadline: "Stronger mornings start the night before", imagePrompt: "A bedroom just after waking, low winter light through a gap in the curtains, bedding pushed back, nobody in frame yet." },
      { kind: "imagetext", imageHeading: "Three pathways, one capsule", body: "Magnesium bisglycinate, L-theanine and apigenin work on different parts of the same problem. Doses printed on the label, so you know what you are taking.", imagePosition: "left", imagePrompt: "Loose botanical material and pale powder on a plain stone surface, macro, flat daylight from one side." },
      { kind: "imagebullets", bulletItems: ["Melatonin-free", "No proprietary blends", "Third-party tested"], bulletColor: "aqua", imagePosition: "right", imagePrompt: "A laboratory bench, gloved hands weighing a sample, clean daylight, no branding anywhere." },
      { kind: "text", body: "Built for every night, not for the worst one.", align: "center" },
    ],
  },
  {
    id: "discount",
    name: "Discount announcement",
    description: "Promo band, the offer up front, then why it is worth taking",
    guidance: `Lead with the offer. Open with a "discount" block ONLY if the source contains a real code or price, otherwise open with "text". Follow with an "imagebullets" block for the reasons to act, then a "table" if the source has plan pricing. Close on one short "text" block. ${KEEP_IT_HONEST}`,
    promoBand: "LIMITED TIME",
    ctaLabel: "Claim your discount",
    starter: [
      { kind: "text", body: "A short line on why this offer exists right now.", align: "left" },
      { kind: "discount", discountCode: "SLEEP20", discountDescription: "20% off your first order", originalPrice: "$38.93", newPrice: "$29.20" },
      { kind: "imagebullets", bulletItems: ["Melatonin-free", "Doses printed on the label", "Cancel anytime"], bulletColor: "yellow", imagePosition: "left", imagePrompt: "A kitchen counter at night, a glass of water and a paperback beside it, one warm lamp out of frame." },
    ],
  },
  {
    id: "educational",
    name: "Educational",
    description: "One idea explained, with a picture beside each step",
    guidance: `Teach one idea. Open with a "text" block that states it plainly, then TWO "imagetext" blocks that carry it forward, imagePosition "left" then "right". Use "ingredients" only if the source names doses. Keep bare text blocks to at most two. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "text", body: "Most people think of sleep as one thing. It is closer to three, and they fail in different ways.", align: "left" },
      { kind: "imagetext", imageHeading: "Falling asleep", body: "The wind-down window is roughly the two hours before bed. Light, food and stress all push against it.", imagePosition: "left", imagePrompt: "A living room in the last hour before bed, low lamplight, a book face down on the arm of a chair." },
      { kind: "imagetext", imageHeading: "Staying asleep", body: "Waking at three in the morning is usually about how deeply you went under, not about how tired you were.", imagePosition: "right", imagePrompt: "A dark bedroom at three in the morning, a bedside clock out of focus, moonlight on the wall." },
      { kind: "ingredients", ingredientHeading: "What's inside", ingredientItems: [{ name: "Magnesium Bisglycinate", dose: "500 mg" }, { name: "L-Theanine", dose: "300 mg" }, { name: "Apigenin", dose: "50 mg" }], ingredientFootnote: "Melatonin-free, third-party tested" },
    ],
  },
  {
    id: "proof-led",
    name: "Proof-led",
    description: "Numbers first, then the reviews behind them",
    guidance: `Lead with evidence. Open with a "stat" block ONLY if the source contains the number, then a "grid" of parallel proof points, then a "testimonial" ONLY if the source contains verbatim quoted customer text. Never invent a number or a quote. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "stat", statValue: "558 reviews", statLabel: "91% five-star" },
      { kind: "grid", gridCells: [
        { heading: "Melatonin-free", caption: "No grogginess, nothing to taper off.", imagePrompt: "An empty unmade bed in morning light, curtains open, nobody in frame." },
        { heading: "Transparent dosing", caption: "Every milligram printed on the label.", imagePrompt: "A clipboard and a pen on a laboratory bench, clean daylight, no text legible." },
      ] },
      { kind: "testimonial", testimonialQuote: "Replace this with a real review before sending.", testimonialAuthor: "Sample, not a real customer", testimonialStars: 5 },
    ],
  },
  {
    id: "welcome",
    name: "Welcome",
    description: "Say who you are, then what to expect",
    guidance: `Introduce the brand. Open with a "headerimage", style "card". Follow with one "imagetext" on what the product is for, then a "checklist" of what to expect next. Close on a short "text". ${KEEP_IT_HONEST}`,
    ctaLabel: "Start your first night",
    starter: [
      { kind: "headerimage", headerStyle: "card", headerHeadline: "Welcome to Lunia", imagePrompt: "A quiet bedroom doorway at dusk, warm light spilling from inside, seen from the hall." },
      { kind: "imagetext", imageHeading: "What it is for", body: "Two capsules before bed, built for every night rather than for the worst one.", imagePosition: "left", imagePrompt: "A bedside table with a glass of water and a small dish, one lamp lit, late evening." },
      { kind: "checklist", items: ["Two capsules, before bed", "Give it a full week", "Melatonin-free, so no tapering"] },
      { kind: "text", body: "Questions get a real answer, usually the same day.", align: "center" },
    ],
  },
  {
    id: "urgency",
    name: "Last call",
    description: "Short, one reason, one deadline",
    guidance: `Keep it very short, three blocks at most. Open with "text", then "discount" ONLY if the source has a code or price, then close. No grid, no ingredients. Urgency comes from brevity, not from adjectives. ${KEEP_IT_HONEST}`,
    promoBand: "ENDS TONIGHT",
    ctaLabel: "Before it ends",
    starter: [
      { kind: "text", body: "Last night to take the offer.", align: "center" },
      { kind: "discount", discountCode: "SLEEP20", discountDescription: "20% off your first order" },
    ],
  },
  {
    id: "ingredient-deep-dive",
    name: "Ingredient deep dive",
    description: "One ingredient at a time, each with its own picture",
    theme: "cream",
    guidance: `Take the formula apart. Open with "text", then one "imagetext" per ingredient the source discusses, alternating imagePosition. Close with an "ingredients" panel ONLY if the source names doses. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "text", body: "Three ingredients, each doing a different job.", align: "left" },
      { kind: "imagetext", imageHeading: "Magnesium bisglycinate", body: "A chelated form, chosen because it is absorbed well and is gentle on the stomach.", imagePosition: "left", imagePrompt: "Pale mineral powder in a small dish on a plain surface, macro, soft daylight from the left." },
      { kind: "imagetext", imageHeading: "L-theanine", body: "An amino acid from green tea, associated with relaxation without sedation.", imagePosition: "right", imagePrompt: "Loose green tea leaves scattered on unglazed ceramic, overhead, flat natural light." },
      { kind: "ingredients", ingredientHeading: "What's inside", ingredientItems: [{ name: "Magnesium Bisglycinate", dose: "500 mg" }, { name: "L-Theanine", dose: "300 mg" }, { name: "Apigenin", dose: "50 mg" }], ingredientFootnote: "Melatonin-free, third-party tested" },
    ],
  },
  {
    id: "subscribe-vs-once",
    name: "Subscribe or one-time",
    description: "The pricing question, answered in a table",
    guidance: `Answer the pricing question. Open with a short "text", then a "table" ONLY if the source contains the prices, otherwise a "comparison". Follow with an "imagebullets" of what a subscription actually changes. ${KEEP_IT_HONEST}`,
    ctaLabel: "See the plans",
    starter: [
      { kind: "text", body: "Same capsules either way. The difference is what you pay and how often you think about it.", align: "left" },
      { kind: "table", tableHeaders: ["Path", "Per bottle", "Per night"], tableRows: [
        { cells: ["One bottle at a time", "$38.93", "$1.30"] },
        { cells: ["Subscription", "$29.20", "$0.97"] },
        { cells: ["3 month plan", "$33.10", "$0.84"] },
      ], tableEmphasisRow: 2 },
      { kind: "imagebullets", bulletItems: ["Skip or cancel anytime", "Arrives before you run out", "Same formula, lower price"], bulletColor: "aqua", imagePosition: "right", imagePrompt: "A cardboard parcel on a doormat inside a front door, morning light through the glass." },
    ],
  },
  {
    id: "wind-down-story",
    name: "Wind-down story",
    description: "Walk through an evening, hour by hour",
    theme: "cream",
    guidance: `Tell one evening as a sequence. Open with a "headerimage" style "pill", then a "timeline" ONLY if the source has time labels, otherwise two "imagetext" blocks in order. Close on a short "text". ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "headerimage", headerStyle: "pill", headerPillText: "The last two hours", headerHeadline: "What your evening is actually deciding", imagePrompt: "A kitchen at dusk seen from the doorway, one lamp on, the window still faintly blue." },
      { kind: "timeline", timelineRows: [
        { label: "TWO HOURS OUT", text: "Core temperature starts to fall" },
        { label: "ONE HOUR OUT", text: "Bright light is the main thing pushing back" },
        { label: "LIGHTS OUT", text: "How deeply you go under is mostly already set" },
      ] },
      { kind: "text", body: "The hour before bed does more than the hours in it.", align: "center" },
    ],
  },
  {
    id: "why-different",
    name: "Why we're different",
    description: "A grid of trust points, then the formula",
    guidance: `Make the difference argument. Open with "text", then a "grid" of three or more parallel points, then "ingredients" ONLY if the source names doses. Avoid "checklist" here; the grid is the point. ${KEEP_IT_HONEST}`,
    starter: [
      { kind: "text", body: "Most sleep supplements are melatonin and a proprietary blend. This is neither.", align: "left" },
      { kind: "grid", gridCells: [
        { heading: "Melatonin-free", caption: "No grogginess, no vivid-dream rebound.", imagePrompt: "A morning bedroom with the curtains just opened, bedding thrown back, empty." },
        { heading: "Every dose printed", caption: "Nothing hidden behind a blend.", imagePrompt: "A supplement label photographed at a steep angle so no words are readable, plain background." },
        { heading: "Third-party tested", caption: "Checked by someone who does not work for us.", imagePrompt: "A laboratory bench with sample vials in a rack, gloved hand reaching in, cool daylight." },
      ] },
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
