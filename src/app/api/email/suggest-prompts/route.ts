import { anthropic } from "@/lib/anthropic";
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
    const { currentPrompt, topic, sectionBody } = await req.json();

    const prompt = `You are generating image prompts for fal-ai/recraft-v3.

Email topic: ${topic?.trim() || "wellness"}
Section text: ${sectionBody?.trim().slice(0, 300) || "(none)"}
Current prompt: ${currentPrompt?.trim() || "(none)"}

Generate 3 alternative photorealistic image prompts for this email section. Each prompt should:
- Describe a specific wellness lifestyle scene (person, product, nature, or environment — vary between the 3)
- Specify lighting, mood, and setting in detail
- Be portrait-oriented (1024×1280), editorial photography feel
- Contain NO text, typography, or words in the scene
- Be 1-2 sentences only

Return ONLY a JSON array of 3 strings, no markdown fences:
["prompt one", "prompt two", "prompt three"]`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
    const cleaned = raw
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();

    let suggestions: string[] = [];
    try {
      suggestions = JSON.parse(cleaned);
    } catch {
      suggestions = [];
    }

    return Response.json({ suggestions });
  } catch (err) {
    console.error("[api/email/suggest-prompts]", err);
    return Response.json({ suggestions: [] });
  }
}
