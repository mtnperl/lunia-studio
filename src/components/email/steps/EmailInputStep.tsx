"use client";
import { useState, useRef } from "react";
import { StylePreset, EmailSection } from "@/lib/types";

type GenerateResult = {
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
  onGenerated: (result: GenerateResult, competitorText: string, stylePreset: StylePreset) => void;
};

const STYLE_PRESETS: { key: StylePreset; label: string; desc: string }[] = [
  { key: "minimal-modern", label: "Minimal Modern", desc: "Short sentences, generous space, every word earns its place" },
  { key: "story-driven", label: "Story Driven", desc: "Opens with a moment, lets narrative carry to product" },
  { key: "bold-product-first", label: "Bold Product First", desc: "Lead with the benefit, punchy and direct, numbers over vague claims" },
];

export function EmailInputStep({ onGenerated }: Props) {
  const [competitorText, setCompetitorText] = useState("");
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const [stylePreset, setStylePreset] = useState<StylePreset>("minimal-modern");
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
        body: JSON.stringify({ competitorText, stylePreset, imageData: pastedImages }),
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
      onGenerated(data, competitorText, stylePreset);
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
      style={{ maxWidth: 680, margin: "0 auto", padding: "56px 40px 80px", outline: "none" }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 300,
          color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}>
          Email Template
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
          Paste a competitor email. Get a visual template with per-section images, editable copy, and Lunia voice.
        </p>
      </div>

      {/* Style picker */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--muted)", marginBottom: 10,
        }}>
          Style
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STYLE_PRESETS.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => setStylePreset(key)}
              title={desc}
              style={{
                padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                fontFamily: "var(--font-ui)", fontSize: 13,
                fontWeight: stylePreset === key ? 600 : 400,
                background: stylePreset === key ? "var(--accent-dim)" : "var(--surface-r)",
                border: stylePreset === key ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                color: stylePreset === key ? "var(--accent)" : "var(--muted)",
                transition: "all 0.12s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Paste area */}
      <textarea
        value={competitorText}
        onChange={(e) => setCompetitorText(e.target.value)}
        placeholder="Paste the full email here — subject line, body, P.S. Or Cmd+V a screenshot anywhere on this page."
        style={{
          width: "100%", minHeight: 280, padding: "16px",
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
            : `${charCount} chars${charCount > 8000 ? " — will be trimmed to 8000" : ""} · or Cmd+V a screenshot`}
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
