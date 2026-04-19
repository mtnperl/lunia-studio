import { getBriefById, revokeBriefShare } from "@/lib/kv";
import { logEntry, logExit } from "@/lib/ugc-api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/briefs/[id]/revoke", "revoke", { briefId: id });
  try {
    const existing = await getBriefById(id);
    if (!existing) {
      logExit("/api/ugc/briefs/[id]/revoke", "revoke", start, 404, { briefId: id });
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }
    await revokeBriefShare(id);
    logExit("/api/ugc/briefs/[id]/revoke", "revoke", start, 200, { briefId: id });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/ugc/briefs/[id]/revoke] POST", err);
    logExit("/api/ugc/briefs/[id]/revoke", "revoke", start, 500, { briefId: id });
    return Response.json({ error: "Revoke failed" }, { status: 500 });
  }
}
