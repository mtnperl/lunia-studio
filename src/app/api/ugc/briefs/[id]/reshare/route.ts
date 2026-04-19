import { nanoid } from "nanoid";
import { getBriefById, saveBrief } from "@/lib/kv";
import { logEntry, logExit } from "@/lib/ugc-api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/briefs/[id]/reshare", "reshare", { briefId: id });
  try {
    const existing = await getBriefById(id);
    if (!existing) {
      logExit("/api/ugc/briefs/[id]/reshare", "reshare", start, 404, { briefId: id });
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }
    const updated = {
      ...existing,
      publicBriefId: nanoid(16),
      revokedAt: null,
      sharedAt: null,
      updatedAt: Date.now(),
    };
    await saveBrief(updated);
    logExit("/api/ugc/briefs/[id]/reshare", "reshare", start, 200, { briefId: id });
    return Response.json(updated);
  } catch (err) {
    console.error("[api/ugc/briefs/[id]/reshare] POST", err);
    logExit("/api/ugc/briefs/[id]/reshare", "reshare", start, 500, { briefId: id });
    return Response.json({ error: "Reshare failed" }, { status: 500 });
  }
}
