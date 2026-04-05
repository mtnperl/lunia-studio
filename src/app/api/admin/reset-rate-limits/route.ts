import { clearRateLimits } from "@/lib/kv";

export async function POST() {
  try {
    const deleted = await clearRateLimits();
    return Response.json({ ok: true, deleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
