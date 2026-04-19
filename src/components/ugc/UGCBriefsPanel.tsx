"use client";
import { useEffect, useState } from "react";
import { UGCBriefTemplate } from "@/lib/types";

export default function UGCBriefsPanel({ onBack }: { onBack: () => void }) {
  const [briefs, setBriefs] = useState<UGCBriefTemplate[]>([]);
  const [angle, setAngle] = useState("");
  const [label, setLabel] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/ugc/briefs");
    const data = await res.json();
    setBriefs(Array.isArray(data) ? data : []);
  }
  useEffect(() => { void load(); }, []);

  async function create() {
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/ugc/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle, label, docUrl }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setErr(b.error ?? `Failed (${res.status})`);
        return;
      }
      setAngle(""); setLabel(""); setDocUrl("");
      await load();
    } finally { setBusy(false); }
  }

  async function archive(id: string) {
    if (!confirm("Archive this brief? Creators that reference it keep it; it just disappears from the dropdown.")) return;
    await fetch(`/api/ugc/briefs/${encodeURIComponent(id)}/archive`, { method: "POST" });
    await load();
  }

  const active = briefs.filter((b) => !b.archivedAt);
  const archived = briefs.filter((b) => b.archivedAt);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 40px 80px", fontFamily: "var(--font-ui)" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Tracker
      </button>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Brief templates</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
        Global briefs that creators reference. Editing a brief that&apos;s already in use will fork it — originals stay intact.
      </p>

      <div style={{ marginTop: 24, padding: 20, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>New brief</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10 }}>
          <Input value={angle} onChange={setAngle} placeholder="Angle (e.g. perimenopause)" />
          <Input value={label} onChange={setLabel} placeholder="Label (e.g. Skeptic #1)" />
          <Input value={docUrl} onChange={setDocUrl} placeholder="https://docs.google.com/..." />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button
            onClick={create}
            disabled={!angle || !label || !docUrl || busy}
            style={{
              padding: "8px 16px",
              background: (!angle || !label || !docUrl || busy) ? "var(--surface-h)" : "var(--accent)",
              color: (!angle || !label || !docUrl || busy) ? "var(--muted)" : "var(--bg)",
              border: "1px solid var(--accent)", borderRadius: 6,
              fontSize: 12, fontWeight: 500,
              cursor: (!angle || !label || !docUrl || busy) ? "default" : "pointer",
            }}
          >
            {busy ? "Creating…" : "Create"}
          </button>
          {err && <span style={{ color: "var(--error)", fontSize: 12, alignSelf: "center" }}>{err}</span>}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <BriefList title="Active" items={active} onArchive={archive} />
        {archived.length > 0 && <BriefList title="Archived" items={archived} onArchive={null} />}
      </div>
    </div>
  );
}

function BriefList({ title, items, onArchive }: {
  title: string;
  items: UGCBriefTemplate[];
  onArchive: ((id: string) => void) | null;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--subtle)", fontWeight: 600 }}>{title}</h2>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {items.length === 0 && (
          <div style={{ padding: 16, fontSize: 12, color: "var(--muted)" }}>None.</div>
        )}
        {items.map((b) => (
          <div key={b.id} style={{
            display: "flex", gap: 12, padding: "12px 16px",
            borderTop: items[0].id === b.id ? "none" : "1px solid var(--border)",
            background: "var(--surface)",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{b.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{b.angle}</div>
              <a href={b.docUrl} target="_blank" rel="noreferrer"
                 style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%" }}>
                {b.docUrl}
              </a>
            </div>
            {onArchive && (
              <button
                onClick={() => onArchive(b.id)}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--muted)", cursor: "pointer", alignSelf: "center" }}
              >
                Archive
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "8px 10px",
        background: "var(--bg)", color: "var(--text)",
        border: "1px solid var(--border)", borderRadius: 6,
        fontFamily: "var(--font-ui)", fontSize: 12,
      }}
    />
  );
}
