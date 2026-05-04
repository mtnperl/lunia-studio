import { anthropic, extractText, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_SHORT } from "@/lib/anthropic";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { body: slideBody } = await req.json();
    if (!slideBody) return Response.json({ error: "body required" }, { status: 400 });
    const msg = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: `Shorten this carousel slide body text to 1-2 punchy sentences (max 30 words total). Keep the single most important insight and any specific stat or number. Remove all filler, secondary claims, and caveats. Return ONLY the shortened text, no quotes, no explanation.\n\nOriginal: "${slideBody}"` }],
    });
    const shortened = extractText(msg).trim() || slideBody;
    return Response.json({ body: shortened });
  } catch (err) {
    console.error("[shorten-slide]", err);
    return Response.json({ error: "Failed to shorten" }, { status: 500 });
  }
}
