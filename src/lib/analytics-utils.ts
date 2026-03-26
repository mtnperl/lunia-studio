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
