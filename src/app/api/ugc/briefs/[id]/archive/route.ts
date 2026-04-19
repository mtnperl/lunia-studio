import { archiveBrief, getBriefs } from "@/lib/kv";
import { logEntry, logExit } from "@/lib/ugc-api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/briefs/[id]/archive", "archive", { briefId: id });
  try {
    const briefs = await getBriefs();
    if (!briefs.find((b) => b.id === id)) {
      logExit("/api/ugc/briefs/[id]/archive", "archive", start, 404, { briefId: id });
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }
    await archiveBrief(id);
    logExit("/api/ugc/briefs/[id]/archive", "archive", start, 200, { briefId: id });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/ugc/briefs/[id]/archive] POST", err);
    logExit("/api/ugc/briefs/[id]/archive", "archive", start, 500, { briefId: id });
    return Response.json({ error: "Archive failed" }, { status: 500 });
  }
}
