// A batch of eight emails once rendered eight rows reading "Unauthorized",
// each with a Retry button that could never succeed: the session cookie had
// expired mid-run and every /api/* call was answered 401 by the middleware.
// Retrying is the one thing that cannot help, so the answer is to go and log
// in — but only for the case that actually means that.
import { describe, it, expect } from "vitest";
import { loginRedirectFor } from "@/lib/session-redirect";

const base = {
  status: 401,
  requestUrl: "/api/campaign/restructure",
  origin: "https://lunia-studio.vercel.app",
  currentPath: "/",
  currentSearch: "",
};

describe("loginRedirectFor", () => {
  it("redirects on a 401 from this app's API", () => {
    expect(loginRedirectFor(base)).toBe("/login?next=%2F");
  });

  it("carries the current location so the work is not lost", () => {
    expect(loginRedirectFor({ ...base, currentPath: "/", currentSearch: "?tab=campaign" }))
      .toBe("/login?next=%2F%3Ftab%3Dcampaign");
  });

  it("ignores every status but 401", () => {
    for (const status of [200, 400, 403, 404, 422, 429, 500, 503]) {
      expect(loginRedirectFor({ ...base, status })).toBeNull();
    }
  });

  it("leaves the login form's own 401 alone", () => {
    // PasswordGate renders "wrong password" off this exact response. A
    // redirect here would replace that message with a reload.
    expect(loginRedirectFor({ ...base, requestUrl: "/api/login" })).toBeNull();
  });

  it("does not bounce a page that is already the login page", () => {
    expect(loginRedirectFor({ ...base, currentPath: "/login" })).toBeNull();
  });

  it("ignores a 401 from anywhere but this app's API", () => {
    // A third party's expired token is that caller's problem to render.
    expect(loginRedirectFor({ ...base, requestUrl: "https://api.stripe.com/v1/x" })).toBeNull();
    expect(loginRedirectFor({ ...base, requestUrl: "https://fal.media/thing" })).toBeNull();
    // Same origin, but not the API — a page navigation, not a data call.
    expect(loginRedirectFor({ ...base, requestUrl: "/carousels/abc" })).toBeNull();
  });

  it("handles an absolute same-origin URL the same as a relative one", () => {
    expect(loginRedirectFor({ ...base, requestUrl: `${base.origin}/api/campaign/save` }))
      .toBe("/login?next=%2F");
  });

  it("returns null rather than throwing on a URL it cannot parse", () => {
    expect(loginRedirectFor({ ...base, requestUrl: "::::" })).toBeNull();
  });
});
