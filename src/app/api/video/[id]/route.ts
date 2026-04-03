import { getVideoAdById, deleteVideoAd } from "@/lib/kv";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ad = await getVideoAdById(id);
    if (!ad) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(ad);
  } catch (err) {
    console.error("[api/video/[id] GET]", err);
    return Response.json({ error: "Failed to fetch video ad" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteVideoAd(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/video/[id] DELETE]", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
