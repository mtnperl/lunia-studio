import { reframeSubject } from "@/lib/subject-reframe";
import { isSubjectFormat } from "@/lib/subject-fit";
import { describeGenerateError, rateLimitedResponse } from "@/lib/generate-route-utils";

// Rewrite a subject for a frozen format before generation. Draft tier: the
// answer is three topic lines, not research.
export const maxDuration = 60;

export async function POST(req: Request) {
  const limited = await rateLimitedResponse(req);
  if (limited) return limited;
  try {
    const body = await req.json();
    const topic: string = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) return Response.json({ error: "Topic required" }, { status: 400 });
    if (topic.length > 500) return Response.json({ error: "Topic too long (max 500 characters)" }, { status: 400 });
    if (!isSubjectFormat(body.format)) return Response.json({ error: "format must be did_you_know, chartbook or primer" }, { status: 400 });
    const category = typeof body.category === "string" ? body.category : undefined;
    const proposals = await reframeSubject(topic, body.format, category);
    if (proposals.length === 0) return Response.json({ error: "No usable rewrites returned. Try again." }, { status: 500 });
    return Response.json({ proposals });
  } catch (err) {
    console.error("[subjects/reframe] failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: describeGenerateError(err, "subject reframe") }, { status: 500 });
  }
}
