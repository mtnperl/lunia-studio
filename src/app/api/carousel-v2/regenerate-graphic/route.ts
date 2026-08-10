import { createContentMessage, extractText, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { REGENERATE_GRAPHIC_PROMPT, REGENERATE_VECTOR_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";
import { validateOrFallbackGraphic } from "@/lib/carousel-utils";

export const maxDuration = 300;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "graphic");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const topic: string = body.topic ?? "";
    const headline: string = body.headline ?? "";
    const slideBody: string = body.body ?? "";
    const currentGraphicRaw: string = body.currentGraphic ?? "";

    if (!topic || !headline) {
      return Response.json({ error: "topic and headline required" }, { status: 400 });
    }

    // Support explicit avoidComponents list (new) or derive from currentGraphic (backward compat)
    let currentComponent: string | undefined;
    try {
      if (currentGraphicRaw) {
        const parsed = JSON.parse(currentGraphicRaw);
        if (parsed?.component) currentComponent = parsed.component;
      }
    } catch { /* ignore parse errors */ }

    const avoidComponents: string[] = body.avoidComponents ?? (currentComponent ? [currentComponent] : []);
    const forceVector: boolean = body.forceVector === true;
    const attempt: number = typeof body.attempt === "number" ? body.attempt : 0;
    const userComment: string = typeof body.userComment === "string" ? body.userComment : "";
    const forceComponent: string | undefined = typeof body.forceComponent === "string" && body.forceComponent.trim()
      ? body.forceComponent.trim()
      : undefined;

    const prompt = forceVector
      ? REGENERATE_VECTOR_PROMPT(topic, headline, slideBody, attempt)
      : REGENERATE_GRAPHIC_PROMPT(topic, headline, slideBody, avoidComponents, userComment, forceComponent);

    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      messages: [
        { role: "user", content: prompt },
      ],
    });

    const raw = extractText(msg);
    // Strip accidental code fences if model adds them
    const graphic = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    // Validate the full data shape against GraphicSpecSchema — not just the
    // component key — so a shape mismatch never ships as-is only to blank
    // out later at render time. Falls back to a callout built from the
    // slide's own text if the shape is wrong (or empty/undefined if the
    // model returned nothing usable at all).
    // `headline` is required (checked above), so fallbackText is always
    // non-empty here — the `?? ""` only satisfies the return type.
    const finalGraphic = validateOrFallbackGraphic(graphic, headline || slideBody) ?? "";

    return Response.json({ graphic: finalGraphic });
  } catch (err) {
    console.error("[api/carousel/regenerate-graphic]", err);
    return Response.json({ error: "Failed to regenerate graphic" }, { status: 500 });
  }
}
