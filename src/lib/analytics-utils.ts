import type { MetaAdInsight, ShopifyDayRow, CombinedDayRow } from './types';

/** Revenue / spend. Returns 0 when spend is 0 (NaN guard). */
export function calcROAS(spend: number, revenue: number): number {
  return spend > 0 ? revenue / spend : 0;
}

/** Revenue / orders. Returns 0 when orders is 0 (div/0 guard). */
export function calcAOV(orders: number, revenue: number): number {
  return orders > 0 ? revenue / orders : 0;
}

/**
 * Left-join Meta days → Shopify days.
 * Meta is authoritative for the date range.
 * Shopify-only days (organic, no ad spend) are intentionally excluded.
 */
export function joinDays(
  metaDays: MetaAdInsight[],
  shopifyDays: ShopifyDayRow[]
): CombinedDayRow[] {
  const shopifyMap = new Map(shopifyDays.map(d => [d.date, d]));
  return metaDays
    .map(m => ({
      date: m.date,
      spend: m.spend,
      shopifyRevenue: shopifyMap.get(m.date)?.revenue ?? 0,
      shopifyOrders: shopifyMap.get(m.date)?.orders ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Compute YYYY-MM-DD start/end for a rolling N-day window in UTC. */
export function computeDateRange(days: number): { start: string; end: string } {
  return {
    start: new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolve `since`/`until` query params (YYYY-MM-DD, UTC) with a `days` fallback.
 * Validates ordering and caps span to MAX_RANGE_DAYS.
 */
export function resolveRangeParams(
  url: URL,
  opts: { defaultDays?: number; maxDays?: number } = {}
): { since: string; until: string; days: number } | { error: string } {
  const defaultDays = opts.defaultDays ?? 30;
  const maxDays = opts.maxDays ?? 400;

  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");

  let resolvedSince: string;
  let resolvedUntil: string;

  if (since && until) {
    if (!ISO_DATE.test(since) || !ISO_DATE.test(until)) {
      return { error: "since/until must be YYYY-MM-DD" };
    }
    if (since > until) {
      return { error: "since must be before or equal to until" };
    }
    resolvedSince = since;
    resolvedUntil = until;
  } else {
    const daysParam = url.searchParams.get("days") ?? String(defaultDays);
    const days = parseInt(daysParam, 10);
    if (!Number.isFinite(days) || days < 1) {
      return { error: "days must be a positive integer" };
    }
    const range = computeDateRange(days);
    resolvedSince = range.start;
    resolvedUntil = range.end;
  }

  const days = Math.round(
    (Date.parse(resolvedUntil + "T00:00:00Z") - Date.parse(resolvedSince + "T00:00:00Z")) / 86_400_000
  ) + 1;

  if (days > maxDays) {
    return { error: `range exceeds max of ${maxDays} days` };
  }

  return { since: resolvedSince, until: resolvedUntil, days };
}
