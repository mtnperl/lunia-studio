"use client";
import { useState } from "react";
import type { Insight, MetaCampaign, MetaAd } from "@/lib/types";

type Props = {
  insights: Insight[];
  loading?: boolean;
  error?: string;
  campaigns: MetaCampaign[];
  ads: MetaAd[];
  selectedCampaign: MetaCampaign | null;
  selectedAd: MetaAd | null;
  onRequestAnalysis: (params: { campaignId?: string; adId?: string }) => void;
  analysisLoading?: boolean;
};

const TYPE_COLOR: Record<Insight["type"], string> = {
  positive: "var(--success)",
  warning:  "var(--warning)",
  neutral:  "var(--border-strong)",
};

export default function InsightsPanel({
  insights,
  loading = false,
  error,
  campaigns,
  ads,
  selectedCampaign,
  selectedAd,
  onRequestAnalysis,
  analysisLoading = false,
}: Props) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedAdId, setSelectedAdId] = useState<string>("");

  // When a campaign is selected in the dropdown, filter ads to that campaign
  const filteredAds = selectedCampaignId
    ? ads.filter(a => a.campaignId === selectedCampaignId)
    : ads;

  function handleGetInsights() {
    const params: { campaignId?: string; adId?: string } = {};
    if (selectedCampaignId) params.campaignId = selectedCampaignId;
    if (selectedAdId) params.adId = selectedAdId;
    onRequestAnalysis(params);
  }

  const selectStyle: React.CSSProperties = {
    padding: "5px 8px",
    borderRadius: 5,
    border: "1px solid var(--border)",
    background: "var(--surface-r)",
    color: "var(--text)",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    cursor: "pointer",
    flex: 1,
    minWidth: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Target selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}>
          Analyze:
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={selectedCampaignId}
            onChange={e => {
              setSelectedCampaignId(e.target.value);
              setSelectedAdId(""); // reset ad when campaign changes
            }}
            style={selectStyle}
          >
            <option value="">All campaigns</option>
            {campaigns.map(c => (
              <option key={c.campaignId} value={c.campaignId}>{c.campaignName}</option>
            ))}
          </select>
          <select
            value={selectedAdId}
            onChange={e => setSelectedAdId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Any ad</option>
            {filteredAds.map(a => (
              <option key={a.adId} value={a.adId}>{a.adName}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGetInsights}
          disabled={analysisLoading}
          style={{
            padding: "7px 16px",
            borderRadius: 6,
            border: "1px solid var(--accent)",
            background: analysisLoading ? "transparent" : "var(--accent-dim)",
            color: analysisLoading ? "var(--muted)" : "var(--accent)",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            fontWeight: 600,
            cursor: analysisLoading ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
            transition: "all 120ms ease",
            alignSelf: "flex-start",
          }}
        >
          {analysisLoading ? "Analyzing…" : "Get Insights"}
        </button>
      </div>

      {/* Divider */}
      {(loading || error || insights.length > 0) && (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 4 }} />
      )}

      {/* Insights list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-shimmer" style={{ height: 72, borderRadius: 6 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{
          borderLeft: "3px solid var(--warning)",
          background: "var(--surface-r)",
          padding: "12px 16px",
          borderRadius: "0 6px 6px 0",
          fontSize: 13,
          color: "var(--warning)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <span>{error}</span>
          <button
            onClick={handleGetInsights}
            disabled={analysisLoading}
            style={{
              padding: "5px 12px",
              borderRadius: 5,
              border: "1px solid var(--warning)",
              background: "transparent",
              color: "var(--warning)",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              cursor: analysisLoading ? "not-allowed" : "pointer",
              opacity: analysisLoading ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            {analysisLoading ? "Retrying…" : "Try again"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((ins, i) => (
            <div
              key={i}
              style={{
                borderLeft: `3px solid ${TYPE_COLOR[ins.type]}`,
                background: "var(--surface)",
                borderRadius: "0 6px 6px 0",
                padding: "12px 14px",
                animation: "fadeIn 0.22s ease-out forwards",
                animationDelay: `${i * 80}ms`,
                opacity: 0,
              }}
            >
              <div style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 600,
                color: TYPE_COLOR[ins.type],
                marginBottom: 4,
                letterSpacing: "0.01em",
              }}>
                {ins.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
                {ins.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
