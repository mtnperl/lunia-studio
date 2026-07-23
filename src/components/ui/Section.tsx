"use client";
import { useState, type ReactNode } from "react";
import { IcChevron } from "./icons";

/** A named, individually-collapsible group. 1px-border card, no shadow.
 *  `defaultCollapsed` seeds the initial state from a gating rule; it does not
 *  re-collapse under an in-progress edit. No `overflow:hidden` on the outer
 *  box — several children (dropdown menus) render outside its bounds — so
 *  corner rounding is applied per-element. */
export function Section({ title, defaultCollapsed, children }: {
  title: string;
  defaultCollapsed: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          minHeight: 44, padding: "0 14px",
          border: "none", borderBottom: collapsed ? "none" : "1px solid var(--border)",
          borderTopLeftRadius: 8, borderTopRightRadius: 8,
          borderBottomLeftRadius: collapsed ? 8 : 0, borderBottomRightRadius: collapsed ? 8 : 0,
          background: "var(--surface)", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}
      >
        <span style={{
          display: "inline-flex", color: "var(--muted)", transition: "transform 130ms ease",
          transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}>
          <IcChevron size={16} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {title}
        </span>
      </button>
      {!collapsed && <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>}
    </div>
  );
}
