import { checkRateLimit, getFlowReviewById, mutateFlowReview, getAssets } from "@/lib/kv";
import { mirrorImageToBlob } from "@/lib/blob-mirror";
import { generateEmailImage, type EmailImageAspect } from "@/lib/email-image-engine";
import type { FlowReviewImagePrompt } from "@/lib/types";

export const maxDuration = 180;

/**
 * Resolve a list of asset IDs to URLs by reading the asset library. Missing
 * IDs are silently dropped (the asset may have been deleted between analyze
 * and generate). The Lunia logo is always included implicitly so every
 * email image carries brand identity.
 *
 * Safety net: the Lunia editorial template ALWAYS shows the Restore bottle.
 * If nothing product-related got attached (e.g. an old review predating the
 * reference system, or a plain "Re-render this prompt" on a stale prompt),
 * auto-attach the best available product-image asset so GPT Image 2 matches
 * the real bottle instead of hallucinating one from the text fallback.
 */
async function resolveReferenceUrls(opts: {
  assetIds?: string[];
  extraUrls?: string[];
}): Promise<string[]> {
  const ids = opts.assetIds ?? [];
  const extras = opts.extraUrls ?? [];
  const allAssets = await getAssets();
  const idSet = new Set(ids);

  // 1. Always include the logo(s)
  const logoUrls = allAssets
    .filter((a) => a.assetType === "logo")
    .map((a) => a.url);

  // 2. Include any explicitly-selected assets (product-image, lifestyle, etc.)
  const selectedAssets = allAssets.filter((a) => idSet.has(a.id));
  const selectedUrls = selectedAssets.map((a) => a.url);

  // 3. Safety net — guarantee a product reference for the bottle.
  // Only kicks in when the caller selected NO product-image asset (and the
  // user didn't already attach a one-off upload). Picks the most recently
  // uploaded product-image so the bottle is always reference-locked.
  const hasProductSelected = selectedAssets.some((a) => a.assetType === "product-image");
  let fallbackProductUrls: string[] = [];
  if (!hasProductSelected && extras.length === 0) {
    const productAssets = allAssets
      .filter((a) => a.assetType === "product-image")
      .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
    if (productAssets[0]) {
      fallbackProductUrls = [productAssets[0].url];
      console.log(`[email-review/generate-image] no product ref selected — auto-attaching "${productAssets[0].name}"`);
    }
  }

  // 4. Append any user-uploaded one-off URLs
  const all = [
    ...logoUrls,
    ...selectedUrls,
    ...fallbackProductUrls,
    ...extras.filter(Boolean),
  ];

  // Dedupe, cap at 10 (GPT Image 2 edit limit)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of all) {
    if (!seen.has(u)) { seen.add(u); out.push(u); }
    if (out.length >= 10) break;
  }
  return out;
}

export async function POST(req: Request) {
  if (!process.env.FAL_KEY) {
    return Response.json(
      { error: "FAL_KEY is not configured — add it to Vercel Environment Variables to enable image generation" },
      { status: 503 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "images");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  const t0 = Date.now();
  let reviewId: string | undefined;
  let promptId: string | undefined;
  try {
    const body = await req.json();
    reviewId = body.reviewId as string | undefined;
    promptId = body.promptId as string | undefined;
    if (!reviewId || !promptId) return Response.json({ error: "missing reviewId or promptId" }, { status: 400 });

    // Initial (unlocked) read just to resolve prompt text + reference inputs.
    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });
    const prompt0 = review.imagePrompts.find((p) => p.id === promptId);
    if (!prompt0) return Response.json({ error: "prompt not found in review" }, { status: 404 });

    const promptText = (body.promptOverride as string | undefined) ?? prompt0.prompt;
    // Caller can override Claude's asset picks (UI toggles) or the persisted overrides.
    const refAssetIdsOverride = body.referenceAssetIds as string[] | undefined;
    const refUrlsOverride = body.referenceImageUrls as string[] | undefined;
    const refAssetIds = refAssetIdsOverride ?? prompt0.referenceAssetIds ?? [];
    const refUrls = refUrlsOverride ?? prompt0.referenceImageUrls ?? [];

    // ── Atomic write #1: mark this one prompt generating ──────────────────
    // mutateFlowReview re-reads the freshest review inside a per-review lock
    // and writes only after merging, so a parallel "Generate all" no longer
    // clobbers sibling prompts (root cause: only 1 image survived a batch).
    const marked = await mutateFlowReview(reviewId, (r) => ({
      ...r,
      imagePrompts: r.imagePrompts.map((p) =>
        p.id === promptId
          ? {
              ...p,
              engine: "gpt-image-2" as const,
              prompt: promptText,
              referenceAssetIds: refAssetIds,
              referenceImageUrls: refUrls,
              status: "generating" as const,
              errorMessage: undefined,
            }
          : p,
      ),
    }));
    if (!marked) return Response.json({ error: "review not found" }, { status: 404 });

    // Resolve the full reference URL list (logo + selected assets + user uploads).
    const referenceImageUrls = await resolveReferenceUrls({
      assetIds: refAssetIds,
      extraUrls: refUrls,
    });

    // ── Slow work OUTSIDE the lock so parallel renders still overlap ──────
    let url: string | undefined;
    try {
      url = await generateEmailImage({
        prompt: promptText,
        aspect: prompt0.aspect as EmailImageAspect,
        referenceImageUrls,
        quality: "medium",
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await mutateFlowReview(reviewId, (r) => ({
        ...r,
        imagePrompts: r.imagePrompts.map((p) =>
          p.id === promptId ? { ...p, status: "error" as const, errorMessage: detail } : p,
        ),
      }));
      console.error(`[email-review/generate-image] gpt-image-2 failed:`, detail);
      return Response.json({ error: detail }, { status: 502 });
    }
    if (!url) {
      const errMsg = `No URL returned from gpt-image-2`;
      await mutateFlowReview(reviewId, (r) => ({
        ...r,
        imagePrompts: r.imagePrompts.map((p) =>
          p.id === promptId ? { ...p, status: "error" as const, errorMessage: errMsg } : p,
        ),
      }));
      return Response.json({ error: errMsg }, { status: 502 });
    }

    // Persist to Blob
    const mirrored = await mirrorImageToBlob(url, `${reviewId}-${promptId}-${Date.now()}`);
    const finalUrl = mirrored ?? url;

    // ── Atomic write #2: merge the result onto the FRESH prompt ───────────
    // History is computed inside the mutator from the current stored prompt,
    // not the stale snapshot, so concurrent runs can't resurrect old images.
    let updatedPrompt: FlowReviewImagePrompt | undefined;
    const saved = await mutateFlowReview(reviewId, (r) => ({
      ...r,
      imagePrompts: r.imagePrompts.map((p) => {
        if (p.id !== promptId) return p;
        const history = [...(p.history ?? [])];
        if (p.imageUrl) {
          history.unshift({
            prompt: p.prompt,
            engine: p.engine,
            imageUrl: p.imageUrl,
            renderedAt: new Date().toISOString(),
          });
        }
        updatedPrompt = {
          ...p,
          engine: "gpt-image-2" as const,
          prompt: promptText,
          referenceAssetIds: refAssetIds,
          referenceImageUrls: refUrls,
          imageUrl: finalUrl,
          status: "ready" as const,
          errorMessage: undefined,
          history: history.slice(0, 8),
          regenSuggestions: undefined,
        };
        return updatedPrompt;
      }),
    }));
    if (!saved || !updatedPrompt) return Response.json({ error: "review not found" }, { status: 404 });

    const elapsed = Date.now() - t0;
    console.log(`[email-review/generate-image] reviewId=${reviewId} promptId=${promptId} refs=${referenceImageUrls.length} elapsed=${elapsed}ms`);
    return Response.json({ prompt: updatedPrompt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/generate-image]", msg, { reviewId, promptId });
    return Response.json({ error: msg }, { status: 500 });
  }
}
