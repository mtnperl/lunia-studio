import { generateAdImage, type AdAspectRatio } from "@/lib/fal";
import { BRAND_VISUAL_GUARDRAILS } from "@/lib/ad-prompts";
import { checkRateLimit } from "@/lib/kv";

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

    if (!prompt) {
      return Response.json({ error: "prompt required" }, { status: 400 });
    }
    if (prompt.length > 2000) {
      return Response.json({ error: "prompt too long (max 2000 chars)" }, { status: 400 });
    }
    if (!VALID_ASPECTS.has(aspect)) {
      return Response.json({ error: "aspect must be 1:1 or 4:5" }, { status: 400 });
    }

    // Always append brand guardrails — they're non-negotiable.
    const fullPrompt = `${prompt}\n\n${BRAND_VISUAL_GUARDRAILS}`;

    const url = await generateAdImage({ prompt: fullPrompt, aspect });
    return Response.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ad/generate-image]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
