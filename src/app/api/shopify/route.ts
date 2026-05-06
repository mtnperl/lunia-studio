import { kv } from '@/lib/kv';
import { calcAOV, resolveRangeParams } from '@/lib/analytics-utils';
import type { ShopifyData, ShopifyDayRow, ShopifyProduct } from '@/lib/types';

export const maxDuration = 30;

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMockData(days: number): ShopifyData {
  const products: ShopifyProduct[] = [
    { productTitle: 'Sleep Formula 60ct',   orders: 112, revenue: 13440 },
    { productTitle: 'Sleep Gummies Bundle', orders: 67,  revenue: 8710  },
    { productTitle: 'Reset Kit',            orders: 31,  revenue: 4650  },
    { productTitle: 'Sleep Formula 30ct',   orders: 24,  revenue: 1920  },
  ];

  const totalOrders  = products.reduce((s, p) => s + p.orders,  0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);

  // ~40% subscription, ~60% one-time
  const subscriptionRevenue = Math.round(totalRevenue * 0.4 * 100) / 100;
  const onetimeRevenue      = Math.round((totalRevenue - subscriptionRevenue) * 100) / 100;
  const subscriptionOrders  = Math.round(totalOrders * 0.4);
  const onetimeOrders       = totalOrders - subscriptionOrders;

  const by_day: ShopifyDayRow[] = [];
  const end = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const t = (days - i) / days;
    const wave = 0.6 + 0.4 * Math.sin(t * Math.PI);
    const dayOrders  = Math.round((totalOrders  / days) * wave);
    const dayRevenue = Math.round((totalRevenue / days) * wave * 10) / 10;
    by_day.push({ date, orders: dayOrders, revenue: dayRevenue });
  }

  return {
    summary: {
      orders: totalOrders,
      revenue: totalRevenue,
      aov: calcAOV(totalOrders, totalRevenue),
      subscriptionRevenue,
      onetimeRevenue,
      subscriptionOrders,
      onetimeOrders,
    },
    by_day,
    products,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resolved = resolveRangeParams(url, { defaultDays: 30, maxDays: 400 });
  if ('error' in resolved) {
    return Response.json({ error: resolved.error }, { status: 400 });
  }
  const { since, until, days } = resolved;

  const isMock = url.searchParams.get('mock') === 'true';
  if (isMock) {
    return Response.json(buildMockData(days));
  }

  const SHOPIFY_STORE_DOMAIN  = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_ACCESS_TOKEN  = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    return Response.json({ error: 'Shopify credentials not configured' }, { status: 503 });
  }

  const cacheKey = `analytics:shopify:v4:${since}_${until}`;
  const bust = url.searchParams.get('bust') === '1';

  if (!bust) {
    try {
      const cached = await kv.get<ShopifyData>(cacheKey);
      if (cached) return Response.json(cached);
    } catch { /* Redis unavailable — fetch live */ }
  }

  try {
    const created_at_min = new Date(`${since}T00:00:00Z`).toISOString();
    // Shopify's created_at_max is exclusive at the moment provided, so add 1 day to make `until` inclusive.
    const created_at_max = new Date(`${until}T00:00:00Z`);
    created_at_max.setUTCDate(created_at_max.getUTCDate() + 1);
    const created_at_max_iso = created_at_max.toISOString();

    type ShopifyLineItem = { product_title: string; variant_title?: string; quantity: number; price: string; selling_plan_allocation?: { selling_plan_id: number } | null };
    type ShopifyOrder = { id: number; created_at: string; total_price: string; financial_status: string; line_items: ShopifyLineItem[]; customer?: { id: number } | null };

    const allOrders: ShopifyOrder[] = [];
    let nextUrl: string | null = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/orders.json?status=any&created_at_min=${encodeURIComponent(created_at_min)}&created_at_max=${encodeURIComponent(created_at_max_iso)}&limit=250&fields=id,created_at,total_price,financial_status,line_items,customer`;
    let pages = 0;
    let truncated = false;

    while (nextUrl && pages < 10) {
      const shopifyRes: Response = await fetch(nextUrl, {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN },
      });
      pages++;

      if (!shopifyRes.ok) {
        const status = shopifyRes.status;
        if (status === 401 || status === 403) {
          return Response.json({ error: 'Shopify access denied — check your token' }, { status: 502 });
        }
        console.error('[api/shopify] Shopify API error', status);
        return Response.json({ error: 'Shopify data unavailable — try refreshing' }, { status: 502 });
      }

      const json = await shopifyRes.json() as { orders: ShopifyOrder[] };
      allOrders.push(...json.orders);

      // Parse Link header for pagination
      const linkHeader: string = shopifyRes.headers.get('link') ?? '';
      const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = nextMatch ? nextMatch[1] : null;

      if (pages === 10 && nextUrl) {
        truncated = true;
        console.warn('[api/shopify] pagination cap reached at 10 pages — revenue may be understated');
        nextUrl = null;
      }
    }

    // Match Shopify admin "Orders" reporting — count every revenue order regardless of
    // dollar amount. $0 promo/comp orders ARE customer acquisitions and need to be
    // counted (e.g. influencer comps, free trial, 100% discount codes).
    const REVENUE_STATUSES = new Set(['paid', 'authorized', 'partially_paid']);
    const paidOrders = allOrders.filter(o =>
      REVENUE_STATUSES.has(o.financial_status)
    );

    // Aggregate by day
    const dayMap = new Map<string, { orders: number; revenue: number }>();
    for (const order of paidOrders) {
      const date = order.created_at.slice(0, 10);
      const existing = dayMap.get(date) ?? { orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += parseFloat(order.total_price ?? '0');
      dayMap.set(date, existing);
    }

    // Aggregate products
    const productMap = new Map<string, { orders: number; revenue: number }>();
    for (const order of paidOrders) {
      for (const item of order.line_items) {
        const key = item.product_title + (item.variant_title ? ` · ${item.variant_title}` : '');
        const existing = productMap.get(key) ?? { orders: 0, revenue: 0 };
        existing.orders += item.quantity;
        existing.revenue += parseFloat(item.price) * item.quantity;
        productMap.set(key, existing);
      }
    }

    const by_day: ShopifyDayRow[] = Array.from(dayMap.entries())
      .map(([date, d]) => ({ date, orders: d.orders, revenue: d.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const products: ShopifyProduct[] = Array.from(productMap.entries())
      .map(([key, p]) => {
        const [productTitle, variantTitle] = key.split(' · ');
        return { productTitle, variantTitle, orders: p.orders, revenue: p.revenue };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const totalOrders  = paidOrders.length;
    const totalRevenue = paidOrders.reduce((s, o) => s + parseFloat(o.total_price ?? '0'), 0);

    // Subscription vs one-time split — a subscription order has at least one line item with selling_plan_allocation
    const isSubscription = (o: (typeof paidOrders)[0]) =>
      o.line_items.some(li => li.selling_plan_allocation != null);
    const subOrders      = paidOrders.filter(isSubscription);
    const onetimeOrders  = paidOrders.filter(o => !isSubscription(o));
    const subRevenue     = subOrders.reduce((s, o) => s + parseFloat(o.total_price ?? '0'), 0);
    const onetimeRevenue = onetimeOrders.reduce((s, o) => s + parseFloat(o.total_price ?? '0'), 0);

    const data: ShopifyData = {
      summary: {
        orders: totalOrders,
        revenue: totalRevenue,
        aov: calcAOV(totalOrders, totalRevenue),
        subscriptionRevenue: subRevenue,
        onetimeRevenue,
        subscriptionOrders: subOrders.length,
        onetimeOrders: onetimeOrders.length,
      },
      by_day,
      products,
      truncated,
    };

    console.log('[api/shopify] since=%s until=%s orders=%d revenue=%f pages=%d truncated=%s',
      since, until, totalOrders, totalRevenue, pages, truncated);

    try {
      await kv.set(cacheKey, data, { ex: 7200 });
    } catch { /* silently skip cache write */ }

    return Response.json(data);
  } catch (err) {
    console.error('[api/shopify] error', err);
    return Response.json({ error: 'Shopify data unavailable — try refreshing' }, { status: 502 });
  }
}
