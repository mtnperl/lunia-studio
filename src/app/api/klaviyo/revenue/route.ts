import { getOwnedChannelRevenue, hasReadAccess, KlaviyoAuthError, KlaviyoRateLimitError } from "@/lib/klaviyo";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 30;

// Valid Klaviyo reporting timeframe keys we accept (max 1 year).
const ALLOWED_TIMEFRAMES = new Set([
  "last_7_days", "last_30_days", "last_90_days", "last_365_days",
  "last_12_months", "last_3_months", "this_month", "last_month",
]);

export async function GET(req: Request): Promise<Response> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "klaviyo");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!hasReadAccess()) return Response.json({ error: "KLAVIYO_API_KEY not set", code: "no_key" }, { status: 503 });

  const tfParam = new URL(req.url).searchParams.get("timeframe") ?? "last_90_days";
  const timeframe = ALLOWED_TIMEFRAMES.has(tfParam) ? tfParam : "last_90_days";

  try {
    const data = await getOwnedChannelRevenue(timeframe);
    return Response.json(data);
  } catch (err) {
    if (err instanceof KlaviyoAuthError) return Response.json({ error: err.message, code: "auth" }, { status: 401 });
    if (err instanceof KlaviyoRateLimitError) {
      return Response.json({ error: err.message, code: "rate_limit", retryAfterSec: err.retryAfterSec }, { status: 429 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/klaviyo/revenue]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
