import { checkRateLimit } from "@/lib/kv";
import { generateSlideGraphicImage, isTierBC, buildSlideGraphicFallback } from "@/lib/fal";
import type { BrandStyle } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: Request): Promise<Response> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  // Share rate-limit bucket with the main carousel endpoint
  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json(
      { error: "Too many requests. Please try again in an hour." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const prompt: string = body.prompt ?? "";
    const graphicJson: string = body.graphicJson ?? "";
    const headline: string = body.headline ?? "";
    const imageStyle: string = body.imageStyle ?? "realistic";
    const brandStyle: BrandStyle | undefined = body.brandStyle ?? undefined;

    // Only generate images for TIER B/C slides
    if (graphicJson && !isTierBC(graphicJson)) {
      return Response.json({ url: null, reason: "tier-a" });
    }

    // Use provided prompt, or build a fallback from the graphic spec
    const effectivePrompt = prompt?.trim().length > 0
      ? prompt
      : buildSlideGraphicFallback(headline, graphicJson, brandStyle);

    if (!effectivePrompt) {
      return Response.json({ error: "No prompt provided" }, { status: 400 });
    }

    const result = await generateSlideGraphicImage(effectivePrompt, imageStyle);
    return Response.json({ url: result.url });
  } catch (err) {
    console.error("[api/carousel/generate-slide-image]", err);
    return Response.json(
      { error: "Failed to generate slide graphic image" },
      { status: 500 }
    );
  }
}
