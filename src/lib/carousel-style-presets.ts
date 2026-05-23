// Carousel v2 style presets. A preset bundles BrandStyle + typography + image
// engine direction so the whole carousel takes on a single coherent look.
import type { BrandStyle, CarouselStylePreset } from "./types";

/** Lunia April-2026 brand palette mapped onto BrandStyle. Soft Ivory bg,
 *  Deep Navy text, Signal Yellow accent — per the Lunia Color Brand Book. */
export const EDITORIAL_BRAND_STYLE: BrandStyle = {
  background:     "#F7F4EF",  // Soft Ivory
  hookBackground: "#F7F4EF",  // Soft Ivory (light default per user)
  headline:       "#102635",  // Deep Navy
  hookHeadline:   "#102635",  // Deep Navy
  body:           "#2c3f51",  // Slate Blue
  accent:         "#ffd800",  // Signal Yellow — CTAs
  secondary:      "#2c3f51",  // Slate Blue (muted)
};

/** Typography overrides applied across all slides for the editorial preset. */
export const EDITORIAL_FONT = {
  family: "Inter, system-ui, -apple-system, sans-serif",
  headlineWeight: 400, // Inter normal
  bodyWeight:     300, // Inter light
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
