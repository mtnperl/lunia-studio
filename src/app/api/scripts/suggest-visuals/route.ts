import { anthropic } from "@/lib/anthropic";

export async function POST(req: Request) {
  try {
    const { line, lineIndex, scriptLines, hook } = await req.json() as {
      line: string;
      lineIndex: number;
      scriptLines: string[];
      hook: string;
    };

    const scriptContext = scriptLines
      .filter((l: string) => !/^\[(HOOK|BODY|CTA)\]$/.test(l))
      .slice(0, 8)
      .join("\n");

    const prompt = `You are a video production director for a health/wellness brand (Lunia Life — sleep supplements).

Script context:
Hook: "${hook}"
Script excerpt:
${scriptContext}

Target line (line ${lineIndex + 1}):
"${line}"

Suggest production details for this specific line. Be specific and visual. Keep each field to 1 short sentence.

Respond with ONLY this JSON (no markdown, no explanation):
{
  "setting": "...",
  "energy": "...",
  "broll": "..."
}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";
    const json = JSON.parse(text);

    return Response.json({ setting: json.setting ?? "", energy: json.energy ?? "", broll: json.broll ?? "" });
  } catch (err) {
    console.error("[api/scripts/suggest-visuals]", err);
    return Response.json({ error: "Failed to suggest visuals" }, { status: 500 });
  }
}
