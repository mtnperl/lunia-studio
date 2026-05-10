"use client";
import { useEffect, useState } from "react";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { EmailFlow } from "@/lib/types";

type FlowSummary = { id: string; name: string; status: string; triggerType: string; emailCount: number };
type Mode = "flows" | "campaigns";

type Props = {
  /** Called once Mathan picks a flow. We fetch the full flow detail here, then
   * hand the populated EmailFlow back to the parent. */
  onPicked: (flow: EmailFlow) => void;
  onCancel?: () => void;
};

export default function KlaviyoFlowPicker({ onPicked, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>("flows");
  const [flows, setFlows] = useState<FlowSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    fetch(mode === "flows" ? "/api/klaviyo/flows" : "/api/klaviyo/campaigns?limit=50")
      .then(async (r) => {
        const data = await r.json();
        if (!alive) return;
        if (!r.ok) {
          setError(data.error ?? `Klaviyo error ${r.status}`);
          setErrorCode(data.code ?? null);
          setFlows([]);
          return;
        }
        if (mode === "flows") setFlows(data.flows ?? []);
        else setFlows((data.campaigns ?? []).map((c: { id: string; name: string; subject: string; status: string }) => ({ id: c.id, name: c.name, status: c.status, triggerType: "campaign", emailCount: 1 })));
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [mode]);

  async function pick(flowId: string) {
    setPicking(flowId);
    setError(null);
    try {
      const r = await fetch(`/api/klaviyo/flows/${flowId}`);
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? `Klaviyo error ${r.status}`);
        setErrorCode(data.code ?? null);
        return;
      }
      onPicked(data.flow as EmailFlow);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPicking(null);
    }
  }

  const filtered = (flows ?? []).filter((f) => f.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Pick a flow from Klaviyo</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            We pull the latest names + email counts. Selecting a flow fetches every email in it for review.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["flows", "campaigns"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "5px 11px",
                fontSize: 11,
                fontWeight: 700,
                background: mode === m ? "var(--accent)" : "var(--surface)",
                color: mode === m ? "#fff" : "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {m}
            </button>
          ))}
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: "5px 11px",
                fontSize: 11,
                background: "transparent",
                color: "var(--subtle)",
                border: "1px solid var(--border)",
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(184, 92, 92, 0.08)", border: "1px solid rgba(184, 92, 92, 0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "var(--error)" }}>
          {error}
          {errorCode === "no_key" && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
              Add <code style={{ background: "var(--surface-r)", padding: "1px 5px", borderRadius: 3 }}>KLAVIYO_API_KEY</code> to your Vercel env to enable this picker.
            </div>
          )}
        </div>
      )}

      <input
        type="search"
        placeholder={mode === "flows" ? "Filter flows by name..." : "Filter campaigns by name..."}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 14px",
          marginBottom: 14,
          fontSize: 13,
          background: "var(--surface-r)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />

      {loading ? (
        <div style={{ padding: 12 }}>
          <MiniReviewLoader label={`fetching ${mode} from klaviyo`} detail={mode === "flows" ? "FLOWS API" : "CAMPAIGNS API"} engine="klaviyo · read" />
        </div>
      ) : picking ? (
        <div style={{ padding: 12 }}>
          <MiniReviewLoader label="hydrating flow + every email" detail="FETCHING TEMPLATES" engine="klaviyo · flow detail" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 36, textAlign: "center", color: "var(--subtle)", fontSize: 13 }}>
          {error ? "Could not load. Fix the error above and retry." : `No ${mode} found.`}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filtered.map((f) => {
            const busy = picking === f.id;
            return (
              <button
                key={f.id}
                onClick={() => pick(f.id)}
                disabled={!!picking}
                style={{
                  background: busy ? "var(--accent-dim)" : "var(--surface-r)",
                  border: `1px solid ${busy ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: 14,
                  textAlign: "left",
                  cursor: picking ? "wait" : "pointer",
                  fontFamily: "inherit",
                  opacity: picking && !busy ? 0.5 : 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minHeight: 96,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, wordBreak: "break-word" }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--subtle)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{f.triggerType || mode}</span>
                  <span>· {f.status}</span>
                  {mode === "flows" && f.emailCount > 0 && <span>· {f.emailCount} email{f.emailCount === 1 ? "" : "s"}</span>}
                </div>
                {busy && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: "auto" }}>Loading flow detail…</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
