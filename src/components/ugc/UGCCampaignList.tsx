"use client";
import { useEffect, useState } from "react";
import { UGCCampaign } from "@/lib/types";
import UGCCRTLoader from "./UGCCRTLoader";
import { IconPlus, IconArrowRight, IconDocument, IconMail } from "@/components/Icons";

type Props = {
  onOpen: (campaignId: string) => void;
  onOpenBriefs: () => void;
  onOpenOutreach: () => void;
};

export default function UGCCampaignList({ onOpen, onOpenBriefs, onOpenOutreach }: Props) {
  const [campaigns, setCampaigns] = useState<UGCCampaign[] | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const res = await fetch("/api/ugc/campaign");
      const data = (await res.json()) as UGCCampaign[];
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      setCampaigns([]);
    }
  }

  async function seedMonth() {
    if (seeding) return;
    setSeeding(true);
    setError(null);
    try {
      const now = new Date();
      const res = await fetch("/api/ugc/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: now.getMonth() + 1, year: now.getFullYear() }),
      });
      if (!res.ok && res.status !== 409) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Seed failed (${res.status})`);
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  const hasCampaigns = (campaigns?.length ?? 0) > 0;
  const totalCreators = (campaigns ?? []).reduce((s, c) => s + c.creators.length, 0);
  const totalPosted = (campaigns ?? []).reduce(
    (s, c) => s + c.creators.filter(cr => cr.stage === "posted").length, 0,
  );
  const totalSpend = (campaigns ?? []).reduce(
    (s, c) => s + c.creators.reduce((t, cr) => t + (cr.cost || 0), 0), 0,
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 64px", fontFamily: "var(--font-ui)" }}>

      {/* Overview */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
        marginBottom: 20,
      }}>
        <StatWidget label="Active campaigns" value={campaigns?.length ?? 0} accent="var(--mon-sky)"    loading={campaigns === null} />
        <StatWidget label="Creators total"    value={totalCreators}         accent="var(--mon-purple)" loading={campaigns === null} />
        <StatWidget label="Posted"            value={totalPosted}           accent="var(--mon-green)"  loading={campaigns === null} />
        <StatWidget label="Total spend"       value={`$${totalSpend.toLocaleString()}`} accent="var(--mon-yellow)" loading={campaigns === null} />
      </div>

      {/* Action buttons row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={onOpenBriefs}>
            <IconDocument size={14} />
            <span>Briefs</span>
          </button>
          <button className="btn-ghost" onClick={onOpenOutreach}>
            <IconMail size={14} />
            <span>Outreach template</span>
          </button>
        </div>
        <button
          onClick={seedMonth}
          disabled={seeding}
          className="btn"
        >
          <IconPlus size={14} />
          <span>{seeding ? "Seeding…" : `New ${new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}`}</span>
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 14px",
          background: "color-mix(in srgb, var(--mon-red) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--mon-red) 30%, transparent)",
          borderRadius: "var(--r-md)",
          color: "var(--mon-red)", fontSize: 13,
        }}>{error}</div>
      )}

      {campaigns === null && <UGCCRTLoader label="LOADING CAMPAIGNS" />}

      {campaigns !== null && !hasCampaigns && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          padding: "64px 20px",
          textAlign: "center",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>No campaigns yet</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            Seed a campaign for this month to get started.
          </div>
          <button onClick={seedMonth} disabled={seeding} className="btn">
            <IconPlus size={14} />
            <span>{seeding ? "Seeding…" : `Seed ${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}`}</span>
          </button>
        </div>
      )}

      {hasCampaigns && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text)" }}>Campaigns</h2>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {campaigns?.length ?? 0} total
            </span>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 110px 110px 120px 24px",
            gap: 12,
            padding: "8px 14px",
            background: "var(--surface-r)",
            borderBottom: "1px solid var(--border)",
            fontSize: 10, fontWeight: 600,
            color: "var(--subtle)",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            <div>Campaign</div>
            <div>Creators</div>
            <div>Posted</div>
            <div>Delivered</div>
            <div>Spend</div>
            <div></div>
          </div>
          {[...(campaigns ?? [])]
            .sort((a, b) => b.id.localeCompare(a.id))
            .map((c) => {
              const totalCost = c.creators.reduce((s, cr) => s + (cr.cost || 0), 0);
              const posted = c.creators.filter(cr => cr.stage === "posted").length;
              const delivered = c.creators.filter(cr => ["delivered", "edited-and-ready", "posted"].includes(cr.stage)).length;
              return (
                <div
                  key={c.id}
                  onClick={() => onOpen(c.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 110px 110px 110px 120px 24px",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "background 0.12s",
                    fontSize: 13,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-h)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <div style={{ fontWeight: 500, color: "var(--text)" }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{c.creators.length}</div>
                  <div>
                    {posted > 0
                      ? <span className="chip chip-done">{posted}</span>
                      : <span style={{ fontSize: 12, color: "var(--subtle)" }}>—</span>}
                  </div>
                  <div>
                    {delivered > 0
                      ? <span className="chip chip-info">{delivered}</span>
                      : <span style={{ fontSize: 12, color: "var(--subtle)" }}>—</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                    ${totalCost.toLocaleString()}
                  </div>
                  <IconArrowRight size={14} />
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function StatWidget({ label, value, accent, loading }: {
  label: string; value: number | string; accent: string; loading: boolean;
}) {
  return (
    <div className="card" style={{ position: "relative", padding: "18px 18px 16px", overflow: "hidden" }}>
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em", marginBottom: 8 }}>{label}</div>
      <div style={{
        fontSize: 24, fontWeight: 700, color: "var(--text)", lineHeight: 1,
        letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
      }}>
        {loading ? <span style={{ color: "var(--subtle)" }}>—</span> : value}
      </div>
    </div>
  );
}
