import { kv } from '@/lib/kv';
import type { ShopifyMtdData } from '@/lib/types';

export const maxDuration = 30;

function mtdRange(): { since: string; until: string } {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const until = now.toISOString().slice(0, 10);
  return { since, until };
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    return Response.json({ error: 'Shopify credentials not configured' }, { status: 503 });
  }

  const cacheKey = `analytics:shopify-mtd:${new Date().toISOString().slice(0, 10)}`;
  const bust = url.searchParams.get('bust') === '1';

  if (!bust) {
    try {
      const cached = await kv.get<ShopifyMtdData>(cacheKey);
      if (cached) return Response.json(cached);
    } catch { /* Redis unavailable */ }
  }

  const { since, until } = mtdRange();
  const created_at_min = new Date(since).toISOString();

  // ── Fetch MTD orders ───────────────────────────────────────────────────────
  type ShopifyOrder = { id: number; financial_status: string; total_price?: string };
  const allOrders: ShopifyOrder[] = [];
  let nextUrl: string | null =
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/orders.json?status=any&created_at_min=${encodeURIComponent(created_at_min)}&limit=250&fields=id,financial_status,total_price`;
  let pages = 0;

  while (nextUrl && pages < 10) {
    const res: Response = await fetch(nextUrl, {
      headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN },
    });
    pages++;
    if (!res.ok) {
      return Response.json({ error: 'Shopify orders unavailable' }, { status: 502 });
    }
    const json = await res.json() as { orders: ShopifyOrder[] };
    allOrders.push(...json.orders);
    const link = res.headers.get('link') ?? '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = next ? next[1] : null;
  }

  const orders = allOrders.filter(o => o.financial_status === 'paid' && parseFloat(o.total_price ?? '0') > 1).length;

  // ── Fetch MTD sessions ────────────────────────────────────────────────────
  // Strategy 1: ShopifyQL (requires read_analytics scope — Shopify plan or higher)
  // Strategy 2: REST /reports.json (also requires read_analytics, but different endpoint)
  // If both fail, return the actual error so the UI can explain it clearly.
  let sessions = 0;
  let sessionsAvailable = false;
  let sessionsError: string | undefined;

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
                tableData {
                  rowData
                  columns { name dataType }
                }
              }
              ... on ParseErrorResponse {
                parseErrors { code message reason }
              }
            }
          }`,
        }),
      }
    );

    if (!gqlRes.ok) {
      const errText = await gqlRes.text().catch(() => '');
      const hint = gqlRes.status === 403 || gqlRes.status === 401
        ? 'Token missing read_analytics scope'
        : `HTTP ${gqlRes.status}`;
      sessionsError = `ShopifyQL: ${hint}${errText ? ` — ${errText.slice(0, 120)}` : ''}`;
      console.warn('[api/shopify-mtd] ShopifyQL HTTP error:', gqlRes.status, errText.slice(0, 200));
    } else {
      const gql = await gqlRes.json() as {
        data?: {
          shopifyqlQuery?: {
            __typename: string;
            tableData?: { rowData: string[][]; columns: { name: string }[] };
            parseErrors?: { code: string; message: string; reason?: string }[];
          };
        };
        errors?: { message: string }[];
      };

      console.log('[api/shopify-mtd] ShopifyQL response type:', gql.data?.shopifyqlQuery?.__typename);

      const result = gql.data?.shopifyqlQuery;
      if (result?.__typename === 'TableResponse' && result.tableData) {
        const sessionIdx = result.tableData.columns.findIndex(c => c.name === 'sessions');
        const colIdx = sessionIdx !== -1 ? sessionIdx : 0;
        if (result.tableData.rowData.length > 0) {
          sessions = result.tableData.rowData.reduce((sum, row) => {
            return sum + (parseInt(row[colIdx] ?? '0', 10) || 0);
          }, 0);
          sessionsAvailable = true;
        } else {
          // Query succeeded but returned no rows — store has no session data for this period
          sessions = 0;
          sessionsAvailable = true;
        }
      } else if (result?.__typename === 'ParseErrorResponse') {
        const msg = result.parseErrors?.map(e => e.message).join('; ') ?? 'unknown parse error';
        sessionsError = `ShopifyQL parse error: ${msg}`;
        console.warn('[api/shopify-mtd] ShopifyQL parse errors:', result.parseErrors);
      } else if (gql.errors) {
        // GraphQL-level errors — most likely a scope/permission problem
        const msg = gql.errors.map(e => e.message).join('; ');
        sessionsError = `GraphQL error: ${msg}. Add read_analytics scope to your Shopify token.`;
        console.warn('[api/shopify-mtd] GraphQL errors:', gql.errors);
      }
    }
  } catch (err) {
    sessionsError = 'Network error reaching Shopify GraphQL';
    console.warn('[api/shopify-mtd] sessions fetch failed:', err);
  }

  const cvr = sessionsAvailable && sessions > 0 ? orders / sessions : 0;

  const data: ShopifyMtdData = { orders, sessions, cvr, sessionsAvailable, sessionsError };

  try {
    await kv.set(cacheKey, data, { ex: 3600 }); // 1h cache
  } catch { /* skip */ }

  return Response.json(data);
}
