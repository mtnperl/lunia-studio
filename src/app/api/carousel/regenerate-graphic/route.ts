import { anthropic } from "@/lib/anthropic";
import { REGENERATE_GRAPHIC_PROMPT, REGENERATE_VECTOR_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";

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

    const prompt = forceVector
      ? REGENERATE_VECTOR_PROMPT(topic, headline, slideBody)
      : REGENERATE_GRAPHIC_PROMPT(topic, headline, slideBody, avoidComponents);

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [
        { role: "user", content: prompt },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    // Strip accidental code fences if model adds them
    const graphic = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    return Response.json({ graphic });
  } catch (err) {
    console.error("[api/carousel/regenerate-graphic]", err);
    return Response.json({ error: "Failed to regenerate graphic" }, { status: 500 });
  }
}
