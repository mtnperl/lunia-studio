import { getSubjects } from "@/lib/kv";
import { researchSubject } from "@/lib/facts-research";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** Research one subject and file the results as pending facts for review. */
export async function POST(req: Request): Promise<Response> {
  try {
    const { subjectId, subjectText: givenText } = await req.json();
    const subjects = await getSubjects();
    const subject = subjects.find((s) => s.id === subjectId) ?? (givenText ? { id: `adhoc-${randomUUID()}`, text: String(givenText) } : null);
    if (!subject) return Response.json({ error: "Pass subjectId or subjectText" }, { status: 400 });
    const r = await researchSubject(subject);
    return Response.json({ ok: true, ...r });
  } catch (err) {
    console.error("[api/facts/research] POST", err);
    return Response.json({ error: err instanceof Error ? err.message : "Research failed" }, { status: 500 });
  }
}
