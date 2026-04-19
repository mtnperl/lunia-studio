import { describe, it, expect, beforeAll } from "vitest";
import { signCookie, verifyCookie } from "./lib/auth";

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
