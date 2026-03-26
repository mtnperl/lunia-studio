"use client";
import { useState, useEffect, useCallback } from "react";
import type { MetaData, ShopifyData, Insight, CombinedDayRow } from "@/lib/types";
import { joinDays } from "@/lib/analytics-utils";
import KPICard from "./dashboard/KPICard";
import PerformanceChart from "./dashboard/PerformanceChart";
import CampaignTable from "./dashboard/CampaignTable";
import InsightsPanel from "./dashboard/InsightsPanel";
import RefreshButton from "./dashboard/RefreshButton";
import ProductBreakdown from "./dashboard/ProductBreakdown";
import PasswordGate from "./dashboard/PasswordGate";

type Days = 7 | 14 | 30;

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
  const [days, setDays] = useState<Days>(30);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [chartColors, setChartColors] = useState<ChartColors | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lunia:analytics:unlocked");
    if (stored === "1") setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    setChartColors(resolveChartColors());
  }, [unlocked]);

  const fetchAll = useCallback(async (d: Days, bust = false) => {
    setMetaLoading(true);
    setShopifyLoading(true);
    setMetaError(null);
    setShopifyError(null);
    setInsightsError(null);

    const bustParam = bust ? "&bust=1" : "";
    const [metaResult, shopifyResult] = await Promise.allSettled([
      fetch(`/api/meta?days=${d}${bustParam}`).then(r => r.json()),
      fetch(`/api/shopify?days=${d}${bustParam}`).then(r => r.json()),
    ]);

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

  useEffect(() => {
    if (!unlocked) return;
    fetchAll(days);
  }, [days, unlocked, fetchAll]);

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  const combinedDays: CombinedDayRow[] = (metaData && shopifyData)
    ? joinDays(metaData.by_day, shopifyData.by_day)
    : [];

  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--muted)",
    marginBottom: 12,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 80px" }}>
      <style>{`
        @media (max-width: 700px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
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
          {/* Days pills */}
          <div style={{ display: "flex", gap: 4 }}>
            {([7, 14, 30] as Days[]).map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: days === d ? "var(--accent)" : "var(--border)",
                  background: days === d ? "var(--accent-dim)" : "transparent",
                  color: days === d ? "var(--accent)" : "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: days === d ? 600 : 400,
                }}
              >
                {d}d
              </button>
            ))}
          </div>

          <RefreshButton
            loading={metaLoading || shopifyLoading}
            onClick={() => {
              setChartColors(resolveChartColors());
              fetchAll(days, true);
            }}
            lastRefreshed={lastRefreshed ?? undefined}
          />
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
        marginBottom: 24,
      }}>
        <KPICard
          label="Ad Spend"
          value={metaData?.summary.spend ?? 0}
          prefix="$"
          loading={metaLoading}
        />
        <KPICard
          label="Meta Revenue"
          value={metaData?.summary.revenue ?? 0}
          prefix="$"
          loading={metaLoading}
        />
        <KPICard
          label="ROAS"
          value={metaData?.summary.roas ?? 0}
          suffix="x"
          decimals={2}
          loading={metaLoading}
        />
        <KPICard
          label="Shopify Revenue"
          value={shopifyData?.summary.revenue ?? 0}
          prefix="$"
          loading={shopifyLoading}
        />
        <KPICard
          label="Orders"
          value={shopifyData?.summary.orders ?? 0}
          loading={shopifyLoading}
        />
      </div>

      {/* Chart */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "20px 20px 12px",
        marginBottom: 24,
      }}>
        <div style={sectionLabel}>Spend vs Revenue</div>
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

      {/* Campaigns + Insights */}
      <div className="bottom-row" style={{
        display: "grid",
        gridTemplateColumns: "65fr 35fr",
        gap: 16,
        marginBottom: 24,
      }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 20,
        }}>
          <div style={sectionLabel}>Campaigns</div>
          {metaError ? (
            <div style={{
              borderLeft: "3px solid var(--warning)",
              background: "var(--surface-r)",
              padding: "12px 16px",
              borderRadius: "0 6px 6px 0",
              fontSize: 13,
              color: "var(--warning)",
            }}>
              {metaError}
            </div>
          ) : (
            <CampaignTable campaigns={metaData?.campaigns ?? []} loading={metaLoading} />
          )}
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 20,
        }}>
          <div style={sectionLabel}>AI Insights</div>
          {(!metaError && !shopifyError) ? (
            <InsightsPanel
              insights={insights}
              loading={insightsLoading}
              error={insightsError ?? undefined}
            />
          ) : (
            <div style={{
              borderLeft: "3px solid var(--warning)",
              background: "var(--surface-r)",
              padding: "12px 16px",
              borderRadius: "0 6px 6px 0",
              fontSize: 13,
              color: "var(--warning)",
            }}>
              Data unavailable — fix the errors above to generate insights
            </div>
          )}
        </div>
      </div>

      {/* Product breakdown */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 20,
      }}>
        <div style={sectionLabel}>Product Breakdown</div>
        {shopifyError ? (
          <div style={{
            borderLeft: "3px solid var(--warning)",
            background: "var(--surface-r)",
            padding: "12px 16px",
            borderRadius: "0 6px 6px 0",
            fontSize: 13,
            color: "var(--warning)",
          }}>
            {shopifyError}
          </div>
        ) : (
          <ProductBreakdown products={shopifyData?.products ?? []} loading={shopifyLoading} />
        )}
      </div>
    </div>
  );
}
