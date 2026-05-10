// Mirror an image from a short-lived upstream CDN (fal.ai) to Vercel Blob so
// the URL stays valid past the upstream's TTL. Mirrors carousel-v2's existing
// helper; extracted here so email-review can reuse it.
import "server-only";
import { put } from "@vercel/blob";

export async function mirrorImageToBlob(
  url: string | null | undefined,
  key: string,
  prefix = "email-review-images",
): Promise<string | null | undefined> {
  if (!url) return url;
  if (url.startsWith("/") || url.includes("vercel-storage.com")) return url;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[blob-mirror] upstream returned ${res.status} — keeping original`);
      return url;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
    const { url: blobUrl } = await put(`${prefix}/${key}.${ext}`, res.body!, {
      access: "public",
      contentType,
    });
    return blobUrl;
  } catch (err) {
    console.warn(`[blob-mirror] failed:`, err);
    return url;
  }
}
