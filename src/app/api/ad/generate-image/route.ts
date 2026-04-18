// Ad image generation.
//
// Two branches:
//   - If `productAssetId` is provided AND resolves to a BrandAsset: run
//     Seedream v4 Edit with the product URL as reference — so we keep the
//     REAL Lunia bottle in frame instead of letting Recraft guess. Additional
//     reference assets (e.g. lifestyle refs) can be passed via
//     `referenceAssetIds`.
//   - Otherwise: fall back to plain Recraft V4 (text-to-image) for pure
//     conceptual renders.
//
// Brand guardrails always appended to the prompt.

import { generateAdImage, generateAdImageWithReference, type AdAspectRatio } from "@/lib/fal";
import { BRAND_VISUAL_GUARDRAILS } from "@/lib/ad-prompts";
import { checkRateLimit, getBrandAssetById } from "@/lib/kv";

export const maxDuration = 60;

const VALID_ASPECTS = new Set<AdAspectRatio>(["1:1", "4:5"]);

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "ad-image");
  if (!allowed) {
    return Response.json(
      { error: "Too many image requests. Please try again in an hour." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const prompt: string = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const aspect = body.aspect as AdAspectRatio;
    const productAssetId: string | undefined =
      typeof body.productAssetId === "string" ? body.productAssetId : undefined;
    const referenceAssetIds: string[] = Array.isArray(body.referenceAssetIds)
      ? body.referenceAssetIds.filter((x: unknown): x is string => typeof x === "string").slice(0, 5)
      : [];

    if (!prompt) {
      return Response.json({ error: "prompt required" }, { status: 400 });
    }
    if (prompt.length > 2000) {
      return Response.json({ error: "prompt too long (max 2000 chars)" }, { status: 400 });
    }
    if (!VALID_ASPECTS.has(aspect)) {
      return Response.json({ error: "aspect must be 1:1 or 4:5" }, { status: 400 });
    }

    const fullPrompt = `${prompt}\n\n${BRAND_VISUAL_GUARDRAILS}`;

    // Collect reference URLs if a product asset was attached.
    const referenceUrls: string[] = [];
    let usedRef = false;
    if (productAssetId) {
      const asset = await getBrandAssetById(productAssetId);
      if (asset && asset.kind === "product") {
        referenceUrls.push(asset.url);
        usedRef = true;
      }
    }
    for (const refId of referenceAssetIds) {
      const refAsset = await getBrandAssetById(refId);
      if (refAsset) referenceUrls.push(refAsset.url);
    }

    // Branch: reference-conditioned if we have a product URL; otherwise Recraft V4.
    const url = usedRef
      ? await generateAdImageWithReference({
          prompt:
            `${fullPrompt}\n\nCRITICAL: The first reference image is the real Lunia Life product — keep it physically accurate (shape, label, cap, proportions). Place it naturally in the scene described above. Do NOT redraw the label text or invent new packaging.`,
          referenceUrls,
          aspect,
        })
      : await generateAdImage({ prompt: fullPrompt, aspect });

    return Response.json({ url, usedReference: usedRef });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ad/generate-image]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
