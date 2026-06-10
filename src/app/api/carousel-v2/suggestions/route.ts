import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { SUGGESTIONS_PROMPT, SUGGESTIONS_FROM_RECENT_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit, getCarousels } from "@/lib/kv";

export const maxDuration = 300;

export async function POST(req: Request) {
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
    // History-aware: dedupe against the user's 7 most recently saved carousels
    // so suggestions extend the series instead of repeating it. Falls back to
    // the static prompt when there's no history yet.
    const recentTopics = (await getCarousels().catch(() => []))
      .slice(0, 7)
      .map((c) => c.topic?.trim())
      .filter((t): t is string => !!t && t.length > 0);
    const prompt = recentTopics.length > 0
      ? SUGGESTIONS_FROM_RECENT_PROMPT(recentTopics)
      : SUGGESTIONS_PROMPT;

    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = extractText(msg);
    // Models (esp. Haiku) sometimes wrap the array in a ```json fence or add a
    // line of preamble. Strip fences, then fall back to slicing the outermost
    // [...] array before parsing.
    let text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    let suggestions;
    try {
      suggestions = JSON.parse(text);
    } catch {
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      if (start !== -1 && end > start) {
        try {
          text = text.slice(start, end + 1);
          suggestions = JSON.parse(text);
        } catch { /* fall through */ }
      }
    }
    if (!Array.isArray(suggestions)) {
      console.error("[api/carousel/suggestions] JSON parse failed:", raw.slice(0, 400));
      return Response.json(
        { error: "Failed to parse suggestions. Please try again." },
        { status: 500 }
      );
    }
    return Response.json(suggestions);
  } catch (err) {
    console.error("[api/carousel/suggestions]", err);
    return Response.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
