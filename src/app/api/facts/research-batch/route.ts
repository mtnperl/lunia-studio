import { getFacts, getSubjects } from "@/lib/kv";
import { coverageOf, getResearchAttempts, researchSubject } from "@/lib/facts-research";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RETRY_AFTER_DAYS = 14;

/** Research the next few subjects that have nothing on file. Runs daily from
 *  Vercel Cron (GET, authorized by CRON_SECRET) and on demand from the Facts
 *  screen (POST, normal session). Sequential, small batches: each subject is
 *  a web-search run of about a minute. */
async function run(limit: number): Promise<Response> {
  const [facts, subjects, attempts] = await Promise.all([getFacts(), getSubjects(), getResearchAttempts()]);
  const cov = coverageOf(facts, subjects);
  const cutoff = Date.now() - RETRY_AFTER_DAYS * 86_400_000;
  const queue = subjects.filter((s) => {
    const c = cov.bySubject[s.id];
    if (c && c.verified + c.pending > 0) return false;
    const last = attempts[s.id];
    return !last || new Date(last).getTime() < cutoff;
  }).slice(0, limit);
  const results: Array<{ subject: string; added?: number; error?: string }> = [];
  for (const s of queue) {
    try { const r = await researchSubject(s); results.push({ subject: s.text, added: r.added }); }
    catch (err) { results.push({ subject: s.text, error: err instanceof Error ? err.message : "failed" }); }
  }
  return Response.json({ ok: true, researched: results, remaining: Math.max(0, subjects.length - cov.covered - queue.length) });
}

export async function GET(req: Request): Promise<Response> {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run(3);
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(5, Math.max(1, Number(body?.limit) || 2));
  return run(limit);
}
