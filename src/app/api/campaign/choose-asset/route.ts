// Pick an existing library image for one email block, instead of generating.
//
// The counterpart to regenerate-prompt: that route writes a prompt so a
// picture can be made, this one decides that a picture you already own will
// do. Same tier chooser, same focus/context split, so a block's model setting
// governs both — see MODEL_TIERS below for why a tier and not a model id.
//
// Deliberately allowed to answer "none of these". A library of forty photos
// will not cover every block, and a forced pick — the nearest bedroom for a
// block about shipping — is worse than no pick at all, because it looks
// deliberate. The empty answer is a feature; the UI reports it and leaves the
// block alone.
import {
  createContentMessage, extractText, DRAFT_MAX_TOKENS_SHORT,
  CRAFT_MODEL, DRAFT_MODEL, CONTENT_MODEL,
} from "@/lib/anthropic";
import { getAssets, checkRateLimit } from "@/lib/kv";
import { shortlistByOverlap } from "@/lib/asset-shortlist";
import type { AssetMetadata } from "@/lib/types";

export const maxDuration = 60;

/** Tier -> model, mirroring regenerate-prompt. The client sends a TIER, never
 *  a model id: ids move, and the tier a block was set to is stored in a
 *  campaign blob that has no migration path. */
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

/** Assets that must never be offered for an email body image.
 *
 *  `logo` is excluded on a standing brand rule — the Lunia logo does not go
 *  inside an email body — and letting the model choose one would route around
 *  that rule by accident. `carousel-style` is excluded because those are
 *  layout references for generation, not photographs anybody wants to look
 *  at. Everything else, uploaded or auto-registered, is fair game. */
const EXCLUDED_TYPES = new Set(["logo", "carousel-style"]);

/** Candidates the model can actually reason about. An asset with no
 *  description is passed over rather than offered on its filename alone:
 *  choosing IMG_4821.jpg on the strength of its name is a coin toss dressed
 *  up as a decision. Run the backfill to bring older assets back in. */
function candidates(assets: AssetMetadata[]): AssetMetadata[] {
  return assets.filter(
    (a) => !EXCLUDED_TYPES.has(a.assetType) && (a.description ?? "").trim().length > 0,
  );
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "choose-asset");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const topic: string = (body.topic ?? "").slice(0, 400);
    const emailContext: string = (body.emailContext ?? "").slice(0, 1200);
    const focus: string = (body.focus ?? "").slice(0, 600);
    const userInstructions: string = (body.instructions ?? "").slice(0, 600).trim();
    const model = resolveModel(body.model);

    // Shortlisted before the prompt is built: see asset-shortlist for why a
    // library of a few thousand images cannot all go in. A small library is
    // returned untouched, so today this is a no-op.
    const all = candidates(await getAssets());
    const pool = shortlistByOverlap(all, (a) => a.description ?? "", `${focus} ${emailContext} ${topic}`);
    if (pool.length === 0) {
      return Response.json({
        url: null,
        reason: "No described images in the library yet. Upload some, or run the description backfill over the ones already there.",
      });
    }

    // Numbered rather than keyed by id: a short integer is far harder for a
    // model to corrupt than a UUID, and the mapping back is ours to do.
    const list = pool
      .map((a, i) => `${i + 1}. ${a.description}${a.assetType === "product-image" ? " [product shot]" : ""}`)
      .join("\n");

    const brief = focus
      ? `The image sits beside ONE specific piece of copy, and must depict what THAT copy is about:\n\n${focus}\n\nWider email, for context only:\n${emailContext || topic || "better sleep, calm nights"}`
      : `The image must suit the theme and feeling of this email:\n\n${emailContext || topic || "better sleep, calm nights"}`;

    const message = await createContentMessage({
      model,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      system: `You choose one photograph from a library for a block of copy in a marketing email for Lunia Life, a sleep-wellness brand.

You are given numbered descriptions of every image available and the copy the picture will sit beside. Pick the ONE image that genuinely depicts what that copy is about.

The standard is fit, not vague compatibility. A calm bedroom is not the right answer for copy about shipping, ingredients, or a customer's morning walk — it is merely the brand's default mood, and picking it because nothing better exists is the failure this task is meant to avoid.

If no image in the list genuinely fits, say so. Answering 0 is a correct and expected outcome, not a failure — a wrong picture that looks deliberate is worse than no picture.

Never pick an image whose description mentions visible text, a logo, or packaging unless the copy is specifically about the product itself.

Reply as JSON and nothing else:
{"choice": <number, or 0 if none fit>, "reason": "<one short sentence, max 20 words>"}`,
      messages: [
        {
          role: "user",
          content: `${brief}

${userInstructions ? `Standing instructions from the user, which outrank your own judgement where they conflict:\n${userInstructions}\n\n` : ""}Available images:
${list}

Reply with the JSON object only.`,
        },
      ],
    });

    const text = extractText(message).trim();
    // Tolerate a fenced block or a stray sentence around the object — the
    // draft tier in particular likes to introduce its answer.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ error: "The model did not return a choice" }, { status: 502 });
    }

    let parsed: { choice?: unknown; reason?: unknown };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return Response.json({ error: "The model's choice was not valid JSON" }, { status: 502 });
    }

    const choice = Number(parsed.choice);
    const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "";

    // 0 is the documented "nothing fits" answer; anything outside the list is
    // a hallucinated index and gets the same treatment rather than an
    // arbitrary neighbour.
    if (!Number.isInteger(choice) || choice < 1 || choice > pool.length) {
      return Response.json({ url: null, reason: reason || "Nothing in the library fits this block." });
    }

    const picked = pool[choice - 1]!;
    return Response.json({
      url: picked.url,
      id: picked.id,
      name: picked.name,
      description: picked.description,
      reason,
      consideredCount: pool.length,
      libraryCount: all.length,
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    console.error("[api/campaign/choose-asset]", messageText);
    return Response.json({ error: "Could not choose an image" }, { status: 500 });
  }
}
