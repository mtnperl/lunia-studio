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
  if (p === "editorial-scientific") return EDITORIAL_BRAND_STYLE;
  if (p === "free-press") return FREE_PRESS_BRAND_STYLE;
  return undefined;
}

export function isEditorialPreset(p?: CarouselStylePreset | null): boolean {
  return p === "editorial-scientific";
}

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
