// Catalog of all curated graphic components — drives the v2 picker UI and
// keeps a single source of truth for tier + description metadata.
//
// RETIRED components stay listed (saved carousels still reference them and
// must keep parsing) but are excluded from everything forward-looking: the
// generator prompt, the picker UI, and the render map. They render as nothing.
//
// The retirement rule, applied to a full contact-sheet render of every
// component: no boxed/bordered containers, no emoji, no spreadsheet grids.
// What that removes is the SmartArt vocabulary — labelled rectangles wired
// together with arrows — which is what made these read as clip art rather
// than as editorial infographics. What survives is typography and thin
// geometry sitting directly on the slide background.

export type GraphicTier = "A" | "B" | "C";

export type GraphicTypeMeta = {
  key: string;
  label: string;
  tier: GraphicTier;
  /** One-line description: when this component shines. */
  description: string;
  /** Retired from the roster — never offered, never rendered. See above. */
  retired?: true;
};

export const GRAPHIC_TYPES: GraphicTypeMeta[] = [
  // ─── TIER A — DATA ────────────────────────────────────────────────────────
  { key: "stat",        label: "Stat",         tier: "A", description: "One hero number with context" },
  { key: "radial",      label: "Radial",       tier: "A", description: "Single percentage on a speedometer arc" },
  { key: "bars",        label: "Bars",         tier: "A", description: "Compare 2-4 values side by side" },
  { key: "donut",       label: "Donut",        tier: "A", description: "Single percentage filled on a ring" },
  { key: "split",       label: "Split",        tier: "A", description: "Percentage split across 2-4 parts" },
  { key: "circleStats", label: "Circle stats", tier: "A", description: "2-4 ringed stat circles" },
  { key: "spectrum",    label: "Spectrum",     tier: "A", description: "Range on a min-max scale" },
  { key: "stackedBar",  label: "Stacked bar",  tier: "A", description: "Composition broken into 2-5 segments" },
  { key: "funnel",      label: "Funnel",       tier: "A", description: "2-5 stage funnel with drop-off" },
  { key: "scorecard",   label: "Scorecard",    tier: "A", description: "Big grade or score" },
  { key: "iconStat",    label: "Icon stat",    tier: "A", description: "Hero emoji + big number", retired: true },  // 3D emoji hero — off-brand
  { key: "heatGrid",    label: "Heat grid",    tier: "A", description: "Grid coloured by intensity", retired: true },  // reads as a spreadsheet
  { key: "wave",        label: "Wave",         tier: "A", description: "Decorative wave with 2-3 labeled zones" },
  { key: "timeline",    label: "Timeline",     tier: "A", description: "2-6 chronological events" },
  { key: "matrix2x2",   label: "Matrix 2x2",   tier: "A", description: "2x2 quadrant comparison", retired: true },  // boxed quadrants
  { key: "callout",     label: "Callout",      tier: "A", description: "Bold pull-quote or stat" },

  // ─── TIER B — LAYOUT ──────────────────────────────────────────────────────
  { key: "hubSpoke",     label: "Hub & spoke",   tier: "B", description: "Central concept with 3-5 radiating effects", retired: true },  // boxed SmartArt
  { key: "iceberg",      label: "Iceberg",       tier: "B", description: "Hidden truth beneath surface perception", retired: true },  // boxes, not an iceberg
  { key: "bridge",       label: "Bridge",        tier: "B", description: "Problem → result transformation arc", retired: true },  // boxes + dashed arc SmartArt
  { key: "bento",        label: "Bento",         tier: "B", description: "2-4 distinct insight tiles", retired: true },  // emoji tiles
  { key: "conceptFlow",  label: "Concept flow",  tier: "B", description: "3-5 cause-effect nodes with sublabels", retired: true },  // boxed nodes + chevrons
  { key: "dotchain",     label: "Dot chain",     tier: "B", description: "Before/after 2-state comparison", retired: true },  // off-palette break marker
  { key: "steps",        label: "Steps",         tier: "B", description: "2-4 numbered sequential steps" },
  { key: "processFlow",  label: "Process flow",  tier: "B", description: "Horizontal process boxes with arrows", retired: true },  // boxes + arrows SmartArt
  { key: "checklist",    label: "Checklist",     tier: "B", description: "2-5 key facts as a list" },
  { key: "iconGrid",     label: "Icon grid",     tier: "B", description: "2-4 icon + label row" },
  { key: "pyramid",      label: "Pyramid",       tier: "B", description: "2-5 level priority hierarchy", retired: true },  // stacked-bar SmartArt
  { key: "versus",       label: "Versus",        tier: "B", description: "A vs B comparison", retired: true },  // boxed cards
  { key: "table",        label: "Table",         tier: "B", description: "2-4 columns, 1-5 rows", retired: true },  // reads as a spreadsheet
  { key: "bubbles",      label: "Bubbles",       tier: "B", description: "2-5 bubbles sized by importance", retired: true },  // flat grey circles
  { key: "circularCycle",label: "Circular cycle", tier: "B", description: "Loop of recurring stages", retired: true },  // never rendered (absent from GraphicSpec schema)

  // ─── TIER C — VECTOR / CONCEPT ────────────────────────────────────────────
  { key: "vector",       label: "Vector art",    tier: "C", description: "Abstract illustration for emotional or conceptual slides" },
];

/** The live roster — everything the generator may pick and the picker offers. */
export const ACTIVE_GRAPHIC_TYPES: GraphicTypeMeta[] = GRAPHIC_TYPES.filter((t) => !t.retired);

/** Retired keys, as a Set, for cheap lookups at render/validation time. */
export const RETIRED_GRAPHIC_KEYS: ReadonlySet<string> = new Set(
  GRAPHIC_TYPES.filter((t) => t.retired).map((t) => t.key),
);

export function isRetiredGraphic(key: string): boolean {
  return RETIRED_GRAPHIC_KEYS.has(key);
}

export function getGraphicTypeMeta(key: string): GraphicTypeMeta | undefined {
  return GRAPHIC_TYPES.find((t) => t.key === key);
}

/** Active components in a tier. Retired ones are never returned. */
export function getGraphicsByTier(tier: GraphicTier): GraphicTypeMeta[] {
  return ACTIVE_GRAPHIC_TYPES.filter((t) => t.tier === tier);
}

export const TIER_LABELS: Record<GraphicTier, string> = {
  A: "Data",
  B: "Layout",
  C: "Concept",
};

export const TIER_HINTS: Record<GraphicTier, string> = {
  A: "Uses real numbers from your slide",
  B: "Structural shapes — cycles, contrasts, hierarchies",
  C: "Abstract illustration for conceptual slides",
};
