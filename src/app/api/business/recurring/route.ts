import { kv } from "@/lib/kv";
import { fetchSimpleFin } from "@/lib/simplefin-client";
import { detectRecurring, type RecurringExpense } from "@/lib/recurring-detector";
import type { Categorization } from "@/lib/business-types";

export const maxDuration = 60;

const WINDOW_DAYS = 180;
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bust = url.searchParams.get("bust") === "1";

  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl) {
    return Response.json({
      recurring: [],
      monthlyTotal: 0,
      windowDays: WINDOW_DAYS,
      reason: "simplefin_not_connected",
    });
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const since = new Date(todayUtc.getTime() - (WINDOW_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  const until = todayUtc.toISOString().slice(0, 10);

  const cacheKey = `business:recurring:v1:${since}_${until}`;
  if (!bust) {
    try {
      const cached = await kv.get<{
        recurring: RecurringExpense[];
        monthlyTotal: number;
        windowDays: number;
        computedAt: string;
      }>(cacheKey);
      if (cached) return Response.json(cached);
    } catch {
      /* KV unavailable — fall through */
    }
  }

  try {
    const data = await fetchSimpleFin(accessUrl, since, until);
    const txns = data.transactions;

    // Pull every cached categorization for the window so detected groups can
    // tag themselves with a category. Missing → uncategorized.
    const categorizations = new Map<string, Categorization>();
    await Promise.all(
      txns.map(async (t) => {
        try {
          const cat = await kv.get<Categorization>(`simplefin:cat:v2:${t.id}`);
          if (cat) categorizations.set(t.id, cat);
        } catch {
          /* ignore */
        }
      })
    );

    const recurring = detectRecurring(txns, categorizations);
    const monthlyTotal = recurring.reduce((s, r) => s + r.monthlyImpact, 0);

    const payload = {
      recurring,
      monthlyTotal,
      windowDays: WINDOW_DAYS,
      computedAt: new Date().toISOString(),
    };

    try {
      await kv.set(cacheKey, payload, { ex: CACHE_TTL_SECONDS });
    } catch {
      /* skip cache write */
    }

    console.log(
      "[api/business/recurring] window=%dd txns=%d detected=%d monthly_total=$%.0f",
      WINDOW_DAYS,
      txns.length,
      recurring.length,
      monthlyTotal
    );

    return Response.json(payload);
  } catch (err) {
    console.error("[api/business/recurring] error", err);
    return Response.json(
      { error: "Could not detect recurring expenses" },
      { status: 502 }
    );
  }
}
