import { getVideoAssets } from "@/lib/kv";

export async function GET() {
  try {
    const assets = await getVideoAssets();
    return Response.json(assets);
  } catch (err) {
    console.error("[api/video-assets]", err);
    return Response.json({ error: "Failed to fetch video assets" }, { status: 500 });
  }
}
