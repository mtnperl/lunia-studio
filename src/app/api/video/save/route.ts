import { saveVideoAd } from "@/lib/kv";
import { SavedVideoAd, VideoAdData } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data: VideoAdData = body.data;
    const existingId: string | undefined = body.id;

    if (!data?.topic || !data?.scenes?.length) {
      return Response.json({ error: "Invalid video ad data" }, { status: 400 });
    }

    const id = existingId ?? randomUUID();
    const ad: SavedVideoAd = {
      id,
      topic: data.topic,
      data,
      savedAt: new Date().toISOString(),
    };

    await saveVideoAd(ad);
    return Response.json({ id });
  } catch (err) {
    console.error("[api/video/save]", err);
    return Response.json({ error: "Save failed" }, { status: 500 });
  }
}
