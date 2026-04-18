"use client";
// Step 2 — render 3 concept cards, user picks one, edits copy inline if needed.

import { useState } from "react";
import type { AdConcept } from "@/lib/types";

type ConceptWithLint = AdConcept & { complianceIssues?: string[] };

type Props = {
  concepts: ConceptWithLint[];
  onPick: (concept: AdConcept) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  onBack: () => void;
};

export default function AdConceptStep({
  concepts,
  onPick,
  onRegenerate,
  regenerating,
  onBack,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [edited, setEdited] = useState<AdConcept[]>(concepts);

  // Keep local editable copy in sync when concepts prop changes (e.g. regenerate).
  if (edited !== concepts && edited.length !== concepts.length) {
    setEdited(concepts);
    setSelectedIdx(0);
  }

  function updateField<K extends keyof AdConcept>(i: number, key: K, value: AdConcept[K]) {
    setEdited((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {concepts.length} concept{concepts.length === 1 ? "" : "s"} generated
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Pick one. Edit any copy inline before advancing.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            style={{
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: regenerating ? "not-allowed" : "pointer",
              opacity: regenerating ? 0.6 : 1,
            }}
          >
            {regenerating ? "Regenerating…" : "Regenerate concepts"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {edited.map((c, i) => {
          const active = i === selectedIdx;
          const issues = concepts[i]?.complianceIssues ?? [];
          return (
            <div
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                border: "1px solid",
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "var(--accent-dim)" : "var(--surface)",
                borderRadius: 10,
                padding: 18,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--muted)",
                  }}
                >
                  {c.label || `Concept ${i + 1}`}
                </div>
                {issues.length > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--warning)",
                      background: "rgba(196,122,90,0.12)",
                      padding: "3px 8px",
                      borderRadius: 4,
                    }}
                  >
                    ⚠ {issues.join(", ")}
                  </div>
                )}
              </div>

              <FieldLabel>Headline (≤ 5 words)</FieldLabel>
              <input
                value={c.headline}
                onChange={(e) => updateField(i, "headline", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={inputStyle}
              />

              <FieldLabel>Primary text (2–4 sentences)</FieldLabel>
              <textarea
                value={c.primaryText}
                onChange={(e) => updateField(i, "primaryText", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />

              <FieldLabel>Overlay text (3–7 words, burned on image)</FieldLabel>
              <input
                value={c.overlayText}
                onChange={(e) => updateField(i, "overlayText", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={inputStyle}
              />

              <FieldLabel>Visual direction</FieldLabel>
              <textarea
                value={c.visualDirection}
                onChange={(e) => updateField(i, "visualDirection", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />

              {c.whyItWorks?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <FieldLabel>Why it works</FieldLabel>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontSize: 12,
                      color: "var(--muted)",
                      lineHeight: 1.55,
                    }}
                  >
                    {c.whyItWorks.map((w, wi) => (
                      <li key={wi}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            color: "var(--muted)",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: "8px 0",
          }}
        >
          ← Change angle
        </button>
        <button
          onClick={() => onPick(edited[selectedIdx])}
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            borderRadius: 7,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Use this concept →
        </button>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--subtle)",
        marginTop: 10,
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "inherit",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--text)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 10px",
  outline: "none",
};
