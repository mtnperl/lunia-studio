"use client";

// Between the topic and the slides: the numbers. The research call proposes
// up to three figures with a source each; the editor checks them against
// the citation, corrects any cell, picks one, and only then are the cover
// and caption written. Nothing on this screen is styled like the slide: it
// is a worksheet, not a preview.

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { ChartbookFigure, ChartbookFigureProposal } from "@/lib/types";

type Props = {
  topic: string;
  figures: ChartbookFigureProposal[];
  selected: number;
  onSelect: (i: number) => void;
  onChange: (i: number, figure: ChartbookFigure) => void;
  onConfirm: (figure: ChartbookFigure) => void;
  onMoreFigures: () => void;
  busy?: boolean;
};

const label = { fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "Inter, sans-serif" } as const;
const mono = { fontFamily: "'Fira Code', monospace", fontVariantNumeric: "tabular-nums" } as const;

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.7fr) minmax(0, 0.9fr)", gap: 8, alignItems: "center" }}>{children}</div>;
}

function LabeledField({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={label}>{name}</span>
      {children}
    </div>
  );
}

/** One editable cell per field of the figure. Values parse to numbers on
 *  the way out; an unparseable value keeps the last good number. */
function FigureEditor({ figure, onChange }: { figure: ChartbookFigure; onChange: (f: ChartbookFigure) => void }) {
  const set = (patch: Partial<ChartbookFigure>) => onChange({ ...figure, ...patch } as ChartbookFigure);
  const num = (raw: string, fallback: number) => { const n = Number(raw); return Number.isFinite(n) ? n : fallback; };
  const header = (a: string, b: string, c: string) => (
    <Row><span style={label}>{a}</span><span style={label}>{b}</span><span style={label}>{c}</span></Row>
  );

  const body = (() => {
    switch (figure.layout) {
      case "pill-bars":
      case "ranked": {
        const key = figure.layout === "pill-bars" ? "bars" : "items";
        const rows = figure.layout === "pill-bars" ? figure.bars : figure.items;
        return (
          <>
            <LabeledField name="Unit"><Input size="sm" value={figure.unit} onChange={(e) => set({ unit: e.target.value } as Partial<ChartbookFigure>)} /></LabeledField>
            {header("Label", "Value", "As printed")}
            {rows.map((r, i) => (
              <Row key={i}>
                <Input size="sm" value={r.label} onChange={(e) => { const next = rows.map((x, j) => j === i ? { ...x, label: e.target.value } : x); set({ [key]: next } as Partial<ChartbookFigure>); }} />
                <Input size="sm" style={mono} inputMode="decimal" defaultValue={String(r.value)} onBlur={(e) => { const next = rows.map((x, j) => j === i ? { ...x, value: num(e.target.value, x.value) } : x); set({ [key]: next } as Partial<ChartbookFigure>); }} />
                <Input size="sm" style={mono} value={r.display} onChange={(e) => { const next = rows.map((x, j) => j === i ? { ...x, display: e.target.value } : x); set({ [key]: next } as Partial<ChartbookFigure>); }} />
              </Row>
            ))}
          </>
        );
      }
      case "versus-bars":
        return (
          <>
            <LabeledField name="Unit"><Input size="sm" value={figure.unit} onChange={(e) => set({ unit: e.target.value })} /></LabeledField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <LabeledField name="Series 1"><Input size="sm" value={figure.series[0]} onChange={(e) => set({ series: [e.target.value, figure.series[1]] })} /></LabeledField>
              <LabeledField name="Series 2"><Input size="sm" value={figure.series[1]} onChange={(e) => set({ series: [figure.series[0], e.target.value] })} /></LabeledField>
            </div>
            {figure.groups.map((g, i) => {
              const update = (patch: Partial<typeof g>) => set({ groups: figure.groups.map((x, j) => j === i ? { ...x, ...patch } : x) });
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) repeat(4, minmax(0,0.6fr))", gap: 8, alignItems: "center" }}>
                  <Input size="sm" value={g.label} onChange={(e) => update({ label: e.target.value })} />
                  <Input size="sm" style={mono} inputMode="decimal" defaultValue={String(g.values[0])} onBlur={(e) => update({ values: [num(e.target.value, g.values[0]), g.values[1]] })} />
                  <Input size="sm" style={mono} value={g.displays[0]} onChange={(e) => update({ displays: [e.target.value, g.displays[1]] })} />
                  <Input size="sm" style={mono} inputMode="decimal" defaultValue={String(g.values[1])} onBlur={(e) => update({ values: [g.values[0], num(e.target.value, g.values[1])] })} />
                  <Input size="sm" style={mono} value={g.displays[1]} onChange={(e) => update({ displays: [g.displays[0], e.target.value] })} />
                </div>
              );
            })}
            <span style={{ fontSize: 12, color: "var(--subtle)" }}>Each row: label, then value and as-printed for series 1, then for series 2.</span>
          </>
        );
      case "object-pair":
        return (
          <>
            <LabeledField name="Kicker"><Input size="sm" value={figure.kicker} onChange={(e) => set({ kicker: e.target.value })} /></LabeledField>
            {figure.pair.map((o, i) => {
              const update = (patch: Partial<typeof o>) => { const next = figure.pair.map((x, j) => j === i ? { ...x, ...patch } : x) as typeof figure.pair; set({ pair: next }); };
              return (
                <Row key={i}>
                  <Input size="sm" value={o.label} onChange={(e) => update({ label: e.target.value })} />
                  <Input size="sm" style={mono} value={o.figure} onChange={(e) => update({ figure: e.target.value })} />
                  <Input size="sm" value={o.note} onChange={(e) => update({ note: e.target.value })} />
                </Row>
              );
            })}
          </>
        );
      case "claim-check":
        return (
          <>
            <LabeledField name="The belief"><Input size="sm" value={figure.quote} onChange={(e) => set({ quote: e.target.value })} /></LabeledField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <LabeledField name="Kicker"><Input size="sm" value={figure.kicker} onChange={(e) => set({ kicker: e.target.value })} /></LabeledField>
              <LabeledField name="Annotation"><Input size="sm" value={figure.annotation} onChange={(e) => set({ annotation: e.target.value })} /></LabeledField>
            </div>
            {header("Label", "Value", "As printed")}
            {(["small", "large"] as const).map((k) => {
              const b = figure[k];
              return (
                <Row key={k}>
                  <Input size="sm" value={b.label} onChange={(e) => set({ [k]: { ...b, label: e.target.value } })} />
                  <Input size="sm" style={mono} inputMode="decimal" defaultValue={String(b.value)} onBlur={(e) => set({ [k]: { ...b, value: num(e.target.value, b.value) } })} />
                  <Input size="sm" style={mono} value={b.display} onChange={(e) => set({ [k]: { ...b, display: e.target.value } })} />
                </Row>
              );
            })}
          </>
        );
    }
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <LabeledField name="Title"><Input size="sm" value={figure.title} onChange={(e) => set({ title: e.target.value })} /></LabeledField>
      {body}
      <LabeledField name="Source"><Input size="sm" value={figure.source.citation} onChange={(e) => set({ source: { citation: e.target.value } })} /></LabeledField>
    </div>
  );
}

export default function ChartbookFigureStep({ topic, figures, selected, onSelect, onChange, onConfirm, onMoreFigures, busy }: Props) {
  const [showJson, setShowJson] = useState(false);
  const current = figures[selected];
  if (!current) return null;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Check the numbers</h2>
      <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>
        {figures.length} figure{figures.length === 1 ? "" : "s"} proposed for: <span style={{ color: "var(--text)", fontWeight: 600 }}>{topic}</span>. Confirm the values against the source, fix anything that is off, then write the slides.
      </p>

      {figures.length > 1 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {figures.map((p, i) => {
            const sel = selected === i;
            const n = p.violations?.length ?? 0;
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                style={{
                  flex: "1 1 220px", textAlign: "left",
                  border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                  background: sel ? "var(--accent-dim)" : "var(--bg)",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ ...label, color: sel ? "var(--accent)" : "var(--text)" }}>{p.figure.layout.replace("-", " ")}</span>
                  {n > 0 && <span title={p.violations!.join("\n")} style={{ fontSize: 10, fontWeight: 700, color: "var(--error)" }}>{n} flag{n === 1 ? "" : "s"}</span>}
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginBottom: 2 }}>{p.figure.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{p.angle}</div>
              </button>
            );
          })}
        </div>
      )}

      {current.violations && current.violations.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--warning)" }}>
          {current.violations.map((v, i) => <div key={i}>{v}</div>)}
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <span style={label}>{current.figure.layout.replace("-", " ")}</span>
          <button onClick={() => setShowJson((s) => !s)} style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            {showJson ? "Fields" : "Raw"}
          </button>
        </div>
        {showJson
          ? <Textarea rows={14} style={{ ...mono, fontSize: 12 }} defaultValue={JSON.stringify(current.figure, null, 2)} onBlur={(e) => { try { onChange(selected, JSON.parse(e.target.value)); } catch { /* keep the last good figure */ } }} />
          : <FigureEditor figure={current.figure} onChange={(f) => onChange(selected, f)} />}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="primary" size="md" busy={busy} onClick={() => onConfirm(current.figure)}>Write the slides</Button>
        <Button variant="secondary" size="md" disabled={busy} onClick={onMoreFigures}>Propose other figures</Button>
        <span style={{ fontSize: 12, color: "var(--subtle)" }}>The figure goes onto slide 2 exactly as it reads here.</span>
      </div>
    </div>
  );
}
