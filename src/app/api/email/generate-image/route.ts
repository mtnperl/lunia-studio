import { fal } from "@/lib/fal";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "images");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  type ImageStyleValue = "realistic" | "illustration" | "anime" | "vector";
  const STYLE_SUFFIX: Record<ImageStyleValue, string> = {
    realistic: "",
    illustration: ", illustration style, vector art",
    anime: ", anime style",
    vector: ", flat vector illustration, minimal",
  };

  try {
    const body = await req.json();
    const imagePrompt: string = body.imagePrompt ?? "";
    const imageStyle: ImageStyleValue = body.imageStyle ?? "realistic";

    if (!imagePrompt.trim()) {
      return Response.json({ error: "imagePrompt required" }, { status: 400 });
    }

    const suffix = STYLE_SUFFIX[imageStyle] ?? "";
    const fullPrompt = imagePrompt.trim() + suffix;

    const result = await fal.subscribe("fal-ai/recraft-v3", {
      input: {
        prompt: fullPrompt,
        image_size: { width: 1024, height: 1280 },
        style: "realistic_image",
        num_images: 1,
      },
      logs: false,
    });

    const url: string | undefined = (result.data as { images?: { url: string }[] })?.images?.[0]?.url;
    if (!url) throw new Error("No image URL in fal.ai response");

    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/email/generate-image]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
