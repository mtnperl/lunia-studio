"use client";
// Progress surfaces for the Email Flow Review studio. These were black CRT
// terminals (scanlines, `◆ LUNIA.EXE`, a Courier block bar) like the carousel
// loaders DESIGN.md retired on 2026-08-22, and the analyze one ticked sections
// off as DONE on a 3s timer whatever the model was doing. Now: the shimmer the
// spec sanctions for "work happening", an honest elapsed clock, and the list of
// what the review will cover, with nothing marked done that we cannot see.

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui";

const REVIEW_COVERS = [
  "Linter pre-flight",
  "Timing",
  "Subject lines, preview and sender",
  "Full body rewrites",
  "Design and images",
  "Strategic question",
  "Image prompts",
];

function Elapsed() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</>;
}

const mono: React.CSSProperties = { fontFamily: "var(--ui-font-mono)", fontVariantNumeric: "tabular-nums" };

type AnalyzeLoaderProps = {
  flowName?: string;
  emailCount?: number;
  frameworkVersion?: string;
};

// Used during /api/email-review/analyze (Opus with thinking, ~45-90s).
export function AnalyzeLoader({ flowName = "Unnamed flow", emailCount = 0, frameworkVersion = "v1.0" }: AnalyzeLoaderProps) {
  return (
    <div role="status" aria-live="polite" style={{
      maxWidth: 560, margin: "48px auto", padding: 32,
      border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-4)", background: "var(--ui-surface)",
      color: "var(--ui-text)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>Reviewing {flowName}</div>
        <span style={{ ...mono, fontSize: 13, color: "var(--ui-text-2)" }}><Elapsed /></span>
      </div>
      <div style={{ ...mono, fontSize: 12, color: "var(--ui-text-3)", marginTop: 4 }}>
        {emailCount} email{emailCount === 1 ? "" : "s"} · framework {frameworkVersion} · usually 45 to 90 seconds
      </div>
      <div className="ui-skeleton" style={{ height: 4, borderRadius: 2, margin: "24px 0" }} />
      <div style={{ fontSize: 12, color: "var(--ui-text-2)", marginBottom: 8 }}>The review covers</div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
        {REVIEW_COVERS.map((s, i) => (
          <li key={s} style={{ display: "flex", gap: 12, fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ ...mono, fontSize: 12, color: "var(--ui-text-3)", width: 20 }}>{String(i + 1).padStart(2, "0")}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

type MiniLoaderProps = {
  label: string;
  detail?: string;
  /** The model or engine doing the work, shown as quiet meta. */
  engine?: string;
};

// For Klaviyo flow fetches, image generations, regen-suggestions, docx
// exports — anywhere we want a single-line "doing X" indicator.
export function MiniReviewLoader({ label, detail, engine }: MiniLoaderProps) {
  // Callers wrote these for an all-caps terminal; read them as sentence case.
  const text = label.charAt(0).toUpperCase() + label.slice(1);
  const sub = detail && detail === detail.toUpperCase() ? detail.toLowerCase() : detail;
  return (
    <div role="status" aria-live="polite" style={{
      display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "8px 16px",
      border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-3)", background: "var(--ui-surface)",
      color: "var(--ui-text)",
    }}>
      <Spinner />
      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0 }}>
        {text}
        {sub && <span style={{ fontWeight: 400, color: "var(--ui-text-2)" }}> · {sub}</span>}
      </span>
      <span style={{ ...mono, fontSize: 12, color: "var(--ui-text-3)", whiteSpace: "nowrap" }}>
        {engine && <>{engine} · </>}<Elapsed />
      </span>
    </div>
  );
}
