import { anthropic } from "@/lib/anthropic";
import { REGENERATE_GRAPHIC_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";

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
    const topic: string = body.topic ?? "";
    const headline: string = body.headline ?? "";
    const slideBody: string = body.body ?? "";

    if (!topic || !headline) {
      return Response.json({ error: "topic and headline required" }, { status: 400 });
    }

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        { role: "user", content: REGENERATE_GRAPHIC_PROMPT(topic, headline, slideBody) },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    // Strip accidental code fences if model adds them
    const graphic = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    return Response.json({ graphic });
  } catch (err) {
    console.error("[api/carousel/regenerate-graphic]", err);
    return Response.json({ error: "Failed to regenerate graphic" }, { status: 500 });
  }
}
