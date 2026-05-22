"use client";
import { useEffect, useState } from "react";

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, color = "var(--accent)" }: { size?: number; color?: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block", width: size, height: size, flexShrink: 0,
        border: `2px solid var(--border)`, borderTopColor: color,
        borderRadius: "50%", animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

// ─── Elapsed-seconds hook ─────────────────────────────────────────────────────
/** Seconds since this component mounted. Mount it fresh per run (conditional
 *  render) so the counter naturally starts at 0 — no reset logic needed. */
export function useElapsed(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return seconds;
}

export function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

// ─── Campaign generation loader (full step, ~20–40s) ──────────────────────────
const GEN_STEPS = [
  "Reading your brief",
  "Drafting subject lines",
  "Writing the body copy",
  "Planning the image layout",
  "Finalizing the campaign",
];

export function CampaignGenLoader() {
  const [step, setStep] = useState(0);
  const elapsed = useElapsed();
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)",
      padding: "24px 26px", maxWidth: 460,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Spinner size={18} />
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Writing your campaign…</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {GEN_STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 9, fontSize: 13,
              color: done ? "var(--muted)" : active ? "var(--text)" : "var(--subtle)",
              fontWeight: active ? 600 : 400,
            }}>
              <span style={{ width: 14, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <polyline points="1.5,6.5 4.5,9.5 10.5,3" stroke="var(--success)" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : active ? (
                  <Spinner size={11} />
                ) : (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--border-strong)" }} />
                )}
              </span>
              <span>{label}{active ? "…" : ""}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: "var(--subtle)", fontVariantNumeric: "tabular-nums" }}>
        {formatElapsed(elapsed)} elapsed
      </div>
    </div>
  );
}

// ─── Image-generation status (long wait, 1–2 min) ────────────────────────────
/** Render only while a generation is in flight — mounts fresh so the elapsed
 *  counter starts at 0 each run. */
export function ImageGenStatus() {
  const elapsed = useElapsed();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Spinner size={13} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Generating image…</span>
        <span style={{ fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>
          {formatElapsed(elapsed)}
        </span>
      </div>
      <span style={{ fontSize: 10, color: "var(--subtle)", lineHeight: 1.4 }}>
        gpt-image-2 · usually 1–2 minutes. Keep this tab open.
      </span>
    </div>
  );
}

// ─── Skeleton tile (library / asset grids) ────────────────────────────────────
export function SkeletonTile({ aspect = "4/3" }: { aspect?: string }) {
  return (
    <div
      style={{
        aspectRatio: aspect,
        borderRadius: 8,
        background: "linear-gradient(90deg, var(--surface) 25%, var(--surface-h) 50%, var(--surface) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}
