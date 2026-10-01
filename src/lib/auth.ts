// Edge-compatible HMAC cookie signing. No Node `crypto` imports — Web Crypto only.

const COOKIE_NAME = "lunia_auth";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const AUTH_COOKIE_MAX_AGE = COOKIE_MAX_AGE_SECONDS;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signCookie(secret: string, expiresAt: number): Promise<string> {
  const payload = String(expiresAt);
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(secret), new TextEncoder().encode(payload)),
  );
  return `${payload}.${b64url(mac)}`;
}

export async function verifyCookie(secret: string, cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  const dot = cookie.indexOf(".");
  if (dot <= 0) return false;
  const payload = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  let mac: Uint8Array;
  try {
    mac = b64urlDecode(sig);
  } catch {
    return false;
  }
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      mac as unknown as ArrayBuffer,
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

export function authIsConfigured(): { ok: boolean; reason?: string } {
  if (!process.env.AUTH_SECRET) return { ok: false, reason: "AUTH_SECRET unset" };
  if (!process.env.APP_PASSWORD) return { ok: false, reason: "APP_PASSWORD unset" };
  return { ok: true };
}

export function authEnforced(): boolean {
  // Default: enforce. Only the literal string "false" disables enforcement.
  return process.env.AUTH_ENFORCE !== "false";
}

// ── Machine access (Muze) ────────────────────────────────────────────────────
// One static key, sent as `Authorization: Bearer <key>` or `x-api-key: <key>`,
// valid only for the method + path allowlist below. Everything else (delete,
// Klaviyo push, admin, business, Shopify) stays cookie-only.

type MachineRoute = { method: string; path: RegExp };

export const MUZE_ROUTES: MachineRoute[] = [
  { method: "GET", path: /^\/api\/assets$/ },
  { method: "GET", path: /^\/api\/campaign\/library$/ },
  { method: "GET", path: /^\/api\/campaign\/[^/]+$/ },
  { method: "POST", path: /^\/api\/campaign\/generate$/ },
  { method: "POST", path: /^\/api\/campaign\/save$/ },
  { method: "GET", path: /^\/api\/carousel-v2\/library$/ },
  { method: "GET", path: /^\/api\/carousel-v2\/[^/]+$/ },
  { method: "POST", path: /^\/api\/carousel-v2\/generate$/ },
  { method: "POST", path: /^\/api\/carousel-v2\/save$/ },
  // Edit a saved carousel in place (hook, subline, slides, CTA, caption).
  { method: "PATCH", path: /^\/api\/carousel-v2\/[^/]+$/ },
  // Image generation. Each route is behind the 100/hour per-IP "images" rate limit.
  { method: "POST", path: /^\/api\/campaign\/generate-image$/ },
  { method: "POST", path: /^\/api\/carousel-v2\/generate-image$/ },
  { method: "POST", path: /^\/api\/carousel-v2\/generate-slide-bg$/ },
];

export function isMuzeRoute(method: string, pathname: string): boolean {
  return MUZE_ROUTES.some((r) => r.method === method && r.path.test(pathname));
}

function presentedKey(headers: Headers): string | null {
  const bearer = headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return (bearer ?? headers.get("x-api-key"))?.trim() || null;
}

// Compare HMACs of both values so the check is constant-time and length-blind.
export async function muzeKeyIsValid(headers: Headers): Promise<boolean> {
  const expected = process.env.MUZE_API_KEY;
  const given = presentedKey(headers);
  if (!expected || expected.length < 24 || !given) return false;
  const k = await key("muze-key-compare");
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.sign("HMAC", k, enc.encode(expected)),
    crypto.subtle.sign("HMAC", k, enc.encode(given)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}
