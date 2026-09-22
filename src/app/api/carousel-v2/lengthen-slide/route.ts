import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";

export const maxDuration = 300;

/**
 * The mirror of /shorten-slide: give a thin slide another sentence.
 *
 * It is capped, and the cap is the point. A slide's text zone is fixed, and
 * when the copy crowds it the infographic is scaled down and then dropped
 * outright (see FitBox). An uncapped "make it longer" is how a deck quietly
 * loses its graphics, so the ceiling here is deliberately close to what a
 * content slide already carries: about 55 words, two or three sentences.
 */
const MAX_WORDS = 55;
const MAX_CHARS = 340;

export async function POST(req: Request) {
  try {
    const { body: slideBody, headline } = await req.json();
    if (!slideBody || typeof slideBody !== "string") {
      return Response.json({ error: "body required" }, { status: 400 });
    }
    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      messages: [
        {
          role: "user",
          content: `Expand this carousel slide body to 2-3 sentences, at most ${MAX_WORDS} words in total.${typeof headline === "string" && headline.trim() ? `\n\nThe slide's headline is "${headline.trim()}" — the body supports it and must not repeat it.` : ""}

Add only what is already implied by the text: the mechanism behind the claim, what it means for the reader, or the condition the claim holds under. Do NOT introduce a new number, study, author, year or finding. If the original carries a figure, keep it exactly as written.

Plain words a tired adult reads on the first pass. Sentence length varies. No em dashes, no exclamation marks, no rhetorical questions, no "not X but Y" reversals.

Return ONLY the expanded text, no quotes, no explanation.

Original: "${slideBody}"`,
        },
      ],
    });
    const raw = extractText(msg).trim().replace(/^["']|["']$/g, "");
    // A model that ignores the cap is not allowed to blow up the layout:
    // fall back to the text we already had rather than shipping an overflow.
    const words = raw.split(/\s+/).filter(Boolean).length;
    const tooLong = words > MAX_WORDS + 10 || raw.length > MAX_CHARS;
    if (!raw || tooLong) {
      if (tooLong) console.warn(`[lengthen-slide] ${words} words / ${raw.length} chars is over the cap; keeping the original`);
      return Response.json({ body: slideBody, unchanged: true });
    }
    return Response.json({ body: raw });
  } catch (err) {
    console.error("[lengthen-slide]", err);
    return Response.json({ error: "Failed to expand" }, { status: 500 });
  }
}
