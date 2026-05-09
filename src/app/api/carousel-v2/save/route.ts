import { saveCarousel } from "@/lib/kv";
import { DidYouKnowContentSchema, SavedCarousel } from "@/lib/types";
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
      showDecoration, logoScale, arrowScale, darkBackground, slideBgColor,
      contentBgImages, contentBgOverlayOpacity,
      showLuniaLifeWatermark,
      imageStyle, reelsMode, citationFontSize,
      headlineScale, bodyScale,
      format, engagementSubType, didYouKnowContent,
    } = body;

    if (!topic) {
      return Response.json({ error: "Missing required field: topic" }, { status: 400 });
    }
    let validatedDyk: typeof didYouKnowContent | undefined;
    if (format === "did_you_know") {
      const parsed = DidYouKnowContentSchema.safeParse(didYouKnowContent);
      if (!parsed.success) {
        return Response.json({
          error: "Invalid didYouKnowContent",
          details: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`),
        }, { status: 400 });
      }
      validatedDyk = parsed.data;
    } else {
      if (!content || selectedHook == null) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }
    }

    const id = randomUUID();

    // Persist fal.ai images to Vercel Blob before their CDN URLs expire.
    // Run in parallel — any individual failure falls back to the original URL.
    const rawSlides: (string | null)[] = slideImages ?? [];
    const rawContentBgs: (string | null)[] = Array.isArray(contentBgImages) ? contentBgImages : [];
    const [mirroredHook, ...mirroredRest] = await Promise.all([
      mirrorImage(hookImageUrl, `${id}-hook`),
      ...rawSlides.map((u, i) => mirrorImage(u, `${id}-slide-${i}`)),
      ...rawContentBgs.map((u, i) => mirrorImage(u, `${id}-bg-${i}`)),
    ]);
    const mirroredSlides = mirroredRest.slice(0, rawSlides.length) as (string | null)[];
    const mirroredContentBgs = mirroredRest.slice(rawSlides.length) as (string | null)[];

    const carousel: SavedCarousel = {
      id,
      topic,
      hookTone: hookTone ?? "educational",
      content,
      selectedHook: selectedHook ?? 0,
      brandStyle,
      hookImageUrl: mirroredHook ?? hookImageUrl,
      slideImages: mirroredSlides.length > 0
        ? (mirroredSlides as (string | null)[])
        : slideImages,
      showDecoration,
      logoScale,
      arrowScale,
      darkBackground,
      slideBgColor: slideBgColor ?? undefined,
      contentBgImages: mirroredContentBgs.length > 0 ? mirroredContentBgs : (contentBgImages ?? undefined),
      contentBgOverlayOpacity: typeof contentBgOverlayOpacity === 'number' ? contentBgOverlayOpacity : undefined,
      showLuniaLifeWatermark,
      imageStyle: imageStyle ?? undefined,
      format: format ?? undefined,
      engagementSubType: engagementSubType ?? undefined,
      didYouKnowContent: validatedDyk ?? undefined,
      reelsMode: reelsMode ?? undefined,
      citationFontSize: citationFontSize ?? undefined,
      headlineScale: headlineScale ?? undefined,
      bodyScale: bodyScale ?? undefined,
      savedAt: new Date().toISOString(),
    };

    await saveCarousel(carousel);
    return Response.json({ id: carousel.id });
  } catch (err) {
    console.error("[api/carousel/save]", err);
    return Response.json({ error: "Failed to save carousel" }, { status: 500 });
  }
}
