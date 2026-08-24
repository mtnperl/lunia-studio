// One-line captions for library assets, so the model can pick one.
//
// The asset library stores a filename and a MIME type, neither of which tells
// a model anything: asked to choose between IMG_4821.jpg and Untitled-3.png it
// is guessing. So every upload gets described once, at upload, and the caption
// is what `/api/campaign/choose-asset` reasons over from then on. Paid once,
// read forever — which is why this runs on the draft tier and nothing dearer.
//
// Best-effort by construction. Every failure path returns undefined rather
// than throwing: a caption is a nicety, an upload is the user's photo, and
// losing the second to protect the first would be a poor trade.
import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "./anthropic";

/** MIME types the vision API accepts. SVG is uploadable but not describable,
 *  so it is skipped rather than sent and rejected. */
const VISION_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type VisionType = (typeof VISION_TYPES)[number];

function isVisionType(t: string): t is VisionType {
  return (VISION_TYPES as readonly string[]).includes(t);
}

const SYSTEM = `You write one-line catalogue descriptions for a stock library of marketing photography.

Describe what is VISIBLY in the frame so somebody searching the library can find this picture without seeing it: the subject, the setting, the light, the mood, and any dominant colour. Name what a person is doing if there is one.

Rules:
- One sentence, under 30 words, no trailing full stop needed.
- Plain description, never marketing copy. "Woman in a grey robe holding a mug by a rain-streaked window, soft morning light" — not "evokes calm and comfort".
- Say if the shot contains text, a logo, packaging, or a product bottle. That decides where it can be used, so it must never be left out.
- If the image is a flat graphic, icon, or texture rather than a photograph, say so first.
- No preamble. Return the sentence alone.`;

/**
 * Describe one image. Takes the public URL — every caller already has one,
 * since the blob is written before this runs, and the backfill has nothing
 * else to work from.
 *
 * Returns undefined when the type cannot be described, the API key is absent,
 * or the call fails. Callers should treat that as "no caption yet" and carry
 * on; the backfill route will pick it up later.
 */
export async function describeAsset(opts: {
  url: string;
  /** MIME type as recorded on the asset. Non-vision types are skipped. */
  type: string;
  /** Filename, passed as a weak hint — sometimes it genuinely says "logo". */
  name?: string;
}): Promise<string | undefined> {
  if (!isVisionType(opts.type)) return undefined;
  if (!process.env.ANTHROPIC_API_KEY) return undefined;

  try {
    const message = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: opts.url } },
            {
              type: "text",
              text: opts.name
                ? `Describe this image for the library. Filename, as a hint only: ${opts.name}`
                : "Describe this image for the library.",
            },
          ],
        },
      ],
    });
    const text = extractText(message).trim().replace(/^["']|["']$/g, "");
    // A caption long enough to be a paragraph means the model ignored the
    // brief; truncating it would leave a half sentence in the picker, so cap
    // generously and let anything sane through untouched.
    return text ? text.slice(0, 300) : undefined;
  } catch (err) {
    console.warn("[asset-caption]", err instanceof Error ? err.message : String(err));
    return undefined;
  }
}
