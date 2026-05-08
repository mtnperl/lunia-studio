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

// Hook-image engine mix. Recraft V4 Pro is the only engine routed by
// default until Ideogram V3 and FLUX.2 endpoints on fal.ai are verified
// against live calls. Set to 100/0/0 so user-facing generations don't
// hit unverified endpoints. Override available via body.imageEngine for
// targeted testing.
const HOOK_ENGINE_WEIGHTS: { engine: ImageEngine; weight: number }[] = [
  { engine: "recraft",  weight: 100 },
  { engine: "ideogram", weight: 0 },
  { engine: "flux2",    weight: 0 },
];

function pickWeighted(): ImageEngine {
  const total = HOOK_ENGINE_WEIGHTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const { engine, weight } of HOOK_ENGINE_WEIGHTS) {
    if (r < weight) return engine;
    r -= weight;
  }
  return "recraft";
}

export function chooseImageEngine(opts: ChooseEngineInput): ImageEngine {
  if (opts.override) return opts.override;
  if (opts.textInImage) return "ideogram";
  // Hook slide gets a weighted mix; CTA and content slides stick with Recraft
  // for atmospheric backgrounds when they generate (today only slide 0 does).
  if (opts.slideIndex === 0) return pickWeighted();
  return "recraft";
}
