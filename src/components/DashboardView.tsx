"use client";
import { useState, useEffect, useCallback } from "react";
import type { MetaData, ShopifyData, ShopifyMtdData, Insight, CombinedDayRow, MetaCampaign, MetaAd } from "@/lib/types";
import { joinDays } from "@/lib/analytics-utils";
import KPICard from "./dashboard/KPICard";
import PerformanceChart from "./dashboard/PerformanceChart";
import CampaignTable from "./dashboard/CampaignTable";
import InsightsPanel from "./dashboard/InsightsPanel";
import RefreshButton from "./dashboard/RefreshButton";
import PasswordGate from "./dashboard/PasswordGate";
import DateRangePicker, { type DateRange } from "./dashboard/DateRangePicker";

function defaultRange(): DateRange {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = new Date(today.getTime() - 29 * 86_400_000);
  return {
    since: since.toISOString().slice(0, 10),
    until: today.toISOString().slice(0, 10),
  };
}

function rangeToDays(r: DateRange): number {
  return Math.round(
    (Date.parse(r.until + "T00:00:00Z") - Date.parse(r.since + "T00:00:00Z")) / 86_400_000
  ) + 1;
}

type ChartColors = {
  accentColor: string;
  accentMidColor: string;
  mutedColor: string;
  borderColor: string;
  surfaceRColor: string;
};

function resolveChartColors(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  return {
    accentColor: style.getPropertyValue("--accent").trim(),
    accentMidColor: style.getPropertyValue("--accent-mid").trim(),
    mutedColor: style.getPropertyValue("--muted").trim(),
    borderColor: style.getPropertyValue("--border").trim(),
    surfaceRColor: style.getPropertyValue("--surface-r").trim(),
  };
}

// Map Meta objective strings → human-readable labels
const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_SALES:         "Sales",
  OUTCOME_AWARENESS:     "Awareness",
  OUTCOME_TRAFFIC:       "Traffic",
  OUTCOME_ENGAGEMENT:    "Engagement",
  OUTCOME_LEADS:         "Leads",
  OUTCOME_APP_PROMOTION: "App",
};

function labelObjective(obj: string): string {
  return OBJECTIVE_LABELS[obj] ?? obj;
}

// Section header shared style
function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      paddingBottom: 10,
      borderBottom: "1px solid var(--border)",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <span style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--muted)",
      }}>
        {title}
      </span>
      {children}
    </div>
  );
}

export default function DashboardView() {
  const [unlocked, setUnlocked] = useState(false);
  const [metaData, setMetaData] = useState<MetaData | null>(null);
  const [shopifyData, setShopifyData] = useState<ShopifyData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [shopifyLoading, setShopifyLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [shopifyError, setShopifyError] = useState<string | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [chartColors, setChartColors] = useState<ChartColors | null>(null);
  const [mtdData, setMtdData] = useState<ShopifyMtdData | null>(null);
  const [mtdLoading, setMtdLoading] = useState(false);
  const [mtdError, setMtdError] = useState<string | null>(null);

  // Campaign / ad selection for targeted insights
  const [selectedCampaign, setSelectedCampaign] = useState<MetaCampaign | null>(null);
  const [selectedAd, setSelectedAd] = useState<MetaAd | null>(null);

  // Campaign type filter — no default, user selects
  const [selectedObjectives, setSelectedObjectives] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("lunia:analytics:unlocked");
    if (stored === "1") setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    setChartColors(resolveChartColors());
  }, [unlocked]);

  const fetchMtd = useCallback(async (bust = false) => {
    setMtdLoading(true);
    setMtdError(null);
    try {
      const res = await fetch(`/api/shopify-mtd${bust ? '?bust=1' : ''}`);
      const data = await res.json();
      if (res.ok) {
        setMtdData(data as ShopifyMtdData);
      } else {
        setMtdError(data.error ?? 'MTD data unavailable');
      }
    } catch {
      setMtdError('Could not load month-to-date data');
    } finally {
      setMtdLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async (r: DateRange, bust = false) => {
    setMetaLoading(true);
    setShopifyLoading(true);
    setMetaError(null);
    setShopifyError(null);
    setInsightsError(null);

    const qs = `since=${r.since}&until=${r.until}${bust ? "&bust=1" : ""}`;
    const [metaResult, shopifyResult] = await Promise.allSettled([
      fetch(`/api/meta?${qs}`).then(rr => rr.json()),
      fetch(`/api/shopify?${qs}`).then(rr => rr.json()),
    ]);

    const d = rangeToDays(r);

    let meta: MetaData | null = null;
    let shopify: ShopifyData | null = null;

    if (metaResult.status === "fulfilled" && !metaResult.value.error) {
      meta = metaResult.value as MetaData;
      setMetaData(meta);
    } else {
      const msg = metaResult.status === "rejected"
        ? "Could not reach Meta — check your connection"
        : metaResult.value.error ?? "Meta data unavailable — try refreshing";
      setMetaError(msg);
    }
    setMetaLoading(false);

    if (shopifyResult.status === "fulfilled" && !shopifyResult.value.error) {
      shopify = shopifyResult.value as ShopifyData;
      setShopifyData(shopify);
    } else {
      const msg = shopifyResult.status === "rejected"
        ? "Could not reach Shopify — check your connection"
        : shopifyResult.value.error ?? "Shopify data unavailable — try refreshing";
      setShopifyError(msg);
    }
    setShopifyLoading(false);

    setLastRefreshed(new Date());

    if (meta && shopify) {
      setInsightsLoading(true);
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meta, shopify, days: d }),
        });
        const data = await res.json();
        if (res.ok) {
          setInsights(Array.isArray(data) ? data : []);
        } else {
          setInsightsError(data.error ?? "Insights unavailable");
        }
      } catch {
        setInsightsError("Could not load insights");
      } finally {
        setInsightsLoading(false);
      }
    } else {
      setInsightsError("Data unavailable — fix the errors above to generate insights");
    }
  }, []);

  const fetchInsightsTargeted = useCallback(async (params: { campaignId?: string; adId?: string }) => {
    if (!metaData || !shopifyData) return;
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: metaData,
          shopify: shopifyData,
          days: rangeToDays(range),
          campaigns: metaData.campaigns,
          ads: metaData.ads ?? [],
          ...params,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInsights(Array.isArray(data) ? data : []);
      } else {
        setInsightsError(data.error ?? "Insights unavailable");
      }
    } catch {
      setInsightsError("Could not load insights");
    } finally {
      setInsightsLoading(false);
    }
  }, [metaData, shopifyData, range]);

  useEffect(() => {
    if (!unlocked) return;
    fetchAll(range);
  }, [range, unlocked, fetchAll]);

  useEffect(() => {
    if (!unlocked) return;
    fetchMtd();
  }, [unlocked, fetchMtd]);

  if (!unlocked) {
    return (
      <PasswordGate
        title="Analytics"
        description="Enter password to view performance data"
        buttonLabel="Unlock Analytics"
        verifyUrl="/api/analytics/verify"
        storageKey="lunia:analytics:unlocked"
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  const combinedDays: CombinedDayRow[] = (metaData && shopifyData)
    ? joinDays(metaData.by_day, shopifyData.by_day)
    : [];

  // ── Derive available objectives from campaigns ─────────────────────────────
  const allObjectives = metaData
    ? Array.from(new Set(metaData.campaigns.map(c => c.campaignObjective).filter(Boolean) as string[]))
    : [];

  const isFiltered = selectedObjectives.size > 0;

  // ── Filtered campaigns ─────────────────────────────────────────────────────
  const filteredCampaigns = isFiltered && metaData
    ? metaData.campaigns.filter(c => c.campaignObjective && selectedObjectives.has(c.campaignObjective))
    : (metaData?.campaigns ?? []);

  // ── Recomputed KPI totals when filter is active ────────────────────────────
  const displaySpend   = isFiltered ? filteredCampaigns.reduce((s, c) => s + c.spend,   0) : (metaData?.summary.spend   ?? 0);
  const displayRevenue = isFiltered ? filteredCampaigns.reduce((s, c) => s + c.revenue, 0) : (metaData?.summary.revenue ?? 0);
  const displayROAS    = displaySpend > 0 ? displayRevenue / displaySpend : 0;

  function toggleObjective(obj: string) {
    setSelectedObjectives(prev => {
      const next = new Set(prev);
      if (next.has(obj)) next.delete(obj); else next.add(obj);
      return next;
    });
  }

  // ── Pill button style helper ───────────────────────────────────────────────
  function pillStyle(active: boolean): React.CSSProperties {
    return {
      padding: "3px 10px",
      borderRadius: 5,
      border: "1px solid",
      borderColor: active ? "var(--accent)" : "var(--border)",
      background: active ? "var(--accent-dim)" : "transparent",
      color: active ? "var(--accent)" : "var(--muted)",
      fontFamily: "var(--font-ui)",
      fontSize: 10,
      fontWeight: active ? 600 : 400,
      cursor: "pointer",
      letterSpacing: "0.04em",
      transition: "all 120ms ease",
      whiteSpace: "nowrap" as const,
    };
  }

  const errorBanner = (msg: string) => (
    <div style={{
      borderLeft: "3px solid var(--warning)",
      background: "var(--surface-r)",
      padding: "12px 16px",
      borderRadius: "0 6px 6px 0",
      fontSize: 13,
      color: "var(--warning)",
    }}>
      {msg}
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 80px" }}>
      <style>{`
        @media (max-width: 700px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .kpi-grid-2 { grid-template-columns: repeat(2, 1fr) !important; }
          .bottom-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
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
        <h1 style={{
          fontFamily: "var(--font-ui)",
          fontSize: 24,
          fontWeight: 600,
          margin: 0,
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}>
          Analytics
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <DateRangePicker value={range} onChange={setRange} />

          <RefreshButton
            loading={metaLoading || shopifyLoading}
            onClick={() => {
              setChartColors(resolveChartColors());
              fetchAll(range, true);
              fetchMtd(true);
            }}
            lastRefreshed={lastRefreshed ?? undefined}
          />
        </div>
      </div>

      {(metaData?.truncated || shopifyData?.truncated) && (
        <div style={{
          borderLeft: "3px solid var(--warning)",
          background: "var(--surface-r)",
          padding: "10px 14px",
          borderRadius: "0 6px 6px 0",
          fontSize: 12,
          color: "var(--warning)",
          fontFamily: "var(--font-ui)",
          marginBottom: 16,
        }}>
          Range too large — pagination cap hit.{" "}
          {[
            metaData?.truncated && "Meta totals",
            shopifyData?.truncated && "Shopify totals",
          ].filter(Boolean).join(" and ")}{" "}
          may be understated. Try a shorter range.
        </div>
      )}

      {/* MTD row */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--subtle)",
          marginBottom: 8,
        }}>
          Month to Date
        </div>
        {mtdError ? (
          <div style={{
            borderLeft: "3px solid var(--warning)",
            background: "var(--surface-r)",
            padding: "12px 16px",
            borderRadius: "0 6px 6px 0",
            fontSize: 13,
            color: "var(--warning)",
          }}>
            {mtdError}
          </div>
        ) : (
          <>
            {/* Row 1: Revenue health */}
            <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 10 }}>
              <KPICard
                label="Purchases"
                value={mtdData?.orders ?? 0}
                loading={mtdLoading}
                tooltip="Paid Shopify orders since the 1st of this month (excludes $0 orders)"
              />
              <KPICard
                label="Gross Revenue"
                value={mtdData?.revenue ?? 0}
                prefix="$"
                decimals={0}
                loading={mtdLoading}
                tooltip="Total revenue from paid orders before refunds"
              />
              <KPICard
                label="Net Revenue"
                value={mtdData?.netRevenue ?? 0}
                prefix="$"
                decimals={0}
                loading={mtdLoading}
                tooltip="Gross revenue minus refunded orders — the money you actually keep"
              />
              <KPICard
                label="Refund Rate"
                value={mtdData?.refundRate ?? 0}
                suffix="%"
                decimals={1}
                loading={mtdLoading}
                tooltip="Refunded orders ÷ Paid orders × 100. Healthy DTC benchmark is under 5%."
              />
            </div>
            {/* Row 2: Checkout funnel + loyalty */}
            <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KPICard
                label="Abandoned Checkouts"
                value={mtdData?.abandonedCheckouts ?? 0}
                loading={mtdLoading}
                tooltip="Open/incomplete checkouts this month — people who started but didn't complete"
              />
              <KPICard
                label="Abandoned Revenue"
                value={mtdData?.abandonedRevenue ?? 0}
                prefix="$"
                decimals={0}
                loading={mtdLoading}
                tooltip="Total cart value sitting in abandoned checkouts — recoverable with email flows"
              />
              <KPICard
                label="Checkout CVR"
                value={mtdData?.checkoutCvr ?? 0}
                suffix="%"
                decimals={1}
                loading={mtdLoading}
                tooltip="Checkout completion rate = Purchases ÷ (Purchases + Abandoned Checkouts). Measures payment funnel quality."
              />
              <KPICard
                label="Returning Customers"
                value={mtdData?.returningRate ?? 0}
                suffix="%"
                decimals={1}
                loading={mtdLoading}
                tooltip="% of this month's orders from repeat customers (orders_count > 1 at time of purchase)"
              />
            </div>
          </>
        )}
      </div>

      {/* KPI row — Meta + ROAS */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 8,
        }}>
          <div style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--subtle)",
          }}>
            Meta Ads {isFiltered && <span style={{ color: "var(--accent)", marginLeft: 4 }}>· filtered</span>}
          </div>
          {allObjectives.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {allObjectives.map(obj => (
                <button
                  key={obj}
                  onClick={() => toggleObjective(obj)}
                  style={pillStyle(selectedObjectives.has(obj))}
                >
                  {labelObjective(obj)}
                </button>
              ))}
              {isFiltered && (
                <button
                  onClick={() => setSelectedObjectives(new Set())}
                  style={{ ...pillStyle(false), color: "var(--error)", borderColor: "var(--error)" }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
        <div className="kpi-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}>
          <KPICard
            label="Ad Spend"
            value={displaySpend}
            prefix="$"
            loading={metaLoading}
            tooltip="Total USD spent on Meta ads in the selected period"
          />
          <KPICard
            label="Meta Revenue"
            value={displayRevenue}
            prefix="$"
            loading={metaLoading}
            tooltip="Sum of purchase values tracked via Meta Pixel (offsite_conversion.fb_pixel_purchase)"
          />
          <KPICard
            label="ROAS"
            value={displayROAS}
            suffix="x"
            decimals={2}
            loading={metaLoading}
            tooltip="Return on Ad Spend = Meta Revenue ÷ Ad Spend"
          />
        </div>
      </div>

      {/* KPI row — Shopify */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--subtle)",
          marginBottom: 8,
        }}>
          Shopify
        </div>
        <div className="kpi-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}>
          <KPICard
            label="Total Revenue"
            value={shopifyData?.summary.revenue ?? 0}
            prefix="$"
            loading={shopifyLoading}
            tooltip="Total revenue from all paid Shopify orders in the selected period"
          />
          <KPICard
            label="Orders"
            value={shopifyData?.summary.orders ?? 0}
            loading={shopifyLoading}
            tooltip="Count of paid Shopify orders in the selected period"
          />
          <KPICard
            label="AOV"
            value={shopifyData?.summary.aov ?? 0}
            prefix="$"
            decimals={2}
            loading={shopifyLoading}
            tooltip="Average Order Value = Shopify Revenue ÷ Orders"
          />
        </div>

      </div>

      {/* Chart */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "20px 20px 12px",
        marginBottom: 24,
      }}>
        <SectionHeader title={`Spend vs Revenue${isFiltered ? " (all campaigns)" : ""}`} />
        <PerformanceChart
          data={combinedDays}
          loading={metaLoading || shopifyLoading}
          accentColor={chartColors?.accentColor ?? ""}
          accentMidColor={chartColors?.accentMidColor ?? ""}
          mutedColor={chartColors?.mutedColor ?? ""}
          borderColor={chartColors?.borderColor ?? ""}
          surfaceRColor={chartColors?.surfaceRColor ?? ""}
        />
      </div>

      {/* Campaigns */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
      }}>
        <SectionHeader title="Campaigns &amp; Ads" />
        {metaError ? (
          errorBanner(metaError)
        ) : (
          <CampaignTable
            campaigns={filteredCampaigns}
            ads={metaData?.ads ?? []}
            loading={metaLoading}
            onSelectCampaign={c => setSelectedCampaign(c)}
            onSelectAd={a => setSelectedAd(a)}
          />
        )}
      </div>

      {/* Insights */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 20,
        marginBottom: 24,
      }}>
        <SectionHeader title="AI Insights" />
        {(!metaError && !shopifyError) ? (
          <InsightsPanel
            insights={insights}
            loading={insightsLoading}
            error={insightsError ?? undefined}
            campaigns={metaData?.campaigns ?? []}
            ads={metaData?.ads ?? []}
            selectedCampaign={selectedCampaign}
            selectedAd={selectedAd}
            onRequestAnalysis={fetchInsightsTargeted}
            analysisLoading={insightsLoading}
          />
        ) : (
          errorBanner("Data unavailable — fix the errors above to generate insights")
        )}
      </div>

    </div>
  );
}
