import { saveCarousel } from "@/lib/kv";
import { SavedCarousel } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      topic, hookTone, content, selectedHook,
      brandStyle, hookImageUrl, slideImages,
      showDecoration, logoScale, arrowScale, darkBackground, showLuniaLifeWatermark,
    } = body;

    if (!topic || !content || selectedHook == null) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const carousel: SavedCarousel = {
      id: randomUUID(),
      topic,
      hookTone: hookTone ?? "educational",
      content,
      selectedHook,
      brandStyle,
      hookImageUrl,
      slideImages,
      showDecoration,
      logoScale,
      arrowScale,
      darkBackground,
      showLuniaLifeWatermark,
      savedAt: new Date().toISOString(),
    };

    await saveCarousel(carousel);
    return Response.json({ id: carousel.id });
  } catch (err) {
    console.error("[api/carousel/save]", err);
    return Response.json({ error: "Failed to save carousel" }, { status: 500 });
  }
}
