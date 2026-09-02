"use client";
import type { ReactNode } from "react";

/** Compact segmented choice for rails. A radiogroup, not tabs: it changes a
 *  value, it does not switch a view. */
export function Seg<T extends string>({ label, value, options, onChange, size = "sm" }: {
  label?: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="ui-field">
      {label && <span className="ui-field__label">{label}</span>}
      <div role="radiogroup" aria-label={label} className="ui-tabs" style={{ display: "inline-flex", flexWrap: "wrap" }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            aria-selected={value === o.value}
            title={o.title}
            className="ui-tab"
            style={size === "md" ? { minHeight: 30, padding: "0 12px", fontSize: 13 } : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Row of small buttons, wrapping. */
export function Row({ children, gap = 6 }: { children: ReactNode; gap?: number }) {
  return <div style={{ display: "flex", gap, flexWrap: "wrap", alignItems: "center" }}>{children}</div>;
}

/** Two-line note under a control. */
export function Note({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: 12, lineHeight: 1.45, color: "var(--ui-text-3)" }}>{children}</span>;
}

/** Brand-role swatch row, used for promo band, CTA and bullet colours. */
export function RoleSwatches({ value, onChange, allowTheme = true }: { value: string | null; onChange: (v: string | null) => void; allowTheme?: boolean }) {
  const roles = [["ivory", "--lunia-soft-ivory"], ["aqua", "--lunia-aqua"], ["yellow", "--lunia-signal-yellow"], ["navy", "--lunia-rich-navy"], ["slate", "--lunia-slate-blue"]] as const;
  return (
    <div role="radiogroup" aria-label="Colour" style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {allowTheme && <button type="button" role="radio" aria-checked={value === null} className="ui-tab" style={{ minHeight: 24 }} onClick={() => onChange(null)}>Theme</button>}
      {roles.map(([name, token]) => (
        <button key={name} type="button" role="radio" aria-checked={value === name} aria-label={name} title={name} className="ui-focusable" onClick={() => onChange(name)}
          style={{ width: 22, height: 22, borderRadius: 4, background: `var(${token})`, border: value === name ? "2px solid var(--ui-text)" : "1px solid var(--ui-border-strong)", cursor: "pointer", padding: 0 }} />
      ))}
    </div>
  );
}
