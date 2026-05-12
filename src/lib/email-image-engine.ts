// Email-review image generation — locked to OpenAI GPT Image 2 via fal.
//
// Carousel pipeline still uses Recraft/Ideogram/Flux2 (see carousel-image-engine.ts).
// Emails use only gpt-image-2 because:
//   1. Best photorealism for product/lifestyle hero shots
//   2. Pixel-perfect text rendering (matters when an image carries a tagline)
//   3. Accepts multiple reference images on the /edit endpoint, so Lunia's
//      logo + chosen product shot can be passed in for brand consistency
//
// Server-side only. Never import from a "use client" file.
import "server-only";
import { fal } from "@/lib/fal";

export type EmailImageAspect = "16:9" | "4:5" | "1:1";
export type EmailImageQuality = "low" | "medium" | "high";

const DEFAULT_QUALITY: EmailImageQuality = "medium";

/**
 * Map aspect → pixel dims. GPT Image 2 supports arbitrary sizes; these match
 * what carousel-image-engine emits so downstream blob/CDN paths stay consistent.
 */
function sizeFor(aspect: EmailImageAspect): { width: number; height: number } {
  switch (aspect) {
    case "16:9": return { width: 1280, height: 720 };
    case "1:1":  return { width: 1024, height: 1024 };
    case "4:5":
    default:     return { width: 1024, height: 1280 };
  }
}

type GenerateOpts = {
  prompt: string;
  aspect: EmailImageAspect;
  /**
   * Reference image URLs. When provided (>0), routes to the /edit endpoint
   * which conditions output on the references — used to lock in Lunia's
   * logo + product silhouette. Empty → pure text-to-image.
   */
  referenceImageUrls?: string[];
  quality?: EmailImageQuality;
};

/**
 * Generate an email image. Returns the fal CDN URL — caller is responsible
 * for mirroring to Vercel Blob via mirrorImageToBlob().
 */
export async function generateEmailImage(opts: GenerateOpts): Promise<string> {
  const { prompt, aspect, referenceImageUrls, quality = DEFAULT_QUALITY } = opts;
  const size = sizeFor(aspect);
  const refs = (referenceImageUrls ?? []).filter(Boolean);

  // fal model slug — text-to-image vs edit (with refs)
  const endpoint = refs.length > 0
    ? "openai/gpt-image-2/edit"
    : "openai/gpt-image-2";

  // Base input: prompt + image_size + quality.
  // Edit endpoint also takes image_urls.
  const input: Record<string, unknown> = {
    prompt,
    image_size: size,
    quality,
  };
  if (refs.length > 0) {
    // GPT Image 2 edit caps refs around ~10; trim defensively.
    input.image_urls = refs.slice(0, 10);
  }

  const result = await fal.subscribe(endpoint, { input, logs: false });
  const url = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
  if (!url) {
    throw new Error(`No image URL in ${endpoint} response`);
  }
  return url;
}
