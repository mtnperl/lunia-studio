import { describe, expect, it } from "vitest";
import { falErrorMessage, isFalAccountError } from "./fal-error";

// The shape fal's client threw in production on 2026-10-30.
function lockedAccountError() {
  return Object.assign(new Error("Forbidden"), {
    status: 403,
    body: { detail: "User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing." },
  });
}

describe("falErrorMessage", () => {
  it("returns fal's own sentence instead of the bare status text", () => {
    expect(falErrorMessage(lockedAccountError())).toBe(
      "User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing.",
    );
  });

  it("joins validation messages when detail is a list", () => {
    const err = Object.assign(new Error("Unprocessable Entity"), {
      status: 422,
      body: { detail: [{ msg: "prompt too long" }, "image_size invalid", { loc: ["x"] }] },
    });
    expect(falErrorMessage(err)).toBe("prompt too long; image_size invalid");
  });

  it("falls back to the error message, then to a string", () => {
    expect(falErrorMessage(new Error("boom"))).toBe("boom");
    expect(falErrorMessage(Object.assign(new Error("Bad"), { body: { detail: "  " } }))).toBe("Bad");
    expect(falErrorMessage("plain")).toBe("plain");
    expect(falErrorMessage(null)).toBe("null");
  });
});

describe("isFalAccountError", () => {
  it("is true for auth, billing and permission failures", () => {
    expect(isFalAccountError(lockedAccountError())).toBe(true);
    expect(isFalAccountError({ status: 401 })).toBe(true);
    expect(isFalAccountError({ status: 402 })).toBe(true);
  });

  it("is false for request-level and unknown failures", () => {
    expect(isFalAccountError({ status: 422 })).toBe(false);
    expect(isFalAccountError({ status: 500 })).toBe(false);
    expect(isFalAccountError(new Error("boom"))).toBe(false);
    expect(isFalAccountError(null)).toBe(false);
  });
});
