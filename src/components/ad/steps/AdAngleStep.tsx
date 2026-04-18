"use client";
// Step 1 — Angle + Visual format + optional custom hook.
// Mirrors carousel TopicStep: pick inputs, click Next, parent dispatches generation.

import { useState } from "react";
import {
  AD_ANGLE_LABELS,
  VISUAL_FORMAT_LABELS,
  type AdAngle,
  type VisualFormat,
} from "@/lib/types";

const ANGLE_DESCRIPTIONS: Record<AdAngle, string> = {
  credibility: "Backed by research, study-led, authority stance",
  "price-anchor": "Smarter money, value framing, comparison economics",
  "skeptic-convert": "First-person confession — 'I didn't think it would work'",
  "outcome-first": "Lead with the change — clearer mornings, staying asleep",
  formula: "Transparent formulation — 3 ingredients, full doses",
  comparison: "Most products do X; this does Y",
  "social-proof": "Reviews, ratings, testimonial pull",
};

const FORMAT_DESCRIPTIONS: Record<VisualFormat, string> = {
  "product-dark": "Dark surface, single light source — premium/credibility",
  "lifestyle-flatlay": "Nightstand flat lay — routines/outcome",
  "text-dominant": "Minimal product, text-led — price/skeptic/comparison",
  "before-after": "State shift illustration — outcome-first",
  "ingredient-macro": "Macro close-up — ingredient-led",
};

const ANGLES = Object.keys(AD_ANGLE_LABELS) as AdAngle[];
const FORMATS = Object.keys(VISUAL_FORMAT_LABELS) as VisualFormat[];

type Props = {
  onNext: (angle: AdAngle, visualFormat: VisualFormat, customHook: string) => void;
};

export default function AdAngleStep({ onNext }: Props) {
  const [angle, setAngle] = useState<AdAngle>("credibility");
  const [visualFormat, setVisualFormat] = useState<VisualFormat>("product-dark");
  const [customHook, setCustomHook] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Angle */}
      <section>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--muted)",
            marginBottom: 12,
          }}
        >
          Ad angle
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
          {ANGLES.map((a) => {
            const active = a === angle;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAngle(a)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--accent-dim)" : "var(--bg)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "var(--text)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{AD_ANGLE_LABELS[a]}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.45 }}>
                  {ANGLE_DESCRIPTIONS[a]}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Visual format */}
      <section>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--muted)",
            marginBottom: 12,
          }}
        >
          Visual format
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
          {FORMATS.map((f) => {
            const active = f === visualFormat;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setVisualFormat(f)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--accent-dim)" : "var(--bg)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "var(--text)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{VISUAL_FORMAT_LABELS[f]}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.45 }}>
                  {FORMAT_DESCRIPTIONS[f]}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom hook */}
      <section>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--muted)",
            marginBottom: 12,
          }}
        >
          Extra context <span style={{ textTransform: "none", color: "var(--subtle)", fontWeight: 500 }}>(optional)</span>
        </div>
        <textarea
          value={customHook}
          onChange={(e) => setCustomHook(e.target.value)}
          placeholder="Anything specific — a launch, an ingredient focus, a study to lean on."
          rows={3}
          maxLength={500}
          style={{
            width: "100%",
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--text)",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 4, textAlign: "right" }}>
          {customHook.length}/500
        </div>
      </section>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => onNext(angle, visualFormat, customHook.trim())}
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
          Generate concepts →
        </button>
      </div>
    </div>
  );
}
