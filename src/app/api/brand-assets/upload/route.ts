// Brand asset upload — product shots, logos, reference images used to
// condition ad image generation. Stored on Vercel Blob, indexed in KV under
// `lunia:brand-assets`. Intentionally separate from the carousel
// `/api/assets` path so the two libraries can't collide.

import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { saveBrandAsset, checkRateLimit } from "@/lib/kv";
import type { BrandAsset, BrandAssetKind } from "@/lib/types";

export const maxDuration = 30;

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB — logos/product shots can be big
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

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const blob = await put(`brand-assets/${randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
    });

    const asset: BrandAsset = {
      id: randomUUID(),
      kind,
      name: (rawName?.trim() || file.name).slice(0, 120),
      url: blob.url,
      mimeType: file.type,
      // hasTransparentBg is a user hint — PNGs often have transparent bgs,
      // default to true for logos unless overridden.
      hasTransparentBg:
        rawTransparent === "true" ||
        (rawTransparent == null && kind === "logo" && file.type === "image/png"),
      tags: (rawTags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
      createdAt: new Date().toISOString(),
    };

    await saveBrandAsset(asset);
    return Response.json({ asset });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/brand-assets/upload]", message);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
