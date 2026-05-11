import { fal } from "@/lib/fal";
import { checkRateLimit, getFlowReviewById, saveFlowReview } from "@/lib/kv";
import { mirrorImageToBlob } from "@/lib/blob-mirror";
import { FAL_ENDPOINTS, type ImageEngine } from "@/lib/carousel-image-engine";
import type { FlowReviewImageEngine, FlowReviewImagePrompt } from "@/lib/types";

export const maxDuration = 180;

const VALID_ENGINES: FlowReviewImageEngine[] = ["recraft", "ideogram", "flux2"];

// Engine fallback ladder for the "recraft" slot.
// Try v4/pro first (same endpoint carousel-v2 uses successfully), then v3,
// then ideogram as a last resort on a completely different billing pool.
const RECRAFT_LADDER: string[] = [
  FAL_ENDPOINTS["recraft"],                     // v4/pro — known-working endpoint
  "fal-ai/recraft-v3",                         // v3 as fallback
  FAL_ENDPOINTS["ideogram"],                    // ideogram as last resort
];

function aspectToSize(aspect: string): { width: number; height: number } {
  switch (aspect) {
    case "16:9": return { width: 1280, height: 720 };
    case "1:1":  return { width: 1024, height: 1024 };
    case "4:5":
    default:     return { width: 1024, height: 1280 };
  }
}

/** True for auth/plan/bad-request errors — these trigger a fallback to the next engine. */
function isAccessError(err: unknown): boolean {
  if (err instanceof Error) {
    // fal SDK's ApiError exposes .status directly on the Error subclass
    const status = (err as Error & { status?: number }).status;
    if (status === 401 || status === 403 || status === 422) return true;
    const msg = err.message.toLowerCase();
    return (
      msg.includes("forbidden") ||
      msg.includes("unauthorized") ||
      msg.includes("unprocessable") ||
      msg.includes("403") ||
      msg.includes("401") ||
      msg.includes("422")
    );
  }
  const msg = String(err).toLowerCase();
  return (
    msg.includes("forbidden") ||
    msg.includes("unauthorized") ||
    msg.includes("unprocessable") ||
    msg.includes("403") ||
    msg.includes("401") ||
    msg.includes("422")
  );
}

/** Extract the most useful error string from a fal SDK error. */
function extractFalError(err: unknown): string {
  if (!err) return "unknown error";
  if (err instanceof Error) {
    const e = err as Error & { body?: unknown; response?: { status?: number; data?: unknown } };
    if (e.body) {
      try { return typeof e.body === "string" ? e.body : JSON.stringify(e.body); } catch { /* fallthrough */ }
    }
    if (e.response?.data) {
      try { return JSON.stringify(e.response.data); } catch { /* fallthrough */ }
    }
    return err.message || String(err);
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

async function callRecraftWithFallback(prompt: string, aspect: string): Promise<string | undefined> {
  const size = aspectToSize(aspect);
  let lastErr: unknown;
  for (const endpoint of RECRAFT_LADDER) {
    try {
      const isIdeogramFallback = endpoint === FAL_ENDPOINTS["ideogram"];
      let result;
      if (isIdeogramFallback) {
        // Ideogram uses aspect_ratio string, not image_size
        const ar = aspect === "16:9" ? "16:9" : aspect === "1:1" ? "1:1" : "4:5";
        result = await fal.subscribe(endpoint, {
          input: { prompt, aspect_ratio: ar, rendering_speed: "BALANCED", style: "REALISTIC" },
          logs: false,
        });
      } else {
        result = await fal.subscribe(endpoint, {
          input: { prompt, image_size: size },
          logs: false,
        });
      }
      const url = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
      if (url) {
        if (endpoint !== RECRAFT_LADDER[0]) {
          console.warn(`[email-review/generate-image] recraft primary failed — succeeded with fallback: ${endpoint}`);
        }
        return url;
      }
    } catch (err) {
      if (isAccessError(err)) {
        const detail = extractFalError(err);
        console.warn(`[email-review/generate-image] ${endpoint} rejected (auth/422), trying next. detail: ${detail}`);
        lastErr = err;
        continue;
      }
      throw err; // unexpected error — propagate immediately
    }
  }
  // All rungs exhausted
  const detail = extractFalError(lastErr);
  throw new Error(
    `All recraft/ideogram engines failed — check FAL_KEY and model quota. Last error: ${detail}`,
  );
}

async function callFal(engine: ImageEngine, prompt: string, aspect: string): Promise<string | undefined> {
  if (engine === "recraft") {
    return callRecraftWithFallback(prompt, aspect);
  }
  const endpoint = FAL_ENDPOINTS[engine];
  const size = aspectToSize(aspect);
  try {
    if (engine === "ideogram") {
      // Ideogram v3 aspect_ratio values: "1:1", "4:3", "3:4", "16:9", "9:16", "4:5", "5:4"
      const ar = aspect === "16:9" ? "16:9" : aspect === "1:1" ? "1:1" : "4:5";
      const result = await fal.subscribe(endpoint, {
        input: { prompt, aspect_ratio: ar, rendering_speed: "BALANCED", style: "AUTO" },
        logs: false,
      });
      return (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
    }
    // flux2
    const result = await fal.subscribe(endpoint, {
      input: { prompt, image_size: size },
      logs: false,
    });
    return (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
  } catch (err) {
    const detail = extractFalError(err);
    console.error(`[email-review/generate-image] ${engine} (${endpoint}) failed: ${detail}`);
    throw new Error(`fal ${engine} failed: ${detail}`);
  }
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

    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    const idx = review.imagePrompts.findIndex((p) => p.id === promptId);
    if (idx < 0) return Response.json({ error: "prompt not found in review" }, { status: 404 });
    const prompt = review.imagePrompts[idx];

    const requestedEngine = (body.engineOverride as FlowReviewImageEngine | undefined) ?? prompt.engine;
    const engine: FlowReviewImageEngine = VALID_ENGINES.includes(requestedEngine) ? requestedEngine : "recraft";
    const promptText = (body.promptOverride as string | undefined) ?? prompt.prompt;

    // Mark generating
    review.imagePrompts[idx] = { ...prompt, engine, prompt: promptText, status: "generating", errorMessage: undefined };
    await saveFlowReview(review);

    let url: string | undefined;
    try {
      url = await callFal(engine, promptText, prompt.aspect);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const updated: FlowReviewImagePrompt = { ...review.imagePrompts[idx], status: "error", errorMessage: detail };
      review.imagePrompts[idx] = updated;
      await saveFlowReview(review);
      console.error(`[email-review/generate-image] fal ${engine} failed:`, detail);
      return Response.json({ error: detail }, { status: 502 });
    }
    if (!url) {
      const errMsg = `No URL returned from fal ${engine}`;
      review.imagePrompts[idx] = { ...review.imagePrompts[idx], status: "error", errorMessage: errMsg };
      await saveFlowReview(review);
      return Response.json({ error: errMsg }, { status: 502 });
    }

    // Persist to Blob
    const mirrored = await mirrorImageToBlob(url, `${reviewId}-${promptId}-${Date.now()}`);
    const finalUrl = mirrored ?? url;

    // Push prior image into history (if there was one)
    const history = [...(prompt.history ?? [])];
    if (prompt.imageUrl) {
      history.unshift({
        prompt: prompt.prompt,
        engine: prompt.engine,
        imageUrl: prompt.imageUrl,
        renderedAt: new Date().toISOString(),
      });
    }

    const updated: FlowReviewImagePrompt = {
      ...review.imagePrompts[idx],
      engine,
      prompt: promptText,
      imageUrl: finalUrl,
      status: "ready",
      errorMessage: undefined,
      history: history.slice(0, 8),
      regenSuggestions: undefined,
    };
    review.imagePrompts[idx] = updated;
    await saveFlowReview(review);

    const elapsed = Date.now() - t0;
    console.log(`[email-review/generate-image] reviewId=${reviewId} promptId=${promptId} engine=${engine} elapsed=${elapsed}ms`);
    return Response.json({ prompt: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/generate-image]", msg, { reviewId, promptId });
    return Response.json({ error: msg }, { status: 500 });
  }
}
