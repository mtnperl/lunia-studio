import { getCarouselById } from "@/lib/kv";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const carousel = await getCarouselById(id);
    if (!carousel) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(carousel);
  } catch (err) {
    console.error("[api/carousel/[id]]", err);
    return Response.json({ error: "Failed to load carousel" }, { status: 500 });
  }
}
