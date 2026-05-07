import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 300;

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
    const guidelines: string = (body.guidelines ?? "").slice(0, 400); // cap to prevent prompt injection
    const currentPrompt: string = body.currentPrompt ?? "";

    if (!topic && !headline) {
      return Response.json({ error: "topic or headline required" }, { status: 400 });
    }

    const systemPrompt = `You are a top-tier visual creative director writing image generation prompts for Recraft V3 (realistic_image photography style).

Your output is THREE Recraft V3 prompts for a hook slide background image. Each must be a distinct creative direction — different concept, different mood, different visual metaphor. They should feel like three completely separate pitches, not variations of the same idea.

The hook headline IS your creative brief — create a LITERAL VISUAL METAPHOR of the exact words in the headline.

Direction types to use (pick three different ones):
- MACRO/CLOSE-UP: extreme close-up of a physical object or texture that embodies the headline
- ENVIRONMENTAL/WIDE: a full scene or landscape that captures the mood at scale
- ABSTRACT/GRAPHIC: clean geometric or minimal composition, shape-driven, editorial
- SYMBOLIC/SURREAL: unexpected juxtaposition or metaphor that makes you think
- NATURAL/ORGANIC: nature, biology, organic textures that mirror the concept

Rules (hard):
- No people, no faces, no text, no logos
- Ultra-sharp, editorial, premium brand aesthetic
- Max 55 words per prompt
- Output ONLY a JSON array with exactly 3 strings — no explanation, no labels, no markdown
- Format: ["prompt one here","prompt two here","prompt three here"]`;

    const userMessage = [
      `Hook headline: "${headline}"`,
      subline ? `Hook subline: "${subline}"` : null,
      `Topic: "${topic}"`,
      currentPrompt ? `\nCurrent prompt (use as reference — all 3 new ones should differ from this):\n"${currentPrompt}"` : null,
      guidelines ? `\nUser guidelines to apply across all 3 prompts:\n${guidelines}` : null,
      `\nWrite 3 distinct Recraft V3 image prompts for this hook slide, returned as a JSON array.`,
    ].filter(Boolean).join("\n");

    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = extractText(msg).trim();
    if (!raw) {
      return Response.json({ error: "Failed to generate prompts" }, { status: 500 });
    }

    // Parse the JSON array
    let prompts: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 1) {
        prompts = parsed.map(String).filter(Boolean);
      }
    } catch {
      // Fallback: try to extract JSON array from response
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          prompts = JSON.parse(match[0]);
        } catch {
          // Last resort: treat as single prompt
          prompts = [raw];
        }
      } else {
        prompts = [raw];
      }
    }

    if (prompts.length === 0) {
      return Response.json({ error: "Failed to generate prompts" }, { status: 500 });
    }

    return Response.json({
      prompt: prompts[0],           // primary — used by existing callers
      alternatives: prompts.slice(1), // 2 extra options for the UI to display
    });
  } catch (err) {
    console.error("[api/carousel/regenerate-image-prompt]", err);
    return Response.json({ error: "Failed to regenerate prompt" }, { status: 500 });
  }
}
