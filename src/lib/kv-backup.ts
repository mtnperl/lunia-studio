// Durable Blob snapshots for the single-key array collections in kv.ts.
//
// Redis is the fast primary store, but it is an eviction/flush-prone tier — a
// neighboring project sharing the same database flushed it once and wiped every
// library (see project memory). These helpers mirror each collection to Vercel
// Blob (durable object storage) on write, and restore from the newest snapshot
// on read when Redis comes back empty. The net effect: after a future flush,
// the next read silently rehydrates Redis from Blob — no manual recovery.
//
// Privacy: the Blob store is public, so snapshots are written to unguessable
// random-suffixed paths and located server-side via list() (which uses the
// write token, so it works regardless of Redis state). Acceptable for the
// non-secret marketing content these collections hold.
import "server-only";
import { put, list, del } from "@vercel/blob";

const BACKUP_PREFIX = "kv-backups";

// Retain a few recent snapshots per collection so a bad write can be rolled
// back, while keeping storage bounded. Newest is always the source of truth.
const KEEP_SNAPSHOTS = 5;

// Redis keys contain ':' which is legal in Blob paths but noisy; normalize to
// a flat, filesystem-friendly folder name (e.g. "lunia:scripts" -> "lunia_scripts").
function dirFor(key: string): string {
  return `${BACKUP_PREFIX}/${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/**
 * Best-effort durable snapshot of a whole collection to Blob.
 * Never throws — a backup failure must never break the user's save.
 */
export async function backupCollectionToBlob(key: string, value: unknown): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  const dir = dirFor(key);
  try {
    await put(`${dir}/snapshot.json`, JSON.stringify(value), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: true, // unguessable URL; the latest is found via list()
    });
  } catch (err) {
    console.warn(`[kv-backup] snapshot for ${key} failed:`, err);
    return; // if the write failed there is nothing to prune
  }
  // Prune older snapshots beyond KEEP_SNAPSHOTS (best-effort).
  try {
    const { blobs } = await list({ prefix: `${dir}/` });
    const stale = blobs
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(KEEP_SNAPSHOTS);
    await Promise.all(stale.map((b) => del(b.url).catch(() => {})));
  } catch {
    /* pruning is non-critical */
  }
}

/**
 * Restore the newest Blob snapshot for a collection, or null if none exists.
 * Returns the parsed array; callers rehydrate Redis from it.
 */
export async function restoreCollectionFromBlob<T>(key: string): Promise<T[] | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { blobs } = await list({ prefix: `${dirFor(key)}/` });
    if (blobs.length === 0) return null;
    const newest = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
    const res = await fetch(newest.url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : null;
  } catch (err) {
    console.warn(`[kv-backup] restore for ${key} failed:`, err);
    return null;
  }
}
