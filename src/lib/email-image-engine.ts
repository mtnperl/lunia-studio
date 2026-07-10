// Email-review image generation — locked to OpenAI GPT Image 2 via fal.
//
// Carousel pipeline still uses Recraft/Ideogram/Flux2 (see carousel-image-engine.ts).
// Emails use only gpt-image-2 because:
//   1. Best photorealism for product/lifestyle hero shots
//   2. Pixel-perfect text rendering (matters when an image carries a tagline)
//   3. Accepts multiple reference images on the /edit endpoint, so Lunia's
//      logo + chosen product shot can be passed in for brand consistency
//
// SIZE HANDLING (the root cause of the old "ragged email layout" bug):
// GPT Image models only output three native sizes — 1024×1024, 1024×1536,
// 1536×1024. This engine used to request arbitrary dims (1024×1280, 1280×720)
// and fal silently snapped them to a native size, so "4:5" heroes came back
// 2:3 and "1:1" secondaries came back off-square, breaking the fixed email
// layout downstream. Now we always generate at the nearest CONTAINING native
// size, then center-crop with sharp to the exact target from EMAIL.imageSizes,
// so callers are guaranteed the aspect they asked for.
//
// Server-side only. Never import from a "use client" file.
import "server-only";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { fal } from "@/lib/fal";
import { EMAIL, GPT_IMAGE_NATIVE_SIZES } from "@/lib/brand-tokens";

export type EmailImageAspect = "16:9" | "4:5" | "1:1";
export type EmailImageQuality = "low" | "medium" | "high";

const DEFAULT_QUALITY: EmailImageQuality = "medium";

type Size = { width: number; height: number };

/** Exact pixel target for each aspect — single source of truth in brand-tokens. */
export function targetSize(aspect: EmailImageAspect): Size {
  return EMAIL.imageSizes[aspect];
}

/** Native GPT-Image size that CONTAINS the target aspect (so the crop only
 *  ever trims, never upscales). */
function nativeSizeFor(aspect: EmailImageAspect): Size {
  switch (aspect) {
    case "16:9": return GPT_IMAGE_NATIVE_SIZES.landscape; // 1536×1024 → crop to 1536×864 → resize 1280×720
    case "1:1":  return GPT_IMAGE_NATIVE_SIZES.square;    // exact
    case "4:5":
    default:     return GPT_IMAGE_NATIVE_SIZES.portrait;  // 1024×1536 → crop to 1024×1280
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
 * Generate an email image at the EXACT aspect requested. Generates at the
 * nearest containing native GPT-Image size, center-crops to the target, and
 * uploads the cropped result to Vercel Blob. Returns the Blob URL (already
 * persistent — callers must NOT re-mirror it). Falls back to the uncropped
 * fal URL only if Blob is unconfigured.
 */
export async function generateEmailImage(opts: GenerateOpts): Promise<string> {
  const { prompt, aspect, referenceImageUrls, quality = DEFAULT_QUALITY } = opts;
  const refs = (referenceImageUrls ?? []).filter(Boolean);

  // fal model slug — text-to-image vs edit (with refs)
  const endpoint = refs.length > 0
    ? "openai/gpt-image-2/edit"
    : "openai/gpt-image-2";

  const input: Record<string, unknown> = {
    prompt,
    image_size: nativeSizeFor(aspect),
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

  return cropToAspect(url, aspect);
}

/** Download → center-crop/resize to the exact target size → persist to Blob.
 *  Exported for the regression harness. */
export async function cropToAspect(sourceUrl: string, aspect: EmailImageAspect): Promise<string> {
  const target = targetSize(aspect);
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());

    // cover + centre = crop the containing native frame down to the target
    // aspect, then scale to the exact pixel dims the email layout expects.
    const cropped = await sharp(raw)
      .resize(target.width, target.height, { fit: "cover", position: "centre" })
      .jpeg({ quality: 92 })
      .toBuffer();

    if (!process.env.BLOB_READ_WRITE_TOKEN) return sourceUrl;
    const key = `email-images/gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { url: blobUrl } = await put(key, cropped, {
      access: "public",
      contentType: "image/jpeg",
    });
    return blobUrl;
  } catch (err) {
    console.warn("[email-image-engine] crop failed — returning uncropped source:", err);
    return sourceUrl;
  }
}
