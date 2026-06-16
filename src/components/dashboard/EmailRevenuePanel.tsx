"use client";
import { useEffect, useState, useCallback } from "react";
import KPICard from "./KPICard";

type Entry = {
  id: string; name: string; channel: "email" | "sms" | "other";
  revenue: number; conversions: number; recipients: number; openRate: number; clickRate: number;
};
type OwnedChannelRevenue = {
  timeframe: string; conversionMetricResolved: boolean;
  totalRevenue: number; flowRevenue: number; campaignRevenue: number;
  flows: Entry[]; campaigns: Entry[];
};

const TIMEFRAMES: { key: string; label: string }[] = [
  { key: "last_30_days", label: "30d" },
  { key: "last_90_days", label: "90d" },
  { key: "last_365_days", label: "365d" },
];

const CHANNEL_DOT: Record<Entry["channel"], string> = {
  email: "var(--accent)", sms: "#7E9ECC", other: "var(--subtle)",
};

/** Owned-channel (Klaviyo email + SMS) attributed revenue. Self-contained:
 *  fetches /api/klaviyo/revenue and degrades gracefully when Klaviyo isn't
 *  connected. `shopifyRevenue` (optional) powers the "% of revenue" context. */
export default function EmailRevenuePanel({ shopifyRevenue }: { shopifyRevenue?: number }) {
  const [data, setData] = useState<OwnedChannelRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noKey, setNoKey] = useState(false);
  const [timeframe, setTimeframe] = useState("last_90_days");

  const load = useCallback(async (tf: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/klaviyo/revenue?timeframe=${tf}`);
      const body = await res.json();
      if (res.status === 503 && body?.code === "no_key") { setNoKey(true); setData(null); return; }
      if (!res.ok || body?.error) { setError(body?.error ?? "Could not load email revenue"); setData(null); return; }
      setData(body as OwnedChannelRevenue);
    } catch {
      setError("Network error loading email revenue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(timeframe); }, [timeframe, load]);

  if (noKey) return null; // Klaviyo not connected — hide the panel entirely

  const pctOfRevenue = data && shopifyRevenue && shopifyRevenue > 0
    ? (data.totalRevenue / shopifyRevenue) * 100
    : null;

  const renderList = (title: string, rows: Entry[]) => (
    <div style={{ flex: 1, minWidth: 280 }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: 8 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)", padding: "8px 0" }}>No attributed revenue in this window.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
          <tbody>
            {rows.slice(0, 6).map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ textAlign: "left", padding: "8px 8px 8px 0", fontFamily: "var(--font-ui)", color: "var(--text)" }}>
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: CHANNEL_DOT[r.channel], marginRight: 7, verticalAlign: "middle" }} />
                  {r.name}
                </td>
                <td style={{ textAlign: "right", padding: "8px 0 8px 8px", color: "var(--text)", whiteSpace: "nowrap" }}>${Math.round(r.revenue).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>
          Email &amp; SMS revenue · Klaviyo
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {TIMEFRAMES.map((tf) => (
            <button key={tf.key} onClick={() => setTimeframe(tf.key)} style={{
              padding: "3px 9px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
              border: `1px solid ${timeframe === tf.key ? "var(--accent)" : "var(--border)"}`,
              background: timeframe === tf.key ? "var(--accent-dim)" : "transparent",
              color: timeframe === tf.key ? "var(--accent)" : "var(--muted)", borderRadius: 5,
            }}>{tf.label}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--error)" }}>{error}</div>}
      {data && !data.conversionMetricResolved && (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--warning)", marginBottom: 12 }}>
          Couldn&apos;t resolve the &quot;Placed Order&quot; conversion metric in Klaviyo — revenue may be incomplete.
        </div>
      )}

      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: data && (data.flows.length || data.campaigns.length) ? 20 : 0 }}>
        <KPICard label="Owned-channel revenue" value={data?.totalRevenue ?? 0} prefix="$" loading={loading}
          statusNote={pctOfRevenue != null ? `${pctOfRevenue.toFixed(0)}% of Shopify revenue` : undefined}
          tooltip="Attributed revenue (Placed Order conversion value) from Klaviyo flows + campaigns in this window. Near-100% margin." />
        <KPICard label="Flows" value={data?.flowRevenue ?? 0} prefix="$" loading={loading}
          tooltip="Revenue from automated flows (welcome, abandoned, winback, etc.)" />
        <KPICard label="Campaigns" value={data?.campaignRevenue ?? 0} prefix="$" loading={loading}
          tooltip="Revenue from one-off campaign sends" />
      </div>

      {data && (data.flows.length > 0 || data.campaigns.length > 0) && (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {renderList("Top flows by revenue", data.flows)}
          {renderList("Top campaigns by revenue", data.campaigns)}
        </div>
      )}
    </div>
  );
}
