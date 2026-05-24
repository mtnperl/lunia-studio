// Carousel v2 style presets. A preset bundles BrandStyle + typography + image
// engine direction so the whole carousel takes on a single coherent look.
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
  return p === "editorial-scientific" ? EDITORIAL_BRAND_STYLE : undefined;
}

export function isEditorialPreset(p?: CarouselStylePreset | null): boolean {
  return p === "editorial-scientific";
}
