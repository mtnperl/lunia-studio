import { kv } from "@/lib/kv";

// Subscription cockpit — true MRR / churn from Shopify native subscription
// contracts (Katching writes these). Requires the read_own_subscription_contracts
// scope on SHOPIFY_ACCESS_TOKEN. Query validated against the Admin schema; the
// numbers must be confirmed on prod (no scoped token reachable from dev).

export const maxDuration = 60;

const API_VERSION = "2024-10";
const PAGE_CAP = 20;          // up to 20 × 25 = 500 contracts
const PAGE_SIZE = 25;

type Interval = "DAY" | "WEEK" | "MONTH" | "YEAR";
type ContractNode = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  billingPolicy: { interval: Interval; intervalCount: number };
  customer: { id: string } | null;
  lines: { edges: { node: { lineDiscountedPrice: { amount: string } } }[] };
};

export type SubscriptionMetrics = {
  source: "shopify-contracts" | "unavailable";
  activeSubscriptions: number;
  activeSubscribers: number;
  mrr: number;
  arr: number;
  avgSubValue: number;
  statusCounts: Record<string, number>;
  new30d: number;
  cancelled30d: number;
  churnRate30dPct: number;
  truncated: boolean;
  computedAt: string;
};

const QUERY = `query Subs($cursor: String) {
  subscriptionContracts(first: ${PAGE_SIZE}, after: $cursor) {
    edges { node {
      id status createdAt updatedAt
      billingPolicy { interval intervalCount }
      customer { id }
      lines(first: 10) { edges { node { lineDiscountedPrice { amount } } } }
    } }
    pageInfo { hasNextPage endCursor }
  }
}`;

/** Normalize a per-cycle amount to a monthly figure. */
function toMonthly(cycleTotal: number, interval: Interval, count: number): number {
  const n = Math.max(1, count);
  switch (interval) {
    case "DAY": return (cycleTotal * 30) / n;
    case "WEEK": return (cycleTotal * (30 / 7)) / n;
    case "MONTH": return cycleTotal / n;
    case "YEAR": return cycleTotal / (12 * n);
    default: return cycleTotal / n;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const unavailable = (): SubscriptionMetrics => ({
  source: "unavailable", activeSubscriptions: 0, activeSubscribers: 0, mrr: 0, arr: 0,
  avgSubValue: 0, statusCounts: {}, new30d: 0, cancelled30d: 0, churnRate30dPct: 0,
  truncated: false, computedAt: new Date().toISOString(),
});

export async function GET(req: Request): Promise<Response> {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!STORE || !TOKEN) {
    return Response.json({ error: "Shopify credentials not configured" }, { status: 503 });
  }

  const bust = new URL(req.url).searchParams.get("bust") === "1";
  const cacheKey = "analytics:subscriptions:v1";
  if (!bust) {
    try {
      const cached = await kv.get<SubscriptionMetrics>(cacheKey);
      if (cached) return Response.json(cached);
    } catch { /* fetch live */ }
  }

  const endpoint = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;
  const nodes: ContractNode[] = [];
  let cursor: string | null = null;
  let pages = 0;
  let truncated = false;

  type Page = { edges: { node: ContractNode }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  type GqlResp = { data?: { subscriptionContracts?: Page }; errors?: { message?: string; extensions?: { code?: string } }[] };

  try {
    do {
      // Fetch one page with 429/5xx/THROTTLED backoff.
      let page: Page | null = null;
      let attempt = 0;
      while (attempt < 3) {
        attempt++;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify({ query: QUERY, variables: { cursor } }),
        });
        if (res.status === 401 || res.status === 403) {
          // Missing scope / bad token — degrade, don't 500.
          console.error("[api/shopify/subscriptions] access denied", res.status);
          return Response.json(unavailable());
        }
        if (res.status === 429 || res.status >= 500) {
          await sleep(1000 * attempt);
          continue;
        }
        const json = (await res.json().catch(() => null)) as GqlResp | null;
        const throttled = json?.errors?.some((e) => e.extensions?.code === "THROTTLED");
        if (throttled) { await sleep(2000 * attempt); continue; }
        if (json?.errors?.length) {
          console.error("[api/shopify/subscriptions] graphql errors", json.errors.slice(0, 2));
          return Response.json(unavailable());
        }
        page = json?.data?.subscriptionContracts ?? null;
        break;
      }
      if (!page) { truncated = true; break; }
      for (const e of page.edges) nodes.push(e.node);
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      pages++;
      if (pages >= PAGE_CAP && cursor) { truncated = true; cursor = null; }
    } while (cursor);
  } catch (err) {
    console.error("[api/shopify/subscriptions]", err instanceof Error ? err.message : err);
    return Response.json(unavailable());
  }

  // Aggregate.
  const now = Date.now();
  const DAY = 86_400_000;
  const statusCounts: Record<string, number> = {};
  const activeCustomers = new Set<string>();
  let activeSubscriptions = 0, mrr = 0, new30d = 0, cancelled30d = 0;

  for (const n of nodes) {
    statusCounts[n.status] = (statusCounts[n.status] ?? 0) + 1;
    const cycleTotal = n.lines.edges.reduce((s, l) => s + (parseFloat(l.node.lineDiscountedPrice.amount) || 0), 0);
    if (n.status === "ACTIVE") {
      activeSubscriptions++;
      if (n.customer?.id) activeCustomers.add(n.customer.id);
      mrr += toMonthly(cycleTotal, n.billingPolicy.interval, n.billingPolicy.intervalCount);
      if (now - new Date(n.createdAt).getTime() <= 30 * DAY) new30d++;
    }
    if (n.status === "CANCELLED" && now - new Date(n.updatedAt).getTime() <= 30 * DAY) cancelled30d++;
  }

  mrr = Math.round(mrr * 100) / 100;
  const out: SubscriptionMetrics = {
    source: "shopify-contracts", // query succeeded (errors return early); 0 contracts is still valid
    activeSubscriptions,
    activeSubscribers: activeCustomers.size,
    mrr,
    arr: Math.round(mrr * 12 * 100) / 100,
    avgSubValue: activeSubscriptions > 0 ? Math.round((mrr / activeSubscriptions) * 100) / 100 : 0,
    statusCounts,
    new30d,
    cancelled30d,
    churnRate30dPct: activeSubscriptions + cancelled30d > 0
      ? Math.round((cancelled30d / (activeSubscriptions + cancelled30d)) * 1000) / 10
      : 0,
    truncated,
    computedAt: new Date().toISOString(),
  };

  try { await kv.set(cacheKey, out, { ex: 3600 }); } catch { /* best-effort */ }
  return Response.json(out);
}
