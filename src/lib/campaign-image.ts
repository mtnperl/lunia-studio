// Shared campaign lifestyle-image generation — used by both the per-slot
// regenerate route (api/campaign/generate-image) and the auto-generation of
// the three content-tied images at campaign creation (api/campaign/generate).
import "server-only";
import { randomUUID } from "crypto";
import { generateEmailImage, type EmailImageAspect } from "@/lib/email-image-engine";
import { getMoodById } from "@/lib/carousel-visual-moods";
import { saveAssetIfNew } from "@/lib/kv";
import type { AssetMetadata } from "@/lib/types";

// Appended to every campaign image prompt. Two jobs, and they are different:
// the LOOK, and the hard constraints.
//
// The look block is written in CAPTURE language — a camera, a lens, a film
// stock, and the imperfections a real frame has. It used to say
// "photorealistic ... Sharp focus, high detail", which is the single biggest
// reason these images read as AI. Those words sit on 3D renders and
// over-processed stock in training data, so asking for them pulls the model
// toward the plastic, over-rendered look rather than away from it. A real
// photograph is the opposite: shallow and SELECTIVE focus, grain, skin you can
// see the texture of, light that is uneven because nobody fixed it.
//
// Note the offline prompt writer already had a test asserting it never says
// "photorealistic" (campaign-image-prompt.test.ts). This constant appended it
// to every image afterwards, so that test was guarding a door with no wall.
//
// The constraints are structural, not stylistic: text and packaging render
// badly at email sizes, and bottle / logo imagery always comes from uploaded
// assets instead.
export const CAMPAIGN_IMAGE_LOOK =
  " Shot on a 35mm full-frame camera with a 50mm lens at f/2, available light only." +
  " Fine 35mm film grain, natural skin texture with visible pores and stray hair," +
  " slight lens vignetting, mixed and slightly uneven colour temperature." +
  " Candid and unposed, caught mid-moment rather than arranged for the camera;" +
  " imperfect composition, subject off-centre, ordinary lived-in surroundings" +
  " with real clutter. Shallow depth of field, focus falling off naturally" +
  " outside the subject. Muted natural colour, no colour grading, no retouching.";

export const CAMPAIGN_IMAGE_CONSTRAINTS =
  " No text, no words, no signage, no logos, no product packaging, no supplement bottles.";

/** What every generated campaign image gets. Kept as one exported string so
 *  the A/B harness and the callers below cannot drift apart. */
export const CAMPAIGN_IMAGE_SAFETY_SUFFIX = CAMPAIGN_IMAGE_LOOK + CAMPAIGN_IMAGE_CONSTRAINTS;

const VARIATION_ANGLES = [
  "fresh framing this take, the subject slightly rotated and negative space rebalanced",
  "alternate camera angle, hands or surface entering the frame from a new direction",
  "different window-light direction this take, gentle side-light across the scene",
  "subtly different prop arrangement, no two takes alike",
  "the focal subject closer to the bottom-right of the frame this take",
  "the focal subject closer to the top-right, more negative space below",
];

export type CampaignSlotImageOpts = {
  prompt: string;
  aspect: EmailImageAspect;
  /** Visual-mood id from carousel-visual-moods — steers the style block. */
  mood?: string;
  /** For asset-library registration naming only. */
  topic?: string;
  role?: "hero" | "secondary";
};

/**
 * Generate one campaign lifestyle image. Returns a persistent Blob URL
 * (generateEmailImage crops to exact aspect + uploads). Also registers the
 * image in the asset library (fire-and-forget) so the picker can reuse it.
 */
export async function generateCampaignSlotImage(opts: CampaignSlotImageOpts): Promise<string> {
  const { prompt, aspect, mood, topic = "", role = "secondary" } = opts;

  const moodBlock = getMoodById(mood)?.styleBlock;
  const moodSuffix = moodBlock ? ` ${moodBlock}.` : "";

  // Per-call variation seed. gpt-image-2 with the same prompt produces
  // near-identical outputs (no seed parameter); the cue + nonce nudge the
  // model toward a fresh take each call.
  const variationNonce = Math.random().toString(36).slice(2, 8);
  const variationAngle = VARIATION_ANGLES[Math.floor(Math.random() * VARIATION_ANGLES.length)];
  const variationBlock = ` Variation cue: ${variationAngle}. (seed: ${variationNonce})`;

  // "medium": text-free lifestyle photos shown small in an email — visually
  // equivalent to "high" but 3-4× faster.
  const url = await generateEmailImage({
    prompt: prompt + moodSuffix + variationBlock + CAMPAIGN_IMAGE_SAFETY_SUFFIX,
    aspect,
    quality: "medium",
  });

  if (url) {
    const inferMime = (u: string) => {
      const lower = u.toLowerCase();
      if (lower.endsWith(".png")) return "image/png";
      if (lower.endsWith(".webp")) return "image/webp";
      return "image/jpeg";
    };
    const asset: AssetMetadata = {
      id: `egen-${randomUUID()}`,
      url,
      name: (topic ? `${topic} — ${role}` : `Email ${role}`).slice(0, 90),
      type: inferMime(url),
      assetType: "email-generated",
      uploadedAt: new Date().toISOString(),
      source: topic ? { topic } : undefined,
    };
    // Fire-and-forget — failures here never block the image response.
    saveAssetIfNew(asset).catch((err) => {
      console.warn("[campaign-image] asset registration failed:", err);
    });
  }

  return url;
}
