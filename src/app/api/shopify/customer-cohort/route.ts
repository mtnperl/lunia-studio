import { kv } from "@/lib/kv";
import type { CustomerCohort } from "@/lib/business-types";

export const maxDuration = 300;

const WINDOW_DAYS = 365;
const PAGE_CAP = 100;         // 100 × 250 = 25,000 orders. Plenty of headroom for a year of DTC orders.
const PAGE_SIZE = 250;
const REVENUE_STATUSES = new Set(["paid", "authorized", "partially_paid"]);
const MIN_ORDER_VALUE = 1;    // count any order strictly above $1 — excludes $0/$1 test orders only

type ShopifyLineItem = {
  product_title: string;
  quantity: number;
  price: string;
  selling_plan_allocation?: { selling_plan_id: number } | null;
};

type ShopifyOrder = {
  id: number;
  created_at: string;
  total_price: string;
  financial_status: string;
  line_items: ShopifyLineItem[];
  customer?: { id: number; email?: string } | null;
  email?: string;
};

type CustomerRollup = {
  key: string;
  totalRevenue: number;
  orderCount: number;
  hasSubscriptionOrder: boolean;
  firstOrderDate: string; // YYYY-MM-DD
};

type CachedFullWindow = {
  windowDays: number;
  windowOrders: number;
  totalCustomers: number;
  subCustomers: number;
  otpCustomers: number;
  avgLifetimeRevenue: { blended: number; sub: number; otp: number };
  avgOrdersPerCustomer: { blended: number; sub: number; otp: number };
  subMixPct: number;
  repeatRatePct: number;
  newCustomersByDate: Record<string, number>;
  truncated: boolean;
  computedAt: string;
  windowSince: string;
  windowUntil: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bust = url.searchParams.get("bust") === "1";

  const sinceParam = url.searchParams.get("since");
  const untilParam = url.searchParams.get("until");

  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    return Response.json({ error: "Shopify credentials not configured" }, { status: 503 });
  }

  // Compute the 365d window — independent of the requested range.
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const windowSince = new Date(todayUtc.getTime() - (WINDOW_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  const windowUntil = todayUtc.toISOString().slice(0, 10);

  const cacheKey = `shopify:cohort:v2:${windowSince}_${windowUntil}`;

  let full: CachedFullWindow | null = null;

  if (!bust) {
    try {
      full = await kv.get<CachedFullWindow>(cacheKey);
    } catch {
      /* KV unavailable */
    }
  }

  if (!full) {
    try {
      full = await pullAndAggregate(windowSince, windowUntil, SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN);
    } catch (err) {
      console.error("[api/shopify/customer-cohort] aggregation failed", err);
      return Response.json({ error: "Could not compute customer cohort" }, { status: 502 });
    }
    try {
      // 24h TTL — cohorts shift slowly, no need to refetch hourly.
      await kv.set(cacheKey, full, { ex: 24 * 60 * 60 });
    } catch {
      /* skip cache write */
    }
  }

  // Range-aware metrics derived from the cached full-window aggregate.
  const rangeSince = sinceParam ?? windowSince;
  const rangeUntil = untilParam ?? windowUntil;

  const newCustomersInRange = sumNewCustomers(full.newCustomersByDate, rangeSince, rangeUntil);
  const last30 = newCustomersInLastNDays(full.newCustomersByDate, 30, windowUntil);
  const last90 = newCustomersInLastNDays(full.newCustomersByDate, 90, windowUntil);

  const out: CustomerCohort = {
    windowDays: full.windowDays,
    windowOrders: full.windowOrders,
    totalCustomers: full.totalCustomers,
    subCustomers: full.subCustomers,
    otpCustomers: full.otpCustomers,
    avgLifetimeRevenue: full.avgLifetimeRevenue,
    avgOrdersPerCustomer: full.avgOrdersPerCustomer,
    subMixPct: full.subMixPct,
    repeatRatePct: full.repeatRatePct,
    newCustomersInRange,
    newCustomersLast30d: last30,
    newCustomersLast90d: last90,
    range: { since: rangeSince, until: rangeUntil },
    truncated: full.truncated,
    computedAt: full.computedAt,
  };

  return Response.json(out);
}

// ── helpers ──────────────────────────────────────────────────────────────

async function pullAndAggregate(
  windowSince: string,
  windowUntil: string,
  storeDomain: string,
  accessToken: string,
): Promise<CachedFullWindow> {
  const created_at_min = new Date(`${windowSince}T00:00:00Z`).toISOString();
  const created_at_max = new Date(`${windowUntil}T00:00:00Z`);
  created_at_max.setUTCDate(created_at_max.getUTCDate() + 1);
  const created_at_max_iso = created_at_max.toISOString();

  let nextUrl: string | null =
    `https://${storeDomain}/admin/api/2024-10/orders.json?status=any` +
    `&created_at_min=${encodeURIComponent(created_at_min)}` +
    `&created_at_max=${encodeURIComponent(created_at_max_iso)}` +
    `&limit=${PAGE_SIZE}` +
    `&fields=id,created_at,total_price,financial_status,line_items,customer,email`;

  const allOrders: ShopifyOrder[] = [];
  let pages = 0;
  let truncated = false;

  while (nextUrl && pages < PAGE_CAP) {
    let res: Response | null = null;
    let attempt = 0;
    // Up to 3 attempts per page to absorb a transient 429 / 5xx without losing the whole window.
    while (attempt < 3) {
      attempt++;
      try {
        res = await fetch(nextUrl, {
          headers: { "X-Shopify-Access-Token": accessToken },
        });
      } catch (err) {
        console.warn("[customer-cohort] network error on page %d attempt %d", pages, attempt, err);
        if (attempt >= 3) {
          truncated = true;
          nextUrl = null;
          break;
        }
        await sleep(500 * attempt);
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        const retryAfterHeader = res.headers.get("retry-after");
        const wait = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 1000 * attempt;
        console.warn("[customer-cohort] %d on page %d — retrying in %dms", res.status, pages, wait);
        await sleep(wait);
        continue;
      }
      break;
    }

    if (!res || !res.ok) {
      // Don't throw — return what we have and flag truncated. Partial data is more useful than no data.
      console.warn("[customer-cohort] giving up at page %d, status %s — returning partial", pages, res?.status);
      truncated = true;
      break;
    }

    pages++;
    const okRes: Response = res;
    const json = (await okRes.json()) as { orders: ShopifyOrder[] };
    allOrders.push(...json.orders);

    const linkHeader: string = okRes.headers.get("link") ?? "";
    const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = nextMatch ? nextMatch[1] : null;

    if (pages === PAGE_CAP && nextUrl) {
      truncated = true;
      console.warn("[customer-cohort] pagination cap reached at %d pages — totals may be understated", PAGE_CAP);
      nextUrl = null;
    }
  }

  // Filter to revenue orders + roll up per customer.
  // Customer key uses customer.id when present, falling back to email for guest checkouts so
  // repeat-but-unlinked buyers still aggregate correctly.
  const customerMap = new Map<string, CustomerRollup>();
  let subOrders = 0;
  let totalOrders = 0;

  for (const order of allOrders) {
    if (!REVENUE_STATUSES.has(order.financial_status)) continue;
    const total = parseFloat(order.total_price ?? "0");
    if (total <= MIN_ORDER_VALUE) continue;

    totalOrders++;

    const isSubOrder = order.line_items.some((li) => li.selling_plan_allocation != null);
    if (isSubOrder) subOrders++;

    const customerKey = customerKeyFor(order);
    const orderDate = order.created_at.slice(0, 10);
    const existing = customerMap.get(customerKey);
    if (existing) {
      existing.totalRevenue += total;
      existing.orderCount += 1;
      if (isSubOrder) existing.hasSubscriptionOrder = true;
      if (orderDate < existing.firstOrderDate) existing.firstOrderDate = orderDate;
    } else {
      customerMap.set(customerKey, {
        key: customerKey,
        totalRevenue: total,
        orderCount: 1,
        hasSubscriptionOrder: isSubOrder,
        firstOrderDate: orderDate,
      });
    }
  }

  const customers = [...customerMap.values()];
  const subCustomers = customers.filter((c) => c.hasSubscriptionOrder);
  const otpCustomers = customers.filter((c) => !c.hasSubscriptionOrder);

  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.orderCount > 1).length;

  const sumRevenue = (xs: CustomerRollup[]) => xs.reduce((s, c) => s + c.totalRevenue, 0);
  const sumOrders = (xs: CustomerRollup[]) => xs.reduce((s, c) => s + c.orderCount, 0);
  const avg = (sum: number, count: number) => (count > 0 ? sum / count : 0);

  const avgLifetimeRevenue = {
    blended: avg(sumRevenue(customers), totalCustomers),
    sub: avg(sumRevenue(subCustomers), subCustomers.length),
    otp: avg(sumRevenue(otpCustomers), otpCustomers.length),
  };

  const avgOrdersPerCustomer = {
    blended: avg(sumOrders(customers), totalCustomers),
    sub: avg(sumOrders(subCustomers), subCustomers.length),
    otp: avg(sumOrders(otpCustomers), otpCustomers.length),
  };

  const subMixPct = totalOrders > 0 ? (subOrders / totalOrders) * 100 : 0;
  const repeatRatePct = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

  // Build per-day new-customer histogram so range-aware lookups are cheap.
  const newCustomersByDate: Record<string, number> = {};
  for (const c of customers) {
    newCustomersByDate[c.firstOrderDate] = (newCustomersByDate[c.firstOrderDate] ?? 0) + 1;
  }

  console.log(
    "[customer-cohort] window=%s..%s pages=%d raw_orders=%d revenue_orders=%d customers=%d sub=%d truncated=%s",
    windowSince, windowUntil, pages, allOrders.length, totalOrders, totalCustomers, subCustomers.length, truncated,
  );

  return {
    windowDays: WINDOW_DAYS,
    windowOrders: totalOrders,
    totalCustomers,
    subCustomers: subCustomers.length,
    otpCustomers: otpCustomers.length,
    avgLifetimeRevenue,
    avgOrdersPerCustomer,
    subMixPct,
    repeatRatePct,
    newCustomersByDate,
    truncated,
    computedAt: new Date().toISOString(),
    windowSince,
    windowUntil,
  };
}

function customerKeyFor(order: ShopifyOrder): string {
  if (order.customer?.id) return `id:${order.customer.id}`;
  const email = (order.customer?.email ?? order.email ?? "").trim().toLowerCase();
  if (email) return `email:${email}`;
  // No identifier — fall back to a per-order key so the order still counts but doesn't
  // wrongly link with anything else.
  return `order:${order.id}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sumNewCustomers(byDate: Record<string, number>, since: string, until: string): number {
  let sum = 0;
  for (const [date, count] of Object.entries(byDate)) {
    if (date >= since && date <= until) sum += count;
  }
  return sum;
}

function newCustomersInLastNDays(byDate: Record<string, number>, n: number, asOfIso: string): number {
  const asOf = new Date(`${asOfIso}T00:00:00Z`);
  const since = new Date(asOf.getTime() - (n - 1) * 86_400_000).toISOString().slice(0, 10);
  return sumNewCustomers(byDate, since, asOfIso);
}
