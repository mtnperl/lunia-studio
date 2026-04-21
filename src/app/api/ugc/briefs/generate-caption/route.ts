import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { postProcess } from "@/lib/compliance";
import { clientIp, incrComplianceMetric, logEntry, logExit } from "@/lib/ugc-api";
import type { BriefComplianceFlag } from "@/lib/types";

const bodySchema = z.object({
  script: z.object({
    videoHook: z.string().max(1000).default(""),
    textHook: z.string().max(500).default(""),
    narrative: z.string().max(8000).default(""),
    cta: z.string().max(500).default(""),
  }),
  title: z.string().max(200).optional(),
  angle: z.string().max(120).optional(),
  conceptLabel: z.string().max(200).optional(),
});

const FOLLOW_LINE = "For more sleep science content follow lunialife";

const SYSTEM_PROMPT = `You write Instagram/TikTok captions for Lunia Life, a melatonin-free sleep supplement brand.

Voice rules (hard):
- NEVER use em dashes. Use commas, periods, or "..." instead.
- NEVER use "X is not Y, it's Z" structure.
- Product mention comes late, never in the first sentence.
- No "cures", "treats", "prevents", "diagnoses". Use "supports", "may help", "shown in studies to".
- No "click the link", "use my code", "game changer", "holy grail", "obsessed".
- Max one exclamation mark in the whole caption.
- 2 to 5 short sentences. Conversational. First-person is fine.
- No hashtags inside the caption body.
- END the caption with exactly this line, on its own line, no quotes: ${FOLLOW_LINE}

Output only the caption text. No labels, no explanation, no markdown.`;

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/briefs/generate-caption", "generate");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/briefs/generate-caption", "generate", start, 429);
    return Response.json(
      { error: "Too many caption generations. Try again in an hour." },
      { status: 429 },
    );
  }
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs/generate-caption", "generate", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const { script, title, angle, conceptLabel } = parsed.data;

    const userPrompt = `Write a social caption for this Lunia Life UGC post.
${title ? `Title: ${title}` : ""}
${angle ? `Angle: ${angle}` : ""}
${conceptLabel ? `Concept: ${conceptLabel}` : ""}

SCRIPT:
Video hook: ${script.videoHook}
Text hook: ${script.textHook}
Narrative: ${script.narrative}
CTA: ${script.cta}

Return the caption only. Remember to end with the follow line exactly.`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const caption = ensureFollowLine(raw);
    const { cleaned, result } = postProcess(caption);

    const flags: BriefComplianceFlag[] = result.violations.map((v) => ({
      severity: v.severity,
      rule: v.rule,
      match: v.match,
    }));
    const worstLevel = flags.some((f) => f.severity === "red")
      ? "red"
      : flags.length > 0
        ? "amber"
        : "green";
    await incrComplianceMetric(worstLevel);

    logExit("/api/ugc/briefs/generate-caption", "generate", start, 200, {
      level: worstLevel,
      flagCount: flags.length,
    });
    return Response.json({ caption: cleaned, flags });
  } catch (err) {
    console.error("[api/ugc/briefs/generate-caption] POST", err);
    logExit("/api/ugc/briefs/generate-caption", "generate", start, 500);
    return Response.json({ error: "Caption generation failed" }, { status: 500 });
  }
}

function ensureFollowLine(text: string): string {
  const trimmed = text.replace(/\s+$/g, "");
  if (trimmed.toLowerCase().endsWith(FOLLOW_LINE.toLowerCase())) return trimmed;
  return `${trimmed}\n\n${FOLLOW_LINE}`;
}
