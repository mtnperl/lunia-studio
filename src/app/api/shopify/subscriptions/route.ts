import { kv } from "@/lib/kv";

// Subscription cockpit — MRR / active / new / churn derived from Shopify
// subscription ORDERS (Kaching), NOT subscription contracts.
//
// Why orders: Shopify's `subscriptionContracts` query only ever returns
// contracts the *querying app* created (the only scope available to a custom
// app is `read_own_subscription_contracts`). Kaching creates ours, so that
// query always comes back empty — there is no scope that lets us read another
// app's contracts. Orders, however, carry `selling_plan_allocation` on their
// line items plus Kaching's "Subscription First/Recurring Order" tags, and are
// readable with the `read_orders` scope this app already has. The LTV and
// customer-cohort routes classify subscriptions the same way.
//
// Churn here is an ESTIMATE: Kaching doesn't tag cancellations, so we infer a
// lapse from a subscriber who missed their monthly rebill.

export const maxDuration = 120;

const API_VERSION = "2024-10";
const WINDOW_DAYS = 95;        // current + prior monthly cycle + buffer
const PAGE_SIZE = 250;
const PAGE_CAP = 20;           // 20 × 250 = 5,000 orders in 95d — ample for DTC
const DAY = 86_400_000;
const ACTIVE_DAYS = 35;        // monthly plan + grace: active if a sub order within 35d
const CHURN_MAX_DAYS = 65;     // lapsed if last sub order 35–65d ago (missed a rebill in last 30d)
const NEW_DAYS = 30;

// Only genuinely-collected orders count as recurring revenue. A refunded rebill
// isn't MRR, so refunded/partially_refunded are excluded (matches the cohort
// route's REVENUE_STATUSES).
const REVENUE_STATUSES = new Set(["paid", "authorized", "partially_paid"]);

type DiscountAllocation = { amount: string };
type ShopifyLineItem = {
  price: string;
  quantity: number;
  selling_plan_allocation?: { selling_plan_id: number } | null;
  discount_allocations?: DiscountAllocation[];
};
type ShopifyOrder = {
  id: number;
  created_at: string;
  financial_status: string;
  cancelled_at: string | null;
  tags?: string;
  total_line_items_price?: string;
  line_items: ShopifyLineItem[];
  customer?: { id: number; email?: string } | null;
  email?: string;
};

export type SubscriptionMetrics = {
  source: "shopify-orders" | "unavailable";
  estimated: boolean;
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const unavailable = (): SubscriptionMetrics => ({
  source: "unavailable", estimated: true, activeSubscriptions: 0, activeSubscribers: 0,
  mrr: 0, arr: 0, avgSubValue: 0, statusCounts: {}, new30d: 0, cancelled30d: 0,
  churnRate30dPct: 0, truncated: false, computedAt: new Date().toISOString(),
});

function customerKeyFor(o: ShopifyOrder): string {
  if (o.customer?.id) return `id:${o.customer.id}`;
  const email = o.customer?.email ?? o.email;
  return email ? `email:${email.toLowerCase()}` : `order:${o.id}`;
}

function tagList(tags?: string): string[] {
  return (tags ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
}

// Net subscription value for one order = sum of selling-plan line items
// (price × qty) minus their line-level discount allocations. Net of discount
// because subscribe-&-save is a standing reduction in recurring revenue.
function orderSubValue(o: ShopifyOrder): number {
  let v = 0;
  for (const li of o.line_items) {
    if (li.selling_plan_allocation == null) continue;
    const gross = (parseFloat(li.price) || 0) * (li.quantity ?? 0);
    const disc = (li.discount_allocations ?? []).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
    v += Math.max(0, gross - disc);
  }
  // Tag-detected sub order with no selling-plan line — fall back to gross line total.
  if (v === 0) {
    const fallback = parseFloat(o.total_line_items_price ?? "");
    if (Number.isFinite(fallback)) v = fallback;
  }
  return v;
}

export async function GET(req: Request): Promise<Response> {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!STORE || !TOKEN) {
    return Response.json({ error: "Shopify credentials not configured" }, { status: 503 });
  }

  const bust = new URL(req.url).searchParams.get("bust") === "1";
  const cacheKey = "analytics:subscriptions:v2-orders";
  if (!bust) {
    try {
      const cached = await kv.get<SubscriptionMetrics>(cacheKey);
      if (cached) return Response.json(cached);
    } catch { /* fetch live */ }
  }

  const now = Date.now();
  const created_at_min = new Date(now - WINDOW_DAYS * DAY).toISOString();

  let nextUrl: string | null =
    `https://${STORE}/admin/api/${API_VERSION}/orders.json?status=any` +
    `&created_at_min=${encodeURIComponent(created_at_min)}` +
    `&limit=${PAGE_SIZE}` +
    `&fields=id,created_at,financial_status,cancelled_at,tags,total_line_items_price,line_items,customer,email`;

  const orders: ShopifyOrder[] = [];
  let pages = 0;
  let truncated = false;

  try {
    while (nextUrl && pages < PAGE_CAP) {
      let res: Response | null = null;
      let attempt = 0;
      while (attempt < 3) {
        attempt++;
        res = await fetch(nextUrl, { headers: { "X-Shopify-Access-Token": TOKEN } });
        if (res.status === 401 || res.status === 403) {
          // Missing read_orders / bad token — degrade, don't 500.
          console.error("[api/shopify/subscriptions] orders access denied", res.status);
          return Response.json(unavailable());
        }
        if (res.status === 429 || res.status >= 500) {
          const ra = res.headers.get("retry-after");
          await sleep(ra ? parseInt(ra, 10) * 1000 : 1000 * attempt);
          continue;
        }
        break;
      }
      if (!res || !res.ok) { truncated = true; break; }
      pages++;
      const okRes: Response = res;
      const json = (await okRes.json()) as { orders: ShopifyOrder[] };
      orders.push(...json.orders);
      const link: string = okRes.headers.get("link") ?? "";
      const m: RegExpMatchArray | null = link.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = m ? m[1] : null;
      if (pages === PAGE_CAP && nextUrl) { truncated = true; nextUrl = null; }
    }
  } catch (err) {
    console.error("[api/shopify/subscriptions]", err instanceof Error ? err.message : err);
    return Response.json(unavailable());
  }

  // Per-customer subscription rollup. We track each subscriber's most recent
  // sub order (for active/MRR) and whether they're new in the last 30d.
  type Roll = { lastSubMs: number; lastSubValue: number; firstSubMs: number; newIn30d: boolean };
  const subs = new Map<string, Roll>();

  for (const o of orders) {
    if (o.cancelled_at) continue;
    if (!REVENUE_STATUSES.has(o.financial_status)) continue;
    const tags = tagList(o.tags);
    const hasPlanLine = o.line_items.some((li) => li.selling_plan_allocation != null);
    const isSub = hasPlanLine || tags.some((t) => t.includes("subscription"));
    if (!isSub) continue;

    const ms = new Date(o.created_at).getTime();
    const value = orderSubValue(o);
    const key = customerKeyFor(o);
    const isFirst = tags.some((t) => t.includes("first order"));
    const newIn30d = isFirst && now - ms <= NEW_DAYS * DAY;

    const r = subs.get(key);
    if (!r) {
      subs.set(key, { lastSubMs: ms, lastSubValue: value, firstSubMs: ms, newIn30d });
    } else {
      if (ms > r.lastSubMs) { r.lastSubMs = ms; r.lastSubValue = value; }
      if (ms < r.firstSubMs) r.firstSubMs = ms;
      r.newIn30d = r.newIn30d || newIn30d;
    }
  }

  let activeSubscribers = 0, mrr = 0, new30d = 0, cancelled30d = 0;
  for (const r of subs.values()) {
    const ageDays = (now - r.lastSubMs) / DAY;
    if (ageDays <= ACTIVE_DAYS) {
      activeSubscribers++;
      mrr += r.lastSubValue;            // monthly plan → last charge IS the monthly run-rate
      if (r.newIn30d) new30d++;
    } else if (ageDays <= CHURN_MAX_DAYS) {
      // Missed the rebill that was due in the last ~30 days → estimated churn.
      cancelled30d++;
    }
  }

  mrr = Math.round(mrr * 100) / 100;
  const activeSubscriptions = activeSubscribers;  // orders can't split multi-plan; 1 contract per subscriber
  const out: SubscriptionMetrics = {
    source: "shopify-orders",
    estimated: true,
    activeSubscriptions,
    activeSubscribers,
    mrr,
    arr: Math.round(mrr * 12 * 100) / 100,
    avgSubValue: activeSubscriptions > 0 ? Math.round((mrr / activeSubscriptions) * 100) / 100 : 0,
    statusCounts: {},
    new30d,
    cancelled30d,
    churnRate30dPct: activeSubscribers + cancelled30d > 0
      ? Math.round((cancelled30d / (activeSubscribers + cancelled30d)) * 1000) / 10
      : 0,
    truncated,
    computedAt: new Date().toISOString(),
  };

  try { await kv.set(cacheKey, out, { ex: 3600 }); } catch { /* best-effort */ }
  return Response.json(out);
}
