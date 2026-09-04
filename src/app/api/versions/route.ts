import { getVersion, listVersions, nameVersion, recordVersion, type VersionKind } from "@/lib/versions";
import { saveCarousel, saveCampaignEmail } from "@/lib/kv";
import type { SavedCarousel, SavedCampaign } from "@/lib/types";

export const dynamic = "force-dynamic";

function kindOf(v: unknown): VersionKind | null {
  return v === "carousel" || v === "email" ? v : null;
}

/** GET ?kind=carousel|email&id=<documentId>: the version list, newest first, without snapshots. */
export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const kind = kindOf(u.searchParams.get("kind")); const id = u.searchParams.get("id");
  if (!kind || !id) return Response.json({ error: "kind and id required" }, { status: 400 });
  try { return Response.json(await listVersions(kind, id)); }
  catch (err) { console.error("[api/versions] GET", err); return Response.json({ error: "Failed to load versions" }, { status: 500 }); }
}

/** POST { kind, id, versionId, action: "restore" | "name", name? } */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const kind = kindOf(body.kind); const id = String(body.id ?? ""); const versionId = String(body.versionId ?? "");
    if (!kind || !id || !versionId) return Response.json({ error: "kind, id and versionId required" }, { status: 400 });
    if (body.action === "name") {
      const ok = await nameVersion(kind, id, versionId, String(body.name ?? ""));
      return ok ? Response.json({ ok: true }) : Response.json({ error: "Version not found" }, { status: 404 });
    }
    if (body.action === "restore") {
      const v = await getVersion(kind, id, versionId);
      if (!v) return Response.json({ error: "Version not found" }, { status: 404 });
      // Restoring writes the snapshot back as the live document, under the
      // same id, and records that as a new version so nothing is lost.
      if (kind === "carousel") { const snap = { ...(v.snapshot as SavedCarousel), id }; await saveCarousel(snap); await recordVersion(kind, id, snap); }
      else { const snap = { ...(v.snapshot as SavedCampaign), id }; await saveCampaignEmail(snap); await recordVersion(kind, id, snap); }
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[api/versions] POST", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
