import { kv } from '@/lib/kv';
import type { ShopifyMtdData } from '@/lib/types';

export const maxDuration = 45;

function mtdRange(): { since: string; until: string; created_at_min: string } {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const until = now.toISOString().slice(0, 10);
  const created_at_min = new Date(since).toISOString();
  return { since, until, created_at_min };
}

async function shopifyFetch(
  domain: string,
  token: string,
  path: string,
): Promise<{ ok: boolean; json: unknown; status: number }> {
  const res = await fetch(`https://${domain}/admin/api/2024-10${path}`, {
    headers: { 'X-Shopify-Access-Token': token },
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, json, status: res.status };
}

async function paginatedFetch<T>(
  domain: string,
  token: string,
  initialPath: string,
  key: string,
  maxPages = 10,
): Promise<T[]> {
  const all: T[] = [];
  let nextUrl: string | null = `https://${domain}/admin/api/2024-10${initialPath}`;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    const res = await fetch(nextUrl, {
      headers: { 'X-Shopify-Access-Token': token },
    });
    pages++;
    if (!res.ok) break;
    const json = await res.json() as Record<string, T[]>;
    all.push(...(json[key] ?? []));
    const link = res.headers.get('link') ?? '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = next ? next[1] : null;
  }
  return all;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    return Response.json({ error: 'Shopify credentials not configured' }, { status: 503 });
  }

  const cacheKey = `analytics:shopify-mtd:v3:${new Date().toISOString().slice(0, 10)}`;
  const bust = url.searchParams.get('bust') === '1';

  if (!bust) {
    try {
      const cached = await kv.get<ShopifyMtdData>(cacheKey);
      if (cached) return Response.json(cached);
    } catch { /* Redis unavailable */ }
  }

  const { created_at_min } = mtdRange();

  // ── 1. Paid orders (excl. $0) ─────────────────────────────────────────────
  type ShopifyOrder = {
    id: number;
    financial_status: string;
    total_price?: string;
    customer?: { orders_count?: number };
  };

  const allOrders = await paginatedFetch<ShopifyOrder>(
    SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN,
    `/orders.json?status=any&created_at_min=${encodeURIComponent(created_at_min)}&limit=250&fields=id,financial_status,total_price,customer`,
    'orders',
  );

  const paidOrders = allOrders.filter(
    o => o.financial_status === 'paid' && parseFloat(o.total_price ?? '0') > 1,
  );

  const orders = paidOrders.length;
  const revenue = paidOrders.reduce((s, o) => s + parseFloat(o.total_price ?? '0'), 0);

  // Returning customers = those whose customer.orders_count > 1 at time of order
  const returningOrders = paidOrders.filter(o => (o.customer?.orders_count ?? 1) > 1).length;
  const returningRate = orders > 0 ? (returningOrders / orders) * 100 : 0;

  // ── 2. Abandoned checkouts (read_checkouts) ───────────────────────────────
  type ShopifyCheckout = { id: string; total_price?: string };
  let abandonedCheckouts = 0;
  let abandonedRevenue = 0;

  try {
    const checkouts = await paginatedFetch<ShopifyCheckout>(
      SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN,
      `/checkouts.json?created_at_min=${encodeURIComponent(created_at_min)}&limit=250&fields=id,total_price`,
      'checkouts',
    );
    abandonedCheckouts = checkouts.length;
    abandonedRevenue = checkouts.reduce((s, c) => s + parseFloat(c.total_price ?? '0'), 0);
  } catch (err) {
    console.warn('[api/shopify-mtd] checkouts fetch failed:', err);
  }

  // Checkout CVR: orders / (orders + abandoned checkouts)
  const totalCheckouts = orders + abandonedCheckouts;
  const checkoutCvr = totalCheckouts > 0 ? (orders / totalCheckouts) * 100 : 0;

  // ── 3. Sessions via ShopifyQL (requires Shopify plan or higher) ───────────
  // ShopifyQL is only available on Shopify plan+, not Basic.
  // We try it and gracefully fall back — no longer blocking other metrics.
  let sessions = 0;
  let sessionsAvailable = false;
  let sessionsError: string | undefined;

  const { since, until } = mtdRange();
  try {
    const gqlRes = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation {
            shopifyqlQuery(query: "FROM sessions SHOW sum(sessions) AS sessions SINCE ${since} UNTIL ${until}") {
              __typename
              ... on TableResponse {
                tableData { rowData columns { name } }
              }
              ... on ParseErrorResponse {
                parseErrors { code message }
              }
            }
          }`,
        }),
      }
    );

    const gql = await gqlRes.json() as {
      data?: { shopifyqlQuery?: { __typename: string; tableData?: { rowData: string[][]; columns: { name: string }[] }; parseErrors?: { message: string }[] } };
      errors?: { message: string }[];
    };

    const result = gql.data?.shopifyqlQuery;
    if (result?.__typename === 'TableResponse' && result.tableData) {
      const colIdx = result.tableData.columns.findIndex(c => c.name === 'sessions');
      sessions = result.tableData.rowData.reduce(
        (s, row) => s + (parseInt(row[colIdx !== -1 ? colIdx : 0] ?? '0', 10) || 0),
        0,
      );
      sessionsAvailable = true;
    } else if (gql.errors?.[0]) {
      const msg = gql.errors[0].message;
      // shopifyqlQuery not on this plan — give user a clear upgrade message
      sessionsError = msg.includes("doesn't exist")
        ? 'Requires Shopify plan or higher (ShopifyQL not available on Basic)'
        : `GraphQL: ${msg}`;
    }
  } catch (err) {
    sessionsError = 'Network error reaching Shopify GraphQL';
    console.warn('[api/shopify-mtd] sessions fetch failed:', err);
  }

  const cvr = sessionsAvailable && sessions > 0 ? (orders / sessions) * 100 : 0;

  const data: ShopifyMtdData = {
    orders,
    revenue,
    sessions,
    cvr,
    sessionsAvailable,
    sessionsError,
    abandonedCheckouts,
    abandonedRevenue,
    checkoutCvr,
    returningOrders,
    returningRate,
  };

  console.log('[api/shopify-mtd] orders=%d revenue=%f abandoned=%d checkoutCvr=%f%%',
    orders, revenue, abandonedCheckouts, checkoutCvr);

  try {
    await kv.set(cacheKey, data, { ex: 3600 }); // 1h cache
  } catch { /* skip */ }

  return Response.json(data);
}
