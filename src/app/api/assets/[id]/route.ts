import { deleteAsset, getAssets } from "@/lib/kv";
import { del } from "@vercel/blob";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assets = await getAssets();
    const asset = assets.find((a) => a.id === id);
    if (!asset) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Delete from Vercel Blob storage
    await del(asset.url);
    // Remove metadata from KV
    await deleteAsset(id);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/assets/[id]]", err);
    return Response.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
