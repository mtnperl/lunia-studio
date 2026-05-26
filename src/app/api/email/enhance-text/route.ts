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
        "email subject line. Punchy, curiosity-led or benefit-led. Max 55 characters. No emoji unless clearly brand-appropriate.",
      body:
        "email body paragraph. 2-4 sentences, conversational yet sophisticated. One clear idea per paragraph.",
    };

    const guidance = TYPE_GUIDE[type as string] ?? "marketing copy";

    const prompt = `You are a senior copywriter for Lunia Life.

Lunia Life brand voice: aspirational, minimal, wellness-science grounded. Calm confidence. No hype, no FOMO, no urgency manipulation. Clear, direct, sophisticated. Target reader: health-conscious adult, 28-45, optimising their life.

HARD BRAND RULE: NEVER use em dashes (—) or en dashes (–) ANYWHERE in your output. Use commas, periods, semicolons, or short sentences instead. This rule overrides any stylistic instinct you have.

Email topic: ${topic?.trim() || "wellness and lifestyle"}

Rewrite this ${guidance} in Lunia voice. Keep the core intent. Make it sharper, more specific, more Lunia. Elevate without inflating.

"${text.trim()}"

Return ONLY the rewritten text. No explanation, no quotes, no markdown. No em dashes.`;

    const response = await createContentMessage({
      model: "claude-opus-4-6",
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    // Defensive scrub: replace any em-dash with a comma + space and any
    // en-dash with a hyphen, in case the model ignored the HARD BRAND RULE.
    function stripDashes(s: string): string {
      return s
        .replace(/\s*—\s*/g, ", ")
        .replace(/\s*–\s*/g, "-")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    const enhanced =
      response.content[0].type === "text"
        ? stripDashes(response.content[0].text)
        : text;

    return Response.json({ enhanced });
  } catch (err) {
    console.error("[api/email/enhance-text]", err);
    return Response.json({ error: "Enhancement failed" }, { status: 500 });
  }
}
