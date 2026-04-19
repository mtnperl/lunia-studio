import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { ANGLE_LIBRARY } from "@/lib/angleLibrary";
import { clientIp, logEntry, logExit } from "@/lib/ugc-api";

const bodySchema = z.object({
  creatorNotes: z.string().min(1).max(1000),
});

const SYSTEM_PROMPT = `You are a UGC content strategist for Lunia Life, a hormone-support supplement brand targeting women 35–60.

Given notes about a creator, select the 2–3 angles that best match their story, audience, or communication style.

Available angles:
${ANGLE_LIBRARY.map((a) => `- ${a.key}: ${a.label} — ${a.description}`).join("\n")}

Return strict JSON only (no markdown fence, no explanation):
{
  "suggestions": [
    { "angleKey": "string", "reason": "1 sentence why this angle fits this creator" },
    { "angleKey": "string", "reason": "1 sentence why this angle fits this creator" }
  ]
}

Order by fit — best match first. Limit to 3 suggestions.`;

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/suggest-angle", "suggest");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/suggest-angle", "suggest", start, 429);
    return Response.json({ error: "Rate limit exceeded. Try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/suggest-angle", "suggest", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }

    const { creatorNotes } = parsed.data;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Creator notes: ${creatorNotes}` }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    let result: { suggestions: { angleKey: string; reason: string }[] };
    try {
      result = JSON.parse(raw);
    } catch {
      logExit("/api/ugc/suggest-angle", "suggest", start, 502);
      return Response.json({ error: "Model returned malformed JSON", raw }, { status: 502 });
    }

    // Validate that suggested angleKeys actually exist
    result.suggestions = result.suggestions.filter((s) =>
      ANGLE_LIBRARY.some((a) => a.key === s.angleKey),
    );

    logExit("/api/ugc/suggest-angle", "suggest", start, 200, { count: result.suggestions.length });
    return Response.json(result);
  } catch (err) {
    console.error("[api/ugc/suggest-angle] POST", err);
    logExit("/api/ugc/suggest-angle", "suggest", start, 500);
    return Response.json({ error: "Angle suggestion failed" }, { status: 500 });
  }
}
