// Mirror an image from a short-lived upstream CDN (fal.ai, Klaviyo) to Vercel
// Blob so the URL stays valid past the upstream's TTL. Mirrors carousel-v2's
// existing helper; extracted here so email-review + the Klaviyo importer can
// reuse it.
import "server-only";
import { put } from "@vercel/blob";

const MAX_MIRROR_BYTES = 10 * 1024 * 1024; // 10 MB — defensive cap, not a real limit

// Hostnames/IP literals that must never be fetched server-side and republished
// publicly. This is a best-effort allowlist, NOT full SSRF protection (it
// doesn't resolve DNS to catch rebinding) — callers here (Klaviyo import,
// fal.ai generation) only ever see URLs from a trusted upstream API response,
// so this exists to block the obvious cases if that assumption is ever wrong
// (e.g. a crafted client payload), not to defend an open proxy.
const BLOCKED_HOST_RE = /^(localhost|.*\.local|.*\.internal)$/i;
function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 127 || // loopback
    a === 10 || // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 169 && b === 254) || // link-local / cloud metadata
    a === 0
  );
}

/** Exported so other server-side code that fetches a URL sourced from
 *  untrusted/client-supplied content (e.g. the Klaviyo importer resolving a
 *  CTA redirect) can apply the same best-effort SSRF guard. */
export function isSafeToFetch(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (host === "0.0.0.0" || host === "::1" || BLOCKED_HOST_RE.test(host)) return false;
  if (isPrivateIPv4(host)) return false;
  return true;
}

export async function mirrorImageToBlob(
  url: string | null | undefined,
  key: string,
  prefix = "email-review-images",
): Promise<string | null | undefined> {
  if (!url) return url;
  if (url.startsWith("/") || url.includes("vercel-storage.com")) return url;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;
  if (!isSafeToFetch(url)) {
    console.warn(`[blob-mirror] refusing to fetch unsafe url — keeping original`);
    return url;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[blob-mirror] upstream returned ${res.status} — keeping original`);
      return url;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn(`[blob-mirror] upstream content-type "${contentType}" is not an image — keeping original`);
      return url;
    }
    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > MAX_MIRROR_BYTES) {
      console.warn(`[blob-mirror] upstream too large (${contentLength} bytes) — keeping original`);
      return url;
    }
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
