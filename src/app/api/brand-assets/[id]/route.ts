import { del } from "@vercel/blob";
import { deleteBrandAsset, getBrandAssetById } from "@/lib/kv";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const asset = await getBrandAssetById(id);
    if (!asset) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    // Best-effort blob delete — don't block KV removal if blob already gone.
    try {
      await del(asset.url);
    } catch (e) {
      console.warn("[api/brand-assets/[id]] blob del warn:", e);
    }
    await deleteBrandAsset(id);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/brand-assets/[id]]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
