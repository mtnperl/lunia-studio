import { put } from "@vercel/blob";
import { saveAsset } from "@/lib/kv";
import { AssetType } from "@/lib/types";
import { describeAsset } from "@/lib/asset-caption";
import { randomUUID } from "crypto";

// The caption call adds a few seconds to an upload that used to be a single
// blob write, which is comfortably past the default function ceiling.
export const maxDuration = 60;

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const VALID_ASSET_TYPES: AssetType[] = ["logo", "carousel-style", "product-image", "lifestyle", "gen-z", "other"];

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

    // Caption it now, while we are already paying for a round trip, so the
    // library is searchable by the model from the moment it lands. Awaited
    // rather than fired-and-forgotten: this runs in a serverless function,
    // which stops executing once the response is returned, so a floating
    // promise here would be killed roughly whenever it felt like it. The
    // helper swallows its own failures, so this cannot fail the upload.
    const description = await describeAsset({ url: blob.url, type: file.type, name: file.name });

    const id = randomUUID();
    await saveAsset({
      id,
      url: blob.url,
      name: file.name,
      type: file.type,
      assetType,
      uploadedAt: new Date().toISOString(),
      ...(description ? { description } : {}),
    });

    return Response.json({ id, url: blob.url, assetType, description });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/assets/upload]", message);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
