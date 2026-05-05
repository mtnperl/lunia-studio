import { z } from "zod";
import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { findAngle } from "@/lib/angleLibrary";
import { clientIp, logEntry, logExit } from "@/lib/ugc-api";

const bodySchema = z.object({
  angle: z.string().min(1).max(60),
  creatorNotes: z.string().max(1000).optional(),
  extraNotes: z.string().max(1000).optional(),
});

const SYSTEM_PROMPT = `You are a UGC concept strategist for Lunia Life, a hormone-support supplement brand targeting women 35–60.

Given an angle and optional creator notes, generate one fresh concept seed — a short creative brief for a single UGC video.

Rules:
- Video hook: 1–2 sentences. On-camera opening line. Specific and visual.
- Text hook: 1 line. Caption/text overlay. Different hook from the video.
- Narrative arc: 2–4 sentences. Outline the story arc — symptom, mechanism, outcome. Specific numbers preferred.
- Label: short concept name, 3–6 words.

Return strict JSON only (no markdown fence, no explanation):
{
  "label": "string",
  "videoHook": "string",
  "textHook": "string",
  "narrativeArc": "string"
}`;

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/generate-concept", "generate");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/generate-concept", "generate", start, 429);
    return Response.json({ error: "Rate limit exceeded. Try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/generate-concept", "generate", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }

    const { angle, creatorNotes, extraNotes } = parsed.data;

    const angleObj = findAngle(angle);
    if (!angleObj) {
      logExit("/api/ugc/generate-concept", "generate", start, 400);
      return Response.json({ error: `Unknown angle: ${angle}` }, { status: 400 });
    }

    const userPrompt = [
      `Angle: ${angleObj.label} — ${angleObj.description}`,
      creatorNotes ? `Creator notes: ${creatorNotes}` : null,
      extraNotes ? `Extra notes: ${extraNotes}` : null,
      `\nGenerate one fresh concept seed that fits this angle and creator.`,
    ]
      .filter(Boolean)
      .join("\n");

    const message = await createContentMessage({
      model: "claude-opus-4-7",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    let concept: { label: string; videoHook: string; textHook: string; narrativeArc: string };
    try {
      concept = JSON.parse(raw);
    } catch {
      logExit("/api/ugc/generate-concept", "generate", start, 502);
      return Response.json({ error: "Model returned malformed JSON", raw }, { status: 502 });
    }

    logExit("/api/ugc/generate-concept", "generate", start, 200);
    return Response.json({ concept });
  } catch (err) {
    console.error("[api/ugc/generate-concept] POST", err);
    logExit("/api/ugc/generate-concept", "generate", start, 500);
    return Response.json({ error: "Concept generation failed" }, { status: 500 });
  }
}
