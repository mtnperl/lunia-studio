import { saveSubjects } from "@/lib/kv";
import { DEFAULT_SUBJECTS } from "@/lib/default-subjects";

export async function POST() {
  await saveSubjects(DEFAULT_SUBJECTS);
  return Response.json({ ok: true, count: DEFAULT_SUBJECTS.length });
}
