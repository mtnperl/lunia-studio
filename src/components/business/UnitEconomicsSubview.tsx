"use client";
import { useCallback, useEffect, useState } from "react";
import DateRangePicker, { type DateRange } from "../dashboard/DateRangePicker";
import RefreshButton from "../dashboard/RefreshButton";
import KPICard from "../dashboard/KPICard";
import SubscriptionCockpit from "./SubscriptionCockpit";
import DecisionModel from "./DecisionModel";
import type { CustomerCohort, PnL } from "@/lib/business-types";

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
  const [cohortRaw, setCohortRaw] = useState<CustomerCohort | null>(null);
  const [cohortError, setCohortError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAll = useCallback(async (r: DateRange, bust = false) => {
    setLoading(true);
    setError(null);
    setCohortError(null);

    const bustParam = bust ? "&bust=1" : "";
    const [pnlResult, cohortResult] = await Promise.allSettled([
      fetch(`/api/business/pnl?since=${r.since}&until=${r.until}${bustParam}&prior=0`).then(async (res) => ({
        ok: res.ok,
        body: await res.json(),
      })),
      fetch(`/api/shopify/customer-cohort?since=${r.since}&until=${r.until}${bustParam}`).then(async (res) => ({
        ok: res.ok,
        body: await res.json(),
      })),
    ]);

    if (pnlResult.status === "fulfilled") {
      if (pnlResult.value.ok) setPnl(pnlResult.value.body as PnL);
      else setError(pnlResult.value.body?.error ?? "Could not load P&L");
    } else {
      setError("Could not reach the P&L endpoint");
    }

    if (cohortResult.status === "fulfilled") {
      if (cohortResult.value.ok) {
        setCohortRaw(cohortResult.value.body as CustomerCohort);
      } else {
        setCohortError(cohortResult.value.body?.error ?? "Cohort unavailable");
      }
    } else {
      setCohortError("Could not reach the cohort endpoint");
    }

    setLastRefreshed(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll(range);
  }, [range, fetchAll]);

  // Direct cohort fetch is the source of truth for the customer-base panel
  // (it surfaces windowOrders + truncated flags). PnL composer's cohort is
  // for the CAC / LTV numbers themselves.
  const cohort = cohortRaw;
  const ue = pnl?.unitEconomics;
  const isReal = !!cohort && cohort.qualifiedCustomers > 0;

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
            {isReal && cohort
              ? `LTV = revenue ÷ customers (gross of margin). CAC = Meta ad spend ÷ new qualified customers. ROAS = total revenue ÷ ad spend. Customers and revenue based on Shopify orders ≥ $${cohort.minOrderValueForLtv} (excludes $0 promo / sub-$${cohort.minOrderValueForLtv} freebies).`
              : "Connect Shopify cohort to see real CAC, LTV and ROAS."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <DateRangePicker value={range} onChange={setRange} />
          <RefreshButton
            loading={loading}
            onClick={() => fetchAll(range, true)}
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

      {/* Source badge — explicit about what loaded so you can tell at a glance whether numbers are real */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        marginBottom: 20,
      }}>
        <span style={{
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
        }}>
          <span style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isReal ? "var(--accent)" : "var(--muted)",
          }} />
          {isReal && cohort
            ? `Real data · ${cohort.windowOrders.toLocaleString()} total orders · ${cohort.qualifiedOrders.toLocaleString()} qualified ($${cohort.minOrderValueForLtv}+) · ${cohort.qualifiedCustomers.toLocaleString()} qualified customers · 365d window`
            : "Assumption-based — cohort not loaded"}
        </span>
        {cohort?.truncated && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 999,
            background: "var(--surface-r)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--warning)",
          }}>
            ⚠ Pagination capped — counts may understate
          </span>
        )}
        {cohortError && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 999,
            background: "var(--surface-r)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--error)",
          }}>
            Cohort fetch: {cohortError}
          </span>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .ue-grid-3 { grid-template-columns: 1fr !important; }
          .ue-grid-2 { grid-template-columns: 1fr !important; }
          .ue-cust-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Subscription cockpit — true MRR/churn from Shopify contracts (Katching). */}
      <SubscriptionCockpit />

      {/* Headline tiles — CAC / LTV / ROAS */}
      <div className="ue-grid-3" style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
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
            ? "Meta ad spend ÷ new qualified customers in this period"
            : "Connect Shopify cohort for real CAC"}
        />
        <KPICard
          label="LTV"
          value={ue?.blendedLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip="Total qualified revenue ÷ total qualified customers (last 365 days, gross of margin)"
        />
        <KPICard
          label="ROAS"
          value={ue?.roas ?? 0}
          suffix="x"
          decimals={2}
          loading={loading}
          tooltip="Period-blended Return on Ad Spend = total Shopify revenue ÷ Meta ad spend (this period)"
        />
      </div>

      {/* LTV breakdown — subscriber (repeat) vs one-time */}
      <div className="ue-grid-2" style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 12,
        marginBottom: cohort ? 24 : 0,
      }}>
        <KPICard
          label="Subscriber LTV"
          value={ue?.subLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip="Subscriber qualified revenue ÷ subscriber count (last 365 days)"
        />
        <KPICard
          label="One-time LTV"
          value={ue?.otpLtv ?? 0}
          prefix="$"
          decimals={0}
          loading={loading}
          tooltip="One-time qualified revenue ÷ one-time customer count (last 365 days)"
        />
      </div>

      {/* Margin-adjusted health — LTV:CAC + payback (the "should we scale?" tiles) */}
      {(() => {
        const ratio = ue?.ltvCacRatio ?? 0;
        const payback = ue?.paybackMonths ?? 0;
        const haveRatio = isReal && (ue?.cac ?? 0) > 0 && ratio > 0;
        const ratioStatus = ratio >= 3 ? "good" : ratio >= 1 ? "warn" : "bad";
        const ratioNote = ratio >= 3 ? "Healthy — room to scale"
          : ratio >= 1 ? "Watch — margin is thin"
          : "Unprofitable — fix before scaling";
        const paybackStatus = payback > 0 && payback <= 12 ? "good" : payback <= 18 ? "warn" : "bad";
        const paybackNote = payback <= 12 ? "Recovers in under a year"
          : payback <= 18 ? "12–18 months — watch cash"
          : "Over 18 months — too slow";
        return (
          <div className="ue-grid-2" style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            marginBottom: cohort ? 24 : 0,
          }}>
            <KPICard
              label="LTV:CAC (contribution)"
              value={ratio}
              suffix="x"
              decimals={2}
              loading={loading}
              unavailable={!haveRatio}
              status={haveRatio ? ratioStatus : undefined}
              statusNote={haveRatio ? ratioNote : undefined}
              tooltip="Contribution LTV (gross LTV × gross margin %) ÷ CAC. Benchmark: ≥3 healthy, 1–3 watch, under 1 unprofitable."
            />
            <KPICard
              label="CAC payback"
              value={payback}
              suffix=" mo"
              decimals={1}
              loading={loading}
              unavailable={!haveRatio}
              status={haveRatio ? paybackStatus : undefined}
              statusNote={haveRatio ? paybackNote : undefined}
              tooltip="Estimated months to recover CAC = 12 ÷ (LTV:CAC). Assumes contribution accrues evenly across the 365-day window — the cohort view shows the real reorder curve."
            />
          </div>
        );
      })()}

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
            marginBottom: 16,
          }}>
            <Stat
              label="Qualified customers"
              value={cohort.qualifiedCustomers.toLocaleString()}
              hint={`${cohort.repeatCustomers.toLocaleString()} subscriber · ${cohort.oneTimeCustomers.toLocaleString()} one-time`}
            />
            <Stat
              label="Trial-only"
              value={cohort.trialOnlyCustomers.toLocaleString()}
              hint={`Free / sub-$${cohort.minOrderValueForLtv} only · excluded from LTV math`}
            />
            <Stat
              label="New (this period)"
              value={cohort.newCustomersInRange.toLocaleString()}
              hint={`${range.since} → ${range.until} · qualified acquisitions`}
            />
            <Stat
              label="Subscriber rate"
              value={`${cohort.repeatRatePct.toFixed(1)}%`}
              hint={`${cohort.avgOrdersPerCustomer.blended.toFixed(1)} qualified orders / customer`}
            />
          </div>
          <div className="ue-cust-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}>
            <Stat label="Subscription-product mix" value={`${cohort.subscriptionProductOrderMixPct.toFixed(1)}%`} hint="of qualified orders w/ Shopify Subscription line item" />
            <Stat label="Avg subscriber orders" value={cohort.avgOrdersPerCustomer.repeat.toFixed(2)} hint="per repeat customer" />
            <Stat label="Avg one-time orders" value={cohort.avgOrdersPerCustomer.oneTime.toFixed(2)} hint="per one-time customer" />
            <Stat label="New (last 30 days)" value={cohort.newCustomersLast30d.toLocaleString()} hint="for CAC reference" />
          </div>
        </div>
      )}

      {/* Cohort quality by acquisition month — buckets qualified customers by
          first-qualified-order month and shows cumulative repeat behavior.
          UNVALIDATED: confirm the numbers against a known cohort on real data.
          NOTE: this is repeat-behavior-to-date, not a time-windowed M1/M3/M6
          retention curve (that needs order-level dates — a follow-up). */}
      {cohort && Array.isArray(cohort.customers) && cohort.customers.length > 0 && (() => {
        const map = new Map<string, { size: number; repeat: number; orders: number; revenue: number; sub: number }>();
        for (const c of cohort.customers) {
          const d = c.firstQualifiedOrderDate;
          if (!d || c.trialOnly) continue; // qualified customers only
          const month = d.slice(0, 7); // YYYY-MM
          const e = map.get(month) ?? { size: 0, repeat: 0, orders: 0, revenue: 0, sub: 0 };
          e.size += 1;
          if (c.qualifiedOrderCount >= 2) e.repeat += 1;
          e.orders += c.qualifiedOrderCount;
          e.revenue += c.qualifiedRevenue;
          if (c.hasSubscriptionOrder) e.sub += 1;
          map.set(month, e);
        }
        const rows = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])); // newest first
        if (rows.length === 0) return null;
        const maxRepeat = Math.max(...rows.map(([, e]) => (e.size > 0 ? e.repeat / e.size : 0)), 0.0001);
        return (
          <div style={{ marginTop: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>Cohort quality by acquisition month</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--warning)", border: "1px solid var(--warning)", borderRadius: 4, padding: "1px 6px" }}>Unvalidated</span>
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Repeat behavior to date for each month&apos;s newly-acquired qualified customers (365-day window). Newer cohorts have had less time to reorder, so a lower repeat rate at the bottom is expected, not a problem. This is not a time-windowed M1/M3/M6 curve.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "var(--subtle)", textAlign: "right" }}>
                  <th style={{ textAlign: "left", fontWeight: 600, padding: "4px 8px 8px 0" }}>Cohort</th>
                  <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Customers</th>
                  <th style={{ fontWeight: 600, padding: "4px 8px 8px", minWidth: 130 }}>Repeat rate</th>
                  <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Avg orders</th>
                  <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Avg rev</th>
                  <th style={{ fontWeight: 600, padding: "4px 0 8px 8px" }}>Sub %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([month, e]) => {
                  const repeatPct = e.size > 0 ? (e.repeat / e.size) * 100 : 0;
                  const avgOrders = e.size > 0 ? e.orders / e.size : 0;
                  const avgRev = e.size > 0 ? e.revenue / e.size : 0;
                  const subPct = e.size > 0 ? (e.sub / e.size) * 100 : 0;
                  return (
                    <tr key={month} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ textAlign: "left", padding: "8px 8px 8px 0", fontFamily: "var(--font-ui)", color: "var(--text)" }}>{month}</td>
                      <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>{e.size}</td>
                      <td style={{ textAlign: "right", padding: "8px", color: "var(--text)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden", maxWidth: 70 }}>
                            <div style={{ width: `${(repeatPct / 100 / maxRepeat) * 100}%`, height: "100%", background: "var(--accent)" }} />
                          </div>
                          <span style={{ minWidth: 42, textAlign: "right" }}>{repeatPct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>{avgOrders.toFixed(1)}</td>
                      <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>${avgRev.toFixed(0)}</td>
                      <td style={{ textAlign: "right", padding: "8px 0 8px 8px", color: "var(--muted)" }}>{subPct.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Reorder / winback — for a consumable, who is overdue to reorder.
          UNVALIDATED: per-customer cadence is approximated as
          (lastOrder − firstOrder) / (orders − 1), since CustomerSummary carries
          first/last dates + count, not every order date. Confirm on real data. */}
      {cohort && Array.isArray(cohort.customers) && cohort.customers.length > 0 && (() => {
        const DAY = 86_400_000;
        const now = Date.now();
        const withInterval = cohort.customers
          .filter((c) => !c.trialOnly && c.orderCount >= 2 && c.firstOrderDate && c.lastOrderDate)
          .map((c) => {
            const first = new Date(c.firstOrderDate).getTime();
            const last = new Date(c.lastOrderDate).getTime();
            const interval = (last - first) / DAY / (c.orderCount - 1);
            const daysSinceLast = (now - last) / DAY;
            const aov = c.qualifiedOrderCount > 0 ? c.qualifiedRevenue / c.qualifiedOrderCount : 0;
            return { c, interval, daysSinceLast, overdueBy: daysSinceLast - interval, aov };
          })
          .filter((x) => x.interval > 0 && isFinite(x.interval));
        if (withInterval.length === 0) return null;
        const intervals = withInterval.map((x) => x.interval).sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];
        // Overdue = past their own cadence by a 25% buffer.
        const overdue = withInterval.filter((x) => x.overdueBy > x.interval * 0.25).sort((a, b) => b.aov - a.aov);
        const revenueAtRisk = overdue.reduce((s, x) => s + x.aov, 0);
        const label = (c: typeof withInterval[number]["c"]) =>
          [c.firstName, c.lastName ? c.lastName[0] + "." : ""].filter(Boolean).join(" ") || c.email || "Customer";
        return (
          <div style={{ marginTop: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>Reorder &amp; winback</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--warning)", border: "1px solid var(--warning)", borderRadius: 4, padding: "1px 6px" }}>Unvalidated</span>
            </div>
            <div className="ue-cust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
              <Stat label="Typical reorder window" value={`${medianInterval.toFixed(0)} days`} hint="median cadence across repeat customers" />
              <Stat label="Overdue to reorder" value={overdue.length.toLocaleString()} hint="past their own cadence by 25%+" />
              <Stat label="Reorder revenue at risk" value={`$${Math.round(revenueAtRisk).toLocaleString()}`} hint="one reorder each, at their AOV" />
            </div>
            {overdue.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: "var(--subtle)", textAlign: "right" }}>
                    <th style={{ textAlign: "left", fontWeight: 600, padding: "4px 8px 8px 0" }}>Customer</th>
                    <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Last order</th>
                    <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Cadence</th>
                    <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Overdue</th>
                    <th style={{ fontWeight: 600, padding: "4px 0 8px 8px" }}>Est. value</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.slice(0, 10).map((x) => (
                    <tr key={x.c.key} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ textAlign: "left", padding: "8px 8px 8px 0", fontFamily: "var(--font-ui)", color: "var(--text)" }}>{label(x.c)}</td>
                      <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>{x.c.lastOrderDate}</td>
                      <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>{x.interval.toFixed(0)}d</td>
                      <td style={{ textAlign: "right", padding: "8px", color: "var(--text)" }}>{x.overdueBy.toFixed(0)}d</td>
                      <td style={{ textAlign: "right", padding: "8px 0 8px 8px", color: "var(--muted)" }}>${x.aov.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Feed the overdue list into a Klaviyo winback flow or an ad audience. Cadence is approximate (evenly-spaced orders assumed).
            </p>
          </div>
        );
      })()}

      {!isReal && (
        <div style={{ marginTop: 24, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)", lineHeight: 1.6 }}>
          Want to change subscription mix, churn, repeat rate, or per-unit COGS? Update <strong style={{ color: "var(--muted)" }}>Business → Assumptions</strong> and refresh.
        </div>
      )}

      {/* Lunia Decision Model — monthly gate-review tool (its own data pull + calc). */}
      <DecisionModel />
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
