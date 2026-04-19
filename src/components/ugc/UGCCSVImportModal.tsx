"use client";
import { useState } from "react";
import { UGCCreator } from "@/lib/types";

type DryRunResponse = {
  dryRun: true;
  parsed: number;
  errors: { row: number; error: string }[];
  preview: UGCCreator[];
};

type Props = {
  campaignId: string;
  onClose: () => void;
  onImported: () => void;
};

export default function UGCCSVImportModal({ campaignId, onClose, onImported }: Props) {
  const [csv, setCsv] = useState("");
  const [dry, setDry] = useState<DryRunResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFileChosen(file: File) {
    const text = await file.text();
    setCsv(text);
    setDry(null);
  }

  async function runDryRun() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/ugc/campaign/${encodeURIComponent(campaignId)}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun: true }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErr(body.error ?? `Import failed (${res.status})`);
        setDry(null);
        return;
      }
      setDry(body as DryRunResponse);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!dry || dry.errors.length > 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/ugc/campaign/${encodeURIComponent(campaignId)}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun: false }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErr(body.error ?? `Commit failed (${res.status})`);
        return;
      }
      onImported();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  }

  const canCommit = dry !== null && dry.errors.length === 0 && !busy;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 720,
          maxHeight: "calc(100vh - 48px)", overflow: "auto",
          background: "var(--surface-r)", border: "1px solid var(--border)",
          borderRadius: 10, padding: 24,
          fontFamily: "var(--font-ui)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text)" }}>Import CSV</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
          Paste the spreadsheet or drop a CSV. Max 200 rows. Expected headers: Name, Content Angle, platform, cost, goods shipped?, script, Status, Ready to be posted?, # of versions, Caption1, Caption 2.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFileChosen(f); }}
          style={{ marginBottom: 8, fontSize: 12, color: "var(--muted)" }}
        />

        <textarea
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setDry(null); }}
          placeholder="Paste CSV here…"
          rows={10}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: 12,
            background: "var(--surface)", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: 6,
            fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.5,
          }}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={runDryRun}
            disabled={!csv.trim() || busy}
            style={btnGhost(!csv.trim() || busy)}
          >
            {busy && !dry ? "Parsing…" : "Dry run"}
          </button>
          <button
            onClick={commit}
            disabled={!canCommit}
            style={btnPrimary(!canCommit)}
          >
            {busy && dry ? "Importing…" : "Commit import"}
          </button>
        </div>

        {err && <div style={{ marginTop: 12, color: "var(--error)", fontSize: 12 }}>{err}</div>}

        {dry && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
              Parsed <strong>{dry.parsed}</strong> row(s) · <span style={{ color: dry.errors.length ? "var(--error)" : "var(--success)" }}>{dry.errors.length} error(s)</span>
            </div>
            {dry.errors.length > 0 && (
              <div style={{ marginBottom: 12, padding: 10, background: "var(--surface)", border: "1px solid var(--error)", borderRadius: 6, fontSize: 11, color: "var(--error)", fontFamily: "var(--font-mono)" }}>
                {dry.errors.slice(0, 20).map((e) => (
                  <div key={e.row}>Row {e.row}: {e.error}</div>
                ))}
              </div>
            )}
            {dry.preview.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "var(--surface)" }}>
                      <Th>Name</Th><Th>Angle</Th><Th>Platform</Th><Th>Cost</Th><Th>Stage</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {dry.preview.slice(0, 20).map((c) => (
                      <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <Td>{c.name}</Td>
                        <Td>{c.angle}</Td>
                        <Td>{c.sourcingPlatform}</Td>
                        <Td>${c.cost}</Td>
                        <Td>{c.stage}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 18px",
    background: disabled ? "var(--surface-h)" : "var(--accent)",
    color: disabled ? "var(--muted)" : "var(--bg)",
    border: `1px solid ${disabled ? "var(--border)" : "var(--accent)"}`,
    borderRadius: 6,
    fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
  };
}
function btnGhost(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 18px",
    background: "transparent",
    color: disabled ? "var(--muted)" : "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontWeight: 500 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "8px 10px", color: "var(--text)" }}>{children}</td>;
}
