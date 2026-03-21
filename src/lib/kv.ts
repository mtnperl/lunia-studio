import Redis from "ioredis";
import { Script } from "./types";

// Supports both Vercel KV (KV_REST_API_URL) and standard Redis (REDIS_URL)
// Lazily initialized so module evaluation at build time doesn't throw.
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "Missing Redis environment variable: set KV_REST_API_URL or REDIS_URL"
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

// Rate limiting: fixed window, 10 req/hr per IP
export async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const key = `lunia:rl:generate:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600);
    return count <= 10;
  } catch {
    return true; // fail open on Redis error
  }
}
