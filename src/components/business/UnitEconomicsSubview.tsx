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
  const cohort = ue?.cohort;
  const isReal = ue?.source === "shopify-cohort";

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
            {isReal
              ? "CAC and LTV computed from real customer data — last 365 days of Shopify orders, current-period gross margin."
              : "CAC and LTV derived from your assumption form. Connect Shopify or update the assumptions to see real numbers."}
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

      {/* Source badge */}
      {ue && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 12px",
          borderRadius: 999,
          background: isReal ? "var(--accent-dim)" : "var(--surface-r)",
          border: `1px solid ${isReal ? "var(--accent-mid)" : "var(--border)"}`,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 500,
          color: isReal ? "var(--accent)" : "var(--muted)",
          marginBottom: 20,
        }}>
          <span style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isReal ? "var(--accent)" : "var(--muted)",
          }} />
          {isReal
            ? `Real data · ${cohort?.totalCustomers.toLocaleString() ?? 0} customers · 365d window`
            : "Assumption-based"}
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .ue-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .ue-grid-2 { grid-template-columns: 1fr !important; }
          .ue-cust-grid { grid-template-columns: repeat(2, 1fr) !important; }
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
          tooltip={isReal
            ? "Customer Acquisition Cost = Meta ad spend ÷ NEW customers acquired in this period (from Shopify)"
            : "CAC = Meta ad spend ÷ orders. Connect Shopify cohort for real new-customer math."}
        />
        <KPICard
          label="Blended LTV"
          value={ue?.blendedLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip={isReal
            ? "Mean 12-month revenue per customer × current gross margin"
            : "Weighted Sub LTV + OTP LTV based on subscription mix assumption"}
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
      <div className="ue-grid-2" style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 12,
        marginBottom: cohort ? 24 : 0,
      }}>
        <KPICard
          label="Sub LTV"
          value={ue?.subLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip={isReal
            ? "Mean 12-month revenue per subscription customer × current gross margin"
            : "Per-order contribution × avg sub lifetime months"}
        />
        <KPICard
          label="OTP LTV"
          value={ue?.otpLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip={isReal
            ? "Mean 12-month revenue per one-time-purchase customer × current gross margin"
            : "Per-order contribution × (1 + OTP repeat rate)"}
        />
      </div>

      {/* Real customer base panel */}
      {cohort && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 20,
          marginTop: 8,
        }}>
          <div style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 14,
            paddingBottom: 10,
            borderBottom: "1px solid var(--border)",
          }}>
            Customer base · trailing 12 months
          </div>
          <div className="ue-cust-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}>
            <Stat label="Total customers" value={cohort.totalCustomers.toLocaleString()} />
            <Stat
              label="New (this period)"
              value={cohort.newCustomersInRange.toLocaleString()}
              hint={`${range.since} → ${range.until}`}
            />
            <Stat
              label="Sub mix (actual)"
              value={`${cohort.subMixActualPct.toFixed(1)}%`}
              hint={`${cohort.subCustomers.toLocaleString()} sub customers`}
            />
            <Stat
              label="Repeat rate"
              value={`${cohort.repeatRatePct.toFixed(1)}%`}
              hint={`${cohort.avgOrdersPerCustomer.toFixed(1)} orders / customer`}
            />
          </div>
        </div>
      )}

      {!isReal && (
        <div style={{ marginTop: 24, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)", lineHeight: 1.6 }}>
          Want to change subscription mix, churn, repeat rate, or per-unit COGS? Update <strong style={{ color: "var(--muted)" }}>Business → Assumptions</strong> and refresh.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--font-ui)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--subtle)",
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 22,
        fontWeight: 600,
        color: "var(--text)",
      }}>
        {value}
      </div>
      {hint && (
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--subtle)",
          marginTop: 4,
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
