import { kv } from '@/lib/kv';
import type { ShopifyLTVData } from '@/lib/types';

export const maxDuration = 30;

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMockLTV(): ShopifyLTVData {
  return {
    avgSubscriptionLTV: 183.60,
    avgOnetimeLTV: 62.40,
    subscriptionCustomerCount: 94,
    onetimeCustomerCount: 148,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);

  const isMock = url.searchParams.get('mock') === 'true';
  if (isMock) {
    return Response.json(buildMockLTV());
  }

  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    return Response.json({ error: 'Shopify credentials not configured' }, { status: 503 });
  }

  const cacheKey = 'analytics:shopify:ltv';
  const bust = url.searchParams.get('bust') === '1';

  if (!bust) {
    try {
      const cached = await kv.get<ShopifyLTVData>(cacheKey);
      if (cached) return Response.json(cached);
    } catch { /* Redis unavailable — fetch live */ }
  }

  try {
    // Fetch all paid orders from the past 24 months to calculate true LTV
    const created_at_min = new Date(Date.now() - 730 * 86_400_000).toISOString();

    type ShopifyLineItem = { selling_plan_allocation?: { selling_plan_id: number } | null };
    type ShopifyOrder = {
      total_price: string;
      financial_status: string;
      line_items: ShopifyLineItem[];
      customer?: { id: number } | null;
    };

    const allOrders: ShopifyOrder[] = [];
    let nextUrl: string | null = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/orders.json?status=any&created_at_min=${encodeURIComponent(created_at_min)}&limit=250&fields=total_price,financial_status,line_items,customer`;
    let pages = 0;

    while (nextUrl && pages < 20) {
      const shopifyRes: Response = await fetch(nextUrl, {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN },
      });
      pages++;

      if (!shopifyRes.ok) {
        const status = shopifyRes.status;
        if (status === 401 || status === 403) {
          return Response.json({ error: 'Shopify access denied — check your token' }, { status: 502 });
        }
        return Response.json({ error: 'Shopify LTV data unavailable' }, { status: 502 });
      }

      const json = await shopifyRes.json() as { orders: ShopifyOrder[] };
      allOrders.push(...json.orders);

      const linkHeader: string = shopifyRes.headers.get('link') ?? '';
      const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = nextMatch ? nextMatch[1] : null;
    }

    // Only paid orders
    const paidOrders = allOrders.filter(o => o.financial_status === 'paid');

    // Per-customer revenue maps
    const subCustomerRevenue    = new Map<number, number>();
    const onetimeCustomerRevenue = new Map<number, number>();

    for (const order of paidOrders) {
      const customerId = order.customer?.id;
      if (!customerId) continue;

      const revenue = parseFloat(order.total_price ?? '0');
      const isSub   = order.line_items.some(li => li.selling_plan_allocation != null);

      if (isSub) {
        subCustomerRevenue.set(customerId, (subCustomerRevenue.get(customerId) ?? 0) + revenue);
      } else {
        onetimeCustomerRevenue.set(customerId, (onetimeCustomerRevenue.get(customerId) ?? 0) + revenue);
      }
    }

    const subValues     = Array.from(subCustomerRevenue.values());
    const onetimeValues = Array.from(onetimeCustomerRevenue.values());

    const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

    const data: ShopifyLTVData = {
      avgSubscriptionLTV:        avg(subValues),
      avgOnetimeLTV:             avg(onetimeValues),
      subscriptionCustomerCount: subCustomerRevenue.size,
      onetimeCustomerCount:      onetimeCustomerRevenue.size,
    };

    console.log('[api/shopify/ltv] subCustomers=%d onetimeCustomers=%d pages=%d', data.subscriptionCustomerCount, data.onetimeCustomerCount, pages);

    try {
      await kv.set(cacheKey, data, { ex: 86400 }); // 24h TTL
    } catch { /* silently skip */ }

    return Response.json(data);
  } catch (err) {
    console.error('[api/shopify/ltv] error', err);
    return Response.json({ error: 'LTV data unavailable — try refreshing' }, { status: 502 });
  }
}
