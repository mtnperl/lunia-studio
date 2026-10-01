import { deleteCarouselKv, getCarouselById, saveCarousel } from "@/lib/kv";
import { applyCarouselPatch } from "@/lib/carousel-patch";
import { recordVersion } from "@/lib/versions";

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

/** Change part of a saved carousel. Send only what changes; see
 *  src/lib/carousel-patch.ts for the body. Returns the whole updated deck plus
 *  what changed, warnings, and any images that now show stale text. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
    }
    const current = await getCarouselById(id);
    if (!current) return Response.json({ error: "Carousel not found" }, { status: 404 });

    const result = applyCarouselPatch(current, body);
    if (!result.ok) {
      return Response.json({ error: result.error, details: result.details }, { status: result.status });
    }

    const carousel = { ...result.carousel, savedAt: new Date().toISOString() };
    await saveCarousel(carousel);
    // Version history is best effort; a failure never fails the edit.
    await recordVersion("carousel", carousel.id, carousel).catch((e) =>
      console.warn("[carousel-v2 patch] version not recorded", e),
    );
    return Response.json({
      carousel,
      changed: result.changed,
      warnings: result.warnings,
      staleImages: result.staleImages,
    });
  } catch (err) {
    console.error("[api/carousel-v2/[id]] PATCH error:", err);
    return Response.json({ error: "Update failed" }, { status: 500 });
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
