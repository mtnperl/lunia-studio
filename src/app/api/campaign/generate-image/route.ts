import { checkRateLimit } from "@/lib/kv";
import { generateEmailImage, type EmailImageAspect } from "@/lib/email-image-engine";
import { mirrorImageToBlob } from "@/lib/blob-mirror";
import { getMoodById } from "@/lib/carousel-visual-moods";
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

    const falUrl = await generateEmailImage({
      prompt: prompt + moodBlock + SAFETY_SUFFIX,
      aspect,
      quality: "high",
    });

    const url = await mirrorImageToBlob(falUrl, `campaign-${randomUUID()}`, "campaign-images");
    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/campaign/generate-image]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
