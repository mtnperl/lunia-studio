import { checkRateLimit } from "@/lib/kv";
import { generateCampaignSlotImage } from "@/lib/campaign-image";
import type { EmailImageAspect } from "@/lib/email-image-engine";

export const maxDuration = 240;

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

    const url = await generateCampaignSlotImage({
      prompt,
      aspect,
      mood: typeof body.mood === "string" ? body.mood : undefined,
      topic: typeof body.topic === "string" ? body.topic.trim() : "",
      role: body.role === "hero" ? "hero" : "secondary",
    });

    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/campaign/generate-image]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
