import { composeChartbook } from "@/lib/chartbook-pipeline";
import { describeGenerateError, rateLimitedResponse } from "@/lib/generate-route-utils";

// Stage two of the chartbook: the editor has confirmed a figure; write the
// cover and caption around it. Cheap and quick next to stage one.
export const maxDuration = 300;

export async function POST(req: Request) {
  const limited = await rateLimitedResponse(req);
  if (limited) return limited;
  try {
    const body = await req.json();
    const topic: string = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) return Response.json({ error: "Topic required" }, { status: 400 });
    if (!body.figure || typeof body.figure !== "object") return Response.json({ error: "Figure required" }, { status: 400 });
    const count = Math.max(1, Math.min(3, Number(body.count) || 3));
    const variants = await composeChartbook(topic, body.figure, count);
    if (variants.length === 0) return Response.json({ error: "No usable variants returned. Try again." }, { status: 500 });
    return Response.json({ variants });
  } catch (err) {
    console.error("[chartbook/compose] failed:", err instanceof Error ? err.message : err);
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("Invalid figure")) return Response.json({ error: message }, { status: 400 });
    return Response.json({ error: describeGenerateError(err, "chartbook writing") }, { status: 500 });
  }
}
