import { getSubjects } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  const subjects = await getSubjects();
  return Response.json(subjects, {
    headers: { "Cache-Control": "no-store" },
  });
}
