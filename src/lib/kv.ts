import Redis from "ioredis";
import { Script, SavedCarousel, AssetMetadata, Subject, CarouselTemplate, SavedVideoAd, VideoAssetMetadata, SavedEmail, UGCCampaign, UGCBrief } from "./types";

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

const redis = {
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

export async function getScripts(): Promise<Script[]> {
  try {
    const scripts = await redis.get<Script[]>(SCRIPTS_KEY);
    return scripts ?? [];
  } catch {
    return [];
  }
}

export async function saveScriptKv(script: Script): Promise<void> {
  const scripts = await getScripts();
  const idx = scripts.findIndex((s) => s.id === script.id);
  if (idx >= 0) {
    scripts[idx] = script;
  } else {
    scripts.unshift(script);
  }
  await redis.set(SCRIPTS_KEY, scripts, { ex: TTL_SECONDS });
}

export async function getScriptById(id: string): Promise<Script | null> {
  const scripts = await getScripts();
  return scripts.find((s) => s.id === id) ?? null;
}

export async function deleteScriptKv(id: string): Promise<void> {
  const scripts = await getScripts();
  const filtered = scripts.filter((s) => s.id !== id);
  await redis.set(SCRIPTS_KEY, filtered, { ex: TTL_SECONDS });
}

// Rate limiting: fixed window per IP per bucket
const RATE_LIMITS: Record<string, number> = {
  generate: 20,   // script generation
  carousel: 50,   // carousel generation + slide regen
  graphic: 100,   // infographic regen (cheap Claude calls, used frequently)
  images: 100,    // fal.ai image generation
  "ugc-caption": 100, // UGC caption drafts
  "ugc-import": 10,   // CSV imports
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
  try {
    return (await redis.get<SavedCarousel[]>(CAROUSELS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveCarousel(carousel: SavedCarousel): Promise<void> {
  const all = await getCarousels();
  const idx = all.findIndex((c) => c.id === carousel.id);
  if (idx >= 0) {
    all[idx] = carousel;
  } else {
    all.unshift(carousel);
  }
  await redis.set(CAROUSELS_KEY, all.slice(0, 100), { ex: TTL_SECONDS });
}

export async function getCarouselById(id: string): Promise<SavedCarousel | null> {
  const all = await getCarousels();
  return all.find((c) => c.id === id) ?? null;
}

export async function deleteCarouselKv(id: string): Promise<void> {
  const all = await getCarousels();
  const filtered = all.filter((c) => c.id !== id);
  await redis.set(CAROUSELS_KEY, filtered, { ex: TTL_SECONDS });
}

// ─── Asset metadata ───────────────────────────────────────────────────────────
const ASSETS_KEY = "lunia:assets";

export async function getAssets(): Promise<AssetMetadata[]> {
  try {
    return (await redis.get<AssetMetadata[]>(ASSETS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveAsset(asset: AssetMetadata): Promise<void> {
  const all = await getAssets();
  all.unshift(asset);
  await redis.set(ASSETS_KEY, all, { ex: TTL_SECONDS });
}

export async function deleteAsset(id: string): Promise<void> {
  const all = await getAssets();
  const filtered = all.filter((a) => a.id !== id);
  await redis.set(ASSETS_KEY, filtered, { ex: TTL_SECONDS });
}

// ─── Subjects ─────────────────────────────────────────────────────────────────
const SUBJECTS_KEY = "lunia:subjects";

export async function getSubjects(): Promise<Subject[]> {
  try {
    const { DEFAULT_SUBJECTS } = await import("./default-subjects");
    const stored = await redis.get<Subject[]>(SUBJECTS_KEY);
    // Only auto-seed when there's nothing stored (first run). Respect manual deletes.
    if (stored && stored.length > 0) return stored;
    // Preserve usedAt flags when reseeding
    const usedMap = new Map((stored ?? []).map((s) => [s.text, s.usedAt]));
    const seeded = DEFAULT_SUBJECTS.map((s) => {
      const usedAt = usedMap.get(s.text);
      return usedAt ? { ...s, usedAt } : s;
    });
    await redis.set(SUBJECTS_KEY, seeded, { ex: TTL_SECONDS });
    return seeded;
  } catch {
    // Redis unavailable (e.g. local dev without KV_URL) — return defaults in-memory
    const { DEFAULT_SUBJECTS } = await import("./default-subjects").catch(() => ({ DEFAULT_SUBJECTS: [] as Subject[] }));
    return DEFAULT_SUBJECTS;
  }
}

export async function saveSubjects(subjects: Subject[]): Promise<void> {
  await redis.set(SUBJECTS_KEY, subjects, { ex: TTL_SECONDS });
}

export async function updateSubject(id: string, text: string): Promise<void> {
  const all = await getSubjects();
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], text };
    await redis.set(SUBJECTS_KEY, all, { ex: TTL_SECONDS });
  }
}

export async function markSubjectUsed(id: string): Promise<void> {
  const all = await getSubjects();
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], usedAt: new Date().toISOString() };
    await redis.set(SUBJECTS_KEY, all, { ex: TTL_SECONDS });
  }
}

export async function markSubjectUnused(id: string): Promise<void> {
  const all = await getSubjects();
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    const { usedAt: _removed, ...rest } = all[idx];
    all[idx] = rest;
    await redis.set(SUBJECTS_KEY, all, { ex: TTL_SECONDS });
  }
}

export async function deleteSubject(id: string): Promise<void> {
  const all = await getSubjects();
  const filtered = all.filter((s) => s.id !== id);
  await redis.set(SUBJECTS_KEY, filtered, { ex: TTL_SECONDS });
}

// ─── Carousel Templates ───────────────────────────────────────────────────────
const TEMPLATES_KEY = "lunia:carousel-templates";

export async function getCarouselTemplates(): Promise<CarouselTemplate[]> {
  try {
    return (await redis.get<CarouselTemplate[]>(TEMPLATES_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveCarouselTemplate(template: CarouselTemplate): Promise<void> {
  const all = await getCarouselTemplates();
  const idx = all.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    all[idx] = template;
  } else {
    all.unshift(template);
  }
  await redis.set(TEMPLATES_KEY, all, { ex: TTL_SECONDS });
}

export async function deleteCarouselTemplate(id: string): Promise<void> {
  const all = await getCarouselTemplates();
  await redis.set(TEMPLATES_KEY, all.filter((t) => t.id !== id), { ex: TTL_SECONDS });
}

export async function getCarouselTemplateById(id: string): Promise<CarouselTemplate | null> {
  const all = await getCarouselTemplates();
  return all.find((t) => t.id === id) ?? null;
}

// ─── Video Ads ────────────────────────────────────────────────────────────────
const VIDEO_ADS_KEY = "lunia:video-ads";

export async function getVideoAds(): Promise<SavedVideoAd[]> {
  try {
    return (await redis.get<SavedVideoAd[]>(VIDEO_ADS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveVideoAd(ad: SavedVideoAd): Promise<void> {
  const all = await getVideoAds();
  const idx = all.findIndex((a) => a.id === ad.id);
  if (idx >= 0) {
    all[idx] = ad;
  } else {
    all.unshift(ad);
  }
  await redis.set(VIDEO_ADS_KEY, all.slice(0, 100), { ex: TTL_SECONDS });
}

export async function getVideoAdById(id: string): Promise<SavedVideoAd | null> {
  const all = await getVideoAds();
  return all.find((a) => a.id === id) ?? null;
}

export async function deleteVideoAd(id: string): Promise<void> {
  const all = await getVideoAds();
  await redis.set(VIDEO_ADS_KEY, all.filter((a) => a.id !== id), { ex: TTL_SECONDS });
}

// ─── Video Assets ─────────────────────────────────────────────────────────────
const VIDEO_ASSETS_KEY = "lunia:video-assets";

export async function getVideoAssets(): Promise<VideoAssetMetadata[]> {
  try {
    return (await redis.get<VideoAssetMetadata[]>(VIDEO_ASSETS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveVideoAsset(asset: VideoAssetMetadata): Promise<void> {
  const all = await getVideoAssets();
  all.unshift(asset);
  await redis.set(VIDEO_ASSETS_KEY, all, { ex: TTL_SECONDS });
}

export async function deleteVideoAsset(id: string): Promise<void> {
  const all = await getVideoAssets();
  await redis.set(VIDEO_ASSETS_KEY, all.filter((a) => a.id !== id), { ex: TTL_SECONDS });
}

// ─── Email Intelligence ───────────────────────────────────────────────────────
const EMAILS_KEY = "lunia:emails";

export async function getEmails(): Promise<SavedEmail[]> {
  try {
    return (await redis.get<SavedEmail[]>(EMAILS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveEmail(email: SavedEmail): Promise<void> {
  const all = await getEmails();
  const idx = all.findIndex((e) => e.id === email.id);
  if (idx >= 0) {
    all[idx] = email;
  } else {
    all.unshift(email);
  }
  await redis.set(EMAILS_KEY, all.slice(0, 50), { ex: TTL_SECONDS });
}

export async function getEmailById(id: string): Promise<SavedEmail | null> {
  const all = await getEmails();
  return all.find((e) => e.id === id) ?? null;
}

export async function deleteEmailKv(id: string): Promise<void> {
  const all = await getEmails();
  await redis.set(EMAILS_KEY, all.filter((e) => e.id !== id), { ex: TTL_SECONDS });
}

// ─── UGC Tracker ──────────────────────────────────────────────────────────────
// Mirrors the carousel single-key pattern above. Last-write-wins on concurrent
// edits; single-user tool so the race is accepted. See plan Phase 2 for context.
const UGC_CAMPAIGNS_KEY = "lunia:ugc:campaigns";
const UGC_BRIEFS_KEY = "lunia:ugc:briefs";
const UGC_OUTREACH_KEY = "lunia:ugc:outreach";

export async function getCampaigns(): Promise<UGCCampaign[]> {
  try {
    return (await redis.get<UGCCampaign[]>(UGC_CAMPAIGNS_KEY)) ?? [];
  } catch {
    return [];
  }
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
  await redis.set(UGC_CAMPAIGNS_KEY, all.slice(0, 24), { ex: TTL_SECONDS });
}

export async function getCampaignById(id: string): Promise<UGCCampaign | null> {
  const all = await getCampaigns();
  return all.find((c) => c.id === id) ?? null;
}

export async function deleteCampaignKv(id: string): Promise<void> {
  const all = await getCampaigns();
  const filtered = all.filter((c) => c.id !== id);
  await redis.set(UGC_CAMPAIGNS_KEY, filtered, { ex: TTL_SECONDS });
}

export async function getBriefs(): Promise<UGCBrief[]> {
  try {
    return (await redis.get<UGCBrief[]>(UGC_BRIEFS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveBrief(brief: UGCBrief): Promise<void> {
  const all = await getBriefs();
  const idx = all.findIndex((b) => b.id === brief.id);
  if (idx >= 0) {
    all[idx] = brief;
  } else {
    all.unshift(brief);
  }
  await redis.set(UGC_BRIEFS_KEY, all.slice(0, 500), { ex: TTL_SECONDS });
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
  await redis.set(UGC_BRIEFS_KEY, all.filter((b) => b.id !== id), { ex: TTL_SECONDS });
}

export async function archiveBrief(id: string): Promise<void> {
  const all = await getBriefs();
  const idx = all.findIndex((b) => b.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status: "archived", updatedAt: Date.now() };
    await redis.set(UGC_BRIEFS_KEY, all, { ex: TTL_SECONDS });
  }
}

export async function revokeBriefShare(id: string): Promise<void> {
  const all = await getBriefs();
  const idx = all.findIndex((b) => b.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], revokedAt: Date.now(), updatedAt: Date.now() };
    await redis.set(UGC_BRIEFS_KEY, all, { ex: TTL_SECONDS });
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
