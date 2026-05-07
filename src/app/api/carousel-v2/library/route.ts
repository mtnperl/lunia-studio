import { getCarousels } from "@/lib/kv";

export async function GET() {
  try {
    const carousels = await getCarousels();
    return Response.json(carousels);
  } catch (err) {
    console.error("[api/carousel/library]", err);
    return Response.json({ error: "Failed to load library" }, { status: 500 });
  }
}
