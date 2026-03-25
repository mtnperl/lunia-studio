"use client";
import { useState, useEffect } from "react";

const SPINNER_FRAMES = ["◢◣◤◥", "◣◤◥◢", "◤◥◢◣", "◥◢◣◤"];

type LoaderItem = { label: string; done: boolean; error: string | null };

// ─── Full-page retro loader (used in CarouselView during fal.ai generation) ───
export function RetroImageLoader({ items }: { items: LoaderItem[] }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 180);
    return () => clearInterval(t);
  }, []);

  const total = items.length;
  const completed = items.filter((it) => it.done || !!it.error).length;
  const loaded = items.filter((it) => it.done).length;
  const activeIdx = items.findIndex((it) => !it.done && !it.error);
  const barFilled = Math.round((completed / total) * 28);
  const bar = "█".repeat(barFilled) + "░".repeat(28 - barFilled);
  const pct = Math.round((completed / total) * 100);
  const spinner = SPINNER_FRAMES[frame];

  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      background: "#000", color: "#fff",
      border: "3px solid #fff", borderRadius: 2,
      padding: "32px 36px", maxWidth: 520,
      margin: "48px auto", position: "relative",
      overflow: "hidden", userSelect: "none",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #fff", paddingBottom: 10, marginBottom: 18, fontSize: 11, letterSpacing: "0.12em" }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
        <span style={{ color: "#888" }}>fal-ai/recraft-v3 · v2.0</span>
        <span>{spinner}</span>
      </div>
      <div style={{ marginBottom: 22, fontSize: 12, letterSpacing: "0.08em" }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>RENDERING SLIDE BACKGROUNDS</div>
        <div style={{ color: "#888", fontSize: 11 }}>MODEL: fal-ai/recraft-v3 · realistic_image · 1024×1280</div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#888", marginBottom: 5, letterSpacing: "0.1em" }}>── RENDER PROGRESS ──────────────────────</div>
        <div style={{ fontSize: 14, letterSpacing: 1.5, marginBottom: 6 }}>[{bar}]</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ccc" }}>
          <span>{loaded} / {total} BACKGROUNDS COMPLETE</span>
          <span>{pct}%</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #333", borderBottom: "1px solid #333", padding: "12px 0", marginBottom: 16 }}>
        {items.map((item, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={i} style={{ marginBottom: item.error ? 8 : 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, letterSpacing: "0.06em", color: item.error ? "#f55" : item.done ? "#fff" : isActive ? "#fff" : "#444" }}>
                <span style={{ width: 16, flexShrink: 0 }}>{item.error ? "✗" : item.done ? "✓" : isActive ? ">" : "·"}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 11 }}>
                  {item.error ? "FAILED" : item.done ? "DONE" : isActive
                    ? <span>GEN{frame % 2 === 0 ? "..." : ".  "}<span style={{ animation: "blink 1s step-end infinite" }}>█</span></span>
                    : "QUEUE"}
                </span>
              </div>
              {item.error && <div style={{ marginLeft: 26, fontSize: 10, color: "#f55", marginTop: 2, lineHeight: 1.4 }}>ERR: {item.error}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>
        <span>RECRAFT V3 — ANTHROPIC × FAL.AI</span>
        <span style={{ color: frame % 2 === 0 ? "#fff" : "#555" }}>● PROCESSING</span>
      </div>
    </div>
  );
}

// ─── Retro error screen ───────────────────────────────────────────────────────
export function RetroImageError({ items, onRetry }: { items: LoaderItem[]; onRetry: () => void }) {
  const errored = items.filter((it) => !!it.error);
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace", background: "#000", color: "#f55", border: "3px solid #f55", borderRadius: 2, padding: "32px 36px", maxWidth: 520, margin: "48px auto" }}>
      <div style={{ borderBottom: "1px solid #f55", paddingBottom: 10, marginBottom: 18, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
        <span>RENDER ERROR</span>
        <span>EXIT CODE: 1</span>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>!! IMAGE GENERATION FAILED !!</div>
        <div style={{ fontSize: 12, color: "#c44", marginTop: 4 }}>fal-ai/recraft-v3 could not render the background images.</div>
      </div>
      <div style={{ borderTop: "1px solid #500", borderBottom: "1px solid #500", padding: "12px 0", marginBottom: 20 }}>
        {errored.map((item, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.06em" }}><span style={{ marginRight: 10 }}>✗</span>{item.label}</div>
            <div style={{ marginLeft: 22, fontSize: 10, color: "#c44", marginTop: 3, lineHeight: 1.5 }}>{item.error}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={onRetry} style={{ fontFamily: "'Courier New', Courier, monospace", background: "#f55", color: "#000", border: "none", padding: "8px 20px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer" }}>[RETRY]</button>
        <span style={{ fontSize: 10, color: "#c44" }}>Check FAL_KEY · rate limits · fal.ai status</span>
      </div>
    </div>
  );
}

// ─── Compact inline retro loader (used in BatchView per-item card) ─────────────
export function MiniRetroLoader({ label = "HOOK SLIDE" }: { label?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 180);
    return () => clearInterval(t);
  }, []);

  const spinner = SPINNER_FRAMES[frame];
  const bar = "█".repeat(frame % 2 === 0 ? 8 : 12) + "░".repeat(frame % 2 === 0 ? 20 : 16);

  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      background: "#000", color: "#fff",
      border: "2px solid #fff", borderRadius: 2,
      padding: "16px 20px",
      userSelect: "none",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", paddingBottom: 8, marginBottom: 10, fontSize: 10, letterSpacing: "0.1em" }}>
        <span style={{ fontWeight: 700, fontSize: 11 }}>◆ LUNIA.EXE</span>
        <span style={{ color: "#888" }}>fal-ai/recraft-v3</span>
        <span style={{ color: "#aaa" }}>{spinner}</span>
      </div>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 6, letterSpacing: "0.08em" }}>RENDERING: {label}</div>
      <div style={{ fontSize: 12, letterSpacing: 1, marginBottom: 6, color: "#fff" }}>[{bar}]</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.08em" }}>
        <span style={{ color: frame % 2 === 0 ? "#1ef" : "#555" }}>● GEN{frame % 2 === 0 ? "..." : ".  "}█</span>
        <span>RECRAFT V3</span>
      </div>
    </div>
  );
}
