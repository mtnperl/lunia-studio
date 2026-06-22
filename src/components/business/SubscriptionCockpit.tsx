"use client";
import { useEffect, useState } from "react";
import KPICard from "../dashboard/KPICard";

type SubscriptionMetrics = {
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
};

/** Subscription cockpit — MRR / active / new / churn for the Kaching
 *  subscription program, derived from subscription ORDERS (selling-plan lines
 *  + Kaching tags), not Shopify subscription contracts. A custom app can only
 *  read contracts it created itself, and Kaching owns ours — so the contracts
 *  API always returns empty. Orders carry the same signal and are readable with
 *  the read_orders scope this app already has. Churn is an estimate (a
 *  subscriber with no monthly rebill in the last 30 days). */
export default function SubscriptionCockpit() {
  const [data, setData] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shopify/subscriptions");
        if (res.status === 503) { setHidden(true); return; } // no Shopify creds
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || body?.error) { setError(body?.error ?? "Could not load subscriptions"); return; }
        setData(body as SubscriptionMetrics);
      } catch {
        if (!cancelled) setError("Network error loading subscriptions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (hidden) return null;

  const unavailable = data?.source === "unavailable";

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>
          Subscriptions · Kaching (from orders)
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--subtle)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 6px" }}>Estimated</span>
      </div>

      {error && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--error)" }}>{error}</div>}

      {unavailable ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--warning)", lineHeight: 1.6 }}>
          Couldn&apos;t load subscription orders from Shopify. This reads the Orders API (not subscription
          contracts) — confirm the custom app has the <strong style={{ color: "var(--muted)" }}>read_orders</strong> scope
          and the access token is valid.
        </div>
      ) : (
        <>
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KPICard label="MRR" value={data?.mrr ?? 0} prefix="$" loading={loading}
              statusNote={data && data.arr ? `$${Math.round(data.arr).toLocaleString()} ARR` : undefined}
              tooltip="Monthly recurring revenue — sum of the latest subscription-order value for every subscriber active in the last 35 days, net of subscribe-and-save discounts. Plans bill monthly, so the last charge is the monthly run-rate." />
            <KPICard label="Active subscriptions" value={data?.activeSubscriptions ?? 0} loading={loading}
              statusNote={data && data.activeSubscribers ? `${data.activeSubscribers} subscribers` : undefined}
              tooltip="Distinct customers with a Kaching subscription order (first or recurring) in the last 35 days." />
            <KPICard label="Avg sub value" value={data?.avgSubValue ?? 0} prefix="$" suffix="/mo" decimals={2} loading={loading}
              tooltip="MRR ÷ active subscriptions." />
            <KPICard label="Churn (30d) · est." value={data?.churnRate30dPct ?? 0} suffix="%" decimals={1} loading={loading}
              status={data ? (data.churnRate30dPct <= 5 ? "good" : data.churnRate30dPct <= 10 ? "warn" : "bad") : undefined}
              statusNote={data ? `${data.cancelled30d} lapsed · ${data.new30d} new` : undefined}
              tooltip="ESTIMATE. Kaching doesn't tag cancellations, so churn = subscribers whose last order was 35–65 days ago (they missed the monthly rebill due in the last 30 days) ÷ (active + lapsed). A snapshot estimate, not true cohorted churn." />
          </div>

          <div style={{ marginTop: 12, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--subtle)", lineHeight: 1.5 }}>
            Derived from subscription orders (selling plan + Kaching tags), not Shopify subscription contracts. MRR &amp; active counts are exact to paid orders; churn is an estimate.
            {data?.truncated && <span style={{ color: "var(--warning)" }}> ⚠ order window capped — totals may be understated.</span>}
          </div>
        </>
      )}
    </div>
  );
}
