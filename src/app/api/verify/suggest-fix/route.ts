// Suggested rewrites for a unit that failed verification.
//
// The advantage this has over "regenerate the slide" is evidence. The checker
// already found the sources that contradict the claim and quoted them, so the
// rewrite is written AGAINST that evidence rather than from memory again.
// Regenerating blind is how the wrong claim got written in the first place.
//
// Two rules make the output usable rather than merely correct:
//   1. It must satisfy the carousel's format constraints, or applying the fix
//      breaks the layout — an 11-word headline overflows the slide.
//   2. It must not invent a new citation. If the evidence doesn't support a
//      specific source, the citation comes back empty, same as generation.

import { NextRequest } from "next/server";
import { z } from "zod";
import { anthropic, CONTENT_MODEL } from "@/lib/anthropic";
import { checkRateLimit, getCarouselById } from "@/lib/kv";
import { extractJsonFromToolResponse, describeVerifyError } from "@/lib/verification";
import { getUnitFields } from "@/lib/verification-status";
import { effectiveVerdict } from "@/lib/types";
import type { VerifiedClaim } from "@/lib/types";

export const maxDuration = 120;

const SuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        rationale: z.string().min(1),
        fields: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
      }),
    )
    .min(1),
});

/** Per-unit format rules, mirroring the generator's own constraints. */
function formatRules(unitId: string, concise: boolean): string {
  if (/^hook-/.test(unitId)) {
    return `- headline: UPPERCASE, max 8 words, punchy
- subline: max 10 words, no trailing period
- sourceNote: "Based on [real journal/institution] research, [year]", max 8 words after "Based on". Return "" if the evidence does not support naming a specific real source. An empty sourceNote is CORRECT — never invent one.`;
  }
  if (/^slide-/.test(unitId)) {
    return `- headline: UPPERCASE, max 8 words
- body: ${concise ? "1-2 sentences, 30 words max" : "2-3 sentences, under 60 words"}
- citation: a real paper as "Author FM, et al. Title. Journal. Year;Vol(Issue):Pages", or "" if the evidence does not support a specific citation. An empty citation is CORRECT — never invent one.`;
  }
  if (unitId === "takeaway") {
    return `- headline: UPPERCASE, max 6 words
- points: 2-3 strings, each one line, max 12 words, no trailing period`;
  }
  return `- caption: 3 paragraphs separated by blank lines, closing with "For more Sleep-Science content follow @lunia_life"`;
}

const BRAND_RULES = `- No em dashes anywhere. Use commas or short sentences.
- No drug claims: never cure, treat, prevent, diagnose, heal (in any tense).
- No absolutes: never "guaranteed" or "miracle".
- No banned badges: FDA Approved, Doctor Recommended, Clinically Proven.
- Permitted hedges: "may support", "helps promote", "shown in studies", "associated with".
- Max one exclamation mark. Zero is better.
- Tone: dry, science-forward, minimal, confident. Never motivational or cheesy.`;

export async function POST(req: NextRequest): Promise<Response> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  if (!(await checkRateLimit(ip, "verify"))) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: { id?: string; unitId?: string; concise?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, unitId } = body;
  if (!id || !unitId) return Response.json({ error: "id and unitId are required" }, { status: 400 });

  try {
    const carousel = await getCarouselById(id);
    if (!carousel) return Response.json({ error: "Carousel not found" }, { status: 404 });

    const unit = carousel.verification?.units.find((u) => u.id === unitId);
    if (!unit) return Response.json({ error: "Verify this carousel first" }, { status: 409 });

    const fields = getUnitFields(carousel.content, unitId);
    if (!fields) return Response.json({ error: "That unit no longer exists" }, { status: 404 });

    const problems = unit.claims.filter((c) => effectiveVerdict(c) !== "pass");
    if (problems.length === 0) {
      return Response.json({ error: "Nothing to fix — every claim here checked out." }, { status: 400 });
    }

    const evidence = problems
      .map((c: VerifiedClaim) => {
        const verdict = effectiveVerdict(c);
        const lines = [
          `CLAIM: ${c.text}`,
          `VERDICT: ${verdict === "fail" ? "CONTRADICTED by sources" : "NO SOURCE FOUND"}`,
        ];
        if (c.reasoning) lines.push(`WHY: ${c.reasoning}`);
        if (c.sourceUrl) lines.push(`SOURCE: ${c.sourceUrl}`);
        if (c.supportingQuote) lines.push(`WHAT THE SOURCE ACTUALLY SAYS: "${c.supportingQuote}"`);
        return lines.join("\n");
      })
      .join("\n\n");

    const msg = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 2_500,
      system: `You repair one unit of a Lunia Life sleep-supplement carousel that failed fact-checking.

You are given the unit's current field values and the checker's findings, including what the sources ACTUALLY say. Rewrite the unit so every claim is defensible against that evidence.

RULES:
- Fix the claim, keep the punch. A true statement written flatly is a failure of the job. Find the version that is both accurate and sharp.
- Prefer a hedged TRUE statement over a crisp FALSE one. "Cortisol climbs through the second half of the night" beats "cortisol peaks at 3am" if the latter is wrong.
- Where a source gives a real number, use THAT number.
- Never invent a citation or a source. If the evidence doesn't support naming one, return "" for that field. An empty citation is correct and expected.
- Change only what the evidence requires. Do not rewrite lines that were already fine.

FORMAT (hard, the layout breaks otherwise):
${formatRules(unitId, body.concise !== false)}

BRAND:
${BRAND_RULES}

Return ONLY JSON, no fence, no commentary. Give 2 options: the first minimal (smallest change that makes it true), the second a stronger rewrite if the claim needs restructuring.
{"suggestions":[{"rationale":"one line on what changed and why","fields":{${Object.keys(fields).map((k) => `"${k}":"..."`).join(",")}}}]}`,
      messages: [
        {
          role: "user",
          content: `UNIT: ${unit.label} (${unit.kind})

CURRENT VALUES:
${JSON.stringify(fields, null, 2)}

CHECKER FINDINGS:
${evidence}`,
        },
      ],
    });

    const parsed = SuggestionSchema.safeParse(extractJsonFromToolResponse(msg));
    if (!parsed.success) {
      return Response.json({ error: "Could not draft a fix — try again." }, { status: 502 });
    }

    // Only return keys the unit actually has. Prevents a stray field from the
    // model reaching applyUnitFields, and keeps the diff view honest.
    const allowed = new Set(Object.keys(fields));
    const suggestions = parsed.data.suggestions.map((s) => ({
      rationale: s.rationale,
      fields: Object.fromEntries(Object.entries(s.fields).filter(([k]) => allowed.has(k))),
    }));

    return Response.json({ suggestions, current: fields });
  } catch (err) {
    console.error("[api/verify/suggest-fix]", err);
    return Response.json({ error: describeVerifyError(err) }, { status: 500 });
  }
}
