import { deleteAdKv } from "@/lib/kv";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteAdKv(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/ads/[id]] DELETE error:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
