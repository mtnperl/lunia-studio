import { anthropic } from "@/lib/anthropic";
import { REGENERATE_GRAPHIC_PROMPT, REGENERATE_VECTOR_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 30;

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

    // Known valid component keys — any Claude response with a key outside this set is invalid
    const VALID_COMPONENTS = new Set([
      "stat","bars","steps","dotchain","wave","iconGrid","donut","versus","timeline","split",
      "checklist","callout","table","pyramid","radial","circleStats","spectrum","funnel",
      "scorecard","bubbles","iconStat","matrix2x2","stackedBar","processFlow","heatGrid",
      "vector","hubSpoke","iceberg","bridge","circularCycle","bento","conceptFlow",
    ]);

    const prompt = forceVector
      ? REGENERATE_VECTOR_PROMPT(topic, headline, slideBody, attempt)
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

    // Validate: if Claude returned a component key not in our registry, substitute callout
    let finalGraphic = graphic;
    try {
      const parsed = JSON.parse(graphic);
      if (parsed?.component && !VALID_COMPONENTS.has(parsed.component)) {
        // Unknown component — fall back to callout so slide always renders something
        finalGraphic = JSON.stringify({ component: "callout", data: { text: headline } });
      }
    } catch { /* non-JSON response — pass through, ContentSlide will handle */ }

    return Response.json({ graphic: finalGraphic });
  } catch (err) {
    console.error("[api/carousel/regenerate-graphic]", err);
    return Response.json({ error: "Failed to regenerate graphic" }, { status: 500 });
  }
}
