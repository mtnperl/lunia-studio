import { anthropic, extractText, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_SHORT } from "@/lib/anthropic";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { hook, lines, persona, angle, format, subjectNotes, instructions } = await req.json() as {
      hook: string;
      lines: string[];
      persona: string;
      angle: string;
      format: string;
      subjectNotes?: string;
      instructions?: string;
    };

    const bodyLines = lines.filter((l) => !/^\[(HOOK|BODY|CTA)\]$/.test(l));
    const scriptPreview = bodyLines.join("\n");

    const briefSection = [
      subjectNotes ? `Subject background: ${subjectNotes}` : "",
      instructions ? `Instructions: ${instructions}` : "",
    ].filter(Boolean).join("\n");

    const prompt = `You are writing a video script continuation for a health/wellness brand (Lunia Life — sleep supplements).

Persona: ${persona}
Format: ${format}
Angle: ${angle}
Hook: "${hook}"
${briefSection ? `\n${briefSection}\n` : ""}
Current script body:
${scriptPreview}

Generate 3–4 additional BODY lines that expand on the existing content. Requirements:
- Flow naturally from the last line above
- Add new supporting points, examples, or evidence (don't repeat what's already said)
- Match the established tone, persona, and pacing
- Each line is 1–2 punchy, conversational sentences
- No filler, no fluff

Respond with ONLY the new lines, one per line. No labels, no numbers, no explanation.`;

    const message = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: prompt }],
    });

    const text = extractText(message).trim();
    const newLines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    return Response.json({ newLines });
  } catch (err) {
    console.error("[api/scripts/expand] POST error:", err);
    return Response.json({ error: "Failed to expand script" }, { status: 500 });
  }
}
