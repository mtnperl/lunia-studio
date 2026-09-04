import type { CarouselLookSettings, SavedCarousel } from "./types";

/** The whole-deck style of a saved carousel, as a look. Undefined fields are
 *  left out so applying it never resets a setting the source never touched. */
export function lookFromCarousel(c: SavedCarousel): CarouselLookSettings {
  const out: CarouselLookSettings = {};
  const keys: (keyof CarouselLookSettings)[] = [
    "stylePreset", "imageStyle", "reelsMode", "darkBackground", "slideBgColor", "logoScale", "arrowScale",
    "citationFontSize", "headlineScale", "bodyScale", "iconScale", "showLuniaLifeWatermark", "hookOverlays",
    "showSlideArrows", "showSlideNumbers", "showCitationBars", "hookHeadlineWeight", "contentBgOverlayOpacity",
  ];
  for (const k of keys) {
    const v = c[k];
    if (v !== undefined && v !== null) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** The graphic component on each content slide, or "none" where the slide
 *  has no graphic. This is the structure a variant mirrors. */
export function structureOf(c: Pick<SavedCarousel, "content">): string[] {
  return (c.content?.slides ?? []).map((s) => {
    if (!s.graphic) return "none";
    try { const g = JSON.parse(s.graphic) as { component?: string }; return typeof g.component === "string" ? g.component : "none"; }
    catch { return s.graphic.trim().startsWith("<svg") ? "svg" : "none"; }
  });
}

/** The prompt block that makes a new carousel follow an existing one's
 *  structure. Content is never copied, only the shape. */
export function structurePromptBlock(source: SavedCarousel): string {
  const comps = structureOf(source);
  if (comps.length === 0) return "";
  const lines = comps.map((cmp, i) => `- Content slide ${i + 1}: ${cmp === "none" ? "no graphic, text only" : `a "${cmp}" graphic`}`);
  return `\n\nSTRUCTURE TO MIRROR. This carousel is a variant of an earlier one on a different subject. Keep the same slide rhythm: the same number of content slides, and on each slide the same graphic component as listed, filled with data for THIS topic. Do not reuse any wording, figure or citation from the earlier carousel; only its shape.\n${lines.join("\n")}\n`;
}
