// Server-side picker for the v2 carousel image-generation engine.
// Today the hook slide uses a background image with HTML-overlaid text, so
// Recraft V4 Pro is the right default — atmospheric, brand-consistent.
// Ideogram and FLUX.2 [flex] are wired for slide types that render text
// inside the image (quote cards, poster slides) when those land.

export type ImageEngine = "recraft" | "ideogram" | "flux2";

export const FAL_ENDPOINTS: Record<ImageEngine, string> = {
  recraft: "fal-ai/recraft/v4/pro/text-to-image",
  ideogram: "fal-ai/ideogram/v3",
  flux2: "fal-ai/flux-2/flex",
};

export type ChooseEngineInput = {
  slideIndex: number;
  imageStyle: string;
  /** True when the slide composition renders text *inside* the generated image (e.g. a poster or quote card). */
  textInImage?: boolean;
  /** Explicit override from the caller. When set, auto-routing is skipped. */
  override?: ImageEngine;
};

export function chooseImageEngine(opts: ChooseEngineInput): ImageEngine {
  if (opts.override) return opts.override;
  if (opts.textInImage) return "ideogram";
  return "recraft";
}
