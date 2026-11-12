import { deleteAsset, getAssets, patchAssetDetails, type AssetDetailsPatch } from "@/lib/kv";
import { del } from "@vercel/blob";
import { groupAssetFamilies } from "@/lib/asset-selection";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const assets = await getAssets();
    const asset = assets.find((a) => a.id === id);
    if (!asset) return Response.json({ error: "Not found" }, { status: 404 });
    const patch: AssetDetailsPatch = { id };
    if (body.preference !== undefined) {
      if (!["preferred", "available", "archived"].includes(body.preference)) return Response.json({ error: "Invalid preference" }, { status: 400 });
      patch.preference = body.preference;
    }
    if (body.familyId !== undefined) {
      if (typeof body.familyId !== "string" || !body.familyId.trim() || body.familyId.length > 150) return Response.json({ error: "Invalid family" }, { status: 400 });
      patch.familyId = body.familyId;
    }
    const family = body.applyToFamily === true ? groupAssetFamilies(assets).find((f) => f.assets.some((a) => a.id === id)) : undefined;
    await patchAssetDetails(family ? family.assets.map((a) => ({ ...patch, id: a.id })) : [patch]);
    return Response.json({ ...asset, ...patch });
  } catch {
    return Response.json({ error: "Could not update image" }, { status: 500 });
  }
}

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
