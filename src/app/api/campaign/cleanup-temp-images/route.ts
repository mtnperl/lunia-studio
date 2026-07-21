// Daily sweep for /api/campaign/upload-temp-image blobs. Anything under
// temp/ older than TEMP_MAX_AGE_MS is deleted so one-off campaign uploads
// never accumulate in Blob storage. Wired up as a Vercel Cron job in
// vercel.json. If CRON_SECRET is set, only requests carrying it (Vercel
// Cron attaches it automatically) are allowed to trigger the sweep.
import { del, list } from "@vercel/blob";

const TEMP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET(req: Request) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Vercel Blob is not configured." }, { status: 503 });
  }

  try {
    const cutoff = Date.now() - TEMP_MAX_AGE_MS;
    const expired: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await list({ prefix: "temp/", cursor, limit: 1000 });
      for (const blob of page.blobs) {
        if (new Date(blob.uploadedAt).getTime() < cutoff) {
          expired.push(blob.url);
        }
      }
      cursor = page.cursor;
    } while (cursor);

    if (expired.length > 0) {
      await del(expired);
    }

    return Response.json({ deleted: expired.length });
  } catch (err) {
    console.error("[api/campaign/cleanup-temp-images]", err);
    return Response.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
