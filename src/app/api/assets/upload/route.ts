import { put } from "@vercel/blob";
import { saveAsset } from "@/lib/kv";
import { AssetType } from "@/lib/types";
import { randomUUID } from "crypto";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const VALID_ASSET_TYPES: AssetType[] = ["logo", "carousel-style", "product-image", "other"];

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
    const assetType: AssetType = VALID_ASSET_TYPES.includes(assetTypeRaw as AssetType)
      ? (assetTypeRaw as AssetType)
      : "other";

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Unsupported file type. Upload JPEG, PNG, GIF, WebP, or SVG." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return Response.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const blob = await put(`assets/${randomUUID()}.${ext}`, file, {
      access: "public",
    });

    const id = randomUUID();
    await saveAsset({
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
    console.error("[api/assets/upload]", message);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
