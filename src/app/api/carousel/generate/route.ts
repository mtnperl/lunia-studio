import Anthropic from "@anthropic-ai/sdk";
import { GENERATE_CAROUSEL_PROMPT } from "@/lib/carousel-prompts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    if (!topic) return Response.json({ error: "Topic required" }, { status: 400 });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: GENERATE_CAROUSEL_PROMPT(topic) }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const content = JSON.parse(text);
    return Response.json(content);
  } catch (err) {
    console.error("[api/carousel/generate]", err);
    return Response.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
