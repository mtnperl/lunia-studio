"use client";

// The paper row every new style exposes: grain opacity, vignette strength,
// and on the pen-and-paper formats the pen colour. Did you know, Billboard,
// Chartbook and Primer all take this control so the four are tuned alike.

import { PAPER_VIGNETTE_MAX, PEN_PRESETS, type PaperSettings } from "@/lib/brand-tokens";

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

const HEX = /^#[0-9a-f]{6}$/i;

/** Swatches, a colour input and a hex field for the pen. `defaultHex` is
 *  the style's own pen; choosing it clears the override. */
function PenPicker({ value, defaultHex, onChange }: { value?: string; defaultHex: string; onChange: (hex?: string) => void }) {
  const current = (value ?? defaultHex).toLowerCase();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 320px" }}>
      <span style={labelStyle}>Pen</span>
      <div style={{ display: "flex", gap: 6 }}>
        {PEN_PRESETS.map((p) => {
          const sel = p.hex.toLowerCase() === current;
          return (
            <button
              key={p.hex}
              title={p.name}
              aria-label={`Pen ${p.name}`}
              onClick={() => onChange(p.hex.toLowerCase() === defaultHex.toLowerCase() ? undefined : p.hex)}
              style={{ width: 22, height: 22, borderRadius: 11, background: p.hex, border: sel ? "2px solid var(--text)" : "2px solid transparent", boxShadow: "0 0 0 1px var(--border)", cursor: "pointer", padding: 0 }}
            />
          );
        })}
      </div>
      <input
        type="color"
        value={HEX.test(current) ? current : defaultHex}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Pen colour"
        style={{ width: 28, height: 24, padding: 0, border: "1px solid var(--border)", borderRadius: 4, background: "transparent", cursor: "pointer" }}
      />
      <input
        type="text"
        value={value ?? ""}
        placeholder={defaultHex}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v === "") onChange(undefined);
          else if (HEX.test(v)) onChange(v);
        }}
        aria-label="Pen hex"
        style={{ width: 82, fontSize: 12, fontFamily: "'Fira Code', monospace", padding: "3px 6px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", color: "var(--text)" }}
      />
    </div>
  );
}

type Props = {
  value: PaperSettings;
  defaults: PaperSettings;
  onChange: (v: PaperSettings) => void;
  /** Show the pen picker. The hex is the style's own pen colour. */
  penDefault?: string;
};

export default function PaperControls({ value, defaults, onChange, penDefault }: Props) {
  const isDefault = value.grain === defaults.grain && value.vignette === defaults.vignette && !value.pen;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 16,
      padding: "10px 14px", background: "var(--surface)",
      border: "1px solid var(--border)", borderRadius: 8,
    }}>
      <Slider label="Grain" value={value.grain} max={1} onChange={(grain) => onChange({ ...value, grain })} />
      <Slider label="Vignette" value={value.vignette} max={PAPER_VIGNETTE_MAX} onChange={(vignette) => onChange({ ...value, vignette })} />
      {penDefault && <PenPicker value={value.pen} defaultHex={penDefault} onChange={(pen) => onChange({ ...value, pen })} />}
      <button
        onClick={() => onChange({ ...defaults, pen: undefined })}
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
