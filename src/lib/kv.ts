import Redis from "ioredis";
import { Script, SavedCarousel, AssetMetadata, Subject, CarouselTemplate, SavedVideoAd, VideoAssetMetadata, SavedEmail, SavedCampaign, UGCCampaign, UGCBrief, SavedFlowReview } from "./types";
import { backupCollectionToBlob, restoreCollectionFromBlob } from "./kv-backup";

// Supports Vercel KV (KV_URL is the redis:// URL), standard Redis (REDIS_URL),
// or falls back to KV_REST_API_URL as last resort.
// Lazily initialized so module evaluation at build time doesn't throw.
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;
  // KV_URL is Vercel's redis:// URL (ioredis-compatible).
  // KV_REST_API_URL is the https:// REST endpoint — ioredis cannot use it.
  const url = process.env.KV_URL ?? process.env.REDIS_URL ?? process.env.KV_REST_API_URL;
  if (!url) {
    throw new Error(
      "Missing Redis environment variable: set KV_URL or REDIS_URL"
    );
  }
  _redis = new Redis(url, { lazyConnect: true });
  return _redis;
}

// Tiny shim around ioredis that JSON-encodes values + supports `ex:` TTL.
// Exported so other server-side libs (e.g. lib/klaviyo) can reuse the same
// connection without re-implementing the wrapper.
export const redis = {
  get: <T = unknown>(key: string): Promise<T | null> =>
    getRedis()
      .get(key)
      .then((v) => (v ? (JSON.parse(v) as T) : null)),

  set: (key: string, value: unknown, opts?: { ex?: number }): Promise<unknown> => {
    const serialized = JSON.stringify(value);
    if (opts?.ex) return getRedis().set(key, serialized, "EX", opts.ex);
    return getRedis().set(key, serialized);
  },

  incr: (key: string): Promise<number> => getRedis().incr(key),

  expire: (key: string, seconds: number): Promise<number> =>
    getRedis().expire(key, seconds),
};

const SCRIPTS_KEY = "lunia:scripts";
const TTL_SECONDS = 60 * 60 * 24 * 365;

// Soft retention guard for the single-key array collections below.
//
// These collections used to truncate with `all.slice(0, N)` on every write,
// which silently destroyed the OLDEST saved entry once the cap was hit — real,
// unrecoverable data loss (Upstash backups, if enabled at all, are daily
// snapshots and cannot reliably recover an evicted-then-overwritten blob).
//
// We no longer evict. Payloads here are URL-only (~10–20 KB each), and these
// are single-user tools, so a few hundred entries is a low-single-MB blob —
// fine to keep whole. The threshold just warns when a blob is growing large
// enough that migrating that collection to per-id keys is worth considering.
// Nothing is dropped; the warning is purely a heads-up.
const RETENTION_WARN_THRESHOLD = 250;

function retain<T>(key: string, items: T[]): T[] {
  if (items.length > RETENTION_WARN_THRESHOLD) {
    console.warn(
      `[kv] ${key} holds ${items.length} entries (warn threshold ` +
        `${RETENTION_WARN_THRESHOLD}). No data is being evicted, but the ` +
        `single-key blob is growing — consider migrating to per-id keys.`,
    );
  }
  return items;
}

// ─── Durable persistence for single-key array collections ─────────────────────
//
// Every collection below is a single Redis key holding a JSON array. These two
// helpers add a durable Blob mirror so a Redis flush/eviction can't lose data:
//   • writeCollection — writes Redis (fast primary) AND a Blob snapshot.
//   • readCollection  — reads Redis first; if it's empty (or unreachable), it
//     restores from the newest Blob snapshot and rehydrates Redis, so the app
//     self-heals on the very next read after a flush.
// Both are best-effort on the Blob side: a backup/restore failure never breaks
// the underlying Redis operation.

async function writeCollection<T>(key: string, items: T[]): Promise<void> {
  await redis.set(key, retain(key, items), { ex: TTL_SECONDS });
  await backupCollectionToBlob(key, items);
}

async function readCollection<T>(key: string): Promise<T[]> {
  let stored: T[] | null = null;
  try {
    stored = await redis.get<T[]>(key);
    if (stored && stored.length > 0) return stored;
  } catch {
    /* Redis unreachable — fall through to the durable backup */
  }
  const restored = await restoreCollectionFromBlob<T>(key);
  if (restored && restored.length > 0) {
    try {
      await redis.set(key, restored, { ex: TTL_SECONDS });
    } catch {
      /* rehydrate is best-effort; still return the restored data */
    }
    return restored;
  }
  return stored ?? [];
}

export async function getScripts(): Promise<Script[]> {
  return readCollection<Script>(SCRIPTS_KEY);
}

export async function saveScriptKv(script: Script): Promise<void> {
  const scripts = await getScripts();
  const idx = scripts.findIndex((s) => s.id === script.id);
  if (idx >= 0) {
    scripts[idx] = script;
  } else {
    scripts.unshift(script);
  }
  await writeCollection(SCRIPTS_KEY, scripts);
}

export async function getScriptById(id: string): Promise<Script | null> {
  const scripts = await getScripts();
  return scripts.find((s) => s.id === id) ?? null;
}

export async function deleteScriptKv(id: string): Promise<void> {
  const scripts = await getScripts();
  const filtered = scripts.filter((s) => s.id !== id);
  await writeCollection(SCRIPTS_KEY, filtered);
}

// Rate limiting: fixed window per IP per bucket
const RATE_LIMITS: Record<string, number> = {
  generate: 20,   // script generation
  carousel: 50,   // carousel generation + slide regen
  graphic: 100,   // infographic regen (cheap Claude calls, used frequently)
  images: 100,    // fal.ai image generation
  "ugc-caption": 100, // UGC caption drafts
  "ugc-import": 10,   // CSV imports
  klaviyo: 60,    // Klaviyo proxy reads (60/h per IP — Klaviyo allows ~75/min globally)
  "email-review": 30, // analyze + regen-suggestions (Sonnet, expensive)
  "klaviyo-write": 12, // template writebacks (deliberately tight — every write is a real change)
  login: 10,      // login attempts per IP
};

export async function clearRateLimits(): Promise<number> {
  const client = getRedis();
  let cursor = "0";
  let deleted = 0;
  do {
    const [next, keys] = await client.scan(cursor, "MATCH", "lunia:rl:*", "COUNT", 100);
    cursor = next;
    if (keys.length > 0) {
      await client.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== "0");
  return deleted;
}

export async function checkRateLimit(ip: string, bucket = "generate"): Promise<boolean> {
  try {
    const key = `lunia:rl:${bucket}:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600);
    const limit = RATE_LIMITS[bucket] ?? 10;
    return count <= limit;
  } catch {
    return true; // fail open on Redis error
  }
}

// ─── Carousel persistence ─────────────────────────────────────────────────────
const CAROUSELS_KEY = "lunia:carousels";

export async function getCarousels(): Promise<SavedCarousel[]> {
  return readCollection<SavedCarousel>(CAROUSELS_KEY);
}

export async function saveCarousel(carousel: SavedCarousel): Promise<void> {
  const all = await getCarousels();
  const idx = all.findIndex((c) => c.id === carousel.id);
  if (idx >= 0) {
    all[idx] = carousel;
  } else {
    all.unshift(carousel);
  }
  await writeCollection(CAROUSELS_KEY, all);
}

export async function getCarouselById(id: string): Promise<SavedCarousel | null> {
  const all = await getCarousels();
  return all.find((c) => c.id === id) ?? null;
}

export async function deleteCarouselKv(id: string): Promise<void> {
  const all = await getCarousels();
  const filtered = all.filter((c) => c.id !== id);
  await writeCollection(CAROUSELS_KEY, filtered);
}

// ─── Campaign emails (campaign builder) ───────────────────────────────────────
const CAMPAIGN_EMAILS_KEY = "lunia:campaign-emails";

export async function getCampaignEmails(): Promise<SavedCampaign[]> {
  return readCollection<SavedCampaign>(CAMPAIGN_EMAILS_KEY);
}

export async function saveCampaignEmail(campaign: SavedCampaign): Promise<void> {
  const all = await getCampaignEmails();
  const idx = all.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) {
    all[idx] = campaign;
  } else {
    all.unshift(campaign);
  }
  await writeCollection(CAMPAIGN_EMAILS_KEY, all);
}

export async function getCampaignEmailById(id: string): Promise<SavedCampaign | null> {
  const all = await getCampaignEmails();
  return all.find((c) => c.id === id) ?? null;
}

export async function deleteCampaignEmailKv(id: string): Promise<void> {
  const all = await getCampaignEmails();
  const filtered = all.filter((c) => c.id !== id);
  await writeCollection(CAMPAIGN_EMAILS_KEY, filtered);
}

// ─── Asset metadata ───────────────────────────────────────────────────────────
const ASSETS_KEY = "lunia:assets";

export async function getAssets(): Promise<AssetMetadata[]> {
  return readCollection<AssetMetadata>(ASSETS_KEY);
}

export async function saveAsset(asset: AssetMetadata): Promise<void> {
  const all = await getAssets();
  all.unshift(asset);
  await writeCollection(ASSETS_KEY, all);
}

/** Add an asset only if no existing entry already references the same URL.
 *  Used by the carousel save route to register text-free generated images
 *  (hooks + content backgrounds) for re-use in the email campaign picker,
 *  without duplicating entries when a carousel is re-saved with the same
 *  images attached. */
export async function saveAssetIfNew(asset: AssetMetadata): Promise<boolean> {
  const all = await getAssets();
  if (all.some((a) => a.url === asset.url)) return false;
  all.unshift(asset);
  await writeCollection(ASSETS_KEY, all);
  return true;
}

export async function deleteAsset(id: string): Promise<void> {
  const all = await getAssets();
  const filtered = all.filter((a) => a.id !== id);
  await writeCollection(ASSETS_KEY, filtered);
}

// ─── Subjects ─────────────────────────────────────────────────────────────────
const SUBJECTS_KEY = "lunia:subjects";

export async function getSubjects(): Promise<Subject[]> {
  try {
    const { DEFAULT_SUBJECTS } = await import("./default-subjects");
    const stored = await redis.get<Subject[]>(SUBJECTS_KEY);
    let base = stored;
    if (!base || base.length === 0) {
      const restored = await restoreCollectionFromBlob<Subject>(SUBJECTS_KEY);
      if (restored && restored.length > 0) base = restored;
    }
    if (!base || base.length === 0) {
      await writeCollection(SUBJECTS_KEY, DEFAULT_SUBJECTS);
      return DEFAULT_SUBJECTS;
    }
    // Merge: append any DEFAULT_SUBJECTS not already present (by case-insensitive text).
    // Lets new seed categories (e.g. "Did You Know") show up without wiping user data.
    const haveTexts = new Set(base.map((s) => s.text.trim().toLowerCase()));
    const newcomers = DEFAULT_SUBJECTS.filter((d) => !haveTexts.has(d.text.trim().toLowerCase()));
    if (newcomers.length === 0) return base;
    const merged = [...base, ...newcomers];
    await writeCollection(SUBJECTS_KEY, merged);
    return merged;
  } catch {
    // Redis unavailable (e.g. local dev without KV_URL) — return defaults in-memory
    const { DEFAULT_SUBJECTS } = await import("./default-subjects").catch(() => ({ DEFAULT_SUBJECTS: [] as Subject[] }));
    return DEFAULT_SUBJECTS;
  }
}

export async function saveSubjects(subjects: Subject[]): Promise<void> {
  await writeCollection(SUBJECTS_KEY, subjects);
}

export async function updateSubject(id: string, text: string): Promise<void> {
  const all = await getSubjects();
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], text };
    await writeCollection(SUBJECTS_KEY, all);
  }
}

export async function markSubjectUsed(id: string): Promise<void> {
  const all = await getSubjects();
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], usedAt: new Date().toISOString() };
    await writeCollection(SUBJECTS_KEY, all);
  }
}

export async function markSubjectUnused(id: string): Promise<void> {
  const all = await getSubjects();
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    const { usedAt: _removed, ...rest } = all[idx];
    all[idx] = rest;
    await writeCollection(SUBJECTS_KEY, all);
  }
}

export async function deleteSubject(id: string): Promise<void> {
  const all = await getSubjects();
  const filtered = all.filter((s) => s.id !== id);
  await writeCollection(SUBJECTS_KEY, filtered);
}

// ─── Carousel Templates ───────────────────────────────────────────────────────
const TEMPLATES_KEY = "lunia:carousel-templates";

export async function getCarouselTemplates(): Promise<CarouselTemplate[]> {
  return readCollection<CarouselTemplate>(TEMPLATES_KEY);
}

export async function saveCarouselTemplate(template: CarouselTemplate): Promise<void> {
  const all = await getCarouselTemplates();
  const idx = all.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    all[idx] = template;
  } else {
    all.unshift(template);
  }
  await writeCollection(TEMPLATES_KEY, all);
}

export async function deleteCarouselTemplate(id: string): Promise<void> {
  const all = await getCarouselTemplates();
  await writeCollection(TEMPLATES_KEY, all.filter((t) => t.id !== id));
}

export async function getCarouselTemplateById(id: string): Promise<CarouselTemplate | null> {
  const all = await getCarouselTemplates();
  return all.find((t) => t.id === id) ?? null;
}

// ─── Video Ads ────────────────────────────────────────────────────────────────
const VIDEO_ADS_KEY = "lunia:video-ads";

export async function getVideoAds(): Promise<SavedVideoAd[]> {
  return readCollection<SavedVideoAd>(VIDEO_ADS_KEY);
}

export async function saveVideoAd(ad: SavedVideoAd): Promise<void> {
  const all = await getVideoAds();
  const idx = all.findIndex((a) => a.id === ad.id);
  if (idx >= 0) {
    all[idx] = ad;
  } else {
    all.unshift(ad);
  }
  await writeCollection(VIDEO_ADS_KEY, all);
}

export async function getVideoAdById(id: string): Promise<SavedVideoAd | null> {
  const all = await getVideoAds();
  return all.find((a) => a.id === id) ?? null;
}

export async function deleteVideoAd(id: string): Promise<void> {
  const all = await getVideoAds();
  await writeCollection(VIDEO_ADS_KEY, all.filter((a) => a.id !== id));
}

// ─── Video Assets ─────────────────────────────────────────────────────────────
const VIDEO_ASSETS_KEY = "lunia:video-assets";

export async function getVideoAssets(): Promise<VideoAssetMetadata[]> {
  return readCollection<VideoAssetMetadata>(VIDEO_ASSETS_KEY);
}

export async function saveVideoAsset(asset: VideoAssetMetadata): Promise<void> {
  const all = await getVideoAssets();
  all.unshift(asset);
  await writeCollection(VIDEO_ASSETS_KEY, all);
}

export async function deleteVideoAsset(id: string): Promise<void> {
  const all = await getVideoAssets();
  await writeCollection(VIDEO_ASSETS_KEY, all.filter((a) => a.id !== id));
}

// ─── Email Intelligence ───────────────────────────────────────────────────────
const EMAILS_KEY = "lunia:emails";

export async function getEmails(): Promise<SavedEmail[]> {
  return readCollection<SavedEmail>(EMAILS_KEY);
}

export async function saveEmail(email: SavedEmail): Promise<void> {
  const all = await getEmails();
  const idx = all.findIndex((e) => e.id === email.id);
  if (idx >= 0) {
    all[idx] = email;
  } else {
    all.unshift(email);
  }
  await writeCollection(EMAILS_KEY, all);
}

export async function getEmailById(id: string): Promise<SavedEmail | null> {
  const all = await getEmails();
  return all.find((e) => e.id === id) ?? null;
}

export async function deleteEmailKv(id: string): Promise<void> {
  const all = await getEmails();
  await writeCollection(EMAILS_KEY, all.filter((e) => e.id !== id));
}

// ─── Email Flow Reviews ──────────────────────────────────────────────────────
// Single-key list pattern (same shape as getEmails / getCarousels). Full
// retention — nothing is evicted (see retain() / RETENTION_WARN_THRESHOLD).
const FLOW_REVIEWS_KEY = "lunia:flow_reviews";

export async function getFlowReviews(): Promise<SavedFlowReview[]> {
  return readCollection<SavedFlowReview>(FLOW_REVIEWS_KEY);
}

export async function saveFlowReview(review: SavedFlowReview): Promise<void> {
  const all = await getFlowReviews();
  const idx = all.findIndex((r) => r.id === review.id);
  if (idx >= 0) {
    all[idx] = review;
  } else {
    all.unshift(review);
  }
  await writeCollection(FLOW_REVIEWS_KEY, all);
}

export async function getFlowReviewById(id: string): Promise<SavedFlowReview | null> {
  const all = await getFlowReviews();
  return all.find((r) => r.id === id) ?? null;
}

/**
 * Per-review distributed lock. Reviews live in a single Redis key holding
 * the whole array, so concurrent read-modify-write (e.g. "Generate all
 * images" firing N parallel /generate-image calls) loses updates: each
 * request reads the array, sets its own prompt, and writes the whole thing
 * back — last writer wins, so only one image survives.
 *
 * This serialises the *write* critical section per review. Callers must
 * keep slow work (fal renders, blob mirroring) OUTSIDE the lock so parallel
 * renders still overlap — only the fast KV merge is serialised.
 */
async function withFlowReviewLock<T>(reviewId: string, fn: () => Promise<T>): Promise<T> {
  const r = getRedis();
  const lockKey = `lunia:flow_review_lock:${reviewId}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const lockTtlMs = 10_000;          // auto-expires if a holder crashes
  const maxWaitMs = 20_000;          // give up acquiring after this
  const deadline = Date.now() + maxWaitMs;

  // Spin-acquire with small jittered backoff. The critical section is a
  // couple of Redis round-trips (~ms), so contention clears fast.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ok = await r.set(lockKey, token, "PX", lockTtlMs, "NX");
    if (ok === "OK") break;
    if (Date.now() > deadline) {
      throw new Error(`Timed out acquiring flow-review lock for ${reviewId}`);
    }
    await new Promise((res) => setTimeout(res, 80 + Math.random() * 170));
  }

  try {
    return await fn();
  } finally {
    // Release only if we still own the lock (compare-and-delete via Lua so
    // we never delete a lock a later holder acquired after our TTL lapsed).
    const lua =
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
    try {
      await r.eval(lua, 1, lockKey, token);
    } catch {
      /* lock will expire on its own via PX TTL */
    }
  }
}

/**
 * Atomic read-modify-write of one review. The mutator receives the FRESHEST
 * stored copy (re-read inside the lock, so it includes images other parallel
 * requests already persisted) and returns the next state. Return null to
 * signal "review not found" without writing.
 */
export async function mutateFlowReview(
  id: string,
  mutator: (review: SavedFlowReview) => SavedFlowReview,
): Promise<SavedFlowReview | null> {
  return withFlowReviewLock(id, async () => {
    const all = await getFlowReviews();
    const idx = all.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const next = mutator(all[idx]);
    all[idx] = next;
    await writeCollection(FLOW_REVIEWS_KEY, all);
    return next;
  });
}

export async function deleteFlowReviewKv(id: string): Promise<void> {
  const all = await getFlowReviews();
  await writeCollection(FLOW_REVIEWS_KEY, all.filter((r) => r.id !== id));
}

// ─── UGC Tracker ──────────────────────────────────────────────────────────────
// Mirrors the carousel single-key pattern above. Last-write-wins on concurrent
// edits; single-user tool so the race is accepted. See plan Phase 2 for context.
const UGC_CAMPAIGNS_KEY = "lunia:ugc:campaigns";
const UGC_BRIEFS_KEY = "lunia:ugc:briefs";
const UGC_OUTREACH_KEY = "lunia:ugc:outreach";

export async function getCampaigns(): Promise<UGCCampaign[]> {
  return readCollection<UGCCampaign>(UGC_CAMPAIGNS_KEY);
}

export async function saveCampaign(campaign: UGCCampaign): Promise<void> {
  // last-write-wins: reads current array, mutates, writes back. Single-user tool.
  const all = await getCampaigns();
  const idx = all.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) {
    all[idx] = campaign;
  } else {
    all.unshift(campaign);
  }
  await writeCollection(UGC_CAMPAIGNS_KEY, all);
}

export async function getCampaignById(id: string): Promise<UGCCampaign | null> {
  const all = await getCampaigns();
  return all.find((c) => c.id === id) ?? null;
}

export async function deleteCampaignKv(id: string): Promise<void> {
  const all = await getCampaigns();
  const filtered = all.filter((c) => c.id !== id);
  await writeCollection(UGC_CAMPAIGNS_KEY, filtered);
}

export async function getBriefs(): Promise<UGCBrief[]> {
  const raw = await readCollection<UGCBrief>(UGC_BRIEFS_KEY);
  return raw.map((b) => ({ ...b, caption: b.caption ?? "" }));
}

export async function saveBrief(brief: UGCBrief): Promise<void> {
  const all = await getBriefs();
  const idx = all.findIndex((b) => b.id === brief.id);
  if (idx >= 0) {
    all[idx] = brief;
  } else {
    all.unshift(brief);
  }
  await writeCollection(UGC_BRIEFS_KEY, all);
}

export async function getBriefById(id: string): Promise<UGCBrief | null> {
  const all = await getBriefs();
  return all.find((b) => b.id === id) ?? null;
}

export async function getBriefByPublicId(publicBriefId: string): Promise<UGCBrief | null> {
  const all = await getBriefs();
  return all.find((b) => b.publicBriefId === publicBriefId) ?? null;
}

export async function deleteBriefKv(id: string): Promise<void> {
  const all = await getBriefs();
  await writeCollection(UGC_BRIEFS_KEY, all.filter((b) => b.id !== id));
}

export async function archiveBrief(id: string): Promise<void> {
  const all = await getBriefs();
  const idx = all.findIndex((b) => b.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status: "archived", updatedAt: Date.now() };
    await writeCollection(UGC_BRIEFS_KEY, all);
  }
}

export async function revokeBriefShare(id: string): Promise<void> {
  const all = await getBriefs();
  const idx = all.findIndex((b) => b.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], revokedAt: Date.now(), updatedAt: Date.now() };
    await writeCollection(UGC_BRIEFS_KEY, all);
  }
}

export async function getOutreach(): Promise<string> {
  try {
    return (await redis.get<string>(UGC_OUTREACH_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function setOutreach(text: string): Promise<void> {
  await redis.set(UGC_OUTREACH_KEY, text, { ex: TTL_SECONDS });
}

// Re-export the internal redis wrapper so analytics routes can import { kv }
export const kv = redis;
