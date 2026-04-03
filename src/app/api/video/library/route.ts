import { getVideoAds } from "@/lib/kv";

export async function GET() {
  try {
    const ads = await getVideoAds();
    return Response.json(ads);
  } catch (err) {
    console.error("[api/video/library]", err);
    return Response.json({ error: "Failed to fetch library" }, { status: 500 });
  }
}
