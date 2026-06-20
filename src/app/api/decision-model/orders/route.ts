import { kv } from "@/lib/kv";
import type { DecisionModelActuals } from "@/lib/decision-model";

// Decision Model — Shopify actuals. Pulls orders for the window server-side and
// classifies them BY TAG (never by price — a first sub order and a recurring
// one can land at the same dollar amount, and first orders appear at several
// prices due to discounts). Read-only, no mutations. Token stays server-side.

export const maxDuration = 60;

const API_VERSION = "2024-10";
const PAGE_CAP = 30;        // up to 30 × 100 = 3000 orders
const PAGE_SIZE = 100;

const ORDERS_QUERY = `query($cursor: String, $q: String!) {
  orders(first: ${PAGE_SIZE}, after: $cursor, query: $q, sortKey: CREATED_AT) {
    edges { node {
      name createdAt displayFinancialStatus tags
      totalPriceSet { shopMoney { amount } }
      customer { numberOfOrders }
    } }
    pageInfo { hasNextPage endCursor }
  }
}`;

type OrderNode = {
  name: string;
  createdAt: string;
  displayFinancialStatus: string | null;
  tags: string[];
  totalPriceSet: { shopMoney: { amount: string } };
  customer: { numberOfOrders: number } | null;
};

type Cohort = "sub" | "recurring" | "pack" | "oneTime";

// CLASSIFY BY TAG, NEVER BY PRICE. Order matters: refunded → first → recurring
// → bundle → one-time. (Kaching writes these tags.)
function classify(node: OrderNode): Cohort | "skip" {
  if (node.displayFinancialStatus === "REFUNDED") return "skip";
  const t = node.tags;
  if (t.includes("Kaching Subscription First Order")) return "sub";
  if (t.includes("Kaching Subscription Recurring Order")) return "recurring";
  if (t.includes("Kaching Bundles")) return "pack";
  return "oneTime";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const unavailable = (since: string, until: string): DecisionModelActuals => ({
  source: "unavailable",
  nSub: 0, nOneTime: 0, nPack: 0, nRecurring: 0, newCustomers: 0,
  pSubFirst: 0, pSubRec: 0, pOneTime: 0, pPack: 0,
  ordersScanned: 0, truncated: false, range: { since, until },
});

export async function GET(req: Request): Promise<Response> {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!STORE || !TOKEN) return Response.json({ error: "Shopify credentials not configured" }, { status: 503 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since") ?? "";
  const until = url.searchParams.get("until") ?? "";
  const bust = url.searchParams.get("bust") === "1";
  if (!isoDate(since) || !isoDate(until)) {
    return Response.json({ error: "since and until must be YYYY-MM-DD" }, { status: 400 });
  }

  const cacheKey = `analytics:decision-model:orders:v1:${since}_${until}`;
  if (!bust) {
    try { const cached = await kv.get<DecisionModelActuals>(cacheKey); if (cached) return Response.json(cached); } catch { /* live */ }
  }

  // Inclusive window. until extended to end-of-day (UTC) so the last day counts.
  const q = `created_at:>='${since}T00:00:00Z' AND created_at:<='${until}T23:59:59Z'`;
  const endpoint = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

  type Page = { edges: { node: OrderNode }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  type GqlResp = { data?: { orders?: Page }; errors?: { extensions?: { code?: string } }[] };

  const sums = { sub: 0, recurring: 0, pack: 0, oneTime: 0 };
  const counts = { sub: 0, recurring: 0, pack: 0, oneTime: 0 };
  let cursor: string | null = null;
  let pages = 0, scanned = 0, truncated = false;

  try {
    do {
      let page: Page | null = null;
      let attempt = 0;
      while (attempt < 3) {
        attempt++;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify({ query: ORDERS_QUERY, variables: { cursor, q } }),
        });
        if (res.status === 401 || res.status === 403) {
          console.error("[api/decision-model/orders] access denied", res.status);
          return Response.json(unavailable(since, until));
        }
        if (res.status === 429 || res.status >= 500) { await sleep(1000 * attempt); continue; }
        const json = (await res.json().catch(() => null)) as GqlResp | null;
        if (json?.errors?.some((e) => e.extensions?.code === "THROTTLED")) { await sleep(2000 * attempt); continue; }
        if (json?.errors?.length) {
          console.error("[api/decision-model/orders] graphql errors", json.errors.slice(0, 2));
          return Response.json(unavailable(since, until));
        }
        page = json?.data?.orders ?? null;
        break;
      }
      if (!page) { truncated = true; break; }
      for (const e of page.edges) {
        scanned++;
        const c = classify(e.node);
        if (c === "skip") continue;
        sums[c] += parseFloat(e.node.totalPriceSet.shopMoney.amount) || 0;
        counts[c] += 1;
      }
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      pages++;
      if (pages >= PAGE_CAP && cursor) { truncated = true; cursor = null; }
    } while (cursor);
  } catch (err) {
    console.error("[api/decision-model/orders]", err instanceof Error ? err.message : err);
    return Response.json(unavailable(since, until));
  }

  const avg = (sum: number, n: number) => (n > 0 ? Math.round((sum / n) * 100) / 100 : 0);
  const out: DecisionModelActuals = {
    source: "shopify",
    nSub: counts.sub,
    nOneTime: counts.oneTime,
    nPack: counts.pack,
    nRecurring: counts.recurring,
    newCustomers: counts.sub + counts.oneTime + counts.pack,
    pSubFirst: avg(sums.sub, counts.sub),
    pSubRec: avg(sums.recurring, counts.recurring),
    pOneTime: avg(sums.oneTime, counts.oneTime),
    pPack: avg(sums.pack, counts.pack),
    ordersScanned: scanned,
    truncated,
    range: { since, until },
  };

  try { await kv.set(cacheKey, out, { ex: 3600 }); } catch { /* best-effort */ }
  return Response.json(out);
}
