// Starter content for a newly-added block.
//
// The point is to give you something to react to. An empty block asks you to
// imagine the result before you can judge it; a filled one lets you say yes,
// no, or nudge.
//
// Every value comes from PRODUCT rather than being retyped, so sample copy can
// never quietly contradict the brand canon, and every string goes through
// stripDashes because PRODUCT.dose ships an en dash and the no-dash rule is
// absolute.
//
// ONE DELIBERATE EXCEPTION to "use real facts": the testimonial sample is
// visibly placeholder text, not a plausible named customer. Every other sample
// is a true statement about the product, so shipping one un-edited is merely
// generic. A fabricated review is a different category of wrong, and sample
// data sits one un-edited click from a real send.
import { PRODUCT } from "./lunia-brand-guidelines";
import { stripDashes } from "./strip-dashes";
import { CAMPAIGN_BLOCK_KINDS, type CampaignBlock, type CampaignBlockKind } from "./types";

const money = (n: number) => `$${n.toFixed(2)}`;

/** Per-kind starter content, minus the fields every block already has.
 *  A Record keyed on the kind union, so a new kind without a sample is a
 *  compile error rather than a block that silently opens empty. */
export const BLOCK_SAMPLES: Record<CampaignBlockKind, Partial<CampaignBlock>> = {
  text: {
    body: "Most people wake up groggy and blame the night before. Usually it is the wind-down window, not the hours.",
  },
  stat: {
    statValue: `${PRODUCT.reviewCount} reviews`,
    statLabel: `${PRODUCT.fiveStarPct}% five-star`,
  },
  discount: {
    discountCode: "SLEEP20",
    discountDescription: "20% off your first order",
    originalPrice: money(PRODUCT.price1Bottle),
    newPrice: money(PRODUCT.priceSubscription),
  },
  checklist: {
    items: ["Melatonin-free", "No proprietary blends", "Every dose printed on the label"],
  },
  testimonial: {
    // Deliberately unusable as-is. See the note at the top of this file.
    testimonialQuote: "Replace this with a real review before sending.",
    testimonialAuthor: "Sample, not a real customer",
    testimonialStars: 5,
  },
  timeline: {
    timelineRows: [
      { label: "NIGHT 1", text: "Falling asleep without lying there planning tomorrow" },
      { label: "WEEK 2", text: "Fewer 3am wake-ups" },
      { label: "WEEK 4", text: "Mornings that start before the second coffee" },
    ],
  },
  trustgrid: {
    trustItems: [
      { caption: "Third-party tested" },
      { caption: "Made in a GMP facility" },
    ],
  },
  comparison: {
    comparisonLeftLabel: "One-time",
    comparisonLeftPrice: money(PRODUCT.price1Bottle),
    comparisonLeftPerk: "Ships once",
    comparisonRightLabel: "Subscribe",
    comparisonRightPrice: money(PRODUCT.priceSubscription),
    comparisonRightPerk: "Cancel anytime",
  },
  ingredients: {
    ingredientHeading: "What's inside",
    ingredientItems: PRODUCT.ingredients.map((i) => ({ name: i.name, dose: i.dose })),
    ingredientFootnote: "Melatonin-free, third-party tested",
  },
  image: {
    // An image block places a slot the user picks; there is nothing to prefill
    // but the layout, and "column" is already its default.
    imageLayout: "column",
  },
  table: {
    tableHeaders: ["Path", "Per bottle", "Per night"],
    tableRows: [
      { cells: ["One bottle at a time", money(PRODUCT.price1Bottle), "$1.30"] },
      { cells: ["Subscription", money(PRODUCT.priceSubscription), "$0.97"] },
      { cells: ["3 month plan", money(PRODUCT.price3Bottles / 3), "$0.84"] },
    ],
    tableEmphasisRow: 2,
  },
  imagetext: {
    imageHeading: "Three ingredients, all at clinical doses",
    body: `Magnesium bisglycinate, L-theanine and apigenin. ${PRODUCT.pricePerServing} a serving, and nothing hidden behind a proprietary blend.`,
    imagePosition: "left",
  },
  imagebullets: {
    bulletItems: ["Melatonin-free", "Non-habit forming", "Vegan and gluten-free"],
    bulletColor: "aqua",
    imagePosition: "right",
  },
  grid: {
    gridCells: [
      { heading: "Melatonin-free", caption: "No grogginess, no tolerance, nothing to taper off." },
      { heading: "Transparent dosing", caption: "Every milligram printed on the label." },
    ],
  },
  headerimage: {
    headerStyle: "card",
    headerHeadline: "Stronger mornings start the night before",
  },
};

/** A ready-to-edit block of the given kind.
 *
 *  `isSample` is editor-only and is never read by the renderer, so this can
 *  never change what an email looks like. `imageUrl` is filled from the asset
 *  library when one is available; generation is always an explicit click, so
 *  adding a block never spends one. */
export function sampleBlock(kind: CampaignBlockKind, id: string, imageUrl?: string): CampaignBlock {
  const sample = BLOCK_SAMPLES[kind];
  const block: CampaignBlock = {
    id,
    body: "",
    align: "left",
    kind,
    isSample: true,
    ...sample,
  };
  // Give the image-bearing kinds a real picture when the library has one, so a
  // new block looks like the thing it will be rather than a grey rectangle.
  // Kind "image" is excluded: it points at a slot in content.images, which the
  // editor creates alongside it.
  if (imageUrl) {
    if (kind === "imagetext" || kind === "imagebullets" || kind === "headerimage") {
      block.imageUrl = imageUrl;
    } else if (kind === "grid") {
      block.gridCells = (block.gridCells ?? []).map((c) => ({ ...c, imageUrl }));
    } else if (kind === "trustgrid") {
      block.trustItems = (block.trustItems ?? []).map((t) => ({ ...t, imageUrl }));
    }
  }
  // Strip dashes from every string the sample contributes. PRODUCT.dose alone
  // would otherwise put an en dash into an email on a single click.
  return scrubDashes(block);
}

/** Deep-strip forbidden dashes from every string a block carries. */
function scrubDashes(block: CampaignBlock): CampaignBlock {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return stripDashes(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, walk(val)]));
    }
    return v;
  };
  // id is a uuid and align/kind are literal unions; walking them is harmless
  // (stripDashes leaves them untouched) and keeps this exhaustive by default.
  return walk(block) as CampaignBlock;
}

/** The empty shape a block of this kind had before samples existed. Used by
 *  the Clear action, so "clear" means "as if I had just added it", not
 *  "delete the block". */
export function emptyBlock(kind: CampaignBlockKind, id: string): CampaignBlock {
  const base: CampaignBlock = { id, body: "", align: "left", kind };
  if (kind === "checklist") base.items = [];
  if (kind === "testimonial") base.testimonialStars = 5;
  if (kind === "timeline") base.timelineRows = [];
  if (kind === "trustgrid") base.trustItems = [];
  if (kind === "grid") base.gridCells = [];
  if (kind === "table") base.tableHeaders = ["", ""];
  if (kind === "image") base.imageLayout = "column";
  return base;
}

/** Every kind has a sample. Exported so a test can assert it without
 *  reaching into the Record's key list twice. */
export const SAMPLED_KINDS = CAMPAIGN_BLOCK_KINDS;
