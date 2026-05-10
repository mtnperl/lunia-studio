"use client";
// Retro terminal-style loaders for the Email Flow Review studio.
// Mirrors the patterns in src/components/carousel/shared/RetroLoader.tsx and
// src/components/email/EmailPanelBuilderView.tsx so loaders feel consistent
// across the app — black bg, Courier mono, white border, ◆ LUNIA.EXE header,
// animated spinner, progress bar, optional stepped list.

import { useEffect, useState } from "react";

const SPINNER_FRAMES = ["◢◣◤◥", "◣◤◥◢", "◤◥◢◣", "◥◢◣◤"];

function useSpinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 180);
    return () => clearInterval(t);
  }, []);
  return { spinner: SPINNER_FRAMES[frame], frame };
}

const SCANLINES = "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px)";

// ─── Full-screen analyze loader ──────────────────────────────────────────────
// Used during /api/email-review/analyze (Sonnet 4.6 with thinking, ~30-60s).
// Walks through the framework's 6 sections so the user sees what's coming.

const ANALYZE_STEPS = [
  "PARSING FLOW + LINTER PRE-FLIGHT",
  "SECTION 1 — HEADLINE",
  "SECTION 2 — TIMING",
  "SECTION 3 — SUBJECT LINES",
  "SECTION 4 — FULL BODY REWRITES",
  "SECTION 5 — DESIGN AUDIT",
  "SECTION 6 — STRATEGIC QUESTION",
  "DRAFTING IMAGE PROMPTS",
];

type AnalyzeLoaderProps = {
  flowName?: string;
  emailCount?: number;
  frameworkVersion?: string;
};

export function AnalyzeLoader({ flowName = "(unnamed flow)", emailCount = 0, frameworkVersion = "v1.0" }: AnalyzeLoaderProps) {
  const { spinner, frame } = useSpinner();
  const [step, setStep] = useState(0);
  useEffect(() => {
    // Step every ~3s — slow enough that a fast run finishes before we exhaust
    // the list, fast enough that a slow run still progresses visibly.
    const t = setInterval(() => setStep((s) => Math.min(s + 1, ANALYZE_STEPS.length - 1)), 3200);
    return () => clearInterval(t);
  }, []);

  const completed = step;
  const barFilled = Math.round((completed / ANALYZE_STEPS.length) * 28);
  const bar = "█".repeat(barFilled) + "░".repeat(28 - barFilled);
  const pct = Math.round((completed / ANALYZE_STEPS.length) * 100);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
      <div style={{
        fontFamily: "'Courier New', Courier, monospace",
        background: "#000", color: "#fff",
        border: "3px solid #fff", borderRadius: 2,
        padding: "32px 36px", width: 520, maxWidth: "100%",
        position: "relative", overflow: "hidden", userSelect: "none",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: SCANLINES }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #fff", paddingBottom: 10, marginBottom: 18, fontSize: 11, letterSpacing: "0.12em" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
          <span style={{ color: "#888" }}>claude-opus-4-7 · email-review</span>
          <span>{spinner}</span>
        </div>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>
            RUNNING FLOW REVIEW
          </div>
          <div style={{ color: "#888", fontSize: 11, letterSpacing: "0.06em" }}>
            {flowName.toUpperCase()} · {emailCount} EMAIL{emailCount === 1 ? "" : "S"} · FRAMEWORK {frameworkVersion.toUpperCase()}
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: "#888", marginBottom: 5, letterSpacing: "0.1em" }}>── REVIEW PROGRESS ─────────────────────</div>
          <div style={{ fontSize: 14, letterSpacing: 1.5, marginBottom: 6 }}>[{bar}]</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ccc" }}>
            <span>SECTION {Math.min(completed + 1, ANALYZE_STEPS.length)} OF {ANALYZE_STEPS.length}</span>
            <span>{pct}%</span>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #333", borderBottom: "1px solid #333", padding: "12px 0", marginBottom: 16 }}>
          {ANALYZE_STEPS.map((s, i) => {
            const done = i < step, active = i === step;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 5,
                fontSize: 12, letterSpacing: "0.06em",
                color: done ? "#fff" : active ? "#fff" : "#444",
              }}>
                <span style={{ width: 16, flexShrink: 0 }}>{done ? "+" : active ? ">" : "."}</span>
                <span style={{ flex: 1 }}>{s}</span>
                <span style={{ fontSize: 11 }}>{done ? "DONE" : active ? `GEN${frame % 2 === 0 ? "..." : ".  "}` : ""}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>
          <span>ANTHROPIC × LUNIA LIFE</span>
          <span style={{ color: frame % 2 === 0 ? "#fff" : "#555" }}>● PROCESSING</span>
        </div>
      </div>
    </div>
  );
}

// ─── Compact bar loader ─────────────────────────────────────────────────────
// For Klaviyo flow fetches, image generations, regen-suggestions, docx
// exports — anywhere we want a single-line "doing X" indicator.

type MiniLoaderProps = {
  label: string;
  detail?: string;
  /** Override the model / engine string in the top-right corner. */
  engine?: string;
};

export function MiniReviewLoader({ label, detail, engine }: MiniLoaderProps) {
  const { spinner, frame } = useSpinner();
  const bar = "█".repeat(frame % 2 === 0 ? 8 : 12) + "░".repeat(frame % 2 === 0 ? 20 : 16);

  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      background: "#000", color: "#fff",
      border: "2px solid #fff", borderRadius: 2,
      padding: "14px 18px",
      userSelect: "none",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: SCANLINES }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", paddingBottom: 6, marginBottom: 8, fontSize: 10, letterSpacing: "0.1em" }}>
        <span style={{ fontWeight: 700, fontSize: 11 }}>◆ LUNIA.EXE</span>
        <span style={{ color: "#888" }}>{engine ?? "email-review"}</span>
        <span style={{ color: "#aaa" }}>{spinner}</span>
      </div>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 6, letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 12, letterSpacing: 1, marginBottom: 6, color: "#fff" }}>[{bar}]</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.08em" }}>
        <span style={{ color: frame % 2 === 0 ? "#1ef" : "#555" }}>● GEN{frame % 2 === 0 ? "..." : ".  "}█</span>
        <span>{detail ?? "WORKING"}</span>
      </div>
    </div>
  );
}
