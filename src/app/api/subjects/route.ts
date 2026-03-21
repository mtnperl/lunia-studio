import { getSubjects } from "@/lib/kv";

export async function GET() {
  const subjects = await getSubjects();
  return Response.json(subjects);
}
