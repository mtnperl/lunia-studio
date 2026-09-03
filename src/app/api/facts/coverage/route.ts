import { getFacts, getSubjects } from "@/lib/kv";
import { coverageOf, getResearchAttempts } from "@/lib/facts-research";

export const dynamic = "force-dynamic";

/** How much of the subject library has facts on file. `?subjectId=` for one. */
export async function GET(req: Request): Promise<Response> {
  try {
    const [facts, subjects, attempts] = await Promise.all([getFacts(), getSubjects(), getResearchAttempts()]);
    const cov = coverageOf(facts, subjects);
    const subjectId = new URL(req.url).searchParams.get("subjectId");
    if (subjectId) return Response.json({ subjectId, ...(cov.bySubject[subjectId] ?? { verified: 0, pending: 0 }), lastResearched: attempts[subjectId] ?? null });
    const unresearched = subjects.filter((s) => (cov.bySubject[s.id]?.verified ?? 0) + (cov.bySubject[s.id]?.pending ?? 0) === 0 && !attempts[s.id]).length;
    return Response.json({ ...cov, unresearched, attempts: Object.keys(attempts).length });
  } catch (err) {
    console.error("[api/facts/coverage] GET", err);
    return Response.json({ error: "Coverage failed" }, { status: 500 });
  }
}
