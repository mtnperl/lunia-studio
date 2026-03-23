import Redis from "ioredis";
import { Script, SavedCarousel, AssetMetadata, Subject, CarouselTemplate } from "./types";

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

// Rate limiting: fixed window, 10 req/hr per IP per bucket
export async function checkRateLimit(ip: string, bucket = "generate"): Promise<boolean> {
  try {
    const key = `lunia:rl:${bucket}:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600);
    return count <= 10;
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
    // Reseed if empty OR if stored count is less than the canonical defaults
    if (stored && stored.length >= DEFAULT_SUBJECTS.length) return stored;
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
