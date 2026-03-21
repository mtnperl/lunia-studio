import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

// Fail open if KV env vars are missing (e.g., local dev without Vercel KV)
let generateRatelimit: Ratelimit | null = null;

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  generateRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: false,
    prefix: "lunia-studio:rl:generate",
  });
}

export async function middleware(request: NextRequest) {
  if (!generateRatelimit) return NextResponse.next();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  try {
    const { success, limit, remaining, reset } = await generateRatelimit.limit(ip);

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again in an hour." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    return NextResponse.next();
  } catch {
    // KV error — fail open rather than blocking all requests
    console.warn("[middleware] Rate limit check failed — failing open");
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/generate"],
};
