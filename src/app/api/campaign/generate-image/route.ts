import { checkRateLimit, saveAssetIfNew } from "@/lib/kv";
import { generateEmailImage, type EmailImageAspect } from "@/lib/email-image-engine";
import { mirrorImageToBlob } from "@/lib/blob-mirror";
import { getMoodById } from "@/lib/carousel-visual-moods";
import type { AssetMetadata } from "@/lib/types";
import { randomUUID } from "crypto";

export const maxDuration = 240;

// No text, no product, no logo — keeps generated lifestyle images sharp and
// on-brief. Bottle / logo imagery always comes from uploaded assets instead.
const SAFETY_SUFFIX =
  " Editorial wellness lifestyle photography, photorealistic, natural light, calm and warm. No text, no words, no signage, no logos, no product packaging, no supplement bottles. Sharp focus, high detail.";

export async function POST(req: Request) {
  if (!process.env.FAL_KEY) {
    return Response.json(
      { error: "FAL_KEY is not configured — add it to enable image generation." },
      { status: 503 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "images");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const prompt: string = (body.prompt ?? "").trim();
    const aspect: EmailImageAspect = body.aspect === "1:1" || body.aspect === "16:9" ? body.aspect : "4:5";

    if (!prompt) {
      return Response.json({ error: "Image prompt required" }, { status: 400 });
    }

    // Optional visual mood (shared list with carousel v2) steers the look.
    const mood = getMoodById(body.mood);
    const moodBlock = mood ? ` ${mood.styleBlock}.` : "";

    // "medium" not "high": these are text-free lifestyle photos shown small in
    // an email, so medium is visually equivalent — but 3-4× faster (~40s vs
    // 2-3 min). The slow "high" path made regeneration feel stuck / unchanged.
    const falUrl = await generateEmailImage({
      prompt: prompt + moodBlock + SAFETY_SUFFIX,
      aspect,
      quality: "medium",
    });

    const url = await mirrorImageToBlob(falUrl, `campaign-${randomUUID()}`, "campaign-images");

    // Register the freshly generated image in the asset library so the
    // campaign image picker can re-use it on any future email. Lifestyle-
    // only by construction (SAFETY_SUFFIX strips text / product / logo),
    // so it's safe to re-use as a background anywhere. saveAssetIfNew is
    // URL-keyed, so re-generations of the exact same image don't duplicate.
    if (url) {
      const topic: string = typeof body.topic === "string" ? body.topic.trim() : "";
      const role: string = body.role === "hero" || body.role === "secondary" ? body.role : "secondary";
      const inferMime = (u: string) => {
        const lower = u.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
      };
      const assetName = (topic ? `${topic} — ${role}` : `Email ${role}`)
        .slice(0, 90);
      const asset: AssetMetadata = {
        id: `egen-${randomUUID()}`,
        url,
        name: assetName,
        type: inferMime(url),
        assetType: "email-generated",
        uploadedAt: new Date().toISOString(),
        source: topic ? { topic } : undefined,
      };
      // Fire-and-forget — failures here never block the image response.
      saveAssetIfNew(asset).catch((err) => {
        console.warn("[api/campaign/generate-image] asset registration failed:", err);
      });
    }

    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/campaign/generate-image]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
