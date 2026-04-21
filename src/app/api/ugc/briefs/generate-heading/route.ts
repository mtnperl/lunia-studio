import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { clientIp, logEntry, logExit } from "@/lib/ugc-api";

const bodySchema = z.object({
  script: z.object({
    videoHook: z.string().max(1000).default(""),
    textHook: z.string().max(500).default(""),
    narrative: z.string().max(8000).default(""),
    cta: z.string().max(500).default(""),
  }),
  angle: z.string().max(120).optional(),
  conceptLabel: z.string().max(200).optional(),
});

const SYSTEM_PROMPT = `You write short, editorial headings for UGC video briefs at Lunia Life, a sleep supplement brand.

Heading rules (hard):
- 4 to 8 words.
- Title Case (capitalize principal words).
- Describes the angle or point of view, not the outcome or result.
- No emoji.
- No punctuation except apostrophes. No periods, colons, dashes, quotes, question marks, exclamation marks.
- No brand name ("Lunia"). No product names.
- No clickbait. No superlatives ("best", "ultimate", "#1").

Output exactly the heading text. No quotes, no explanation, no trailing punctuation.`;

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/briefs/generate-heading", "generate");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/briefs/generate-heading", "generate", start, 429);
    return Response.json(
      { error: "Too many heading generations. Try again in an hour." },
      { status: 429 },
    );
  }
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs/generate-heading", "generate", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const { script, angle, conceptLabel } = parsed.data;

    const hasContent = [script.videoHook, script.textHook, script.narrative, script.cta]
      .some((s) => s.trim().length > 0);
    if (!hasContent) {
      logExit("/api/ugc/briefs/generate-heading", "generate", start, 400);
      return Response.json(
        { error: "Fill in the script first, then generate a heading." },
        { status: 400 },
      );
    }

    const userPrompt = `Write a heading for this UGC script.
${angle ? `Angle: ${angle}` : ""}
${conceptLabel ? `Concept: ${conceptLabel}` : ""}

SCRIPT:
Video hook: ${script.videoHook}
Text hook: ${script.textHook}
Narrative: ${script.narrative}
CTA: ${script.cta}

Return the heading only.`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 60,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const cleaned = sanitizeHeading(raw);

    logExit("/api/ugc/briefs/generate-heading", "generate", start, 200);
    return Response.json({ heading: cleaned });
  } catch (err) {
    console.error("[api/ugc/briefs/generate-heading] POST", err);
    logExit("/api/ugc/briefs/generate-heading", "generate", start, 500);
    return Response.json({ error: "Heading generation failed" }, { status: 500 });
  }
}

function sanitizeHeading(s: string): string {
  let out = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  // Strip any punctuation the model may have slipped in (keep letters, numbers, spaces, apostrophes).
  out = out.replace(/[^A-Za-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  // Title Case, preserving apostrophes.
  out = out
    .split(" ")
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
  // Clamp to 8 words.
  const parts = out.split(" ").slice(0, 8);
  return parts.join(" ");
}
