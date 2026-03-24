import { getAds } from "@/lib/kv";

export async function GET() {
  try {
    const ads = await getAds();
    return Response.json(ads);
  } catch (err) {
    console.error("[api/ads/library]", err);
    return Response.json({ error: "Failed to load library" }, { status: 500 });
  }
}
