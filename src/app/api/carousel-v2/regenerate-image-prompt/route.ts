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
    const moodId: string = typeof body.moodId === "string" ? body.moodId : "";

    if (!topic && !headline) {
      return Response.json({ error: "topic or headline required" }, { status: 400 });
    }

    const EDITORIAL_SYSTEM_PROMPT = `You are a top-tier visual creative director writing image generation prompts for Recraft V3 (realistic_image photography style).

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

    // Lifestyle Health mood needs Tally / Ritual / AG1 style subjects, not the
    // moody editorial defaults above. The styleBlock alone can't rescue a
    // "dark water + surreal" subject into a sunlit kitchen — the subject
    // itself has to be a real lifestyle moment.
    const LIFESTYLE_SYSTEM_PROMPT = `You are a creative director writing image generation prompts for premium DTC wellness brand content (think Tally Health, Ritual, AG1). Real-world, sunlit, human, approachable — NOT editorial, NOT cinematic, NOT moody.

Your output is THREE prompts for a hook slide background image. Each is a distinct lifestyle direction — different setting, different moment, different framing. They should feel like three real photographs a wellness brand might post, not three art-direction concepts.

The hook headline is your brief — translate it into a real human moment a viewer might actually live (morning, kitchen, bathroom, bedroom, yoga corner, walk, breakfast). Anchor in everyday objects and natural daylight, not metaphors.

Direction types (pick three different ones):
- PRODUCT-IN-HAND: a hand holding / cradling / pouring a supplement, glass of water, mug, or simple wellness tool, soft natural light, partial framing of the person
- MORNING RITUAL: a real unposed moment at a kitchen counter, breakfast table, or bedside — props in soft focus, daylight from a window
- TABLETOP STILL LIFE: linen, ceramic, fresh produce, a water glass, an open notebook or book — composed but unstaged, like a Sunday morning
- GENTLE LIFESTYLE WIDE: a person (back-of-head, silhouette, over-the-shoulder, or partial body) in a sunlit bedroom / kitchen / living room / yoga space — calm posture, no drama
- CLOSE TEXTURE: an inviting close-up of food, fabric, skin, plant, or steam in warm daylight — feels touchable, not clinical

Examples of headline-to-image translation:
- "MAGNESIUM IS YOUR BRAIN'S OFF SWITCH" → a hand setting a glass of water and a single supplement on a linen-draped bedside table, warm bedside lamp + soft window dawn, partial blanket in frame
- "YOU'RE WIRED BUT TIRED" → over-the-shoulder of a person at a sunlit kitchen counter with a steaming mug, morning daylight, soft focus on the back of their robe
- "ADENOSINE IS DROWNING YOUR BRAIN" → a slow morning pour of water from a ceramic carafe into a glass on a wooden counter, late-morning daylight, condensation, calm hand

Rules (hard):
- People are encouraged: hands, partial faces, silhouettes, over-the-shoulder, back-of-head — natural and unposed. No full studio portraits. No direct eye contact with camera.
- Warm natural daylight is the default. Absolutely no chiaroscuro, no dark blue palette, no cinematic shadow, no surreal juxtaposition.
- Soft, real, human, approachable; never editorial, never moody.
- No text, no logos, no fake supplement labels or branded mockups.
- Max 55 words per prompt.
- Output ONLY a JSON array with exactly 3 strings — no explanation, no labels, no markdown.
- Format: ["prompt one here","prompt two here","prompt three here"]`;

    const systemPrompt = moodId === "lifestyle-health" ? LIFESTYLE_SYSTEM_PROMPT : EDITORIAL_SYSTEM_PROMPT;

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
