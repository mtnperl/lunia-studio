// Email image generation via fal. Carousel has its own engine
// (carousel-image-engine.ts).
//
// gpt-image-2 is the DEFAULT, not the only option — see MODEL_SPECS below.
// It keeps the default because it is the only one wired here that accepts
// reference images, which is how Lunia's real product silhouette gets into a
// frame instead of a hallucinated bottle (the logo is deliberately never
// passed — see api/email-review/generate-image), and because it renders text
// cleanly when an image has to carry a tagline.
//
// What it is NOT best at is looking like a photograph. It has a house look —
// clean, evenly lit, faintly retouched — that prompt wording cannot fully
// escape, which is why the model is selectable per block.
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

// ─── Image models ───────────────────────────────────────────────────────────
//
// This engine was locked to gpt-image-2. That model has a recognisable house
// look — clean, evenly lit, faintly retouched — which no amount of prompt
// wording fully escapes, so the choice is exposed rather than hard-coded.
//
// Only endpoints VERIFIED against a live call are listed. The carousel engine
// carries `fal-ai/flux-2/flex`, which returns 404 (see FAL_ENDPOINTS in
// carousel-image-engine.ts) — a reminder that a slug in a constant is not
// evidence the endpoint exists.
export const EMAIL_IMAGE_MODELS = ["gpt-image-2", "flux-2", "seedream-5"] as const;
export type EmailImageModel = (typeof EMAIL_IMAGE_MODELS)[number];

export const DEFAULT_EMAIL_IMAGE_MODEL: EmailImageModel = "gpt-image-2";

type ModelSpec = {
  slug: string;
  /** Endpoint that accepts reference images. Absent means this model cannot be
   *  conditioned on references here, and a call supplying them falls back to
   *  gpt-image-2 rather than silently dropping the references — losing the
   *  brand's real product silhouette is worse than ignoring a model pick. */
  editSlug?: string;
  /** gpt-image-2 outputs only three sizes, so it generates at the nearest
   *  CONTAINING one and the crop below trims. The others accept the exact
   *  email size, so they are asked for it directly and the crop is a no-op
   *  re-encode. */
  sizeFor: (aspect: EmailImageAspect) => Size;
  /** Only gpt-image-2 takes `quality`; the others reject the unknown field. */
  usesQuality: boolean;
};

const MODEL_SPECS: Record<EmailImageModel, ModelSpec> = {
  "gpt-image-2": {
    slug: "openai/gpt-image-2",
    editSlug: "openai/gpt-image-2/edit",
    sizeFor: nativeSizeFor,
    usesQuality: true,
  },
  "flux-2": {
    slug: "fal-ai/flux-2",
    sizeFor: targetSize,
    usesQuality: false,
  },
  "seedream-5": {
    slug: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
    sizeFor: targetSize,
    usesQuality: false,
  },
};

/** Unknown / absent model names fall back rather than throwing: the value is
 *  persisted on a campaign block, and a build that drops a model must not make
 *  an existing block un-generatable. */
export function resolveEmailImageModel(v: unknown): EmailImageModel {
  return typeof v === "string" && (EMAIL_IMAGE_MODELS as readonly string[]).includes(v)
    ? (v as EmailImageModel)
    : DEFAULT_EMAIL_IMAGE_MODEL;
}

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
   * product silhouette. Empty → pure text-to-image.
   */
  referenceImageUrls?: string[];
  quality?: EmailImageQuality;
  /** Which model draws it. Unset = gpt-image-2, what this engine always used. */
  model?: EmailImageModel;
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

  let model = resolveEmailImageModel(opts.model);
  // References outrank the model pick. They exist to lock Lunia's real product
  // silhouette into the frame, and a model with no edit endpoint here would
  // have to drop them — which produces a hallucinated bottle, the exact
  // failure the references were added to prevent.
  if (refs.length > 0 && !MODEL_SPECS[model].editSlug) {
    console.warn(`[email-image-engine] ${model} has no edit endpoint; using gpt-image-2 for ${refs.length} reference(s)`);
    model = "gpt-image-2";
  }
  const spec = MODEL_SPECS[model];
  const endpoint = refs.length > 0 && spec.editSlug ? spec.editSlug : spec.slug;

  const input: Record<string, unknown> = {
    prompt,
    image_size: spec.sizeFor(aspect),
  };
  if (spec.usesQuality) input.quality = quality;
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
