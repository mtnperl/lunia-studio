import { getAssets } from "@/lib/kv";

export async function GET() {
  try {
    const assets = await getAssets();
    return Response.json(assets);
  } catch (err) {
    console.error("[api/assets]", err);
    return Response.json({ error: "Failed to load assets" }, { status: 500 });
  }
}
