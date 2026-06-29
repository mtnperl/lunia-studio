import { createContentMessage, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_SHORT, extractText } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 30;

const LUNIA_VOICE_SPEC = `Lunia Life brand voice: Aspirational, minimal, wellness-science grounded. Tone: calm confidence. No hype. No FOMO manipulation.

HARD BRAND RULE — NEVER use em dashes (—) or en dashes (–). Use commas, periods, or short phrases instead.`;

function stripDashes(s: string): string {
  return s
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: Request): Promise<Response> {
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
    const topic: string = (body.topic ?? "").trim();
    const current: string = (body.current ?? "").trim();

    if (topic.length < 3) {
      return Response.json({ error: "Need a campaign topic to suggest a top banner." }, { status: 400 });
    }

    const prompt = `${LUNIA_VOICE_SPEC}

Suggest ONE short top-banner line for a marketing email. The top banner is a thin strip at the very top of the email, above the logo. It renders in uppercase automatically and is the first thing a reader sees.

Campaign topic: ${topic}
${current ? `Current top banner (write something different): ${current}` : ""}

Rules:
- 2 to 8 words. Short and scannable (e.g. "FREE SHIPPING OVER $50", "NEW MAGNESIUM GLYCINATE BLEND", "SAVE 26% WITH A 3 MONTH PLAN").
- You MAY wrap ONE key fragment in **double asterisks** to highlight it with the brand color (e.g. "SAVE **26%** WITH A 3 MONTH PLAN"). Use at most one highlighted fragment, and only when it adds emphasis. Otherwise return plain text.
- No em dashes, no en dashes, no emoji, no surrounding quotes.
- Lunia voice: calm confidence, not hypey. Avoid "DON'T MISS", "HURRY", "LAST CHANCE" unless the topic is genuinely time-limited.
- If the topic isn't promotional, return a calm editorial line instead (e.g. "A BETTER WAY TO REST").

Return ONLY the banner string, no JSON, no markdown fences, no explanation.`;

    const response = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: prompt }],
    });

    // Keep the first non-empty line, strip any surrounding quotes/backticks, and
    // scrub dashes. The **highlight** markers are intentionally preserved — the
    // renderer turns them into the brand pill.
    const raw = extractText(response);
    const firstLine = raw.split("\n").find((l) => l.trim()) ?? "";
    const topBanner = stripDashes(firstLine.replace(/^["'`]+|["'`]+$/g, "").trim());

    if (!topBanner) {
      return Response.json({ error: "Suggestion failed, please try again." }, { status: 422 });
    }

    return Response.json({ topBanner });
  } catch (err) {
    console.error("[api/campaign/suggest-banner]", err);
    return Response.json({ error: "Suggestion failed" }, { status: 500 });
  }
}
