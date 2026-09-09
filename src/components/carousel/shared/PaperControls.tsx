"use client";

// Two sliders every paper-ground style exposes: grain opacity and vignette
// strength. Did you know uses it now; Billboard, Chartbook and Primer take
// the same control so the four styles are tuned the same way.

import { PAPER_VIGNETTE_MAX, type PaperSettings } from "@/lib/brand-tokens";

const labelStyle = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 64 } as const;
const valueStyle = { fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--text)", minWidth: 40, textAlign: "right" } as const;

function Slider({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 240px" }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={max / 20}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "var(--accent)" }}
        aria-label={label}
      />
      <span style={valueStyle}>{Math.round((value / max) * 100)}%</span>
    </div>
  );
}

export default function PaperControls({ value, defaults, onChange }: { value: PaperSettings; defaults: PaperSettings; onChange: (v: PaperSettings) => void }) {
  const isDefault = value.grain === defaults.grain && value.vignette === defaults.vignette;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 16,
      padding: "10px 14px", background: "var(--surface)",
      border: "1px solid var(--border)", borderRadius: 8,
    }}>
      <Slider label="Grain" value={value.grain} max={1} onChange={(grain) => onChange({ ...value, grain })} />
      <Slider label="Vignette" value={value.vignette} max={PAPER_VIGNETTE_MAX} onChange={(vignette) => onChange({ ...value, vignette })} />
      <button
        onClick={() => onChange(defaults)}
        disabled={isDefault}
        style={{
          fontSize: 11, fontWeight: 600, color: isDefault ? "var(--muted)" : "var(--accent)",
          background: "transparent", border: "none", cursor: isDefault ? "default" : "pointer", padding: 0, fontFamily: "inherit",
        }}
      >
        Reset
      </button>
    </div>
  );
}
