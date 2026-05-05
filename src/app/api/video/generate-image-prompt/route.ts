import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { VideoAdSceneType } from "@/lib/types";

export const maxDuration = 30;

const SCENE_CONTEXT: Record<VideoAdSceneType, string> = {
  hook: "Bold opening — emotionally resonant attention grab. Dramatic, aspirational, visceral.",
  science: "Sleep science or ingredient fact. Clean, clinical but elevated. Minimal, data-forward.",
  product: "Product showcase. Luxurious, premium lifestyle. Focus on aspiration, not the supplement itself.",
  proof: "Social proof / trust signal. Warm, human, credible. Community and reliability.",
  cta: "Call to action — final impression. Energizing, inviting, brand-defining moment.",
};

const IMAGE_STYLE_INSTRUCTIONS: Record<string, string> = {
  realistic: `You write Recraft V3 (realistic_image) image generation prompts for Lunia Life video ads.
Brand palette: dark navy blues (#102635, #2c3f51), with cyan (#bffbf8) and cream (#F7F4EF) accents.
Rules:
- No people, no faces, no body parts, no text, no logos
- Ultra-sharp editorial photography, premium wellness brand
- Minimalist composition, dark navy tones, cinematic mood
- Max 60 words
- Output ONLY the prompt — no quotes, no explanation`,
  cartoon: `You write Recraft V3 (digital_illustration) image generation prompts for Lunia Life video ads.
Brand palette: dark navy blues with cyan (#bffbf8) and cream (#F7F4EF) accents.
Rules:
- Bold digital illustration style, expressive and colorful
- No text, no logos, no recognizable faces
- Use the brand's navy/cyan palette but in an illustrated, painterly way
- Concept-driven composition — illustrate the idea, not the product
- Max 60 words
- Output ONLY the prompt — no quotes, no explanation`,
  anime: `You write Recraft V3 (digital_illustration/anime) image generation prompts for Lunia Life video ads.
Brand palette: dark navy blues with cyan (#bffbf8) and cream (#F7F4EF) accents.
Rules:
- Clean anime-inspired cel-shaded illustration style
- No text, no logos
- Atmospheric, dreamlike quality fitting the sleep/wellness brand
- Soft glows, star fields, moonlit scenes work well
- Max 60 words
- Output ONLY the prompt — no quotes, no explanation`,
  vector: `You write Recraft V3 (vector_illustration) image generation prompts for Lunia Life video ads.
Brand palette: dark navy blues with cyan (#bffbf8) and cream (#F7F4EF) accents.
Rules:
- Flat vector illustration style, clean geometric shapes
- No text, no logos
- Minimal, modern, premium design aesthetic
- Bold shapes, clear visual hierarchy, limited color palette
- Max 60 words
- Output ONLY the prompt — no quotes, no explanation`,
};

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) return Response.json({ error: "Too many requests." }, { status: 429 });

  try {
    const body = await req.json();
    const topic: string = body.topic ?? "";
    const sceneType: VideoAdSceneType = body.sceneType;
    const headline: string = body.headline ?? "";
    const currentPrompt: string = body.currentPrompt ?? "";
    const imageStyle: string = body.imageStyle ?? "realistic";

    const systemPrompt = (IMAGE_STYLE_INSTRUCTIONS[imageStyle] ?? IMAGE_STYLE_INSTRUCTIONS.realistic)
      + (currentPrompt ? "\n- This is a regeneration — produce a distinctly different visual direction" : "");

    const msg = await createContentMessage({
      model: "claude-sonnet-4-5",
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Scene: ${sceneType} — ${SCENE_CONTEXT[sceneType]}
Topic: "${topic}"
Headline: "${headline}"${currentPrompt ? `\nCurrent prompt (make the new one very different):\n"${currentPrompt}"` : ""}

Write one Recraft V3 image prompt for this scene.`,
        },
      ],
    });

    const prompt = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!prompt) return Response.json({ error: "Failed to generate prompt" }, { status: 500 });

    return Response.json({ prompt });
  } catch (err) {
    console.error("[api/video/generate-image-prompt]", err);
    return Response.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}
