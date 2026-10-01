// Server-side picker for the v2 carousel image-generation engine.
// Today the hook slide uses a background image with HTML-overlaid text, so
// Recraft V4 Pro is the right default — atmospheric, brand-consistent.
// Ideogram and FLUX.2 [flex] are wired for slide types that render text
// inside the image (quote cards, poster slides) when those land.

export type GptImageEngine = "gpt-image-2" | "gpt-image-2.5-sunburst";
export type ImageEngine = "recraft" | "ideogram" | "flux2" | GptImageEngine;

export const FAL_ENDPOINTS: Record<ImageEngine, string> = {
  recraft: "fal-ai/recraft/v4/pro/text-to-image",
  ideogram: "fal-ai/ideogram/v3",
  flux2: "fal-ai/flux-2/flex",
  "gpt-image-2": "openai/gpt-image-2",
  "gpt-image-2.5-sunburst": "openai/gpt-image-2.5/sunburst/text-to-image",
};

/** The GPT model new carousel images use unless a caller pins another. */
export const DEFAULT_GPT_ENGINE: GptImageEngine = "gpt-image-2.5-sunburst";

export function isGptImageEngine(engine: ImageEngine): engine is GptImageEngine {
  return engine === "gpt-image-2" || engine === "gpt-image-2.5-sunburst";
}

export function getGptImageEndpoint(engine: GptImageEngine, hasReferenceImages: boolean): string {
  if (!hasReferenceImages) return FAL_ENDPOINTS[engine];
  return engine === "gpt-image-2.5-sunburst"
    ? "openai/gpt-image-2.5/sunburst/edit"
    : "openai/gpt-image-2/edit";
}

export type ChooseEngineInput = {
  slideIndex: number;
  imageStyle: string;
  /** True when the slide composition renders text *inside* the generated image (e.g. a poster or quote card). */
  textInImage?: boolean;
  /** Explicit override from the caller. When set, auto-routing is skipped. */
  override?: ImageEngine;
  /** Carousel-wide style preset. "editorial-scientific" forces gpt-image-2. */
  stylePreset?: string;
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
  // The GPT lane runs on the newest model, gpt-image-2.5 Sunburst. Callers
  // can still pin the older one with `override`.
  // Editorial Scientific style: every image goes through the GPT lane so the
  // bottle / brand look stays consistent across the whole carousel.
  if (opts.stylePreset === "editorial-scientific" || opts.stylePreset === "viral") return DEFAULT_GPT_ENGINE;
  // Free Press covers are documentary photographs that must contain NO text at
  // all, because the headline is composited over them in HTML. The weighted
  // mix below rolls engines that routinely paint incidental signage and
  // lettering; the GPT lane is the one that reliably honours the constraint.
  if (opts.stylePreset === "free-press") return DEFAULT_GPT_ENGINE;
  // Essay covers are engravings on a white ground, printed onto the paper
  // with multiply. The GPT lane holds the medium and keeps text out.
  if (opts.stylePreset === "essay") return DEFAULT_GPT_ENGINE;
  // Billboard covers are photographs in a band with the headline in HTML
  // above and below; like Free Press they must carry no text.
  if (opts.stylePreset === "billboard") return DEFAULT_GPT_ENGINE;
  if (opts.textInImage) return "ideogram";
  // Hook slide gets a weighted mix; CTA and content slides stick with Recraft
  // for atmospheric backgrounds when they generate (today only slide 0 does).
  if (opts.slideIndex === 0) return pickWeighted();
  return "recraft";
}
