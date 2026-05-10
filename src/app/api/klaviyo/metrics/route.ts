import { getFlowMetrics, hasReadAccess, KlaviyoAuthError, KlaviyoRateLimitError } from "@/lib/klaviyo";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 30;

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "klaviyo");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!hasReadAccess()) return Response.json({ error: "KLAVIYO_API_KEY not set", code: "no_key" }, { status: 503 });
  try {
    const url = new URL(req.url);
    const flowId = url.searchParams.get("flowId");
    const days = Math.min(parseInt(url.searchParams.get("days") ?? "60", 10) || 60, 365);
    if (!flowId) return Response.json({ error: "missing flowId" }, { status: 400 });
    const metrics = await getFlowMetrics(flowId, days);
    return Response.json({ metrics });
  } catch (err) {
    if (err instanceof KlaviyoAuthError) return Response.json({ error: err.message, code: "auth" }, { status: 401 });
    if (err instanceof KlaviyoRateLimitError) return Response.json({ error: err.message, code: "rate_limit", retryAfterSec: err.retryAfterSec }, { status: 429 });
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/klaviyo/metrics]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
