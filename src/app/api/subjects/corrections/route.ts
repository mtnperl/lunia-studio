import { getFacts, getSubjects, saveSubjects } from "@/lib/kv";
import { createContentMessage, extractText, DRAFT_MODEL } from "@/lib/anthropic";
import {
  planCorrections,
  applyCorrections,
  correctedSubjects,
  correctionsAsText,
  revertCorrection,
  condensePrompt,
  parseCondensed,
  type SubjectCorrection,
} from "@/lib/subject-corrections";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET: the subjects whose line has been corrected, and how many are waiting.
 *  This is the list to review: what the library said, what it says now. */
export async function GET(): Promise<Response> {
  try {
    const [subjects, facts] = await Promise.all([getSubjects(), getFacts()]);
    const plan = planCorrections(subjects, facts);
    const corrected = correctedSubjects(subjects);
    return Response.json({
      corrected: corrected.map((s) => ({ id: s.id, category: s.category, was: s.priorText, now: s.text, correctedAt: s.correctedAt })),
      pending: plan.ready.length + plan.needsCondensing.length,
      text: correctionsAsText(subjects),
    });
  } catch (err) {
    console.error("[api/subjects/corrections] GET", err);
    return Response.json({ error: "Could not read the corrections" }, { status: 500 });
  }
}

/**
 * POST: correct every subject whose line the research contradicts.
 *
 * Runs as one explicit pass rather than silently on read: this rewrites lines
 * across the content library, and a bulk edit nobody triggered is a bulk edit
 * nobody can account for. The old wording is kept on each subject, so the run
 * is visible in the corrected list and reversible one subject at a time.
 *
 * `dryRun` returns the plan without writing. `limit` caps the condensing
 * calls, which are the only part that costs anything.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limit = Math.min(400, Math.max(1, Number(body?.limit) || 400));

    // Undo one subject, for a correction that read worse than the original.
    if (typeof body?.revert === "string") {
      const subjects = await getSubjects();
      const idx = subjects.findIndex((s) => s.id === body.revert);
      if (idx < 0) return Response.json({ error: "Subject not found" }, { status: 404 });
      const next = [...subjects];
      next[idx] = revertCorrection(subjects[idx]);
      await saveSubjects(next);
      return Response.json({ ok: true, reverted: next[idx].text });
    }

    const [subjects, facts] = await Promise.all([getSubjects(), getFacts()]);
    const plan = planCorrections(subjects, facts);

    // The long ones are research frames, not subject lines, and go through a
    // short draft-tier call to come back as something the library can carry.
    const condensed: SubjectCorrection[] = [];
    const failed: string[] = [];
    const toCondense = plan.needsCondensing.slice(0, Math.max(0, limit - plan.ready.length));
    if (!dryRun) {
      for (const item of toCondense) {
        try {
          const msg = await createContentMessage({
            model: DRAFT_MODEL,
            max_tokens: 200,
            messages: [{ role: "user", content: condensePrompt(item.subject.text, item.correction) }],
          });
          const line = parseCondensed(extractText(msg));
          if (line && line.trim().toLowerCase() !== item.subject.text.trim().toLowerCase()) {
            condensed.push({ subjectId: item.subject.id, from: item.subject.text, to: line, how: "condensed", sources: item.sources });
          } else {
            // A line that came back unusable leaves the subject alone. A
            // mangled subject is worse than an uncorrected one.
            failed.push(item.subject.text);
          }
        } catch {
          failed.push(item.subject.text);
        }
      }
    }

    const corrections = [...plan.ready, ...condensed];
    if (dryRun) {
      return Response.json({
        dryRun: true,
        verbatim: plan.ready.length,
        needsCondensing: plan.needsCondensing.length,
        sample: plan.ready.slice(0, 10),
      });
    }
    if (corrections.length > 0) await saveSubjects(applyCorrections(subjects, corrections));
    console.log(`[subjects/corrections] corrected ${corrections.length} (${plan.ready.length} verbatim, ${condensed.length} condensed), ${failed.length} left alone`);
    return Response.json({
      ok: true,
      corrected: corrections.length,
      verbatim: plan.ready.length,
      condensed: condensed.length,
      skipped: failed.length,
      remaining: Math.max(0, plan.needsCondensing.length - toCondense.length),
    });
  } catch (err) {
    console.error("[api/subjects/corrections] POST", err);
    return Response.json({ error: "Could not correct the subjects" }, { status: 500 });
  }
}
