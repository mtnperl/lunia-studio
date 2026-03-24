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
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const topic: string = body.topic ?? "";
    const headline: string = body.headline ?? "";
    const subline: string = body.subline ?? "";
    const guidelines: string = body.guidelines ?? "";
    const currentPrompt: string = body.currentPrompt ?? "";

    if (!topic && !headline) {
      return Response.json({ error: "topic or headline required" }, { status: 400 });
    }

    const systemPrompt = `You are a creative director writing image generation prompts for Recraft V3 (realistic_image photography style).

Your output is a single Recraft V3 prompt for a hook slide background image — cinematic, editorial, premium wellness brand.

Rules (hard):
- Dark background always: midnight navy, black, or deep charcoal
- No people, no faces, no text, no logos
- Ultra-sharp, editorial, premium wellness brand aesthetic
- Name the exact material or object (e.g. "magnesium glycinate crystals", not "minerals")
- Max 55 words
- Output ONLY the prompt text — no quotes, no explanation, no JSON

Structure: [precise subject/material] + [action or state] + [lighting description] + [camera/composition] + [colour palette] + [mood]

Good example: "Extreme macro of magnesium glycinate powder dissolving in still dark water, single cold shaft of light, crystal clarity, deep navy background, editorial pharmaceutical photography, shallow depth of field, ultra-sharp edges, absolute stillness"`;

    const userMessage = [
      `Hook headline: "${headline}"`,
      subline ? `Hook subline: "${subline}"` : null,
      `Topic: "${topic}"`,
      currentPrompt ? `\nCurrent prompt (improve on this):\n"${currentPrompt}"` : null,
      guidelines ? `\nUser guidelines to follow:\n${guidelines}` : null,
      `\nWrite a new Recraft V3 image prompt for this hook slide.`,
    ].filter(Boolean).join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const prompt = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!prompt) {
      return Response.json({ error: "Failed to generate prompt" }, { status: 500 });
    }

    return Response.json({ prompt });
  } catch (err) {
    console.error("[api/carousel/regenerate-image-prompt]", err);
    return Response.json({ error: "Failed to regenerate prompt" }, { status: 500 });
  }
}
