import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 30;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const { text, topic, type } = await req.json();
    if (!text?.trim()) {
      return Response.json({ error: "text required" }, { status: 400 });
    }

    const TYPE_GUIDE: Record<string, string> = {
      subject:
        "email subject line — punchy, curiosity-led or benefit-led, max 55 characters, no emoji unless clearly brand-appropriate",
      body:
        "email body paragraph — 2-4 sentences, conversational yet sophisticated, one clear idea per paragraph",
    };

    const guidance = TYPE_GUIDE[type as string] ?? "marketing copy";

    const prompt = `You are a senior copywriter for Lunia Life.

Lunia Life brand voice: aspirational, minimal, wellness-science grounded. Calm confidence. No hype, no FOMO, no urgency manipulation. Clear, direct, sophisticated. Target reader: health-conscious adult, 28–45, optimising their life.

Email topic: ${topic?.trim() || "wellness and lifestyle"}

Rewrite this ${guidance} in Lunia voice. Keep the core intent. Make it sharper, more specific, more Lunia — elevate without inflating:

"${text.trim()}"

Return ONLY the rewritten text. No explanation, no quotes, no markdown.`;

    const response = await createContentMessage({
      model: "claude-opus-4-6",
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    const enhanced =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : text;

    return Response.json({ enhanced });
  } catch (err) {
    console.error("[api/email/enhance-text]", err);
    return Response.json({ error: "Enhancement failed" }, { status: 500 });
  }
}
