import {
  createContentMessage, extractText, DRAFT_MAX_TOKENS_SHORT,
  CRAFT_MODEL, DRAFT_MODEL, CONTENT_MODEL,
} from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

/** Tier -> model. The client sends a TIER, never a model id: ids move, and the
 *  tier a block was set to is stored in a campaign blob that has no migration
 *  path. An unknown or absent tier falls back to craft, which is what this
 *  endpoint used before the chooser existed. */
const MODEL_TIERS = {
  draft: DRAFT_MODEL,
  craft: CRAFT_MODEL,
  content: CONTENT_MODEL,
} as const;
type ModelTier = keyof typeof MODEL_TIERS;

function resolveModel(tier: unknown): string {
  return typeof tier === "string" && tier in MODEL_TIERS
    ? MODEL_TIERS[tier as ModelTier]
    : CRAFT_MODEL;
}

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
    // Standing instructions the user set on this block. Capped like every
    // other free-text field here so a paste cannot blow out the request.
    const userInstructions: string = (body.instructions ?? "").slice(0, 600).trim();
    const model = resolveModel(body.model);

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
- ONE lifestyle / atmosphere scene that clearly RELATES to the copy above (a moment, benefit, or feeling it describes). Real people, spaces, and light.
- Absolutely NO text, words, signage, logos, product packaging, or supplement bottles in the scene.
- Two or three sentences: what is happening, the light, the space.

Write it as a photograph somebody TOOK, not as an image to be rendered. That
distinction is the whole job here:
- Describe a specific, ordinary, slightly awkward moment — someone half out of
  frame, mid-gesture, looking away, caught between two things. Not a pose.
- Put real life in the room: worn surfaces, a crumpled sheet, a used mug, cables,
  laundry, the mess of an actual home. An immaculate room reads as a render.
- Light comes from a nameable source and is uneven — one window, one lamp,
  a screen, an overcast sky. Let some of the frame fall dark.
- NEVER use these words. They are the vocabulary of 3D renders and stock, and
  they are what makes an image look AI-generated: photorealistic, hyperrealistic,
  ultra-realistic, 8K, 4K, HDR, ultra-detailed, highly detailed, sharp focus,
  crystal clear, flawless, perfect, pristine, immaculate, stunning, breathtaking,
  masterpiece, award-winning, professional photography, cinematic lighting,
  studio lighting, bokeh, golden hour.
- Do not specify a camera, lens, film stock or grain — that is appended
  afterwards, and saying it twice makes the model over-apply it.
- ${role === "hero" ? "This is the HERO image — the strongest, most evocative scene for the email's core message." : "This is a SECONDARY supporting image — a smaller, complementary moment or detail tied to the content."}
${currentPrompt ? `- Write something clearly DIFFERENT from the current prompt: ${currentPrompt}` : ""}
${userInstructions
  ? `
The user has standing instructions for this image. Follow them wherever they
do not contradict the rules above — the "no text, words, logos or packaging"
rule is the one thing they cannot override, because that constraint exists to
keep the render sharp rather than to express a preference:
${userInstructions}`
  : ""}

Output ONLY the new prompt text — no quotes, no preamble, no explanation.`;

    const msg = await createContentMessage({
      // Defaults a tier above draft deliberately: a weak prompt here buys a
      // weak IMAGE, and the image costs more than the prompt that asked for
      // it. Generic results (a social-media block getting a calm bedroom)
      // were the symptom. The block can raise or lower it per block.
      model,
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
