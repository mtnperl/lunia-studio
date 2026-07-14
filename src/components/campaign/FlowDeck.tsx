"use client";
// A deck of campaign emails produced by importing a Klaviyo flow. Each email is
// its own CampaignContent, edited one at a time in the existing CampaignEditor
// (Copy HTML / Save / Improve with Claude all come along for free). Switching
// emails remounts the editor via `key` so its internal state resets cleanly.
import { useState } from "react";
import type { CampaignContent } from "@/lib/types";
import CampaignEditor from "./CampaignEditor";
import { Spinner } from "./Loaders";

export type DeckEmail = {
  emailId: string;
  position: number;
  subject: string;
  topic: string;
  content: CampaignContent;
  savedId: string | null;
  flagged?: boolean;
};

export default function FlowDeck({
  flowName,
  initialEmails,
  onExit,
}: {
  flowName: string;
  initialEmails: DeckEmail[];
  onExit: () => void;
}) {
  const [emails, setEmails] = useState<DeckEmail[]>(initialEmails);
  const [index, setIndex] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [saveAllMsg, setSaveAllMsg] = useState<string | null>(null);
  const current = emails[index];

  function updateCurrent(patch: Partial<DeckEmail>) {
    setEmails((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  async function saveAll() {
    if (savingAll) return;
    setSavingAll(true);
    setSaveAllMsg(null);
    try {
      const updated = await Promise.all(
        emails.map(async (e) => {
          try {
            const res = await fetch("/api/campaign/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: e.savedId ?? undefined, topic: e.topic, content: e.content }),
            });
            const data = await res.json();
            return res.ok && data.id ? { ...e, savedId: data.id as string } : e;
          } catch {
            return e;
          }
        }),
      );
      setEmails(updated);
      const ok = updated.filter((e) => e.savedId).length;
      setSaveAllMsg(ok === updated.length ? `Saved all ${ok} to the gallery ✓` : `Saved ${ok}/${updated.length} — retry the rest`);
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <div>
      {/* Deck header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Imported from Klaviyo
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{flowName}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveAllMsg && <span style={{ fontSize: 12, color: "var(--muted)" }}>{saveAllMsg}</span>}
          <button
            onClick={saveAll}
            disabled={savingAll}
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {savingAll && <Spinner size={12} color="var(--bg)" />}
            {savingAll ? "Saving…" : "Save all to gallery"}
          </button>
          <button
            onClick={onExit}
            style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
          >
            New
          </button>
        </div>
      </div>

      {/* Email switcher E1 … EN */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {emails.map((e, i) => {
          const active = i === index;
          return (
            <button
              key={e.emailId}
              onClick={() => setIndex(i)}
              title={e.subject || `Email ${i + 1}`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
                maxWidth: 220, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent-dim)" : "var(--surface)",
                fontFamily: "inherit", textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: active ? "var(--accent)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                E{e.position}
                {e.savedId && <span title="Saved to gallery" style={{ color: "var(--accent)" }}>✓</span>}
                {e.flagged && <span title="No content found — fill this one in manually" style={{ color: "var(--error)" }}>!</span>}
              </span>
              <span style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 196 }}>
                {e.subject || "(no subject)"}
              </span>
            </button>
          );
        })}
      </div>

      {current?.flagged && (
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
          This email had no readable HTML or text in Klaviyo, so it came in empty. Add copy and images below, or skip it.
        </div>
      )}

      {current && (
        <CampaignEditor
          key={current.emailId}
          topic={current.topic}
          content={current.content}
          savedId={current.savedId}
          onChange={(next: CampaignContent) => updateCurrent({ content: next })}
          onSaved={(id: string) => updateCurrent({ savedId: id })}
        />
      )}
    </div>
  );
}
