import { anthropic } from "@/lib/anthropic";
import { SUGGESTIONS_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";

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
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: SUGGESTIONS_PROMPT }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    let suggestions;
    try {
      suggestions = JSON.parse(text);
    } catch {
      console.error("[api/carousel/suggestions] JSON parse failed:", text);
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
