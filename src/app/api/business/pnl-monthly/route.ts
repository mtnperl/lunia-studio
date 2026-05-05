import { kv } from "@/lib/kv";
import { fetchSimpleFin } from "@/lib/simplefin-client";
import { calcAOV, calcROAS } from "@/lib/analytics-utils";
import { composePnL } from "@/lib/pnl-composer";
import { detectRecurring, recurringTxnIdSet, totalMonthlyRecurring } from "@/lib/recurring-detector";
import {
  ASSUMPTIONS_KV_KEY,
  DEFAULT_ASSUMPTIONS,
  type BusinessAssumptions,
  type Categorization,
  type PnL,
  type SimpleFinTxn,
} from "@/lib/business-types";
import type { MetaData, ShopifyData } from "@/lib/types";

export const maxDuration = 120;

type MonthlyResponse = {
  months: Array<{
    label: string;          // "Jan 2026"
    range: { since: string; until: string };
    pnl: PnL;
  }>;
  totals: PnL;
  truncated?: { meta?: boolean; shopify?: boolean };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bust = url.searchParams.get("bust") === "1";

  // Build the 12-month window ending at the current month's last-known day.
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const months = buildMonthWindow(todayUtc, 12);
  const fullSince = months[0].since;
  const fullUntil = months[months.length - 1].until;

  const origin = `${url.protocol}//${url.host}`;
  const qs = `since=${fullSince}&until=${fullUntil}${bust ? "&bust=1" : ""}`;

  // Forward the user's auth cookie so the internal /api/meta + /api/shopify
  // fetches survive the auth middleware in production.
  const cookie = req.headers.get("cookie") ?? "";

  // Pull everything once over the whole window.
  const [assumptions, meta, shopify, simplefin, recurringWindow] = await Promise.all([
    loadAssumptions(),
    fetchJson<MetaData>(`${origin}/api/meta?${qs}`, cookie),
    fetchJson<ShopifyData>(`${origin}/api/shopify?${qs}`, cookie),
    loadSimpleFin(fullSince, fullUntil),
    loadRecurringWindow(),
  ]);

  const allTxns = simplefin?.transactions ?? [];
  const categorizations = await loadCategorizations(allTxns);

  // Detect recurring — uses a 180d window so our monthly P&Ls inherit a stable
  // run-rate signal instead of recomputing recurrence per month.
  let recurringTxnIds: Set<string> | undefined;
  let recurringMonthlyRunRate = 0;
  if (recurringWindow) {
    const recCats = await loadCategorizations(recurringWindow.transactions);
    const detected = detectRecurring(recurringWindow.transactions, recCats);
    recurringTxnIds = recurringTxnIdSet(detected);
    recurringMonthlyRunRate = totalMonthlyRecurring(detected);
  }

  // Compose one P&L per month.
  const monthsOut: MonthlyResponse["months"] = months.map((m) => {
    const monthMeta = sliceMeta(meta, m.since, m.until);
    const monthShopify = sliceShopify(shopify, m.since, m.until);
    const monthTxns = simplefin
      ? { transactions: filterTxns(allTxns, m.since, m.until) }
      : null;

    const pnl = composePnL({
      range: m,
      meta: monthMeta,
      shopify: monthShopify,
      simplefin: monthTxns,
      categorizations,
      recurringTxnIds,
      recurringMonthlyRunRate,
      assumptions,
    });

    return {
      label: monthLabel(m.since),
      range: m,
      pnl,
    };
  });

  // Yearly totals — compose once over the full window so derived percentages
  // (gross margin, net margin, LTV:CAC) are computed on real aggregates.
  const totals = composePnL({
    range: { since: fullSince, until: fullUntil },
    meta: meta ?? null,
    shopify: shopify ?? null,
    simplefin: simplefin,
    categorizations,
    recurringTxnIds,
    recurringMonthlyRunRate,
    assumptions,
  });

  const payload: MonthlyResponse = {
    months: monthsOut,
    totals,
    truncated: {
      meta: !!meta?.truncated,
      shopify: !!shopify?.truncated,
    },
  };

  return Response.json(payload);
}

// ── helpers ──────────────────────────────────────────────────────────────

function buildMonthWindow(today: Date, count: number): Array<{ since: string; until: string }> {
  const months: Array<{ since: string; until: string }> = [];
  const startMonth = today.getUTCMonth() - (count - 1);
  const startDate = new Date(Date.UTC(today.getUTCFullYear(), startMonth, 1));
  for (let i = 0; i < count; i++) {
    const monthStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1));
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
    // Clamp the final month to today so we don't show "future" days as $0.
    const cappedEnd = monthEnd.getTime() > today.getTime() ? today : monthEnd;
    months.push({
      since: monthStart.toISOString().slice(0, 10),
      until: cappedEnd.toISOString().slice(0, 10),
    });
  }
  return months;
}

function monthLabel(sinceIso: string): string {
  const d = new Date(`${sinceIso}T00:00:00Z`);
  return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function isoWithinRange(iso: string, since: string, until: string): boolean {
  return iso >= since && iso <= until;
}

/** Build a partial MetaData scoped to one month from the full-year payload. */
function sliceMeta(full: MetaData | null, since: string, until: string): MetaData | null {
  if (!full) return null;
  const days = full.by_day.filter((d) => isoWithinRange(d.date, since, until));
  const spend = days.reduce((s, d) => s + d.spend, 0);
  const revenue = days.reduce((s, d) => s + d.revenue, 0);
  return {
    summary: {
      spend,
      revenue,
      roas: calcROAS(spend, revenue),
      impressions: 0, // not used by the composer
      clicks: 0,
    },
    campaigns: [],
    ads: [],
    by_day: days,
  };
}

/** Build a partial ShopifyData scoped to one month from the full-year payload. */
function sliceShopify(full: ShopifyData | null, since: string, until: string): ShopifyData | null {
  if (!full) return null;
  const days = full.by_day.filter((d) => isoWithinRange(d.date, since, until));
  const orders = days.reduce((s, d) => s + d.orders, 0);
  const revenue = days.reduce((s, d) => s + d.revenue, 0);
  return {
    summary: {
      orders,
      revenue,
      aov: calcAOV(orders, revenue),
      subscriptionRevenue: 0,
      onetimeRevenue: 0,
      subscriptionOrders: 0,
      onetimeOrders: 0,
    },
    by_day: days,
    products: [],
  };
}

function filterTxns(txns: SimpleFinTxn[], since: string, until: string): SimpleFinTxn[] {
  const start = Date.parse(`${since}T00:00:00Z`) / 1000;
  const end = Date.parse(`${until}T23:59:59Z`) / 1000;
  return txns.filter((t) => t.posted >= start && t.posted <= end);
}

async function loadAssumptions(): Promise<BusinessAssumptions> {
  try {
    const stored = await kv.get<BusinessAssumptions>(ASSUMPTIONS_KV_KEY);
    return stored ?? DEFAULT_ASSUMPTIONS;
  } catch {
    return DEFAULT_ASSUMPTIONS;
  }
}

async function fetchJson<T extends { truncated?: boolean }>(url: string, cookie = ""): Promise<T | null> {
  try {
    const res = await fetch(url, cookie ? { headers: { cookie } } : undefined);
    if (!res.ok) return null;
    const body = await res.json();
    if (body && typeof body === "object" && "error" in body) return null;
    return body as T;
  } catch {
    return null;
  }
}

async function loadSimpleFin(since: string, until: string): Promise<{ transactions: SimpleFinTxn[] } | null> {
  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl) return null;
  try {
    const data = await fetchSimpleFin(accessUrl, since, until);
    return { transactions: data.transactions };
  } catch (err) {
    console.warn("[api/business/pnl-monthly] simplefin fetch failed", err);
    return null;
  }
}

async function loadRecurringWindow(): Promise<{ transactions: SimpleFinTxn[] } | null> {
  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl) return null;
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const since = new Date(todayUtc.getTime() - 179 * 86_400_000).toISOString().slice(0, 10);
  const until = todayUtc.toISOString().slice(0, 10);
  try {
    const data = await fetchSimpleFin(accessUrl, since, until);
    return { transactions: data.transactions };
  } catch {
    return null;
  }
}

async function loadCategorizations(txns: SimpleFinTxn[]): Promise<Map<string, Categorization>> {
  const out = new Map<string, Categorization>();
  await Promise.all(
    txns.map(async (t) => {
      try {
        const cat = await kv.get<Categorization>(`simplefin:cat:v2:${t.id}`);
        if (cat) out.set(t.id, cat);
      } catch {
        /* ignore */
      }
    })
  );
  return out;
}
