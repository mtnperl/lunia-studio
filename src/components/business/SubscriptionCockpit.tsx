"use client";
import { useEffect, useState } from "react";
import KPICard from "../dashboard/KPICard";

type SubscriptionMetrics = {
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
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "var(--success)", PAUSED: "var(--warning)", CANCELLED: "var(--error)",
  EXPIRED: "var(--subtle)", FAILED: "var(--error)",
};

/** Subscription cockpit — true MRR / churn from Shopify native subscription
 *  contracts (Katching). Hides itself when Shopify isn't configured; shows a
 *  scope hint when the contracts API is denied. UNVALIDATED until confirmed
 *  against the live store (numbers can't be exercised from dev). */
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

  const denied = data?.source === "unavailable";

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>
          Subscriptions · Shopify contracts
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--warning)", border: "1px solid var(--warning)", borderRadius: 4, padding: "1px 6px" }}>Unvalidated</span>
      </div>

      {error && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--error)" }}>{error}</div>}

      {denied ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--warning)", lineHeight: 1.6 }}>
          Couldn&apos;t read subscription contracts. Confirm the Shopify custom app has the
          <strong style={{ color: "var(--muted)" }}> read_own_subscription_contracts</strong> scope and was re-installed.
        </div>
      ) : (
        <>
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: data && Object.keys(data.statusCounts).length ? 16 : 0 }}>
            <KPICard label="MRR" value={data?.mrr ?? 0} prefix="$" loading={loading}
              statusNote={data && data.arr ? `$${Math.round(data.arr).toLocaleString()} ARR` : undefined}
              tooltip="Monthly recurring revenue across ACTIVE subscription contracts, each normalized to a monthly amount by its billing interval." />
            <KPICard label="Active subscriptions" value={data?.activeSubscriptions ?? 0} loading={loading}
              statusNote={data && data.activeSubscribers ? `${data.activeSubscribers} subscribers` : undefined}
              tooltip="Count of subscription contracts with status ACTIVE (and distinct subscribers)." />
            <KPICard label="Avg sub value" value={data?.avgSubValue ?? 0} prefix="$" suffix="/mo" decimals={2} loading={loading}
              tooltip="MRR ÷ active subscriptions." />
            <KPICard label="Churn (30d)" value={data?.churnRate30dPct ?? 0} suffix="%" decimals={1} loading={loading}
              status={data ? (data.churnRate30dPct <= 5 ? "good" : data.churnRate30dPct <= 10 ? "warn" : "bad") : undefined}
              statusNote={data ? `${data.cancelled30d} cancelled · ${data.new30d} new` : undefined}
              tooltip="Approx: contracts cancelled in the last 30 days ÷ (active + cancelled-30d). A snapshot estimate, not a true cohorted churn." />
          </div>

          {data && Object.keys(data.statusCounts).length > 0 && (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              {Object.entries(data.statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLOR[status] ?? "var(--subtle)" }} />
                  {status.toLowerCase()} {count}
                </span>
              ))}
              {data.truncated && <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--warning)" }}>⚠ capped — totals understated</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
