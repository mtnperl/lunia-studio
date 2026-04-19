import { getBriefByPublicId } from "@/lib/kv";
import { logEntry, logExit } from "@/lib/ugc-api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> },
): Promise<Response> {
  const { publicId } = await params;
  const start = logEntry("/api/ugc/briefs/share/[publicId]", "read", { publicId });
  try {
    const brief = await getBriefByPublicId(publicId);
    if (!brief) {
      logExit("/api/ugc/briefs/share/[publicId]", "read", start, 404, { publicId });
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }
    if (brief.revokedAt) {
      logExit("/api/ugc/briefs/share/[publicId]", "read", start, 410, { publicId });
      return Response.json({ error: "This brief link has been revoked" }, { status: 410 });
    }
    logExit("/api/ugc/briefs/share/[publicId]", "read", start, 200, { publicId });
    // Omit internal id — only expose what the creator needs
    const { id: _id, publicBriefId: _pub, revokedAt: _rev, ...safe } = brief;
    return Response.json(safe);
  } catch (err) {
    console.error("[api/ugc/briefs/share/[publicId]] GET", err);
    logExit("/api/ugc/briefs/share/[publicId]", "read", start, 500, { publicId });
    return Response.json({ error: "Failed to load brief" }, { status: 500 });
  }
}
