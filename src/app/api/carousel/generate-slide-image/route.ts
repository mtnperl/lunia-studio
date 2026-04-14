import { checkRateLimit } from "@/lib/kv";
import { generateSlideBackground, buildSlideBackgroundPrompt } from "@/lib/fal";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json(
      { error: "Too many requests. Please try again in an hour." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const prompt: string = body.prompt ?? "";
    const headline: string = body.headline ?? "";
    const topic: string = body.topic ?? "";

    const effectivePrompt = prompt.trim().length > 0
      ? prompt
      : buildSlideBackgroundPrompt(headline, topic);

    if (!effectivePrompt) {
      return Response.json({ error: "No prompt provided" }, { status: 400 });
    }

    const result = await generateSlideBackground(effectivePrompt);
    return Response.json({ url: result.url });
  } catch (err) {
    console.error("[api/carousel/generate-slide-image]", err);
    return Response.json(
      { error: "Failed to generate slide background image" },
      { status: 500 }
    );
  }
}
