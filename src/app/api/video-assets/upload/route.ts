import { put } from "@vercel/blob";
import { saveVideoAsset } from "@/lib/kv";
import { VideoAssetType } from "@/lib/types";
import { randomUUID } from "crypto";

const MAX_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB for hi-res product shots
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VALID_ASSET_TYPES: VideoAssetType[] = [
  "product-image-vertical",
  "lifestyle-image",
  "product-video",
];

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN to your environment variables." },
      { status: 503 }
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetTypeRaw = formData.get("assetType") as string | null;
    const assetType: VideoAssetType = VALID_ASSET_TYPES.includes(assetTypeRaw as VideoAssetType)
      ? (assetTypeRaw as VideoAssetType)
      : "product-image-vertical";

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Unsupported file type. Upload JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return Response.json(
        { error: "File too large. Maximum size is 30 MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const blob = await put(`video-assets/${randomUUID()}.${ext}`, file, {
      access: "public",
    });

    const id = randomUUID();
    await saveVideoAsset({
      id,
      url: blob.url,
      name: file.name,
      type: file.type,
      assetType,
      uploadedAt: new Date().toISOString(),
    });

    return Response.json({ id, url: blob.url, assetType });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/video-assets/upload]", message);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
