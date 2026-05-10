import { getFlow, hasReadAccess, KlaviyoAuthError, KlaviyoNotFoundError, KlaviyoRateLimitError } from "@/lib/klaviyo";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "klaviyo");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!hasReadAccess()) return Response.json({ error: "KLAVIYO_API_KEY not set", code: "no_key" }, { status: 503 });
  try {
    const { id } = await params;
    if (!id) return Response.json({ error: "missing flow id" }, { status: 400 });
    const flow = await getFlow(id);
    return Response.json({ flow });
  } catch (err) {
    if (err instanceof KlaviyoNotFoundError) return Response.json({ error: err.message }, { status: 404 });
    if (err instanceof KlaviyoAuthError) return Response.json({ error: err.message, code: "auth" }, { status: 401 });
    if (err instanceof KlaviyoRateLimitError) return Response.json({ error: err.message, code: "rate_limit", retryAfterSec: err.retryAfterSec }, { status: 429 });
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/klaviyo/flows/[id]]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
