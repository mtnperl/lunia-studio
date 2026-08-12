// Verification result cache, keyed by unit content hash.
//
// ─── Deviation from the plan, and why ─────────────────────────────────────────
// The plan specified a CLAIM-level source library: hash each atomic claim, cache
// its resolved source, reuse it across carousels. That turns out to be
// unbuildable in this shape, because claims are discovered BY the grounded model
// call. You cannot look up a claim's cached source before you know the claim
// exists, so a claim-level cache cannot short-circuit the expensive part — it
// would need a separate extraction pass first, doubling the calls it was meant
// to save.
//
// Caching at the UNIT level works with the grain instead. The unit's content
// hash is already computed, it is known before any model call, and it skips the
// entire call on a hit. It directly serves the common case: edit one slide,
// re-verify, and the other seven units come back free.
//
// What this does NOT do is reuse a source across different carousels citing the
// same study. That was the plan's cost argument and it is genuinely lost here.
// Getting it back needs claim extraction split out as its own cheap ungrounded
// pass, which is worth doing once there is data on how often claims actually
// repeat across content.
//
// Per-key storage, never a single-key array: this collection is designed to grow
// without bound, and kv.ts's array collections are read-all/write-all with a
// full Blob snapshot on every write (kv.ts:85-88). A growing cache in that shape
// gets slower and more expensive precisely as it becomes more useful.

import "server-only";
import { redis } from "./kv";
import type { VerifiedUnit } from "./types";

const PREFIX = "lunia:vcache:";

/**
 * 30 days. Long enough that iterating on a deck is nearly free; short enough
 * that a source which has since been retracted, moved, or 404'd gets
 * re-checked within a reasonable window.
 */
const TTL_SECONDS = 60 * 60 * 24 * 30;

type CachedUnit = {
  /** Everything except the id/label, which belong to the calling content. */
  claims: VerifiedUnit["claims"];
  error?: string;
  cachedAt: string;
};

function key(contentHash: string): string {
  return `${PREFIX}${contentHash}`;
}

/**
 * Look up a previously verified unit by its content hash.
 *
 * Returns null on a miss OR on any Redis failure — a cache that throws is worse
 * than no cache, so every failure degrades to "verify it live".
 */
export async function getCachedUnit(contentHash: string): Promise<CachedUnit | null> {
  try {
    return await redis.get<CachedUnit>(key(contentHash));
  } catch {
    return null;
  }
}

/**
 * Store a verified unit's claims.
 *
 * Units that errored are NOT cached. Caching a failure would mean a transient
 * rate-limit turns into 30 days of a stuck amber chip.
 */
export async function setCachedUnit(unit: VerifiedUnit): Promise<void> {
  if (unit.error) return;
  try {
    const payload: CachedUnit = {
      claims: unit.claims,
      cachedAt: new Date().toISOString(),
    };
    await redis.set(key(unit.contentHash), payload, { ex: TTL_SECONDS });
  } catch {
    /* best-effort; a failed cache write must never fail the verification */
  }
}

/**
 * Drop a cached entry. Used when a human overrides a verdict — the override
 * belongs to that specific piece of content, and must not leak into a different
 * carousel that happens to share identical text.
 */
export async function invalidateCachedUnit(contentHash: string): Promise<void> {
  try {
    await redis.set(key(contentHash), null, { ex: 1 });
  } catch {
    /* best-effort */
  }
}
