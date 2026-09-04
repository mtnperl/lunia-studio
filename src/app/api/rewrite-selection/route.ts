import { createContentMessage, extractText, CRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";

export const maxDuration = 120;

/** Rewrite one selected passage. Text in, instruction in, text out. Mirrors
 *  shorten-slide; the caller decides where the result lands. Numbers and
 *  citations are kept verbatim so a rewrite can never introduce a figure. */
export async function POST(req: Request): Promise<Response> {
  try {
    const { text, instruction, context } = (await req.json()) as { text?: string; instruction?: string; context?: string };
    if (!text?.trim()) return Response.json({ error: "text required" }, { status: 400 });
    if (!instruction?.trim()) return Response.json({ error: "instruction required" }, { status: 400 });
    const msg = await createContentMessage({
      model: CRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      messages: [{
        role: "user",
        content: `You edit copy for Lunia Life, a science-backed sleep brand. Calm, plain, editorial voice. No exclamation marks, no em dashes, no hype.

Rewrite ONLY the passage below according to the instruction. Rules:
- Keep every number, unit, study name and citation exactly as written. Never add a figure.
- Keep any [[...]] or {{...}} markers exactly where they are; they are formatting and merge tags.
- Keep the same language and roughly the same length unless the instruction says otherwise.
- Return ONLY the rewritten passage. No quotes, no preface, no explanation.
${context ? `\nContext (do not rewrite this, it is where the passage sits):\n${context.slice(0, 1500)}\n` : ""}
Instruction: ${instruction.trim()}

Passage:
${text}`,
      }],
    });
    const out = extractText(msg).trim();
    if (!out) return Response.json({ error: "Empty result" }, { status: 502 });
    return Response.json({ text: out });
  } catch (err) {
    console.error("[rewrite-selection]", err);
    return Response.json({ error: "Failed to rewrite" }, { status: 500 });
  }
}
