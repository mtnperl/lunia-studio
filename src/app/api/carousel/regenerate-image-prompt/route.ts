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

    const systemPrompt = `You are a top-tier visual creative director writing image generation prompts for Recraft V3 (realistic_image photography style).

Your output is a single Recraft V3 prompt for a hook slide background image. The hook headline IS your creative brief — create a LITERAL VISUAL METAPHOR of the exact words in the headline. Pull the most striking noun or verb and build a cinematic scene around it. The image should feel like a still frame of the hook text happening.

Examples of hook-to-image translation:
- "ADENOSINE IS DROWNING YOUR BRAIN" → dark water engulfing objects sinking into deep blue, air bubbles rising, cold undercurrent light
- "MAGNESIUM IS YOUR BRAIN'S OFF SWITCH" → single light switch on a dark wall, the moment it flips off, deep shadow with one cold highlight
- "YOUR CORTISOL IS SPIKING" → sharp crystal or spire formation breaking through a dark surface, jagged edges catching light, tension
- "YOU'RE WIRED BUT TIRED" → tangled copper wire in warm shallow-focus light, frayed at the end, quiet exhaustion

Rules (hard):
- ILLUSTRATE THE HOOK TEXT, not the topic or ingredient
- No people, no faces, no text, no logos
- Ultra-sharp, editorial, premium brand aesthetic
- Max 55 words
- Output ONLY the prompt text — no quotes, no explanation, no JSON

Structure: [literal visual metaphor from hook's key word/phrase] + [cinematic lighting] + [camera/composition] + [colour palette] + [mood]`;

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
