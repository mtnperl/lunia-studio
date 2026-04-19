"use client";
import { useEffect, useState } from "react";
import { UGCCampaign } from "@/lib/types";
import UGCCRTLoader from "./UGCCRTLoader";

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

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 40px 80px", fontFamily: "var(--font-ui)" }}>
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em", color: "var(--text)" }}>UGC Tracker</h1>
      </div>

      {campaigns === null && <UGCCRTLoader label="LOADING CAMPAIGNS" />}

      {campaigns !== null && !hasCampaigns && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 15, color: "var(--muted)", marginBottom: 20 }}>No campaigns yet.</div>
          <button
            onClick={seedMonth}
            disabled={seeding}
            style={{
              padding: "12px 24px",
              background: "var(--accent)", color: "var(--bg)",
              border: "1px solid var(--accent)", borderRadius: 8,
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
              letterSpacing: "0.02em", cursor: seeding ? "default" : "pointer",
              opacity: seeding ? 0.6 : 1,
            }}
          >
            {seeding ? "Seeding…" : `Seed ${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })} campaign`}
          </button>
          {error && <div style={{ marginTop: 12, color: "var(--error)", fontSize: 12 }}>{error}</div>}
        </div>
      )}

      {hasCampaigns && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {[...(campaigns ?? [])]
            .sort((a, b) => b.id.localeCompare(a.id))
            .map((c) => {
              const totalCost = c.creators.reduce((s, cr) => s + (cr.cost || 0), 0);
              return (
                <button
                  key={c.id}
                  onClick={() => onOpen(c.id)}
                  style={{
                    textAlign: "left",
                    padding: 20,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontFamily: "var(--font-ui)",
                    transition: "background 0.12s, border-color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-h)";
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--surface)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{c.label}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
                    <span>{c.creators.length} creators</span>
                    <span>${totalCost.toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          <button
            onClick={seedMonth}
            disabled={seeding}
            style={{
              padding: 20, minHeight: 72,
              background: "transparent",
              border: "1px dashed var(--border-strong)",
              borderRadius: 10,
              fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)",
              cursor: seeding ? "default" : "pointer",
            }}
          >
            {seeding ? "…" : `+ ${new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}`}
          </button>
        </div>
      )}

      {/* Settings links — below campaigns */}
      {campaigns !== null && (
        <div style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 8,
        }}>
          <GhostButton onClick={onOpenBriefs}>Briefs</GhostButton>
          <GhostButton onClick={onOpenOutreach}>Outreach template</GhostButton>
        </div>
      )}
    </div>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: 6,
        fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)",
        cursor: "pointer",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </button>
  );
}
