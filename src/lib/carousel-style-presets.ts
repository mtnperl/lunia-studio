// Carousel v2 style presets. A preset bundles BrandStyle + typography + image
// engine direction so the whole carousel takes on a single coherent look.
import type { BrandStyle, CarouselStylePreset } from "./types";

/** Lunia April-2026 brand palette mapped onto BrandStyle. Soft Ivory bg with
 *  Rich Navy #01253f used uniformly for every text role — explicit user
 *  direction. Signal Yellow is reserved for the CTA button in HTML chrome
 *  (never as on-slide text), so we don't map it to BrandStyle.accent here. */
export const EDITORIAL_BRAND_STYLE: BrandStyle = {
  background:     "#F7F4EF",  // Soft Ivory
  hookBackground: "#F7F4EF",  // Soft Ivory (light default)
  headline:       "#01253f",  // Rich Navy — all on-slide text
  hookHeadline:   "#01253f",  // Rich Navy
  body:           "#01253f",  // Rich Navy
  accent:         "#01253f",  // Rich Navy (no yellow text anywhere)
  secondary:      "#01253f",  // Rich Navy
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
