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
