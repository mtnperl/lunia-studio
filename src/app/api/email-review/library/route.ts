import { getFlowReviews } from "@/lib/kv";

export async function GET() {
  try {
    const reviews = await getFlowReviews();
    // Return a lightweight summary so the library page doesn't ship every
    // bodyMarkdown blob in the list response.
    const summary = reviews.map((r) => ({
      id: r.id,
      flowId: r.flow.id,
      flowName: r.flow.flowName,
      flowType: r.flow.flowType,
      source: r.flow.source,
      emailCount: r.flow.emails.length,
      complianceFlagCount: r.sections.reduce((acc, s) => acc + (s.flags?.filter((f) => f.severity === "compliance").length ?? 0), 0),
      imagesReady: r.imagePrompts.filter((p) => p.status === "ready").length,
      imagesTotal: r.imagePrompts.length,
      frameworkVersion: r.frameworkVersion,
      writebacksCount: r.writebacks?.length ?? 0,
      createdAt: r.createdAt,
    }));
    return Response.json({ reviews: summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/library]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
