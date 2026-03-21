import Anthropic from "@anthropic-ai/sdk";
import { SUGGESTIONS_PROMPT } from "@/lib/carousel-prompts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: SUGGESTIONS_PROMPT }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const suggestions = JSON.parse(text);
    return Response.json(suggestions);
  } catch (err) {
    console.error("[api/carousel/suggestions]", err);
    return Response.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
