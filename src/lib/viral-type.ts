// Type hierarchy for Viral slides.
//
// The rule the slides were missing: exactly ONE element dominates a slide, and
// every step down the ladder is a clear jump, never a nudge. A slide with a
// figure is led by the figure and its headline steps down to a deck line; a
// slide without one is led by the headline. Support copy is always a clear
// step below whatever leads, the open loop is a step below that, and the
// citation is the floor.
//
// Sizes are computed, not hand-placed, so a seven-word headline and a
// two-word headline both hold the same rank without one swallowing the slide.

/** Minimum ratio between one rank and the next. Below this two elements read
 *  as the same rank and the hierarchy collapses, which is the failure this
 *  module exists to prevent. */
export const RANK_STEP = 1.5;

export type ViralTypeInput = {
  /** The figure token, e.g. "40%". Absent or empty means no figure. */
  figure?: string;
  headline: string;
  /** Support lines, excluding the open-loop line. */
  supportLines: string[];
  /** Rendered slide height; shorter export frames scale everything down. */
  frameH: number;
  baseH?: number;
  headlineScale?: number;
  bodyScale?: number;
};

export type ViralTypeScale = {
  figureSize: number;
  headlineSize: number;
  lineSize: number;
  loopSize: number;
  citationSize: number;
  /** Gap between support lines, and between the blocks in the column. */
  lineGap: number;
  blockGap: number;
  /** True when the figure is the dominant element on the slide. */
  figureLeads: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Words in a string, cheaply. */
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * The ladder, at the 1080x1350 artboard:
 *
 *   figure leads      figure 208 · headline 60 · support 38 · loop 30 · cite 20
 *   headline leads               · headline 88 · support 40 · loop 30 · cite 20
 *
 * A long headline shrinks toward its floor so it stays inside three lines, and
 * a body of four lines shrinks toward its floor so the column still breathes.
 * Both floors keep the RANK_STEP jump to the rank below intact.
 */
export function viralTypeScale(input: ViralTypeInput): ViralTypeScale {
  const { figure, headline, supportLines, frameH, baseH = 1350 } = input;
  const headlineScale = input.headlineScale ?? 1;
  const bodyScale = input.bodyScale ?? 1;
  const compact = frameH < baseH ? frameH / baseH : 1;
  const figureLeads = !!figure && figure.trim().length > 0;

  // Headline: shorter lines can be bigger. Seven words needs the floor.
  const hw = words(headline);
  const leadHeadline = figureLeads
    ? clamp(68 - Math.max(0, hw - 4) * 3, 52, 68)
    : clamp(100 - Math.max(0, hw - 3) * 5, 72, 100);

  // Support: four lines get the floor, two lines the ceiling.
  const n = supportLines.length;
  const longest = supportLines.reduce((m, l) => Math.max(m, words(l)), 0);
  let support = clamp(46 - Math.max(0, n - 2) * 4 - Math.max(0, longest - 9) * 1.5, 34, 46);

  // The rank guarantee: support must sit a clear step below whatever leads.
  const lead = figureLeads ? 208 : leadHeadline;
  const supportCeiling = figureLeads ? leadHeadline / RANK_STEP : lead / RANK_STEP;
  support = Math.min(support, Math.max(supportCeiling, 30));

  const loop = clamp(support * 0.78, 26, 34);
  const px = (v: number) => Math.round(v * compact);

  return {
    figureSize: figureLeads ? px(208 * headlineScale) : 0,
    headlineSize: px(leadHeadline * headlineScale),
    lineSize: px(support * bodyScale),
    loopSize: px(loop),
    citationSize: px(20),
    lineGap: px(clamp(support * 0.34, 10, 18)),
    blockGap: px(figureLeads ? 18 : 24),
    figureLeads,
  };
}
