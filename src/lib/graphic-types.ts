// Catalog of all curated graphic components — drives the v2 picker UI and
// keeps a single source of truth for tier + description metadata.

export type GraphicTier = "A" | "B" | "C";

export type GraphicTypeMeta = {
  key: string;
  label: string;
  tier: GraphicTier;
  /** One-line description: when this component shines. */
  description: string;
};

export const GRAPHIC_TYPES: GraphicTypeMeta[] = [
  // ─── TIER A — DATA ────────────────────────────────────────────────────────
  { key: "stat",        label: "Stat",         tier: "A", description: "One hero number with context" },
  { key: "radial",      label: "Radial",       tier: "A", description: "Single percentage on a speedometer arc" },
  { key: "bars",        label: "Bars",         tier: "A", description: "Compare 2-4 values side by side" },
  { key: "donut",       label: "Donut",        tier: "A", description: "Proportional 2-5 part breakdown" },
  { key: "split",       label: "Split",        tier: "A", description: "Percentage split across 2-4 parts" },
  { key: "circleStats", label: "Circle stats", tier: "A", description: "2-4 ringed stat circles" },
  { key: "spectrum",    label: "Spectrum",     tier: "A", description: "Range on a min-max scale" },
  { key: "stackedBar",  label: "Stacked bar",  tier: "A", description: "Composition broken into 2-5 segments" },
  { key: "funnel",      label: "Funnel",       tier: "A", description: "2-5 stage funnel with drop-off" },
  { key: "scorecard",   label: "Scorecard",    tier: "A", description: "Big grade or score" },
  { key: "iconStat",    label: "Icon stat",    tier: "A", description: "Hero emoji + big number" },
  { key: "heatGrid",    label: "Heat grid",    tier: "A", description: "Grid coloured by intensity" },
  { key: "wave",        label: "Wave",         tier: "A", description: "Trend line over 2-6 points" },
  { key: "timeline",    label: "Timeline",     tier: "A", description: "2-6 chronological events" },
  { key: "matrix2x2",   label: "Matrix 2x2",   tier: "A", description: "2x2 quadrant comparison" },
  { key: "callout",     label: "Callout",      tier: "A", description: "Bold pull-quote or stat" },

  // ─── TIER B — LAYOUT ──────────────────────────────────────────────────────
  { key: "hubSpoke",     label: "Hub & spoke",   tier: "B", description: "Central concept with 3-5 radiating effects" },
  { key: "iceberg",      label: "Iceberg",       tier: "B", description: "Hidden truth beneath surface perception" },
  { key: "bridge",       label: "Bridge",        tier: "B", description: "Problem → result transformation arc" },
  { key: "bento",        label: "Bento",         tier: "B", description: "2-4 distinct insight tiles" },
  { key: "conceptFlow",  label: "Concept flow",  tier: "B", description: "3-5 cause-effect nodes with sublabels" },
  { key: "dotchain",     label: "Dot chain",     tier: "B", description: "3-5 simple connected steps" },
  { key: "steps",        label: "Steps",         tier: "B", description: "2-4 numbered sequential steps" },
  { key: "processFlow",  label: "Process flow",  tier: "B", description: "Horizontal process boxes with arrows" },
  { key: "checklist",    label: "Checklist",     tier: "B", description: "2-5 key facts as a list" },
  { key: "iconGrid",     label: "Icon grid",     tier: "B", description: "2-9 icon + label grid" },
  { key: "pyramid",      label: "Pyramid",       tier: "B", description: "2-5 level priority hierarchy" },
  { key: "versus",       label: "Versus",        tier: "B", description: "A vs B comparison" },
  { key: "table",        label: "Table",         tier: "B", description: "2-4 columns, 1-5 rows" },
  { key: "bubbles",      label: "Bubbles",       tier: "B", description: "2-5 bubbles sized by importance" },
  { key: "circularCycle",label: "Circular cycle", tier: "B", description: "Loop of recurring stages" },

  // ─── TIER C — VECTOR / CONCEPT ────────────────────────────────────────────
  { key: "vector",       label: "Vector art",    tier: "C", description: "Abstract illustration for emotional or conceptual slides" },
];

export function getGraphicTypeMeta(key: string): GraphicTypeMeta | undefined {
  return GRAPHIC_TYPES.find((t) => t.key === key);
}

export function getGraphicsByTier(tier: GraphicTier): GraphicTypeMeta[] {
  return GRAPHIC_TYPES.filter((t) => t.tier === tier);
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
