"use client";
// AdRetroLoader — 90s-CRT loader for the Meta ad builder. Same visual
// language as carousel RetroLoader (phosphor-green glow on black, courier,
// scanline overlay, ASCII progress bar) but keyed to the ad flow stages:
//   - "concepts" → Claude generating 3 concept variants (Opus 4.7)
//   - "image"    → Recraft V4 Pro base render
//   - "edit"     → Seedream 5 Lite Edit iteration
// Each mode ships its own header chyron + status lines + model metadata.

import { useEffect, useState } from "react";

const SPINNER_FRAMES = ["◢◣◤◥", "◣◤◥◢", "◤◥◢◣", "◥◢◣◤"];

export type AdLoaderMode = "concepts" | "image" | "edit";

type Props = {
  mode: AdLoaderMode;
  /** Optional status line — e.g. concept angle or prompt excerpt. */
  detail?: string;
  /** Optional cosmetic: override the model chyron. */
  modelLabel?: string;
};

const COPY: Record<
  AdLoaderMode,
  { title: string; model: string; spec: string; steps: string[] }
> = {
  concepts: {
    title: "GENERATING AD CONCEPTS",
    model: "anthropic/claude-opus-4-7",
    spec: "MODEL: claude-opus-4-7 · 3 variants · compliance-linted",
    steps: [
      "loading static-ad-creator skill",
      "drafting 3 angle variants",
      "running compliance lint",
      "packaging concept JSON",
    ],
  },
  image: {
    title: "RENDERING AD VISUAL",
    model: "fal-ai/recraft/v4/pro",
    spec: "MODEL: fal-ai/recraft/v4/pro · brand-palette guardrails · 1024×",
    steps: [
      "queueing on fal.ai",
      "composing scene",
      "rendering base image",
      "packaging output",
    ],
  },
  edit: {
    title: "EDITING AD VISUAL",
    model: "fal-ai/bytedance/seedream/v5/lite/edit",
    spec: "MODEL: seedream-5-lite-edit · reference-based · natural-language",
    steps: [
      "encoding reference image",
      "parsing edit instruction",
      "applying targeted edit",
      "packaging output",
    ],
  },
};

export default function AdRetroLoader({ mode, detail, modelLabel }: Props) {
  const [frame, setFrame] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 180);
    return () => clearInterval(t);
  }, []);

  // Advance the step pointer on a slower cadence so it reads like real progress.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 900);
    return () => clearInterval(t);
  }, []);

  const copy = COPY[mode];
  const spinner = SPINNER_FRAMES[frame];
  const activeIdx = Math.min(copy.steps.length - 1, Math.floor(tick / 2));
  const barFilled = Math.min(28, Math.round(((activeIdx + 1) / copy.steps.length) * 28));
  const bar = "█".repeat(barFilled) + "░".repeat(28 - barFilled);
  const pct = Math.round(((activeIdx + 1) / copy.steps.length) * 100);

  return (
    <div
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        background: "#000",
        color: "#b6ffb6", // phosphor green
        border: "3px solid #b6ffb6",
        borderRadius: 2,
        padding: "28px 32px",
        maxWidth: 540,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        boxShadow: "0 0 24px rgba(182,255,182,0.15) inset",
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(182,255,182,0.06) 3px,rgba(182,255,182,0.06) 4px)",
        }}
      />

      {/* Chyron */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #3d6a3d",
          paddingBottom: 10,
          marginBottom: 16,
          fontSize: 11,
          letterSpacing: "0.12em",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
        <span style={{ color: "#6a9a6a" }}>{modelLabel ?? copy.model}</span>
        <span>{spinner}</span>
      </div>

      {/* Title + spec */}
      <div style={{ marginBottom: 20, letterSpacing: "0.08em" }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>
          {copy.title}
        </div>
        <div style={{ color: "#6a9a6a", fontSize: 11 }}>{copy.spec}</div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10,
            color: "#6a9a6a",
            marginBottom: 5,
            letterSpacing: "0.1em",
          }}
        >
          ── PROGRESS ───────────────────────────
        </div>
        <div style={{ fontSize: 14, letterSpacing: 1.5, marginBottom: 6 }}>[{bar}]</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#8bc38b",
          }}
        >
          <span>
            STEP {Math.min(activeIdx + 1, copy.steps.length)} / {copy.steps.length}
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* Step list */}
      <div
        style={{
          borderTop: "1px solid #1f3d1f",
          borderBottom: "1px solid #1f3d1f",
          padding: "12px 0",
          marginBottom: 14,
        }}
      >
        {copy.steps.map((label, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                letterSpacing: "0.06em",
                color: done ? "#b6ffb6" : active ? "#b6ffb6" : "#3d6a3d",
                marginBottom: 5,
              }}
            >
              <span style={{ width: 16, flexShrink: 0 }}>
                {done ? "✓" : active ? ">" : "·"}
              </span>
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontSize: 11 }}>
                {done ? "DONE" : active ? (frame % 2 === 0 ? "RUN..." : "RUN.  ") : "QUEUE"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Detail line */}
      {detail && (
        <div
          style={{
            fontSize: 10,
            color: "#6a9a6a",
            marginBottom: 12,
            letterSpacing: "0.08em",
            lineHeight: 1.45,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          ▸ {detail}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#3d6a3d",
          letterSpacing: "0.1em",
        }}
      >
        <span>LUNIA STUDIO — META AD BUILDER</span>
        <span style={{ color: frame % 2 === 0 ? "#b6ffb6" : "#3d6a3d" }}>● PROCESSING</span>
      </div>
    </div>
  );
}
