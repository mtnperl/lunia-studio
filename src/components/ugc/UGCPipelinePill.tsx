"use client";
import { useState, useRef, useEffect } from "react";
import { UGCPipelineStage, UGC_PIPELINE_STAGES, UGC_STAGE_LABELS } from "@/lib/types";

// Map each stage to a DESIGN.md token pairing.
const STAGE_STYLES: Record<UGCPipelineStage, { bg: string; border: string; text: string }> = {
  invited:   { bg: "var(--surface-r)", border: "var(--border)",        text: "var(--muted)" },
  shipped:   { bg: "var(--accent-dim)", border: "var(--accent-mid)",   text: "var(--text)"  },
  delivered: { bg: "var(--accent-dim)", border: "var(--accent-mid)",   text: "var(--text)"  },
  approved:  { bg: "color-mix(in srgb, var(--success) 14%, transparent)", border: "color-mix(in srgb, var(--success) 40%, transparent)", text: "var(--success)" },
  posted:    { bg: "var(--success)",   border: "var(--success)",       text: "#FFFFFF"      },
};

type Props = {
  stage: UGCPipelineStage;
  onChange: (next: UGCPipelineStage) => void;
};

export default function UGCPipelinePill({ stage, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const style = STAGE_STYLES[stage];

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  function advance() {
    const i = UGC_PIPELINE_STAGES.indexOf(stage);
    const next = UGC_PIPELINE_STAGES[Math.min(i + 1, UGC_PIPELINE_STAGES.length - 1)];
    if (next !== stage) onChange(next);
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={advance}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen((v) => !v);
        }}
        title="Click to advance · Right-click to jump"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.text,
          padding: "4px 10px",
          borderRadius: 9999,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "background 0.12s, border-color 0.12s",
        }}
      >
        {UGC_STAGE_LABELS[stage]}
      </button>
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "var(--surface-r)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 4,
            zIndex: 50,
            minWidth: 120,
          }}
        >
          {UGC_PIPELINE_STAGES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 10px",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: s === stage ? "var(--text)" : "var(--muted)",
                background: s === stage ? "var(--accent-dim)" : "transparent",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {UGC_STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
