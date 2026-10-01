import { describe, it, expect, beforeAll } from "vitest";
import { isMuzeRoute, muzeKeyIsValid, signCookie, verifyCookie } from "./lib/auth";

const SECRET = "test-secret-do-not-use-in-prod";

describe("auth cookie", () => {
  beforeAll(() => {
    // Web Crypto is on globalThis in Node 20+.
    if (!globalThis.crypto?.subtle) throw new Error("Web Crypto not available in test runtime");
  });

  it("verifies a freshly-signed cookie", async () => {
    const expiresAt = Date.now() + 60_000;
    const value = await signCookie(SECRET, expiresAt);
    expect(await verifyCookie(SECRET, value)).toBe(true);
  });

  it("rejects a missing cookie", async () => {
    expect(await verifyCookie(SECRET, undefined)).toBe(false);
    expect(await verifyCookie(SECRET, "")).toBe(false);
  });

  it("rejects a tampered cookie", async () => {
    const value = await signCookie(SECRET, Date.now() + 60_000);
    const [payload, sig] = value.split(".");
    const tamperedPayload = `${Number(payload) + 1}.${sig}`;
    expect(await verifyCookie(SECRET, tamperedPayload)).toBe(false);
  });

  it("rejects an expired cookie", async () => {
    const value = await signCookie(SECRET, Date.now() - 1000);
    expect(await verifyCookie(SECRET, value)).toBe(false);
  });

  it("rejects a cookie signed with a different secret", async () => {
    const value = await signCookie(SECRET, Date.now() + 60_000);
    expect(await verifyCookie("different-secret", value)).toBe(false);
  });

  it("rejects malformed cookies", async () => {
    expect(await verifyCookie(SECRET, "no-dot")).toBe(false);
    expect(await verifyCookie(SECRET, ".only-sig")).toBe(false);
    expect(await verifyCookie(SECRET, "not-a-number.sig")).toBe(false);
  });
});

describe("muze machine access", () => {
  const KEY = "k".repeat(32);
  const headers = (h: Record<string, string>) => new Headers(h);

  it("allows only the listed method + path pairs", () => {
    expect(isMuzeRoute("GET", "/api/assets")).toBe(true);
    expect(isMuzeRoute("POST", "/api/campaign/generate")).toBe(true);
    expect(isMuzeRoute("GET", "/api/carousel-v2/abc123")).toBe(true);
    expect(isMuzeRoute("PATCH", "/api/carousel-v2/abc123")).toBe(true);
    expect(isMuzeRoute("POST", "/api/campaign/generate-image")).toBe(true);
    expect(isMuzeRoute("POST", "/api/carousel-v2/generate-image")).toBe(true);
    expect(isMuzeRoute("POST", "/api/carousel-v2/generate-slide-bg")).toBe(true);
    expect(isMuzeRoute("PATCH", "/api/campaign/abc123")).toBe(false);
    expect(isMuzeRoute("PUT", "/api/carousel-v2/abc123")).toBe(false);    expect(isMuzeRoute("DELETE", "/api/campaign/abc123")).toBe(false);
    expect(isMuzeRoute("DELETE", "/api/carousel-v2/abc123")).toBe(false);
    expect(isMuzeRoute("POST", "/api/campaign/klaviyo")).toBe(false);
    expect(isMuzeRoute("GET", "/api/shopify")).toBe(false);
    expect(isMuzeRoute("GET", "/api/admin/blob-cleanup")).toBe(false);
  });

  it("accepts the key as Bearer or x-api-key", async () => {
    process.env.MUZE_API_KEY = KEY;
    expect(await muzeKeyIsValid(headers({ authorization: `Bearer ${KEY}` }))).toBe(true);
    expect(await muzeKeyIsValid(headers({ "x-api-key": KEY }))).toBe(true);
  });

  it("rejects a wrong, missing, or unconfigured key", async () => {
    process.env.MUZE_API_KEY = KEY;
    expect(await muzeKeyIsValid(headers({ authorization: "Bearer nope" }))).toBe(false);
    expect(await muzeKeyIsValid(headers({}))).toBe(false);
    delete process.env.MUZE_API_KEY;
    expect(await muzeKeyIsValid(headers({ authorization: `Bearer ${KEY}` }))).toBe(false);
    process.env.MUZE_API_KEY = "short";
    expect(await muzeKeyIsValid(headers({ authorization: "Bearer short" }))).toBe(false);
    delete process.env.MUZE_API_KEY;
  });
});
