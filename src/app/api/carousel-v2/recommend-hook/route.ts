import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { RECOMMEND_HOOK_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";
import type { HookTone } from "@/lib/types";

export const maxDuration = 300;

// The 8 tones the carousel builder actually exposes (did-you-know is hidden —
// it's superseded by the did_you_know CarouselFormat). The model is told to
// return these values, but we validate defensively in case it returns a label
// or hallucinates a tone.
const ALLOWED_TONES: HookTone[] = [
  "educational",
  "science-backed",
  "myth-bust",
  "clickbait",
  "personal-story",
  "symptom",
  "paradox",
  "tell",
];

type HookRecommendation = { tone: HookTone; reason: string };

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

  let body: { topic?: unknown; category?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : undefined;
  if (!topic || topic.length > 500) {
    return Response.json(
      { error: "A topic of 1-500 characters is required." },
      { status: 400 }
    );
  }

  try {
    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      messages: [{ role: "user", content: RECOMMEND_HOOK_PROMPT(topic, category) }],
    });
    const raw = extractText(msg);
    // Haiku sometimes wraps the array in a ```json fence or adds preamble —
    // strip fences, then fall back to slicing the outermost [...] array.
    let text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      if (start !== -1 && end > start) {
        try {
          text = text.slice(start, end + 1);
          parsed = JSON.parse(text);
        } catch { /* fall through */ }
      }
    }

    const allowedSet = new Set<string>(ALLOWED_TONES);
    const seen = new Set<string>();
    const recommendations: HookRecommendation[] = Array.isArray(parsed)
      ? parsed
          .filter((r): r is { tone: string; reason: unknown } =>
            !!r && typeof r === "object" && typeof (r as { tone?: unknown }).tone === "string")
          .filter((r) => allowedSet.has(r.tone) && !seen.has(r.tone) && (seen.add(r.tone), true))
          .slice(0, 3)
          .map((r) => ({
            tone: r.tone as HookTone,
            reason: typeof r.reason === "string" ? r.reason : "",
          }))
      : [];

    if (recommendations.length === 0) {
      console.error("[api/carousel-v2/recommend-hook] no valid tones:", raw.slice(0, 400));
      return Response.json(
        { error: "Failed to recommend a hook. Please try again." },
        { status: 500 }
      );
    }
    return Response.json(recommendations);
  } catch (err) {
    console.error("[api/carousel-v2/recommend-hook]", err);
    return Response.json({ error: "Failed to recommend a hook" }, { status: 500 });
  }
}
