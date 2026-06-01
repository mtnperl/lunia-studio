import { createContentMessage, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
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
    const topic: string = (body.topic ?? "").trim();
    const current: string = (body.current ?? "").trim();

    if (topic.length < 3) {
      return Response.json({ error: "Need a campaign topic to suggest a promo band." }, { status: 400 });
    }

    const prompt = `${LUNIA_VOICE_SPEC}

Suggest ONE short promo band line for the top of a marketing email. The promo band sits in a thin colored strip above the hero image — it's the punchy hook a reader sees first.

Campaign topic: ${topic}
${current ? `Current promo band (write something different): ${current}` : ""}

Rules:
- 2 to 6 words. Uppercase-style is fine (e.g. "MEMORIAL DAY WEEKEND SALE", "FREE SHIPPING THIS WEEK", "24 HOURS ONLY").
- No em dashes, no en dashes, no emoji, no quotes around the line.
- Lunia voice: calm confidence, not hypey. Avoid "DON'T MISS", "HURRY", "LAST CHANCE" unless the topic is genuinely time-limited.
- If the topic isn't promotional (e.g. an educational email), return a calm editorial header instead (e.g. "A BETTER WAY TO REST").

Return ONLY the promo band string, no JSON, no markdown, no explanation.`;

    const response = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const promoBand = stripDashes(raw.replace(/^["'`]+|["'`]+$/g, "").split("\n")[0] ?? "");

    if (!promoBand) {
      return Response.json({ error: "Suggestion failed, please try again." }, { status: 422 });
    }

    return Response.json({ promoBand });
  } catch (err) {
    console.error("[api/campaign/suggest-promo]", err);
    return Response.json({ error: "Suggestion failed" }, { status: 500 });
  }
}
