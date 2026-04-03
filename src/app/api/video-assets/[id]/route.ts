import { getVideoAssets, deleteVideoAsset } from "@/lib/kv";
import { del } from "@vercel/blob";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assets = await getVideoAssets();
    const asset = assets.find((a) => a.id === id);
    if (!asset) {
      return Response.json({ error: "Asset not found" }, { status: 404 });
    }
    // Delete from Blob storage if configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(asset.url);
      } catch {
        // Non-fatal — remove from KV even if Blob delete fails
      }
    }
    await deleteVideoAsset(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/video-assets/[id]]", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
