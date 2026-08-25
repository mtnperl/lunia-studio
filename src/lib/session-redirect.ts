// Where a response should send you, if anywhere. Pure so the edge cases are
// testable without a browser, a live 401, or a configured auth secret.

type Args = {
  status: number;
  /** The URL as passed to fetch — absolute, relative, or protocol-relative. */
  requestUrl: string;
  origin: string;
  currentPath: string;
  currentSearch: string;
};

/**
 * The login URL to send the user to, or null to leave the response alone.
 *
 * Redirects on exactly one case: a 401 from this app's own API. Everything
 * else is somebody else's error to render, and bouncing the page over it
 * would be a worse bug than the one this fixes.
 */
export function loginRedirectFor({
  status, requestUrl, origin, currentPath, currentSearch,
}: Args): string | null {
  if (status !== 401) return null;

  let url: URL;
  try {
    url = new URL(requestUrl, origin);
  } catch {
    return null;
  }
  // Cross-origin 401s belong to whoever called them — an expired token on a
  // third-party API is not a reason to log the user out of this app.
  if (url.origin !== origin) return null;
  if (!url.pathname.startsWith("/api/")) return null;
  // The login form posts here and renders its own "wrong password" message.
  // Redirecting would swallow it and reload the page the user is already on.
  if (url.pathname === "/api/login") return null;
  // Already there.
  if (currentPath === "/login") return null;

  return `/login?next=${encodeURIComponent(currentPath + currentSearch)}`;
}
