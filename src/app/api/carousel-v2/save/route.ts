import { saveAssetIfNew, saveCarousel } from "@/lib/kv";
import { AssetMetadata, DidYouKnowContentSchema, SavedCarousel } from "@/lib/types";
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
      id: existingId,
      topic, hookTone, content, selectedHook,
      brandStyle, hookImageUrl, slideImages,
      showDecoration, logoScale, arrowScale, darkBackground, slideBgColor,
      contentBgImages, contentBgOverlayOpacity,
      showLuniaLifeWatermark,
      imageStyle, reelsMode, citationFontSize,
      headlineScale, bodyScale,
      format, engagementSubType, didYouKnowContent,
      hookOverlays,
      stylePreset, showSlideArrows, showSlideNumbers, showCitationBars,
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

    // When the editor passes an existing id (update flow), reuse it so the
    // KV upsert lands on the same record. Otherwise mint a fresh one.
    const id = typeof existingId === "string" && existingId.length > 0 ? existingId : randomUUID();

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
      hookOverlays: hookOverlays ?? undefined,
      stylePreset: stylePreset ?? undefined,
      showSlideArrows: typeof showSlideArrows === "boolean" ? showSlideArrows : undefined,
      showSlideNumbers: typeof showSlideNumbers === "boolean" ? showSlideNumbers : undefined,
      showCitationBars: typeof showCitationBars === "boolean" ? showCitationBars : undefined,
      savedAt: new Date().toISOString(),
    };

    await saveCarousel(carousel);

    // ── Register text-free carousel images in the asset library ────────────
    // So the email-campaign image picker can reuse them. Editorial hooks
    // have text baked into the pixels by gpt-image-2 — those are intentionally
    // skipped because they wouldn't work as a clean background image. Every
    // other image (non-editorial hook + every content-slide bg) is text-free
    // by construction and is registered idempotently (URL-keyed) so re-saves
    // don't duplicate entries.
    const isEditorial = stylePreset === "editorial-scientific";
    const registrations: Promise<unknown>[] = [];
    const now = new Date().toISOString();
    function inferMime(url: string): string {
      const lower = url.toLowerCase();
      if (lower.endsWith(".png")) return "image/png";
      if (lower.endsWith(".webp")) return "image/webp";
      return "image/jpeg";
    }
    // Hook image — only when the text isn't baked into the pixels (i.e. not
    // editorial preset). The hook hex on the slide carries text via HTML
    // overlay for non-editorial presets, so the underlying image is clean.
    if (!isEditorial && carousel.hookImageUrl) {
      const url = carousel.hookImageUrl;
      const asset: AssetMetadata = {
        id: `cgen-${id}-hook`,
        url,
        name: `${topic} — hook`.slice(0, 90),
        type: inferMime(url),
        assetType: "carousel-generated",
        uploadedAt: now,
        source: { carouselId: id, topic, role: "hook" },
      };
      registrations.push(saveAssetIfNew(asset).catch(() => false));
    }
    // Content-slide backgrounds — always text-free.
    (carousel.contentBgImages ?? []).forEach((url, i) => {
      if (!url) return;
      const asset: AssetMetadata = {
        id: `cgen-${id}-bg-${i}`,
        url,
        name: `${topic} — slide ${i + 2} bg`.slice(0, 90),
        type: inferMime(url),
        assetType: "carousel-generated",
        uploadedAt: now,
        source: { carouselId: id, topic, role: "slide-bg" },
      };
      registrations.push(saveAssetIfNew(asset).catch(() => false));
    });
    if (registrations.length > 0) {
      // Fire-and-forget after the carousel itself is persisted — failures
      // here should never block the save response.
      Promise.allSettled(registrations).catch(() => {});
    }

    return Response.json({ id: carousel.id });
  } catch (err) {
    console.error("[api/carousel/save]", err);
    return Response.json({ error: "Failed to save carousel" }, { status: 500 });
  }
}
