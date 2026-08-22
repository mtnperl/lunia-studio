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
    // The actual email copy (subject + promo + body blocks) so the scene
    // reflects THIS email's message, not a generic stock bedroom.
    const emailContext: string = (body.emailContext ?? "").slice(0, 1200);
    // The copy of the ONE block this image sits beside. When present it
    // outranks the email-wide context: an image next to "we publish research
    // on Instagram" should show a phone, not the brand's default bedroom.
    const focus: string = (body.focus ?? "").slice(0, 600);

    const instructions = `You write a single image-generation prompt for ONE image in a Lunia Life (sleep-wellness DTC) marketing email.

${focus
  ? `This image sits beside ONE specific piece of copy. The picture must depict what THAT copy is about, not the brand in general.

The copy it sits beside:
${focus}

Wider email, for context only:
${emailContext || topic || "better sleep, calm nights"}

The most common mistake is answering with the brand's default imagery — a calm bedroom, someone asleep, a warm mug — regardless of what the copy says. Only choose those if the copy above is genuinely about sleeping or winding down. Copy about social media gets a screen; copy about a walk gets that walk; copy about testing gets a lab bench; copy about ingredients gets the raw botanicals.`
  : `The image must visually express the THEME and FEELING of THIS specific email — the moment, benefit, or mood its copy evokes — NOT a generic stock scene. Read the email content below and pick the lifestyle / atmosphere scene an art director would actually pair with it.

Email content:
${emailContext || topic || "better sleep, calm nights"}`}

Rules:
- ONE photorealistic lifestyle / atmosphere scene that clearly RELATES to the copy above (a moment, benefit, or feeling it describes). Real people, spaces, and light — editorial, premium DTC-wellness mood.
- Absolutely NO text, words, signage, logos, product packaging, or supplement bottles in the scene.
- Two or three vivid sentences: scene, light, palette, mood.
- ${role === "hero" ? "This is the HERO image — the strongest, most evocative scene for the email's core message." : "This is a SECONDARY supporting image — a smaller, complementary moment or detail tied to the content."}
${currentPrompt ? `- Write something clearly DIFFERENT from the current prompt: ${currentPrompt}` : ""}

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
