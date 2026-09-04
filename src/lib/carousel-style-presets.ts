// Carousel v2 style presets. A preset bundles BrandStyle + typography + image
// engine direction so the whole carousel takes on a single coherent look.
import { FP_COLORS } from "./brand-tokens";
import type { BrandStyle, CarouselStylePreset } from "./types";

/** Editorial Scientific brand palette — explicit user direction.
 *  Background: #EFEFF4 (soft pearl ivory), primary text/accents: #01253f
 *  (rich navy), secondary structure: #2C3F51 (slate blue). No yellow on slide. */
export const EDITORIAL_BRAND_STYLE: BrandStyle = {
  background:     "#EFEFF4",  // soft pearl ivory
  hookBackground: "#EFEFF4",  // same — keeps the hook flush with content slides
  headline:       "#01253f",  // rich navy — primary text + accents
  hookHeadline:   "#01253f",
  body:           "#01253f",
  accent:         "#01253f",
  secondary:      "#2C3F51",  // slate blue — secondary structure
};

/** Typography overrides applied across all slides for the editorial preset.
 *  Headlines: Inter "normal" 300, body: Inter "light" 200 — per user spec. */
export const EDITORIAL_FONT = {
  family: "Inter, system-ui, -apple-system, sans-serif",
  headlineWeight: 300, // Inter normal (per user direction)
  bodyWeight:     200, // Inter light
} as const;

/** Visual-mood id wired into VISUAL_MOODS for editorial image prompts. */
export const EDITORIAL_MOOD_ID = "editorial-scientific";

/** Returns the BrandStyle preset for a given preset name, or `undefined` so
 *  callers can fall back to their existing brandStyle source. */
export function getStylePresetBrandStyle(p?: CarouselStylePreset): BrandStyle | undefined {
  if (p === "editorial-scientific" || p === "viral") return EDITORIAL_BRAND_STYLE;
  if (p === "free-press") return FREE_PRESS_BRAND_STYLE;
  return undefined;
}

/** True for every preset drawn with the editorial components: Editorial
 *  Scientific itself and Viral, which changes structure, not look. */
export function isEditorialPreset(p?: CarouselStylePreset | null): boolean {
  return p === "editorial-scientific" || p === "viral";
}

export function isViralPreset(p?: CarouselStylePreset | null): boolean {
  return p === "viral";
}

/** Slot table for the viral engine. Hook and CTA bracket the content slots. */
export const VIRAL_SLOTS: Record<5 | 10, { name: string; job: string; openLoop: string }[]> = {
  5: [
    { name: "Stakes", job: "Confirm the hook. Set up the problem and what it costs. The reader must think this is worth their time in one second.", openLoop: "Here is why the usual fix fails." },
    { name: "Turn", job: "Amplify the pain, invalidate the current method, pivot on BUT. Do not deliver the solution.", openLoop: "The fix is smaller than you think." },
    { name: "Solution", job: "One idea, one easy step toward a result, with its proof. A beginner could do it tonight.", openLoop: "One more thing decides whether it holds." },
  ],
  10: [
    { name: "Stakes", job: "Confirm the hook. Set up the problem and what it costs.", openLoop: "It is not the reason you were told." },
    { name: "Pain", job: "Amplify. Show the problem compounding with a second consequence the reader has felt.", openLoop: "Most people fix the wrong half." },
    { name: "Invalidate and turn", job: "Name the current method, say why it fails, pivot on BUT. Solution still withheld.", openLoop: "The real lever is upstream." },
    { name: "Idea 1", job: "Education. One idea, one step a beginner does tonight.", openLoop: "That handles the start of the night." },
    { name: "Idea 2", job: "Education. One idea, one step a beginner does tonight.", openLoop: "The middle of the night needs something else." },
    { name: "Idea 3", job: "Education. One idea, one step a beginner does tonight.", openLoop: "Now the part that makes it stick." },
    { name: "Proof", job: "Social proof or mechanism proof that the solution works. One sourced figure or one mechanism in one sentence.", openLoop: "Which leaves one question." },
    { name: "Objection", job: "The reason they still will not do it, in the reader's words, answered.", openLoop: "So here is the only thing to do." },
  ],
};

/** Free Press brand palette — a text-led editorial preset.
 *
 *  The body slide has no image, no graphic and no headline: one centred block
 *  of copy, an italic source line when there is a real one, and a navy
 *  indicator. That emptiness IS the design, so this preset deliberately does
 *  not thread the graphic / icon / background-image controls the other presets
 *  expose. Colour lives in FP_COLORS (brand-tokens); this BrandStyle exists so
 *  the shared slide chrome (logo ink, arrow colour) resolves correctly. */
export const FREE_PRESS_BRAND_STYLE: BrandStyle = {
  background:     FP_COLORS.paper,
  hookBackground: FP_COLORS.ink,   // covers are photo + dark scrim
  headline:       FP_COLORS.ink,
  hookHeadline:   FP_COLORS.paper,
  body:           FP_COLORS.ink,
  accent:         FP_COLORS.indicator,
  secondary:      FP_COLORS.inkMuted,
};

export function isFreePressPreset(p?: CarouselStylePreset | null): boolean {
  return p === "free-press";
}
