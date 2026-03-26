import { anthropic } from "@/lib/anthropic";
export async function POST(req: Request) {
  try {
    const { body: slideBody } = await req.json();
    if (!slideBody) return Response.json({ error: "body required" }, { status: 400 });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: `Shorten this carousel slide body text to 1-2 punchy sentences (max 30 words total). Keep the single most important insight and any specific stat or number. Remove all filler, secondary claims, and caveats. Return ONLY the shortened text, no quotes, no explanation.\n\nOriginal: "${slideBody}"` }],
    });
    const shortened = msg.content[0].type === "text" ? msg.content[0].text.trim() : slideBody;
    return Response.json({ body: shortened });
  } catch (err) {
    console.error("[shorten-slide]", err);
    return Response.json({ error: "Failed to shorten" }, { status: 500 });
  }
}
