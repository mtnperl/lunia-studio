"use client";
import { useCallback, useEffect, useState } from "react";
import DateRangePicker, { type DateRange } from "../dashboard/DateRangePicker";
import RefreshButton from "../dashboard/RefreshButton";
import KPICard from "../dashboard/KPICard";
import type { PnL } from "@/lib/business-types";

function defaultRange(): DateRange {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = new Date(today.getTime() - 29 * 86_400_000);
  return {
    since: since.toISOString().slice(0, 10),
    until: today.toISOString().slice(0, 10),
  };
}

export default function UnitEconomicsSubview() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [pnl, setPnl] = useState<PnL | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchPnl = useCallback(async (r: DateRange, bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/pnl?since=${r.since}&until=${r.until}${bust ? "&bust=1" : ""}&prior=0`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not load");
      } else {
        setPnl(body as PnL);
        setLastRefreshed(new Date());
      }
    } catch {
      setError("Could not reach the P&L endpoint");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPnl(range);
  }, [range, fetchPnl]);

  const ue = pnl?.unitEconomics;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 80px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-ui)",
            fontSize: 24,
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}>
            Unit Economics
          </h1>
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--muted)",
            margin: "6px 0 0",
          }}>
            CAC from live Meta + Shopify, LTV computed from your assumptions. Update assumptions to recompute LTV.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <DateRangePicker value={range} onChange={setRange} />
          <RefreshButton
            loading={loading}
            onClick={() => fetchPnl(range, true)}
            lastRefreshed={lastRefreshed ?? undefined}
          />
        </div>
      </div>

      {error && (
        <div style={{
          borderLeft: "3px solid var(--warning)",
          background: "var(--surface-r)",
          padding: "12px 16px",
          borderRadius: "0 6px 6px 0",
          fontSize: 13,
          color: "var(--warning)",
          fontFamily: "var(--font-ui)",
          marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .ue-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .ue-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Headline tiles */}
      <div className="ue-grid-4" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 24,
      }}>
        <KPICard
          label="CAC"
          value={ue?.cac ?? 0}
          prefix="$"
          decimals={2}
          loading={loading}
          tooltip="Customer Acquisition Cost = Meta ad spend ÷ orders in this period"
        />
        <KPICard
          label="Blended LTV"
          value={ue?.blendedLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip="Weighted Sub LTV + OTP LTV based on subscription mix assumption"
        />
        <KPICard
          label="LTV : CAC"
          value={ue?.ltvToCac ?? 0}
          suffix="x"
          decimals={2}
          loading={loading}
          tooltip="Healthy DTC benchmark is 3x or higher"
        />
        <KPICard
          label="Payback"
          value={ue?.paybackMonths ?? 0}
          suffix=" mo"
          decimals={1}
          loading={loading}
          tooltip="Months of contribution margin to recover CAC"
        />
      </div>

      {/* LTV breakdown — sub vs OTP */}
      <div className="ue-grid-3" style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 12,
      }}>
        <KPICard
          label="Sub LTV"
          value={ue?.subLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip="Per-order contribution × avg sub lifetime months (1 order/month)"
        />
        <KPICard
          label="OTP LTV"
          value={ue?.otpLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip="Per-order contribution × (1 + OTP repeat rate)"
        />
      </div>

      <div style={{ marginTop: 24, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)", lineHeight: 1.6 }}>
        Want to change subscription mix, churn, repeat rate, or per-unit COGS? Update <strong style={{ color: "var(--muted)" }}>Business → Assumptions</strong> and refresh.
      </div>
    </div>
  );
}
