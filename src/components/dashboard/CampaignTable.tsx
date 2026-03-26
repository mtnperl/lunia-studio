"use client";
import { useState } from "react";
import type { MetaCampaign } from "@/lib/types";

type SortKey = keyof MetaCampaign;
type SortDir = "asc" | "desc";

type Props = {
  campaigns: MetaCampaign[];
  loading?: boolean;
};

// Map Meta objective strings to short human-readable labels + colors
const OBJECTIVE_MAP: Record<string, { label: string; color: string }> = {
  OUTCOME_SALES:            { label: "Sales",       color: "var(--success)" },
  OUTCOME_AWARENESS:        { label: "Awareness",   color: "var(--muted)" },
  OUTCOME_TRAFFIC:          { label: "Traffic",     color: "var(--accent)" },
  OUTCOME_ENGAGEMENT:       { label: "Engagement",  color: "#7E9ECC" },
  OUTCOME_LEADS:            { label: "Leads",       color: "#C47A5A" },
  OUTCOME_APP_PROMOTION:    { label: "App",         color: "#9E7ECC" },
};

function ObjectiveBadge({ objective }: { objective?: string }) {
  if (!objective) return null;
  const mapped = OBJECTIVE_MAP[objective] ?? { label: objective, color: "var(--muted)" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 6px",
      borderRadius: 4,
      background: "var(--surface-r)",
      border: "1px solid var(--border)",
      fontSize: 10,
      fontFamily: "var(--font-ui)",
      fontWeight: 600,
      letterSpacing: "0.04em",
      color: mapped.color,
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: mapped.color,
        display: "inline-block",
        flexShrink: 0,
      }} />
      {mapped.label}
    </span>
  );
}

function roasColor(roas: number): string {
  if (roas >= 3) return "var(--success)";
  if (roas >= 1.5) return "var(--accent)";
  return "var(--error)";
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };

export default function CampaignTable({ campaigns, loading = false }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "roas", dir: "desc" });

  function toggleSort(key: SortKey) {
    setSort(s => s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });
  }

  const sorted = [...campaigns].sort((a, b) => {
    const av = a[sort.key] as number | string;
    const bv = b[sort.key] as number | string;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === "desc" ? -cmp : cmp;
  });

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontFamily: "var(--font-ui)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--muted)",
    textAlign: "left",
    background: "var(--surface-r)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border)",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: "1px solid var(--border)",
    fontSize: 13,
  };

  function SortArrow({ col }: { col: SortKey }) {
    if (sort.key !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sort.dir === "desc" ? "↓" : "↑"}</span>;
  }

  if (loading) {
    return (
      <div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 36, marginBottom: 6, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  if (!campaigns.length) {
    return <p style={{ color: "var(--muted)", padding: 24, margin: 0 }}>No campaigns found for this period.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <style>{`
        @media (max-width: 700px) {
          .col-impressions, .col-clicks, .col-type { display: none !important; }
        }
      `}</style>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle} onClick={() => toggleSort("campaignName")}>
              Campaign<SortArrow col="campaignName" />
            </th>
            <th className="col-type" style={thStyle}>
              Type
            </th>
            <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleSort("spend")}>
              Spend<SortArrow col="spend" />
            </th>
            <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleSort("roas")}>
              ROAS<SortArrow col="roas" />
            </th>
            <th className="col-impressions" style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleSort("impressions")}>
              Impr.<SortArrow col="impressions" />
            </th>
            <th className="col-clicks" style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleSort("clicks")}>
              Clicks<SortArrow col="clicks" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(c => (
            <tr key={c.campaignId} style={{ background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-h)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ ...tdStyle, color: "var(--text)", maxWidth: 180 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.campaignName}
                </span>
              </td>
              <td className="col-type" style={{ ...tdStyle }}>
                <ObjectiveBadge objective={c.campaignObjective} />
              </td>
              <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--text)" }}>
                ${c.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: roasColor(c.roas), fontWeight: 600 }}>
                {c.roas.toFixed(2)}x
              </td>
              <td className="col-impressions" style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                {c.impressions.toLocaleString()}
              </td>
              <td className="col-clicks" style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                {c.clicks.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
