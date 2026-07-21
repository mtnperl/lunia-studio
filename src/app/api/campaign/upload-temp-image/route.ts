// Temporary, per-email image upload — for when the user has a real photo to
// drop into a campaign instead of generating one. Deliberately NOT written
// to the permanent asset library (no saveAsset call): the blob lives under
// `temp/` and is swept by /api/campaign/cleanup-temp-images after a few
// days, so one-off campaign images never accumulate in Blob storage.
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

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

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Unsupported file type. Upload JPEG, PNG, GIF, or WebP." },
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
    const blob = await put(`temp/${randomUUID()}.${ext}`, file, {
      access: "public",
    });

    return Response.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/campaign/upload-temp-image]", message);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
