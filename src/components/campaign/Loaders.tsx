"use client";
import { useEffect, useState } from "react";

const SPINNER_FRAMES = ["◢◣◤◥", "◣◤◥◢", "◤◥◢◣", "◥◢◣◤"];
const MONO = "'Courier New', Courier, monospace";
const SCANLINES = "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px)";

// ─── Clean ring spinner (buttons, light inline waits) ────────────────────────
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
 *  render) so the counter naturally starts at 0. */
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
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Retro spinner frame, cycling every 180ms. */
function useSpinnerFrame(): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 180);
    return () => clearInterval(t);
  }, []);
  return frame;
}

// ─── Campaign generation loader — 90s terminal style ──────────────────────────
const GEN_STEPS = [
  "READ BRIEF",
  "DRAFT SUBJECT LINES",
  "WRITE BODY COPY",
  "PLAN IMAGE LAYOUT",
  "FINALIZE CAMPAIGN",
];

export function CampaignGenLoader() {
  const frame = useSpinnerFrame();
  const elapsed = useElapsed();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)), 4500);
    return () => clearInterval(t);
  }, []);

  const total = GEN_STEPS.length;
  const done = step; // steps before the active one are complete
  const barFilled = Math.round(((step + 1) / total) * 28);
  const bar = "█".repeat(barFilled) + "░".repeat(28 - barFilled);
  const pct = Math.round(((step + 1) / total) * 100);
  const spinner = SPINNER_FRAMES[frame];

  return (
    <div style={{
      fontFamily: MONO, background: "#000", color: "#fff",
      border: "3px solid #fff", borderRadius: 2,
      padding: "28px 32px", maxWidth: 500, position: "relative",
      overflow: "hidden", userSelect: "none",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: SCANLINES }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #fff", paddingBottom: 10, marginBottom: 18, fontSize: 11, letterSpacing: "0.12em" }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
        <span style={{ color: "#888" }}>claude-opus · v2.0</span>
        <span>{spinner}</span>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>WRITING CAMPAIGN</div>
        <div style={{ color: "#888", fontSize: 11 }}>MODEL: claude-opus · EMAIL/v1</div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "#888", marginBottom: 5, letterSpacing: "0.1em" }}>── GEN PROGRESS ─────────────────────────</div>
        <div style={{ fontSize: 14, letterSpacing: 1.5, marginBottom: 6 }}>[{bar}]</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ccc" }}>
          <span>STEP {step + 1} / {total}</span>
          <span>{pct}%</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #333", borderBottom: "1px solid #333", padding: "12px 0", marginBottom: 14 }}>
        {GEN_STEPS.map((label, i) => {
          const isDone = i < done;
          const isActive = i === step;
          return (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10, fontSize: 12, letterSpacing: "0.06em",
              marginBottom: 5, color: isDone ? "#fff" : isActive ? "#fff" : "#444",
            }}>
              <span style={{ width: 16, flexShrink: 0 }}>{isDone ? "✓" : isActive ? ">" : "·"}</span>
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontSize: 11 }}>
                {isDone ? "DONE" : isActive
                  ? <span>GEN{frame % 2 === 0 ? "..." : ".  "}<span style={{ animation: "blink 1s step-end infinite" }}>█</span></span>
                  : "QUEUE"}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>
        <span>ELAPSED {formatElapsed(elapsed)}</span>
        <span style={{ color: frame % 2 === 0 ? "#fff" : "#555" }}>● PROCESSING</span>
      </div>
    </div>
  );
}

// ─── Image-generation loader — compact 90s terminal style ─────────────────────
/** Render only while a generation is in flight — mounts fresh so the elapsed
 *  counter starts at 0 each run. */
export function ImageGenStatus() {
  const frame = useSpinnerFrame();
  const elapsed = useElapsed();
  const barFilled = 6 + (frame % 4) * 4;
  const bar = "█".repeat(barFilled) + "░".repeat(24 - barFilled);

  return (
    <div style={{
      fontFamily: MONO, background: "#000", color: "#fff",
      border: "2px solid #fff", borderRadius: 2,
      padding: "12px 14px", position: "relative", overflow: "hidden", userSelect: "none",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: SCANLINES }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", paddingBottom: 7, marginBottom: 9, fontSize: 9, letterSpacing: "0.1em" }}>
        <span style={{ fontWeight: 700, fontSize: 10 }}>◆ LUNIA.EXE</span>
        <span style={{ color: "#888" }}>gpt-image-2</span>
        <span style={{ color: "#aaa" }}>{SPINNER_FRAMES[frame]}</span>
      </div>
      <div style={{ fontSize: 9, color: "#888", marginBottom: 6, letterSpacing: "0.08em" }}>RENDERING IMAGE</div>
      <div style={{ fontSize: 11, letterSpacing: 1, marginBottom: 7 }}>[{bar}]</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#666", letterSpacing: "0.06em" }}>
        <span style={{ color: frame % 2 === 0 ? "#1ef" : "#555" }}>● GEN{frame % 2 === 0 ? "..." : ".  "}█</span>
        <span style={{ color: "#aaa" }}>{formatElapsed(elapsed)} · ~1-2 MIN</span>
      </div>
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

// ─── Content-shaped block skeleton (AI layout suggestion / per-block
// regenerate loading) ──────────────────────────────────────────────────────
/** A handful of shimmering bars sized like a real block, instead of a bare
 *  spinner — matches DESIGN.md's "warm shimmer, not cold grey" Loading spec. */
export function BlockSkeleton({ lines = 2 }: { lines?: number }) {
  const bar = (width: string, height = 10) => (
    <div style={{
      width, height, borderRadius: 4,
      background: "linear-gradient(90deg, var(--surface) 25%, var(--surface-h) 50%, var(--surface) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s ease-in-out infinite",
    }} />
  );
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {bar("40%", 8)}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i}>{bar(i === lines - 1 ? "70%" : "100%")}</div>
      ))}
    </div>
  );
}
