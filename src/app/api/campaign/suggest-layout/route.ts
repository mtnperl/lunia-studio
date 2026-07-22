import { createContentMessage, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_LONG, extractText } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { buildLayoutSuggestionPrompt, LayoutSuggestionSchema, layoutBlockToCampaignBlock } from "@/lib/campaign-layout-prompts";

export const maxDuration = 60;

function stripDashes(s: string): string {
  return s
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const subject: string = (body.subject ?? "").trim();
    const topic: string = (body.topic ?? "").trim();

    if (subject.length < 4) {
      return Response.json({ error: "Type a subject line first." }, { status: 400 });
    }

    const prompt = buildLayoutSuggestionPrompt(subject, topic);
    const response = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractText(response);
    const jsonText = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      console.error("[api/campaign/suggest-layout] JSON parse failed:", raw.slice(0, 400));
      return Response.json({ error: "Suggestion failed, please try again." }, { status: 422 });
    }

    const result = LayoutSuggestionSchema.safeParse(parsedJson);
    if (!result.success) {
      console.error("[api/campaign/suggest-layout] schema validation failed:", result.error.message);
      return Response.json({ error: "Suggestion failed, please try again." }, { status: 422 });
    }

    const blocks = result.data.blocks.map(layoutBlockToCampaignBlock);

    return Response.json({
      topBanner: result.data.topBanner ? stripDashes(result.data.topBanner) : undefined,
      promoBand: result.data.promoBand ? stripDashes(result.data.promoBand) : undefined,
      ctaLabel: result.data.ctaLabel ? stripDashes(result.data.ctaLabel) : undefined,
      blocks,
    });
  } catch (err) {
    console.error("[api/campaign/suggest-layout]", err);
    return Response.json({ error: "Suggestion failed" }, { status: 500 });
  }
}
