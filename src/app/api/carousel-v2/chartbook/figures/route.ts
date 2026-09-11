import { proposeChartbookFigures } from "@/lib/chartbook-pipeline";
import { describeGenerateError, rateLimitedResponse } from "@/lib/generate-route-utils";

// Stage one of the chartbook: the numbers and the source, for the editor to
// confirm. The research is the slow part; the same ceiling as a full deck.
export const maxDuration = 800;

export async function POST(req: Request) {
  const limited = await rateLimitedResponse(req);
  if (limited) return limited;
  try {
    const body = await req.json();
    const topic: string = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) return Response.json({ error: "Topic required" }, { status: 400 });
    if (topic.length > 500) return Response.json({ error: "Topic too long (max 500 characters)" }, { status: 400 });
    const count = Math.max(1, Math.min(3, Number(body.count) || 3));
    const figures = await proposeChartbookFigures(topic, count);
    if (figures.length === 0) return Response.json({ error: "No usable figures returned. Try again." }, { status: 500 });
    return Response.json({ figures });
  } catch (err) {
    console.error("[chartbook/figures] failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: describeGenerateError(err, "chartbook figures") }, { status: 500 });
  }
}
