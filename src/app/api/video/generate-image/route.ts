import { fal } from "@/lib/fal";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "images");
  if (!allowed) return Response.json({ error: "Too many requests." }, { status: 429 });

  try {
    const body = await req.json();
    const prompt: string = body.prompt ?? "";
    if (!prompt.trim()) return Response.json({ error: "Prompt required" }, { status: 400 });

    const result = await fal.subscribe("fal-ai/recraft-v3", {
      input: {
        prompt,
        image_size: { width: 1080, height: 1920 },
        style: "realistic_image",
        num_images: 1,
      },
      logs: false,
    });

    const url: string | undefined = (result.data as any)?.images?.[0]?.url;
    if (!url) throw new Error("No image URL in fal.ai response");

    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/video/generate-image]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
