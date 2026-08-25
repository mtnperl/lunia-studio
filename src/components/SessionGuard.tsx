"use client";

// Sends you to the login screen when the session has expired, instead of
// letting every request fail in place.
//
// The auth cookie carries a FIXED expiry stamped at login (7 days, never
// refreshed on activity — see lib/auth.ts), so it does not lapse while you are
// idle, it lapses while you are working. From that moment the middleware
// answers every /api/* call with 401 {"error":"Unauthorized"}, and each caller
// renders that string wherever it puts errors. A batch of eight emails becomes
// eight rows reading "Unauthorized", each with a Retry button that cannot
// succeed no matter how many times it is pressed, because the problem is not
// the request.
//
// Patching window.fetch rather than adding a helper to ~60 call sites: the
// point is to catch the ones nobody remembers to update, including the ones
// written after this. The patch is deliberately narrow — it inspects the
// response, never the request, and changes nothing but the one case below.
import { useEffect } from "react";
import { loginRedirectFor } from "@/lib/session-redirect";

/** Marks the patch so a remount (fast refresh, route change) cannot install a
 *  second layer of wrappers around the first. */
const PATCHED = Symbol.for("lunia.sessionGuard.patched");

export default function SessionGuard() {
  useEffect(() => {
    const w = window as typeof window & { fetch: typeof fetch & { [PATCHED]?: true } };
    if (w.fetch[PATCHED]) return;

    const original = w.fetch;
    const patched: typeof fetch = async (...args) => {
      const res = await original(...args);
      const target = loginRedirectFor({
        status: res.status,
        requestUrl:
          typeof args[0] === "string" ? args[0]
          : args[0] instanceof Request ? args[0].url
          : String(args[0]),
        origin: window.location.origin,
        currentPath: window.location.pathname,
        currentSearch: window.location.search,
      });
      if (target) window.location.href = target;
      return res;
    };
    (patched as typeof patched & { [PATCHED]?: true })[PATCHED] = true;
    w.fetch = patched as typeof w.fetch;

    // Deliberately never restored. Unpatching on unmount would race any
    // request still in flight, and this component lives for the life of the
    // document anyway.
  }, []);

  return null;
}
