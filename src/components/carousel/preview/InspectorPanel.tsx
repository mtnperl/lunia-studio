"use client";
import { type ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Docked inspector chrome for the v2 carousel editor. Purely presentational —
 * the parent decides which tool body to render as children. Always-mounted in
 * the editor grid so opening/closing it never reflows the canvas vertically.
 */
export default function InspectorPanel({ title, subtitle, onClose, children }: Props) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "transparent",
            border: "none",
            fontSize: 15,
            lineHeight: 1,
            color: "var(--muted)",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "2px 4px",
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ padding: "12px", overflowY: "auto", flex: 1 }}>{children}</div>
    </div>
  );
}
