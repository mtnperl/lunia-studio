import { kv } from "@/lib/kv";
import { resolveRangeParams } from "@/lib/analytics-utils";
import { fetchSimpleFin } from "@/lib/simplefin-client";
import { composePnL } from "@/lib/pnl-composer";
import {
  ASSUMPTIONS_KV_KEY,
  DEFAULT_ASSUMPTIONS,
  type BusinessAssumptions,
  type Categorization,
  type SimpleFinTxn,
} from "@/lib/business-types";
import type { MetaData, ShopifyData } from "@/lib/types";

export const maxDuration = 120;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resolved = resolveRangeParams(url, { defaultDays: 30, maxDays: 400 });
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: 400 });
  }
  const { since, until, days } = resolved;

  // Prior range = same length, ending the day before `since`.
  const priorRange = priorWindow(since, days);

  const origin = `${url.protocol}//${url.host}`;
  const bust = url.searchParams.get("bust") === "1";
  const includePrior = url.searchParams.get("prior") !== "0";

  // ── Pull every input in parallel ────────────────────────────────────────
  const [assumptions, current, prior] = await Promise.all([
    loadAssumptions(),
    loadAll({ origin, since, until, bust }),
    includePrior ? loadAll({ origin, since: priorRange.since, until: priorRange.until, bust: false }) : Promise.resolve(null),
  ]);

  // Merge categorizations for current + prior windows. We need to look up
  // categorizations for all txns we'll feed to the composer.
  const currentCategorizations = await loadCategorizations(current.simplefin?.transactions ?? []);
  const priorCategorizations = prior?.simplefin?.transactions
    ? await loadCategorizations(prior.simplefin.transactions)
    : undefined;

  const pnl = composePnL({
    range: { since, until },
    priorRange: includePrior ? priorRange : undefined,
    meta: current.meta,
    shopify: current.shopify,
    simplefin: current.simplefin,
    categorizations: currentCategorizations,
    assumptions,
    prior: prior
      ? {
          meta: prior.meta,
          shopify: prior.shopify,
          simplefin: prior.simplefin,
          categorizations: priorCategorizations,
        }
      : undefined,
  });

  return Response.json(pnl);
}

// ── helpers ──────────────────────────────────────────────────────────────

function priorWindow(since: string, days: number): { since: string; until: string } {
  const sinceMs = Date.parse(`${since}T00:00:00Z`);
  const priorUntilMs = sinceMs - 86_400_000;
  const priorSinceMs = priorUntilMs - (days - 1) * 86_400_000;
  return {
    since: new Date(priorSinceMs).toISOString().slice(0, 10),
    until: new Date(priorUntilMs).toISOString().slice(0, 10),
  };
}

async function loadAssumptions(): Promise<BusinessAssumptions> {
  try {
    const stored = await kv.get<BusinessAssumptions>(ASSUMPTIONS_KV_KEY);
    return stored ?? DEFAULT_ASSUMPTIONS;
  } catch {
    return DEFAULT_ASSUMPTIONS;
  }
}

type Bundle = {
  meta: MetaData | null;
  shopify: ShopifyData | null;
  simplefin: { transactions: SimpleFinTxn[] } | null;
};

async function loadAll(opts: {
  origin: string;
  since: string;
  until: string;
  bust: boolean;
}): Promise<Bundle> {
  const { origin, since, until, bust } = opts;
  const qs = `since=${since}&until=${until}${bust ? "&bust=1" : ""}`;

  const [meta, shopify, simplefin] = await Promise.all([
    fetchJson<MetaData>(`${origin}/api/meta?${qs}`),
    fetchJson<ShopifyData>(`${origin}/api/shopify?${qs}`),
    loadSimpleFin(since, until),
  ]);

  return { meta, shopify, simplefin };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
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
    console.warn("[api/business/pnl] simplefin fetch failed", err);
    return null;
  }
}

async function loadCategorizations(txns: SimpleFinTxn[]): Promise<Map<string, Categorization>> {
  const out = new Map<string, Categorization>();
  await Promise.all(
    txns.map(async (t) => {
      try {
        const cat = await kv.get<Categorization>(`simplefin:cat:v1:${t.id}`);
        if (cat) out.set(t.id, cat);
      } catch {
        /* ignore — txn stays uncategorized */
      }
    })
  );
  return out;
}
