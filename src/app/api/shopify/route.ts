import { kv } from '@/lib/kv';
import { calcAOV } from '@/lib/analytics-utils';
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
    summary: { orders: totalOrders, revenue: totalRevenue, aov: calcAOV(totalOrders, totalRevenue) },
    by_day,
    products,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const daysParam = url.searchParams.get('days') ?? '30';
  const days = parseInt(daysParam, 10);

  if (![7, 14, 30].includes(days)) {
    return Response.json({ error: 'days must be 7, 14, or 30' }, { status: 400 });
  }

  const isMock = url.searchParams.get('mock') === 'true';
  if (isMock) {
    return Response.json(buildMockData(days));
  }

  const SHOPIFY_STORE_DOMAIN  = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_ACCESS_TOKEN  = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    return Response.json({ error: 'Shopify credentials not configured' }, { status: 503 });
  }

  const cacheKey = `analytics:shopify:${days}`;
  const bust = url.searchParams.get('bust') === '1';

  if (!bust) {
    try {
      const cached = await kv.get<ShopifyData>(cacheKey);
      if (cached) return Response.json(cached);
    } catch { /* Redis unavailable — fetch live */ }
  }

  try {
    const created_at_min = new Date(Date.now() - days * 86_400_000).toISOString();

    type ShopifyLineItem = { product_title: string; variant_title?: string; quantity: number; price: string };
    type ShopifyOrder = { id: number; created_at: string; total_price: string; financial_status: string; line_items: ShopifyLineItem[] };

    const allOrders: ShopifyOrder[] = [];
    let nextUrl: string | null = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/orders.json?status=any&created_at_min=${encodeURIComponent(created_at_min)}&limit=250&fields=id,created_at,total_price,financial_status,line_items`;
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

    // Filter to paid orders only
    const paidOrders = allOrders.filter(o => o.financial_status === 'paid');

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

    const data: ShopifyData = {
      summary: { orders: totalOrders, revenue: totalRevenue, aov: calcAOV(totalOrders, totalRevenue) },
      by_day,
      products,
    };

    console.log('[api/shopify] days=%d orders=%d revenue=%f pages=%d', days, totalOrders, totalRevenue, pages);

    try {
      await kv.set(cacheKey, data, { ex: 7200 });
    } catch { /* silently skip cache write */ }

    const headers: Record<string, string> = {};
    if (truncated) headers['X-Truncated'] = 'true';

    return Response.json(data, { headers });
  } catch (err) {
    console.error('[api/shopify] error', err);
    return Response.json({ error: 'Shopify data unavailable — try refreshing' }, { status: 502 });
  }
}
