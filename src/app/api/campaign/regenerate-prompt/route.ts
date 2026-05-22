import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

/** Writes one fresh gpt-image-2 prompt for a campaign image slot. Lifestyle
 *  scene only — text / logo / bottle are excluded so the result stays sharp. */
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
    const topic: string = (body.topic ?? "").slice(0, 400);
    const role: string = body.role === "hero" ? "hero" : "secondary";
    const currentPrompt: string = (body.currentPrompt ?? "").slice(0, 600);

    const instructions = `You write a single image-generation prompt for a Lunia Life sleep-wellness marketing email.

Rules:
- Describe ONE photorealistic lifestyle / atmosphere scene — a calm bedroom, soft morning or evening light, someone resting, restful domestic detail.
- Absolutely NO text, words, signage, logos, product packaging, or supplement bottles in the scene.
- Warm, calm, premium DTC-wellness mood. Natural light. Editorial.
- Two or three vivid sentences: scene, light, palette, mood.
- ${role === "hero" ? "This is the hero image — make it the strongest, most evocative scene." : "This is a secondary supporting image — a smaller calm detail or moment."}
${currentPrompt ? `- Write something clearly DIFFERENT from the current prompt below.` : ""}

Email topic / angle: ${topic || "better sleep, calm nights"}
${currentPrompt ? `Current prompt: ${currentPrompt}` : ""}

Output ONLY the new prompt text — no quotes, no preamble, no explanation.`;

    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      messages: [{ role: "user", content: instructions }],
    });

    const prompt = extractText(msg).trim().replace(/^["']|["']$/g, "").trim();
    if (!prompt) {
      return Response.json({ error: "Could not write a prompt — try again." }, { status: 422 });
    }
    return Response.json({ prompt });
  } catch (err) {
    console.error("[api/campaign/regenerate-prompt]", err);
    return Response.json({ error: "Prompt generation failed" }, { status: 500 });
  }
}
