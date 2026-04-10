import { saveCarousel } from "@/lib/kv";
import { SavedCarousel } from "@/lib/types";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

// ── Blob mirroring ────────────────────────────────────────────────────────────
// fal.ai CDN URLs expire within days. At save time we upload a permanent copy
// to Vercel Blob so share links never break. Falls back to the original URL
// if Blob isn't configured (local dev) or the upstream fetch fails.
async function mirrorImage(
  url: string | null | undefined,
  key: string,
): Promise<string | null | undefined> {
  if (!url) return url;
  if (url.startsWith("/") || url.includes("vercel-storage.com")) return url; // already permanent
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url; // blob not configured (local dev)

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[save] upstream image returned ${res.status} — skipping blob mirror`);
      return url;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
    const { url: blobUrl } = await put(`carousel-images/${key}.${ext}`, res.body!, {
      access: "public",
      contentType,
    });
    console.log(`[save] mirrored ${url.slice(0, 60)} → ${blobUrl}`);
    return blobUrl;
  } catch (err) {
    console.warn(`[save] blob mirror failed:`, err);
    return url; // best-effort — keep original on failure
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      topic, hookTone, content, selectedHook,
      brandStyle, hookImageUrl, slideImages,
      showDecoration, logoScale, arrowScale, darkBackground, showLuniaLifeWatermark,
      imageStyle, reelsMode,
    } = body;

    if (!topic || !content || selectedHook == null) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = randomUUID();

    // Persist fal.ai images to Vercel Blob before their CDN URLs expire.
    // Run in parallel — any individual failure falls back to the original URL.
    const rawSlides: (string | null)[] = slideImages ?? [];
    const [mirroredHook, ...mirroredSlides] = await Promise.all([
      mirrorImage(hookImageUrl, `${id}-hook`),
      ...rawSlides.map((u, i) => mirrorImage(u, `${id}-slide-${i}`)),
    ]);

    const carousel: SavedCarousel = {
      id,
      topic,
      hookTone: hookTone ?? "educational",
      content,
      selectedHook,
      brandStyle,
      hookImageUrl: mirroredHook ?? hookImageUrl,
      slideImages: mirroredSlides.length > 0
        ? (mirroredSlides as (string | null)[])
        : slideImages,
      showDecoration,
      logoScale,
      arrowScale,
      darkBackground,
      showLuniaLifeWatermark,
      imageStyle: imageStyle ?? undefined,
      reelsMode: reelsMode ?? undefined,
      savedAt: new Date().toISOString(),
    };

    await saveCarousel(carousel);
    return Response.json({ id: carousel.id });
  } catch (err) {
    console.error("[api/carousel/save]", err);
    return Response.json({ error: "Failed to save carousel" }, { status: 500 });
  }
}
