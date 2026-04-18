// Brand asset upload — product shots, logos, reference images used to
// condition ad image generation. Stored on Vercel Blob, indexed in KV under
// `lunia:brand-assets`. Intentionally separate from the carousel
// `/api/assets` path so the two libraries can't collide.
//
// On upload we do two automatic enrichments:
//   1. Logos → BiRefNet v2 background removal so they're transparent-PNG
//      ready for canvas stamping. User can opt out via `autoRemoveBg=false`.
//   2. All assets → Claude Haiku vision auto-tagging so the library is
//      searchable out of the box. User tags merge with auto tags.

import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";
import { saveBrandAsset, checkRateLimit } from "@/lib/kv";
import { removeImageBackground } from "@/lib/fal";
import { autoTagImage } from "@/lib/brand-asset-tagger";
import type { BrandAsset, BrandAssetKind } from "@/lib/types";

// Logos need time for BiRefNet + Haiku vision round-trips.
export const maxDuration = 90;

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const VALID_KINDS: BrandAssetKind[] = ["product", "logo", "reference"];

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Vercel Blob not configured. Add BLOB_READ_WRITE_TOKEN to env." },
      { status: 503 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "asset-upload");
  if (!allowed) {
    return Response.json(
      { error: "Too many uploads. Try again in an hour." },
      { status: 429 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawKind = formData.get("kind") as string | null;
    const rawName = formData.get("name") as string | null;
    const rawTags = formData.get("tags") as string | null;
    const rawTransparent = formData.get("hasTransparentBg") as string | null;
    const autoRemoveBg = formData.get("autoRemoveBg") !== "false"; // default true
    const autoTag = formData.get("autoTag") !== "false"; // default true

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Unsupported file type. Upload PNG, JPEG, or WebP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return Response.json({ error: "File too large (max 8 MB)." }, { status: 400 });
    }

    const kind: BrandAssetKind = VALID_KINDS.includes(rawKind as BrandAssetKind)
      ? (rawKind as BrandAssetKind)
      : "reference";

    // 1. Upload the original to Blob so we have a stable URL for FAL + Claude.
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const originalBlob = await put(`brand-assets/${randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
    });

    let finalUrl = originalBlob.url;
    let finalMime = file.type;
    let processedBgRemoved = false;

    // 2. If this is a logo, run BiRefNet v2 to strip the background. Swap the
    //    blob for the transparent PNG so exports are ready to use. Fall back
    //    to the original on any failure.
    if (kind === "logo" && autoRemoveBg) {
      try {
        const removedUrl = await removeImageBackground(originalBlob.url);
        const res = await fetch(removedUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const transparentBlob = await put(
            `brand-assets/${randomUUID()}-nobg.png`,
            buf,
            { access: "public", contentType: "image/png" },
          );
          // Replace the original blob — we don't need the background version.
          try {
            await del(originalBlob.url);
          } catch (e) {
            console.warn("[brand-assets/upload] del orig warn:", e);
          }
          finalUrl = transparentBlob.url;
          finalMime = "image/png";
          processedBgRemoved = true;
        }
      } catch (err) {
        console.warn("[brand-assets/upload] bg removal failed — keeping original", err);
      }
    }

    // 3. User-supplied tags from the form.
    const userTags = (rawTags ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean);

    // 4. Auto-tag via Claude Haiku vision. Best-effort; don't fail the upload.
    let autoTags: string[] = [];
    if (autoTag) {
      try {
        autoTags = await autoTagImage(finalUrl, kind);
      } catch (err) {
        console.warn("[brand-assets/upload] auto-tag failed", err);
      }
    }

    // Merge, de-dup, cap at 12.
    const tags = Array.from(new Set([...userTags, ...autoTags])).slice(0, 12);

    const asset: BrandAsset = {
      id: randomUUID(),
      kind,
      name: (rawName?.trim() || file.name).slice(0, 120),
      url: finalUrl,
      mimeType: finalMime,
      hasTransparentBg:
        processedBgRemoved ||
        rawTransparent === "true" ||
        (rawTransparent == null && kind === "logo" && file.type === "image/png"),
      tags,
      createdAt: new Date().toISOString(),
    };

    await saveBrandAsset(asset);
    return Response.json({ asset, bgRemoved: processedBgRemoved, autoTagged: autoTags.length > 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/brand-assets/upload]", message);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
