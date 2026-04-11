"use client";
import { useState } from "react";
import type { MetaCampaign, MetaAd } from "@/lib/types";

type ViewMode = "campaigns" | "ads";
type SortDir = "asc" | "desc";

type Props = {
  campaigns: MetaCampaign[];
  ads: MetaAd[];
  loading?: boolean;
  onSelectCampaign?: (campaign: MetaCampaign | null) => void;
  onSelectAd?: (ad: MetaAd | null) => void;
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

export default function CampaignTable({ campaigns, ads, loading = false, onSelectCampaign, onSelectAd }: Props) {
  const [view, setView] = useState<ViewMode>("campaigns");
  const [campaignSort, setCampaignSort] = useState<{ key: keyof MetaCampaign; dir: SortDir }>({ key: "roas", dir: "desc" });
  const [adSort, setAdSort] = useState<{ key: keyof MetaAd; dir: SortDir }>({ key: "roas", dir: "desc" });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  function toggleCampaignSort(key: keyof MetaCampaign) {
    setCampaignSort(s => s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });
  }

  function toggleAdSort(key: keyof MetaAd) {
    setAdSort(s => s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });
  }

  function handleCampaignClick(c: MetaCampaign) {
    if (selectedCampaignId === c.campaignId) {
      setSelectedCampaignId(null);
      onSelectCampaign?.(null);
    } else {
      setSelectedCampaignId(c.campaignId);
      onSelectCampaign?.(c);
    }
  }

  function handleAdClick(a: MetaAd) {
    if (selectedAdId === a.adId) {
      setSelectedAdId(null);
      onSelectAd?.(null);
    } else {
      setSelectedAdId(a.adId);
      onSelectAd?.(a);
    }
  }

  function SortArrow<T>({ col, sortState }: { col: keyof T; sortState: { key: keyof T; dir: SortDir } }) {
    if (sortState.key !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortState.dir === "desc" ? "↓" : "↑"}</span>;
  }

  // Tab switcher
  const tabSwitcher = (
    <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
      {(["campaigns", "ads"] as ViewMode[]).map(v => (
        <button
          key={v}
          onClick={() => setView(v)}
          style={{
            padding: "4px 12px",
            borderRadius: 5,
            border: "1px solid",
            borderColor: view === v ? "var(--accent)" : "var(--border)",
            background: view === v ? "var(--accent-dim)" : "transparent",
            color: view === v ? "var(--accent)" : "var(--muted)",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: view === v ? 600 : 400,
            cursor: "pointer",
            letterSpacing: "0.04em",
            textTransform: "capitalize",
            transition: "all 120ms ease",
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div>
        {tabSwitcher}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 36, marginBottom: 6, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  // ── Campaign view ────────────────────────────────────────────────────────────
  if (view === "campaigns") {
    if (!campaigns.length) {
      return (
        <div>
          {tabSwitcher}
          <p style={{ color: "var(--muted)", padding: 24, margin: 0 }}>No campaigns found for this period.</p>
        </div>
      );
    }

    const sorted = [...campaigns].sort((a, b) => {
      const av = a[campaignSort.key] as number | string;
      const bv = b[campaignSort.key] as number | string;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return campaignSort.dir === "desc" ? -cmp : cmp;
    });

    return (
      <div>
        {tabSwitcher}
        <div style={{ overflowX: "auto" }}>
          <style>{`
            @media (max-width: 700px) {
              .col-type { display: none !important; }
              .col-cpm { display: none !important; }
            }
          `}</style>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle} onClick={() => toggleCampaignSort("campaignName")}>
                  Campaign<SortArrow<MetaCampaign> col="campaignName" sortState={campaignSort} />
                </th>
                <th className="col-type" style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleCampaignSort("spend")}>
                  Spend<SortArrow<MetaCampaign> col="spend" sortState={campaignSort} />
                </th>
                <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleCampaignSort("roas")}>
                  ROAS<SortArrow<MetaCampaign> col="roas" sortState={campaignSort} />
                </th>
                <th className="col-cpm" style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleCampaignSort("cpm")}>
                  CPM<SortArrow<MetaCampaign> col="cpm" sortState={campaignSort} />
                </th>
                <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleCampaignSort("ctr")}>
                  CTR%<SortArrow<MetaCampaign> col="ctr" sortState={campaignSort} />
                </th>
                <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleCampaignSort("purchases")}>
                  Purchases<SortArrow<MetaCampaign> col="purchases" sortState={campaignSort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => {
                const isSelected = selectedCampaignId === c.campaignId;
                return (
                  <tr
                    key={c.campaignId}
                    onClick={() => handleCampaignClick(c)}
                    style={{ background: isSelected ? "var(--accent-dim)" : "transparent", cursor: "pointer" }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-h)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? "var(--accent-dim)" : "transparent"; }}
                  >
                    <td style={{ ...tdStyle, color: "var(--text)", maxWidth: 180 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.campaignName}
                      </span>
                    </td>
                    <td className="col-type" style={tdStyle}>
                      <ObjectiveBadge objective={c.campaignObjective} />
                    </td>
                    <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--text)" }}>
                      ${c.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: roasColor(c.roas), fontWeight: 600 }}>
                      {c.roas.toFixed(2)}x
                    </td>
                    <td className="col-cpm" style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                      ${c.cpm.toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                      {c.ctr.toFixed(2)}%
                    </td>
                    <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                      {Math.round(c.purchases).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Ad view ──────────────────────────────────────────────────────────────────
  if (!ads.length) {
    return (
      <div>
        {tabSwitcher}
        <p style={{ color: "var(--muted)", padding: 24, margin: 0 }}>No ad data available.</p>
      </div>
    );
  }

  const sortedAds = [...ads].sort((a, b) => {
    const av = a[adSort.key] as number | string;
    const bv = b[adSort.key] as number | string;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return adSort.dir === "desc" ? -cmp : cmp;
  });

  return (
    <div>
      {tabSwitcher}
      <div style={{ overflowX: "auto" }}>
        <style>{`
          @media (max-width: 700px) {
            .col-ad-campaign { display: none !important; }
            .col-ad-cpm { display: none !important; }
          }
        `}</style>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => toggleAdSort("adName")}>
                Ad<SortArrow<MetaAd> col="adName" sortState={adSort} />
              </th>
              <th className="col-ad-campaign" style={thStyle} onClick={() => toggleAdSort("campaignName")}>
                Campaign<SortArrow<MetaAd> col="campaignName" sortState={adSort} />
              </th>
              <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleAdSort("spend")}>
                Spend<SortArrow<MetaAd> col="spend" sortState={adSort} />
              </th>
              <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleAdSort("roas")}>
                ROAS<SortArrow<MetaAd> col="roas" sortState={adSort} />
              </th>
              <th className="col-ad-cpm" style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleAdSort("cpm")}>
                CPM<SortArrow<MetaAd> col="cpm" sortState={adSort} />
              </th>
              <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleAdSort("ctr")}>
                CTR%<SortArrow<MetaAd> col="ctr" sortState={adSort} />
              </th>
              <th style={{ ...thStyle, textAlign: "right" }} onClick={() => toggleAdSort("purchases")}>
                Purchases<SortArrow<MetaAd> col="purchases" sortState={adSort} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAds.map(a => {
              const isSelected = selectedAdId === a.adId;
              return (
                <tr
                  key={a.adId}
                  onClick={() => handleAdClick(a)}
                  style={{ background: isSelected ? "var(--accent-dim)" : "transparent", cursor: "pointer" }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-h)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? "var(--accent-dim)" : "transparent"; }}
                >
                  <td style={{ ...tdStyle, color: "var(--text)", maxWidth: 180 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.adName}
                    </span>
                  </td>
                  <td className="col-ad-campaign" style={{ ...tdStyle, color: "var(--muted)", maxWidth: 140 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.campaignName}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--text)" }}>
                    ${a.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: roasColor(a.roas), fontWeight: 600 }}>
                    {a.roas.toFixed(2)}x
                  </td>
                  <td className="col-ad-cpm" style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                    ${a.cpm.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                    {a.ctr.toFixed(2)}%
                  </td>
                  <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                    {Math.round(a.purchases).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
