import { z } from "zod";
import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { findAngle, findConcept } from "@/lib/angleLibrary";
import { buildScriptUserPrompt, UGC_SCRIPT_SYSTEM_PROMPT } from "@/lib/ugc-prompts";
import { postProcess } from "@/lib/compliance";
import { clientIp, incrComplianceMetric, logEntry, logExit } from "@/lib/ugc-api";
import type { BriefScript, BriefComplianceFlag } from "@/lib/types";

const bodySchema = z.object({
  angle: z.string().min(1).max(60),
  conceptId: z.string().max(120).nullable().optional(),
  conceptLabel: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  extraNotes: z.string().max(2000).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/briefs/generate-script", "generate");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/briefs/generate-script", "generate", start, 429);
    return Response.json(
      { error: "Too many script generations. Try again in an hour." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs/generate-script", "generate", start, 400);
      return Response.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { angle, conceptId, conceptLabel, title, extraNotes } = parsed.data;

    const angleObj = findAngle(angle);
    if (!angleObj) {
      logExit("/api/ugc/briefs/generate-script", "generate", start, 400);
      return Response.json({ error: `Unknown angle: ${angle}` }, { status: 400 });
    }

    const concept = conceptId ? findConcept(angle, conceptId) ?? null : null;

    const userPrompt = buildScriptUserPrompt({
      angleLabel: angleObj.label,
      concept,
      conceptLabel,
      title,
      extraNotes,
    });

    const message = await createContentMessage({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      system: UGC_SCRIPT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    let parsed_script: BriefScript;
    try {
      parsed_script = JSON.parse(raw) as BriefScript;
    } catch {
      logExit("/api/ugc/briefs/generate-script", "generate", start, 502);
      return Response.json({ error: "Model returned malformed JSON", raw }, { status: 502 });
    }

    const fields: (keyof BriefScript)[] = ["videoHook", "textHook", "narrative", "cta"];
    const flags: BriefComplianceFlag[] = [];
    const cleanedScript: BriefScript = { ...parsed_script };

    for (const field of fields) {
      const { cleaned, result } = postProcess(parsed_script[field] ?? "");
      cleanedScript[field] = cleaned;
      for (const v of result.violations) {
        flags.push({ severity: v.severity, rule: v.rule, match: v.match });
      }
    }

    const worstLevel = flags.some((f) => f.severity === "red")
      ? "red"
      : flags.length > 0
        ? "amber"
        : "green";
    await incrComplianceMetric(worstLevel);

    logExit("/api/ugc/briefs/generate-script", "generate", start, 200, {
      level: worstLevel,
      flagCount: flags.length,
    });
    return Response.json({ script: cleanedScript, flags });
  } catch (err) {
    console.error("[api/ugc/briefs/generate-script] POST", err);
    logExit("/api/ugc/briefs/generate-script", "generate", start, 500);
    return Response.json({ error: "Script generation failed" }, { status: 500 });
  }
}
