"use client";
import { useState, useRef, useEffect } from "react";
import { EmailSection } from "@/lib/types";

type GenerateResult = {
  topic: string;
  anatomy: unknown;
  score: number;
  scoreDiagnosis: string;
  frameworkLabel: string;
  sendTimingChip: string;
  generated: {
    subjectLines: string[];
    preheader: string;
    sections: EmailSection[];
    cta: string;
    ps: string;
  };
};

type Props = {
  onGenerated: (result: GenerateResult, competitorText: string) => void;
};

// ─── Retro analysis loader ────────────────────────────────────────────────────
const SPINNER_FRAMES = ["◢◣◤◥", "◣◤◥◢", "◤◥◢◣", "◥◢◣◤"];
const ANALYSIS_STEPS = [
  "PARSING EMAIL STRUCTURE",
  "SCORING FRAMEWORK ELEMENTS",
  "EXTRACTING VOICE SIGNALS",
  "GENERATING LUNIA REMIX",
  "BUILDING SECTION TEMPLATE",
];

function EmailAnalysisLoader() {
  const [frame, setFrame] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const spinTimer = setInterval(() => setFrame(f => (f + 1) % SPINNER_FRAMES.length), 180);
    const stepTimer = setInterval(() => setStep(s => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 1600);
    return () => { clearInterval(spinTimer); clearInterval(stepTimer); };
  }, []);

  const spinner = SPINNER_FRAMES[frame];

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        fontFamily: "'Courier New', Courier, monospace",
        background: "#000", color: "#fff",
        border: "3px solid #fff", borderRadius: 2,
        padding: "32px 36px", width: 460,
        position: "relative", overflow: "hidden", userSelect: "none",
      }}>
        {/* Scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px)",
        }} />
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid #fff", paddingBottom: 10, marginBottom: 18,
          fontSize: 11, letterSpacing: "0.12em",
        }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
          <span style={{ color: "#888" }}>claude-opus-4-6 · email-intel</span>
          <span>{spinner}</span>
        </div>
        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>
            ANALYZING COMPETITOR EMAIL
          </div>
          <div style={{ color: "#888", fontSize: 11, letterSpacing: "0.06em" }}>
            Running framework analysis + Lunia voice remix
          </div>
        </div>
        {/* Steps */}
        <div style={{ borderTop: "1px solid #333", borderBottom: "1px solid #333", padding: "12px 0", marginBottom: 16 }}>
          {ANALYSIS_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 5,
                fontSize: 12, letterSpacing: "0.06em",
                color: done ? "#fff" : active ? "#fff" : "#444",
              }}>
                <span style={{ width: 16, flexShrink: 0 }}>
                  {done ? "✓" : active ? ">" : "·"}
                </span>
                <span style={{ flex: 1 }}>{s}</span>
                <span style={{ fontSize: 11 }}>
                  {done ? "DONE" : active ? `GEN${frame % 2 === 0 ? "..." : ".  "}` : ""}
                </span>
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>
          <span>ANTHROPIC × LUNIA LIFE</span>
          <span style={{ color: frame % 2 === 0 ? "#fff" : "#555" }}>● PROCESSING</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main input step ──────────────────────────────────────────────────────────
export function EmailInputStep({ onGenerated }: Props) {
  const [competitorText, setCompetitorText] = useState("");
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);

  const hasImages = pastedImages.length > 0;
  const charCount = competitorText.length;
  const canGenerate = hasImages || competitorText.trim().length >= 100;

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    imageItems.forEach(item => {
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPastedImages(prev => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleGenerate() {
    if (!canGenerate) {
      setError("Paste at least 100 characters of email text, or paste a screenshot.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorText,
          stylePreset: "minimal-modern",
          imageData: pastedImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      if (!data.generated?.sections?.length) {
        setError("Could not parse sections — try with more text");
        return;
      }
      onGenerated(data, competitorText);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={pasteZoneRef}
      onPaste={handlePaste}
      tabIndex={-1}
      style={{ maxWidth: 680, margin: "0 auto", padding: "56px 40px 80px", outline: "none", position: "relative" }}
    >
      {loading && <EmailAnalysisLoader />}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 300,
          color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}>
          Email Builder
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
          Paste a competitor email or screenshot. Get a visual template with per-section images, editable copy, and Lunia voice.
        </p>
      </div>

      {/* Paste area */}
      <textarea
        value={competitorText}
        onChange={(e) => setCompetitorText(e.target.value)}
        placeholder="Paste the full email here — subject line, body, P.S. Or Cmd+V a screenshot anywhere on this page."
        style={{
          width: "100%", minHeight: 300, padding: "16px",
          borderRadius: 10, background: "var(--surface-r)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)",
          lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", outline: "none",
          transition: "border-color 0.12s",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--accent)")}
        onBlur={e => (e.target.style.borderColor = "var(--border)")}
      />

      {/* Pasted image thumbnails */}
      {pastedImages.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {pastedImages.map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Screenshot ${i + 1}`}
                style={{ height: 64, width: "auto", borderRadius: 6, border: "1px solid var(--border)", display: "block" }}
              />
              <button
                onClick={() => setPastedImages(prev => prev.filter((_, j) => j !== i))}
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "var(--error)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 10, color: "#fff", lineHeight: 1,
                }}
                aria-label="Remove screenshot"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)" }}>
          {hasImages
            ? `${pastedImages.length} screenshot${pastedImages.length > 1 ? "s" : ""} ready · Cmd+V to add more`
            : `${charCount} chars${charCount > 8000 ? " — will be trimmed" : ""} · or Cmd+V a screenshot`}
        </span>
        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          style={{
            padding: "10px 28px", borderRadius: 8,
            cursor: loading || !canGenerate ? "not-allowed" : "pointer",
            background: loading || !canGenerate ? "var(--surface-h)" : "var(--accent)",
            border: "none",
            fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
            color: loading || !canGenerate ? "var(--muted)" : "var(--bg)",
            transition: "all 0.15s",
          }}
        >
          {loading ? "Analyzing..." : hasImages && !competitorText.trim() ? "Analyze Screenshot →" : "Analyze + Build Template →"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 14, padding: "10px 14px", borderRadius: 8,
          background: "rgba(184,92,92,0.08)", border: "1px solid var(--error)",
          color: "var(--error)", fontFamily: "var(--font-ui)", fontSize: 13,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
