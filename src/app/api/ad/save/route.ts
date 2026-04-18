import { saveAd } from "@/lib/kv";
import type { SavedAd, AdConcept, AdImageHistoryEntry } from "@/lib/types";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

export const maxDuration = 30;

// fal.ai CDN URLs expire within days. Mirror to Vercel Blob at save time so
// share links never rot. Falls back to the original URL if Blob isn't
// configured (local dev) or the upstream fetch fails.
async function mirrorImage(
  url: string | null | undefined,
  key: string,
): Promise<string | null | undefined> {
  if (!url) return url;
  if (url.startsWith("/") || url.includes("vercel-storage.com")) return url;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[ad/save] upstream ${res.status} — skipping blob mirror`);
      return url;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("webp")
      ? "webp"
      : contentType.includes("png")
        ? "png"
        : "jpg";
    const { url: blobUrl } = await put(`ad-images/${key}.${ext}`, res.body!, {
      access: "public",
      contentType,
    });
    return blobUrl;
  } catch (err) {
    console.warn(`[ad/save] blob mirror failed:`, err);
    return url;
  }
}

function isConcept(v: unknown): v is AdConcept {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.angle === "string" &&
    typeof o.label === "string" &&
    typeof o.headline === "string" &&
    typeof o.primaryText === "string" &&
    typeof o.overlayText === "string" &&
    typeof o.visualDirection === "string" &&
    Array.isArray(o.whyItWorks)
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      angle,
      visualFormat,
      concept,
      imagePrompt,
      imageUrl,
      imageHistory,
      aspectRatio,
      productAssetId,
      logoAssetId,
    } = body as Partial<SavedAd>;

    if (!angle || !visualFormat || !concept || !imagePrompt || !imageUrl || !aspectRatio) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isConcept(concept)) {
      return Response.json({ error: "Invalid concept payload" }, { status: 400 });
    }
    if (aspectRatio !== "1:1" && aspectRatio !== "4:5") {
      return Response.json({ error: "Invalid aspectRatio" }, { status: 400 });
    }

    const id = randomUUID();
    const history: AdImageHistoryEntry[] = Array.isArray(imageHistory) ? imageHistory : [];

    // Mirror the final image + every history entry in parallel.
    const [mirroredFinal, ...mirroredHistory] = await Promise.all([
      mirrorImage(imageUrl, `${id}-final`),
      ...history.map((h, i) => mirrorImage(h.url, `${id}-h${i}`)),
    ]);

    const ad: SavedAd = {
      id,
      angle,
      visualFormat,
      concept,
      imagePrompt,
      imageUrl: mirroredFinal ?? imageUrl,
      imageHistory: history.map((h, i) => ({
        ...h,
        url: mirroredHistory[i] ?? h.url,
      })),
      aspectRatio,
      savedAt: new Date().toISOString(),
      productAssetId: typeof productAssetId === "string" ? productAssetId : undefined,
      logoAssetId: typeof logoAssetId === "string" ? logoAssetId : undefined,
    };

    await saveAd(ad);
    return Response.json({ id: ad.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ad/save]", message);
    return Response.json({ error: "Failed to save ad" }, { status: 500 });
  }
}
