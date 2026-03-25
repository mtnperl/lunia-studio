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

    const systemPrompt = `You are a top-tier ad creative director writing image generation prompts for Recraft V3 (realistic_image photography style).

Your output is a single Recraft V3 prompt for a hook slide background image. The goal: make someone STOP SCROLLING. Think premium lifestyle brand ad, not science textbook. Show aspiration or tension — never literally illustrate the ingredient or topic.

Rules (hard):
- Show the OUTCOME (what life looks like when the problem is solved) or the TENSION (how the problem feels). Never show the molecule or ingredient.
- Aspirational lifestyle scenes: luxury environments, morning light, beautiful objects, emotional moments without people
- No people, no faces, no text, no logos
- Ultra-sharp, editorial, premium lifestyle/wellness brand aesthetic
- Max 55 words
- Output ONLY the prompt text — no quotes, no explanation, no JSON

Structure: [aspirational lifestyle scene or tension-filled environment] + [lighting that creates desire or unease] + [camera/composition] + [colour palette] + [emotional mood]

Good example for a magnesium/sleep hook: "Pristine white linen sheets glowing in warm 8am light, minimalist nightstand with dimmed amber lamp and a glass of water, soft golden bokeh in background, luxury hotel suite stillness, aspirational lifestyle photography, shallow depth of field"
Bad example (NEVER do this): "Extreme macro of magnesium glycinate powder dissolving in dark water, pharmaceutical photography"`;

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
