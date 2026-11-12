"use client";
import { useState } from "react";
import type { AssetMetadata } from "@/lib/types";
import PhotoLibrary from "./PhotoLibrary";

/** Expand a contact sheet in place; keep its filters and scroll while trying versions. */
export function SwapStrip(props: {
  currentUrl?: string;
  copy: string;
  exclude?: string[];
  onPick: (asset: AssetMetadata) => void;
}) {
  const [open, setOpen] = useState(false);
  return <div>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
      style={{ border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)", color: "var(--text)", padding: "6px 10px", font: "inherit", fontSize: 12, cursor: "pointer" }}>
      {open ? "Hide photos" : "Browse photos & versions"}
    </button>
    <div hidden={!open} style={{ marginTop: 8 }}>
      {open && <PhotoLibrary {...props} />}
    </div>
  </div>;
}

export type PictureShape = "1:1" | "4:5" | "16:9";

const SHAPES: { key: PictureShape; label: string }[] = [
  { key: "1:1", label: "Square" },
  { key: "4:5", label: "4:5" },
  { key: "16:9", label: "16:9" },
];

export function ShapePicker({ value, onChange }: { value: PictureShape; onChange: (shape: PictureShape) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Shape</span>
      <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 5, overflow: "hidden", background: "var(--bg)" }}>
        {SHAPES.map((s, i) => {
          const on = value === s.key;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => { if (!on) onChange(s.key); }}
              title={`Crop to ${s.label}`}
              style={{
                padding: "3px 9px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", lineHeight: 1.6,
                border: "none", borderRight: i === SHAPES.length - 1 ? "none" : "1px solid var(--border)",
                background: on ? "var(--accent-dim)" : "transparent",
                color: on ? "var(--text)" : "var(--muted)", cursor: "pointer",
              }}
            >{s.label}</button>
          );
        })}
      </div>
    </div>
  );
}
