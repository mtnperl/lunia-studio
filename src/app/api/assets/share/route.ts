import { nanoid } from "nanoid";
import { getAssetShares, saveAssetShare, deleteAssetShare, type AssetShare } from "@/lib/kv";
import { ASSET_TYPES } from "@/lib/asset-shelves";

function parseType(v: unknown): AssetShare["assetType"] | null {
  return ASSET_TYPES.some((t) => t.value === v) ? (v as AssetShare["assetType"]) : null;
}

/** Active share links, one per shelf at most. */
export async function GET(): Promise<Response> {
  try {
    return Response.json(await getAssetShares());
  } catch (err) {
    console.error("[api/assets/share] GET", err);
    return Response.json({ error: "Failed to load share links" }, { status: 500 });
  }
}

/** Create (or return the existing) share link for a shelf. */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { assetType?: unknown };
  const assetType = parseType(body.assetType);
  if (!assetType) return Response.json({ error: "Unknown shelf" }, { status: 400 });
  try {
    const existing = (await getAssetShares()).find((s) => s.assetType === assetType);
    if (existing) return Response.json(existing);
    const share: AssetShare = { token: nanoid(21), assetType, createdAt: new Date().toISOString() };
    await saveAssetShare(share);
    return Response.json(share);
  } catch (err) {
    console.error("[api/assets/share] POST", err);
    return Response.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

/** Revoke a shelf's link. The old URL stops working immediately. */
export async function DELETE(req: Request): Promise<Response> {
  const assetType = parseType(new URL(req.url).searchParams.get("assetType"));
  if (!assetType) return Response.json({ error: "Unknown shelf" }, { status: 400 });
  try {
    await deleteAssetShare(assetType);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/assets/share] DELETE", err);
    return Response.json({ error: "Failed to revoke share link" }, { status: 500 });
  }
}
