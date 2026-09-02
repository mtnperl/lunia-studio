import { deleteCarouselKv, getCarouselById } from "@/lib/kv";

/** Read one saved carousel. Added for document URLs (/c/:id); read-only,
 *  same store the library list already exposes. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const c = await getCarouselById(id);
    if (!c) return Response.json({ error: "Carousel not found" }, { status: 404 });
    return Response.json(c);
  } catch (err) {
    console.error("[api/carousel-v2/[id]] GET error:", err);
    return Response.json({ error: "Load failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteCarouselKv(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/carousel/[id]] DELETE error:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
