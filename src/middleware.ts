import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, authEnforced, authIsConfigured, verifyCookie } from "@/lib/auth";

// Paths that skip auth entirely.
const PUBLIC_PREFIXES = [
  "/login",
  "/api/login",
  "/api/health",
  // Share routes — read-only public pages
  "/carousels/",
  "/scripts/",
  "/ugc/share/",
  "/api/ugc/briefs/share/",
];

export const config = {
  matcher: [
    // Run on everything except static assets & images
    "/((?!_next/static|_next/image|favicon.ico|lunia-logo\\.jpg|robots.txt|sitemap.xml).*)",
  ],
};

function isPublic(pathname: string): boolean {
  if (pathname === "/login") return true;
  for (const p of PUBLIC_PREFIXES) {
    if (pathname === p || pathname.startsWith(p)) return true;
  }
  return false;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const cfg = authIsConfigured();
  if (!cfg.ok) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        `App misconfigured (${cfg.reason}). Set APP_PASSWORD and AUTH_SECRET in the environment.`,
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }
    console.warn(`[middleware] auth not configured (${cfg.reason}) — passing through (dev)`);
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const ok = await verifyCookie(process.env.AUTH_SECRET!, cookie);

  if (!authEnforced()) {
    if (!ok) console.warn(`[middleware] AUTH_ENFORCE=false; allowing ${pathname} without valid cookie`);
    return NextResponse.next();
  }

  if (ok) return NextResponse.next();

  // API request → 401 JSON; browser nav → redirect to /login with ?next=
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname + (search || ""));
  return NextResponse.redirect(url);
}
