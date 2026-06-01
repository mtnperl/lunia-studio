// Blob cleanup endpoint — finds blobs in Vercel Blob storage that are no
// longer referenced by any KV store (orphans) and optionally deletes
// them to free space on the 1GB Hobby quota.
//
//   GET  /api/admin/blob-cleanup         → dry-run report
//   POST /api/admin/blob-cleanup         → delete all orphans
//                  { "confirm": true }
//
// Detection method: pull every store that holds blob URLs (assets,
// video-assets, carousels, campaign emails, flow reviews, emails),
// serialize to a single string, and regex-extract every URL that points
// at *.public.blob.vercel-storage.com (the Vercel Blob domain). Any
// blob whose URL isn't in that set is treated as an orphan.

import { del, list } from "@vercel/blob";
import {
  getAssets,
  getVideoAssets,
  getCarousels,
  getCampaignEmails,
  getFlowReviews,
  getEmails,
} from "@/lib/kv";

export const maxDuration = 60;

/** Pull every blob URL referenced anywhere in our KV stores. Brute force
 *  but reliable: stringify each store and regex-match the blob domain. */
async function collectLiveUrls(): Promise<Set<string>> {
  const [assets, videoAssets, carousels, campaigns, flows, emails] = await Promise.all([
    getAssets(),
    getVideoAssets(),
    getCarousels(),
    getCampaignEmails(),
    getFlowReviews(),
    getEmails(),
  ]);
  const blob = JSON.stringify({ assets, videoAssets, carousels, campaigns, flows, emails });
  // Match anything that looks like a Vercel Blob URL up to the next
  // whitespace, quote, or close-brace. Strip a trailing punctuation char
  // just in case the JSON encoded one.
  const matches = blob.match(/https:\/\/[^"\s)}]+\.public\.blob\.vercel-storage\.com\/[^"\s)}]+/g) ?? [];
  return new Set(matches.map((u) => u.replace(/[,)}\]]+$/, "")));
}

/** Page through every blob currently stored. */
async function listAllBlobs(): Promise<Array<{ url: string; pathname: string; size: number; uploadedAt: Date }>> {
  const out: Array<{ url: string; pathname: string; size: number; uploadedAt: Date }> = [];
  let cursor: string | undefined = undefined;
  do {
    const page: { blobs: Array<{ url: string; pathname: string; size: number; uploadedAt: Date }>; hasMore: boolean; cursor?: string } =
      await list({ cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function analyze() {
  const [liveUrls, blobs] = await Promise.all([collectLiveUrls(), listAllBlobs()]);
  const orphans = blobs.filter((b) => !liveUrls.has(b.url));
  const orphanBytes = orphans.reduce((sum, b) => sum + (b.size ?? 0), 0);
  const totalBytes = blobs.reduce((sum, b) => sum + (b.size ?? 0), 0);
  return {
    totalBlobs: blobs.length,
    totalBytes,
    totalHuman: fmtBytes(totalBytes),
    liveUrls: liveUrls.size,
    orphans: orphans.length,
    orphanBytes,
    orphanHuman: fmtBytes(orphanBytes),
    sampleOrphans: orphans.slice(0, 10).map((b) => ({
      url: b.url,
      pathname: b.pathname,
      size: b.size,
      uploadedAt: b.uploadedAt,
    })),
    orphanUrls: orphans.map((b) => b.url),
  };
}

export async function GET() {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json({ error: "BLOB_READ_WRITE_TOKEN not set" }, { status: 503 });
    }
    const report = await analyze();
    // Don't return the full url list in the dry run — keep the response small.
    const { orphanUrls: _omit, ...summary } = report;
    return Response.json(summary);
  } catch (err) {
    console.error("[api/admin/blob-cleanup] GET", err);
    return Response.json({ error: err instanceof Error ? err.message : "Cleanup analyze failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json({ error: "BLOB_READ_WRITE_TOKEN not set" }, { status: 503 });
    }
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== true) {
      return Response.json(
        { error: "Pass { confirm: true } to actually delete. GET this endpoint first to see what would be deleted." },
        { status: 400 },
      );
    }
    const report = await analyze();
    if (report.orphans === 0) {
      return Response.json({ ok: true, deleted: 0, freedHuman: "0 B" });
    }
    // `del` accepts arrays and is rate-limit friendly. Chunk to keep each
    // call modest.
    const CHUNK = 50;
    let deleted = 0;
    for (let i = 0; i < report.orphanUrls.length; i += CHUNK) {
      const batch = report.orphanUrls.slice(i, i + CHUNK);
      await del(batch);
      deleted += batch.length;
    }
    return Response.json({
      ok: true,
      deleted,
      freedHuman: report.orphanHuman,
      remainingBlobs: report.totalBlobs - deleted,
    });
  } catch (err) {
    console.error("[api/admin/blob-cleanup] POST", err);
    return Response.json({ error: err instanceof Error ? err.message : "Cleanup delete failed" }, { status: 500 });
  }
}
