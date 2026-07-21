"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import DateRangePicker, { type DateRange } from "../dashboard/DateRangePicker";
import { computeDecisionModel, type DecisionModelInputs, type DecisionModelActuals, type DecisionModelSnapshot } from "@/lib/decision-model";

// Lunia Decision Model — monthly gate-review tool. Pulls tag-classified Shopify
// actuals, takes Meta inputs + editable assumptions, and recomputes cohort LTV,
// blended LTV:CAC, break-even mix, and the scenario grid live (pure calc module).

const ASSUMPTION_DEFAULTS = {
  varCost: 13, varCostPack: 39, subLife: 5,
  oneTimeRepeatRate: 0.2, oneTimeExtraOrders: 1.5,
  packRepeatRate: 0.12, packExtraOrders: 1.0, targetLtvCac: 3.0,
};
type Assumptions = typeof ASSUMPTION_DEFAULTS;
type Prices = { pSubFirst: number; pSubRec: number; pOneTime: number; pPack: number };
type CacMode = "blended" | "meta" | "custom";

const LS_KEY = "lunia:decision-model:state:v1";
const fmtUsd = (n: number, d = 0) => `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const fmtX = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}x` : "∞");

function monthStart(): DateRange {
  // current month → today, in YYYY-MM-DD (local)
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { since: iso(first), until: iso(now) };
}

const VERDICT_COLOR: Record<string, string> = { HEALTHY: "var(--success)", THIN: "var(--warning)", UNDERWATER: "var(--error)" };
function cellColor(v: number): string {
  if (v >= 3) return "rgba(28,122,58,0.18)";
  if (v >= 1) return "rgba(184,96,64,0.16)";
  return "rgba(196,0,0,0.14)";
}

const lblStyle: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "7px 9px", fontSize: 13, fontFamily: "var(--font-mono)", border: "1.5px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)", outline: "none" };

function Num({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <div>
      <label style={lblStyle}>{label}{suffix ? ` (${suffix})` : ""}</label>
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} style={inputStyle} />
    </div>
  );
}

export default function DecisionModel() {
  const [range, setRange] = useState<DateRange>(monthStart);
  const [actuals, setActuals] = useState<DecisionModelActuals | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  const [assumptions, setAssumptions] = useState<Assumptions>(ASSUMPTION_DEFAULTS);
  const [adSpend, setAdSpend] = useState(0);
  const [metaPurchases, setMetaPurchases] = useState(0);
  const [cacMode, setCacMode] = useState<CacMode>("blended");
  const [customCac, setCustomCac] = useState(80);
  const [priceOverrides, setPriceOverrides] = useState<Partial<Prices>>({});

  // Snapshot history — persisted server-side (KV), not localStorage, so the
  // monthly trend survives across browsers/devices.
  const [snapshots, setSnapshots] = useState<DecisionModelSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/decision-model/snapshots");
        const body = await res.json();
        if (!cancelled) setSnapshots(Array.isArray(body?.snapshots) ? body.snapshots : []);
      } catch { /* ignore — history is best-effort */ }
      finally { if (!cancelled) setSnapshotsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Restore persisted state.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.assumptions) setAssumptions({ ...ASSUMPTION_DEFAULTS, ...s.assumptions });
      if (typeof s.adSpend === "number") setAdSpend(s.adSpend);
      if (typeof s.metaPurchases === "number") setMetaPurchases(s.metaPurchases);
      if (s.cacMode) setCacMode(s.cacMode);
      if (typeof s.customCac === "number") setCustomCac(s.customCac);
    } catch { /* ignore */ }
  }, []);
  // Persist on change.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ assumptions, adSpend, metaPurchases, cacMode, customCac })); } catch { /* ignore */ }
  }, [assumptions, adSpend, metaPurchases, cacMode, customCac]);

  const pull = useCallback(async () => {
    setPulling(true); setPullError(null);
    try {
      const res = await fetch(`/api/decision-model/orders?since=${range.since}&until=${range.until}`);
      const body = await res.json();
      if (res.status === 503) { setPullError("Shopify not configured on this environment."); return; }
      if (!res.ok || body?.error) { setPullError(body?.error ?? "Could not pull orders"); return; }
      const a = body as DecisionModelActuals;
      if (a.source === "unavailable") { setPullError("Couldn't read orders — check the read_orders scope."); return; }
      setActuals(a);
      setPriceOverrides({}); // fresh actuals replace any manual price tweaks
    } catch {
      setPullError("Network error pulling orders");
    } finally {
      setPulling(false);
    }
  }, [range]);

  const prices: Prices = {
    pSubFirst: priceOverrides.pSubFirst ?? actuals?.pSubFirst ?? 0,
    pSubRec: priceOverrides.pSubRec ?? actuals?.pSubRec ?? 0,
    pOneTime: priceOverrides.pOneTime ?? actuals?.pOneTime ?? 0,
    pPack: priceOverrides.pPack ?? actuals?.pPack ?? 0,
  };

  // input is kept alongside its output so a snapshot can persist exactly what
  // produced the numbers on screen, not just the numbers themselves.
  const { input, out } = useMemo(() => {
    const nSub = actuals?.nSub ?? 0, nOneTime = actuals?.nOneTime ?? 0, nPack = actuals?.nPack ?? 0;
    const cac = cacMode === "custom" ? customCac
      : cacMode === "meta" ? (metaPurchases > 0 ? adSpend / metaPurchases : 0)
      : undefined; // blended → model default
    const input: DecisionModelInputs = {
      adSpend, metaPurchases, nSub, nOneTime, nPack, nRecurring: actuals?.nRecurring ?? 0,
      ...prices, ...assumptions, cac,
    };
    return { input, out: computeDecisionModel(input) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actuals, adSpend, metaPurchases, assumptions, cacMode, customCac, prices.pSubFirst, prices.pSubRec, prices.pOneTime, prices.pPack]);

  const saveSnapshot = useCallback(async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/decision-model/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range, actualsSource: actuals?.source ?? "unavailable", input, output: out }),
      });
      const body = await res.json();
      if (!res.ok || body?.error) { setSaveMsg(body?.error ?? "Could not save"); return; }
      const snap = body as DecisionModelSnapshot;
      setSnapshots((prev) => {
        const idx = prev.findIndex((s) => s.id === snap.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = snap; return next; }
        return [snap, ...prev];
      });
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg((m) => (m === "Saved" ? null : m)), 1800);
    } catch {
      setSaveMsg("Network error");
    } finally {
      setSaving(false);
    }
  }, [range, actuals, input, out]);

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 18, marginBottom: 16 };
  const sectionLabel: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: 12 };

  return (
    <div style={{ marginTop: 32, borderTop: "2px solid var(--border)", paddingTop: 24 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em", color: "var(--text)" }}>Decision Model</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 18px" }}>Monthly gate review. Pull tag-classified Shopify actuals, set Meta + assumptions, read the verdict. Recomputes live.</p>

      {/* 1. Window + pull + Meta inputs */}
      <div style={card}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label style={lblStyle}>Window</label><DateRangePicker value={range} onChange={setRange} /></div>
          <button onClick={pull} disabled={pulling} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: pulling ? "wait" : "pointer",
            background: "var(--accent)", color: "#fff", border: "none", borderRadius: 7,
          }}>{pulling ? "Pulling…" : "Pull from Shopify"}</button>
          <div style={{ width: 120 }}><Num label="Ad spend" value={adSpend} onChange={setAdSpend} step={1} suffix="$" /></div>
          <div style={{ width: 120 }}><Num label="Meta purchases" value={metaPurchases} onChange={setMetaPurchases} step={1} /></div>
        </div>
        {pullError && <div style={{ marginTop: 10, fontSize: 12, color: "var(--error)" }}>{pullError}</div>}
        {actuals && <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          {actuals.ordersScanned} orders scanned · {actuals.range.since} → {actuals.range.until}{actuals.truncated ? " · ⚠ capped" : ""}
        </div>}
      </div>

      {/* 2. Actuals */}
      <div style={card}>
        <div style={sectionLabel}>Actuals</div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)" }}>
          <span><b>{actuals?.nSub ?? 0}</b> <span style={{ color: "var(--muted)" }}>new subs</span></span>
          <span><b>{actuals?.nOneTime ?? 0}</b> <span style={{ color: "var(--muted)" }}>one-time</span></span>
          <span><b>{actuals?.nPack ?? 0}</b> <span style={{ color: "var(--muted)" }}>3-pack</span></span>
          <span><b>{actuals?.nRecurring ?? 0}</b> <span style={{ color: "var(--muted)" }}>recurring</span></span>
          <span><b>{out.newCustomers}</b> <span style={{ color: "var(--muted)" }}>new customers</span></span>
          <span><b>{(out.subMix * 100).toFixed(1)}%</b> <span style={{ color: "var(--muted)" }}>sub mix</span></span>
        </div>
      </div>

      {/* 3. Assumptions + prices + CAC */}
      <div style={card}>
        <div style={sectionLabel}>Assumptions (editable)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
          <Num label="Var cost / bottle" suffix="$" step={0.5} value={assumptions.varCost} onChange={(v) => setAssumptions((s) => ({ ...s, varCost: v }))} />
          <Num label="Var cost / 3-pack" suffix="$" step={0.5} value={assumptions.varCostPack} onChange={(v) => setAssumptions((s) => ({ ...s, varCostPack: v }))} />
          <Num label="Subscription life" suffix="orders" step={0.5} value={assumptions.subLife} onChange={(v) => setAssumptions((s) => ({ ...s, subLife: v }))} />
          <Num label="Target LTV:CAC" step={0.5} value={assumptions.targetLtvCac} onChange={(v) => setAssumptions((s) => ({ ...s, targetLtvCac: v }))} />
          <Num label="One-time repeat rate" step={0.05} value={assumptions.oneTimeRepeatRate} onChange={(v) => setAssumptions((s) => ({ ...s, oneTimeRepeatRate: v }))} />
          <Num label="One-time extra orders" step={0.5} value={assumptions.oneTimeExtraOrders} onChange={(v) => setAssumptions((s) => ({ ...s, oneTimeExtraOrders: v }))} />
          <Num label="3-pack repeat rate" step={0.05} value={assumptions.packRepeatRate} onChange={(v) => setAssumptions((s) => ({ ...s, packRepeatRate: v }))} />
          <Num label="3-pack extra orders" step={0.5} value={assumptions.packExtraOrders} onChange={(v) => setAssumptions((s) => ({ ...s, packExtraOrders: v }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
          <Num label="Price: sub first" suffix="$" step={0.5} value={prices.pSubFirst} onChange={(v) => setPriceOverrides((s) => ({ ...s, pSubFirst: v }))} />
          <Num label="Price: sub recurring" suffix="$" step={0.5} value={prices.pSubRec} onChange={(v) => setPriceOverrides((s) => ({ ...s, pSubRec: v }))} />
          <Num label="Price: one-time" suffix="$" step={0.5} value={prices.pOneTime} onChange={(v) => setPriceOverrides((s) => ({ ...s, pOneTime: v }))} />
          <Num label="Price: 3-pack" suffix="$" step={0.5} value={prices.pPack} onChange={(v) => setPriceOverrides((s) => ({ ...s, pPack: v }))} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={lblStyle}>CAC</span>
          {(["blended", "meta", "custom"] as CacMode[]).map((m) => (
            <button key={m} onClick={() => setCacMode(m)} style={{
              padding: "4px 11px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
              border: `1px solid ${cacMode === m ? "var(--accent)" : "var(--border)"}`, borderRadius: 6,
              background: cacMode === m ? "var(--accent-dim)" : "transparent", color: cacMode === m ? "var(--accent)" : "var(--muted)",
            }}>{m === "blended" ? "Blended" : m === "meta" ? "Meta-attributed" : "Custom"}</button>
          ))}
          {cacMode === "custom" && <div style={{ width: 110 }}><input type="number" step={1} value={customCac} onChange={(e) => setCustomCac(parseFloat(e.target.value) || 0)} style={inputStyle} /></div>}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>= {fmtUsd(out.resolved.cac, 2)}</span>
        </div>
      </div>

      {/* 4. Cohort table */}
      <div style={card}>
        <div style={sectionLabel}>Cohort economics</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
          <thead><tr style={{ color: "var(--subtle)", textAlign: "right" }}>
            <th style={{ textAlign: "left", fontWeight: 600, padding: "4px 8px 8px 0" }}>Cohort</th>
            <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Count</th>
            <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>First-order GP</th>
            <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Life orders</th>
            <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>LTV</th>
            <th style={{ fontWeight: 600, padding: "4px 0 8px 8px" }}>LTV:CAC</th>
          </tr></thead>
          <tbody>
            {[
              { n: "Subscription", c: actuals?.nSub ?? 0, gp: out.subFirstGp, life: out.resolved.subLife, ltv: out.subLtv, lc: out.subLtvCac },
              { n: "One-time", c: actuals?.nOneTime ?? 0, gp: out.oneTimeFirstGp, life: out.oneTimeLifeOrders, ltv: out.oneTimeLtv, lc: out.oneTimeLtvCac },
              { n: "3-pack", c: actuals?.nPack ?? 0, gp: out.packFirstGp, life: out.packLifeOrders, ltv: out.packLtv, lc: out.packLtvCac },
              { n: "Blended", c: out.newCustomers, gp: out.blendedFirstGp, life: NaN, ltv: out.blendedLtv, lc: out.blendedLtvCac, bold: true },
            ].map((r) => (
              <tr key={r.n} style={{ borderTop: "1px solid var(--border)", fontWeight: r.bold ? 700 : 400 }}>
                <td style={{ textAlign: "left", padding: "8px 8px 8px 0", fontFamily: "var(--font-ui)", color: "var(--text)" }}>{r.n}</td>
                <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>{r.c}</td>
                <td style={{ textAlign: "right", padding: "8px", color: "var(--text)" }}>{fmtUsd(r.gp, 2)}</td>
                <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>{Number.isNaN(r.life) ? "—" : r.life.toFixed(2)}</td>
                <td style={{ textAlign: "right", padding: "8px", color: "var(--text)" }}>{fmtUsd(r.ltv, 2)}</td>
                <td style={{ textAlign: "right", padding: "8px 0 8px 8px", color: r.lc >= 3 ? "var(--success)" : r.lc >= 1 ? "var(--warning)" : "var(--error)" }}>{fmtX(r.lc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Decision read */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
          <div style={{ ...sectionLabel, marginBottom: 0 }}>Decision read</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {saveMsg && <span style={{ fontSize: 11, fontFamily: "var(--font-ui)", color: saveMsg === "Saved" ? "var(--success)" : "var(--error)" }}>{saveMsg}</span>}
            <button onClick={saveSnapshot} disabled={saving || !actuals} title={!actuals ? "Pull actuals before saving a snapshot" : "Save this run to the monthly history"} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: saving || !actuals ? "not-allowed" : "pointer",
              background: "transparent", color: "var(--accent)", border: "1.5px solid var(--accent)", borderRadius: 6, opacity: !actuals ? 0.5 : 1,
            }}>{saving ? "Saving…" : "Save snapshot"}</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          <span><span style={{ color: "var(--muted)" }}>Blended CAC </span><b>{fmtUsd(out.blendedCac, 2)}</b></span>
          <span><span style={{ color: "var(--muted)" }}>Meta CAC </span><b>{fmtUsd(out.metaCac, 2)}</b></span>
          <span><span style={{ color: "var(--muted)" }}>First-order ROAS </span><b>{out.firstOrderRoas.toFixed(2)}x</b></span>
          <span><span style={{ color: "var(--muted)" }}>Sub LTV:CAC </span><b>{fmtX(out.subLtvCac)}</b></span>
          <span><span style={{ color: "var(--muted)" }}>Sub payback </span><b>{Number.isFinite(out.subPaybackMonths) ? `${out.subPaybackMonths.toFixed(1)} mo` : "never"}</b></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--muted)" }}>Blended LTV:CAC </span><b>{fmtX(out.blendedLtvCac)}</b>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 4, color: "#fff", background: VERDICT_COLOR[out.verdict] }}>{out.verdict}</span>
          </span>
        </div>
      </div>

      {/* 6. Break-even + scenario grid */}
      <div style={card}>
        <div style={sectionLabel}>Break-even subscription mix</div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 4 }}>
          <span><span style={{ color: "var(--muted)" }}>To hit {out.resolved.targetLtvCac.toFixed(1)}x: </span>
            {out.breakevenReachable ? <b>{(out.breakevenMixTarget * 100).toFixed(1)}% subscribers</b>
              : <b style={{ color: "var(--warning)" }}>not reachable — lower CAC or extend sub life</b>}</span>
          <span><span style={{ color: "var(--muted)" }}>To hit 1.0x: </span><b>{out.breakevenMix1x <= 1 && out.breakevenMix1x >= 0 ? `${(out.breakevenMix1x * 100).toFixed(1)}%` : "n/a"}</b></span>
        </div>
      </div>

      <div style={card}>
        <div style={sectionLabel}>Scenario grid · blended LTV:CAC by sub mix × sub life</div>
        <table style={{ borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
          <thead><tr>
            <th style={{ padding: "4px 10px", textAlign: "left", color: "var(--subtle)", fontWeight: 600 }}>mix \ life</th>
            {out.scenario.lives.map((l) => <th key={l} style={{ padding: "4px 10px", textAlign: "right", color: "var(--subtle)", fontWeight: 600 }}>{l}</th>)}
          </tr></thead>
          <tbody>
            {out.scenario.mixes.map((mix, ri) => (
              <tr key={mix} style={{ outline: ri === out.scenario.liveRowIndex ? "2px solid var(--accent)" : "none" }}>
                <td style={{ padding: "6px 10px", color: "var(--text)", fontWeight: ri === out.scenario.liveRowIndex ? 700 : 400 }}>
                  {(mix * 100).toFixed(mix === 0.354 ? 1 : 0)}%{ri === out.scenario.liveRowIndex ? " ←" : ""}
                </td>
                {out.scenario.cells[ri].map((v, ci) => (
                  <td key={ci} style={{ padding: "6px 10px", textAlign: "right", background: cellColor(v), color: "var(--text)" }}>{v.toFixed(2)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", margin: "10px 0 0" }}>Green ≥3, amber 1–3, red &lt;1. Highlighted row is nearest your current sub mix.</p>
      </div>

      {/* 7. Snapshot history — month-over-month trend */}
      <div style={card}>
        <div style={sectionLabel}>Snapshot history</div>
        {snapshotsLoading ? (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)" }}>Loading…</div>
        ) : snapshots.length === 0 ? (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)" }}>No snapshots yet. Pull actuals and click Save snapshot to start the monthly trend.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
            <thead><tr style={{ color: "var(--subtle)", textAlign: "right" }}>
              <th style={{ textAlign: "left", fontWeight: 600, padding: "4px 8px 8px 0" }}>Saved</th>
              <th style={{ textAlign: "left", fontWeight: 600, padding: "4px 8px 8px" }}>Window</th>
              <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>New customers</th>
              <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Sub mix</th>
              <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Blended CAC</th>
              <th style={{ fontWeight: 600, padding: "4px 8px 8px" }}>Blended LTV:CAC</th>
              <th style={{ fontWeight: 600, padding: "4px 0 8px 8px" }}>Verdict</th>
            </tr></thead>
            <tbody>
              {[...snapshots].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ textAlign: "left", padding: "8px 8px 8px 0", fontFamily: "var(--font-ui)", color: "var(--text)" }}>{new Date(s.savedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                  <td style={{ textAlign: "left", padding: "8px", color: "var(--muted)" }}>{s.range.since} → {s.range.until}</td>
                  <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>{s.output.newCustomers}</td>
                  <td style={{ textAlign: "right", padding: "8px", color: "var(--muted)" }}>{(s.output.subMix * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: "right", padding: "8px", color: "var(--text)" }}>{fmtUsd(s.output.blendedCac, 2)}</td>
                  <td style={{ textAlign: "right", padding: "8px", color: s.output.blendedLtvCac >= 3 ? "var(--success)" : s.output.blendedLtvCac >= 1 ? "var(--warning)" : "var(--error)" }}>{fmtX(s.output.blendedLtvCac)}</td>
                  <td style={{ textAlign: "right", padding: "8px 0 8px 8px" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 4, color: "#fff", background: VERDICT_COLOR[s.output.verdict] }}>{s.output.verdict}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
