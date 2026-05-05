import { z } from "zod";
import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { findAngle } from "@/lib/angleLibrary";
import { UGC_SCRIPT_SYSTEM_PROMPT } from "@/lib/ugc-prompts";
import { postProcess } from "@/lib/compliance";
import { clientIp, incrComplianceMetric, logEntry, logExit } from "@/lib/ugc-api";
import type { BriefComplianceFlag } from "@/lib/types";

const scriptSchema = z.object({
  videoHook: z.string().max(1000).default(""),
  textHook: z.string().max(500).default(""),
  narrative: z.string().max(8000).default(""),
  cta: z.string().max(500).default(""),
});

const bodySchema = z.object({
  field: z.enum(["videoHook", "textHook", "narrative", "cta"]),
  angle: z.string().min(1).max(60),
  conceptLabel: z.string().min(1).max(200),
  title: z.string().max(200).default(""),
  script: scriptSchema,
  extraNotes: z.string().max(2000).optional(),
});

const FIELD_GUIDE: Record<z.infer<typeof bodySchema>["field"], string> = {
  videoHook: "videoHook: the on-camera opening line, 1-2 sentences. Must land in the first 3 seconds. Concrete, specific, character-driven.",
  textHook: "textHook: the text overlay / caption that appears on screen, 1 short line. Tight, scroll-stopping, specific.",
  narrative: "narrative: the main script body, 2-4 short paragraphs separated by \\n\\n. Mechanism-first when it makes sense. Specific numbers over vague claims.",
  cta: "cta: one short closing line. Soft recommendation. No 'click the link', no 'use my code', no hype.",
};

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/briefs/generate-field", "generate");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/briefs/generate-field", "generate", start, 429);
    return Response.json(
      { error: "Too many regenerations. Try again in an hour." },
      { status: 429 },
    );
  }
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs/generate-field", "generate", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const { field, angle, conceptLabel, title, script, extraNotes } = parsed.data;

    const angleObj = findAngle(angle);
    if (!angleObj) {
      logExit("/api/ugc/briefs/generate-field", "generate", start, 400);
      return Response.json({ error: `Unknown angle: ${angle}` }, { status: 400 });
    }

    const contextBlock = [
      `videoHook: ${script.videoHook || "(empty)"}`,
      `textHook: ${script.textHook || "(empty)"}`,
      `narrative: ${script.narrative || "(empty)"}`,
      `cta: ${script.cta || "(empty)"}`,
    ].join("\n");

    const userPrompt = `Regenerate ONE field of an existing Lunia Life UGC script. Keep it coherent with the rest of the script below. Do not rewrite the other fields.

Angle: ${angleObj.label}
Concept: ${conceptLabel}
${title ? `Title: ${title}` : ""}
${extraNotes ? `Extra notes: ${extraNotes}` : ""}

CURRENT SCRIPT:
${contextBlock}

REGENERATE THIS FIELD ONLY:
${FIELD_GUIDE[field]}

Return the new value for this field as a plain string. No JSON, no labels, no quotes around it, no preamble.`;

    const message = await createContentMessage({
      model: "claude-opus-4-7",
      max_tokens: field === "narrative" ? 1200 : 300,
      system: UGC_SCRIPT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const stripped = raw.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
    const { cleaned, result } = postProcess(stripped);

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

    logExit("/api/ugc/briefs/generate-field", "generate", start, 200, {
      field,
      level: worstLevel,
      flagCount: flags.length,
    });
    return Response.json({ value: cleaned, flags });
  } catch (err) {
    console.error("[api/ugc/briefs/generate-field] POST", err);
    logExit("/api/ugc/briefs/generate-field", "generate", start, 500);
    return Response.json({ error: "Field regeneration failed" }, { status: 500 });
  }
}
