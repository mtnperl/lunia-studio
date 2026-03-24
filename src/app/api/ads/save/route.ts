import { saveAd } from "@/lib/kv";
import { SavedAd, AdCTA } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { competitorCopy, angle, emotion, headline, primaryText, cta, imageUrl, complianceNote } = body;

    if (!headline || !primaryText || !cta || !imageUrl) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ad: SavedAd = {
      id: randomUUID(),
      savedAt: new Date().toISOString(),
      competitorCopy: competitorCopy ?? "",
      angle: angle ?? undefined,
      emotion: emotion ?? undefined,
      headline,
      primaryText,
      cta: cta as AdCTA,
      imageUrl,
      complianceNote: complianceNote ?? "",
    };

    await saveAd(ad);
    return Response.json({ id: ad.id });
  } catch (err) {
    console.error("[api/ads/save]", err);
    return Response.json({ error: "Failed to save ad" }, { status: 500 });
  }
}
