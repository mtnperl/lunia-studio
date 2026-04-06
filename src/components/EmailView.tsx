"use client";
import { useState } from "react";
import { EmailAnatomy, EmailSection, SavedEmail, StylePreset } from "@/lib/types";

type GenerateResult = {
  anatomy: EmailAnatomy;
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
  imagePrompt: string;
};

type Props = {
  onConvertToCarousel?: (data: { frameworkLabel: string; subjectLines: string[]; preheader: string; sections: EmailSection[] }) => void;
};

const STYLE_PRESETS: { key: StylePreset; label: string; desc: string }[] = [
  { key: "minimal-modern", label: "Minimal Modern", desc: "Short sentences, generous space, every word earns its place" },
  { key: "story-driven", label: "Story Driven", desc: "Opens with a moment, lets narrative carry to product" },
  { key: "bold-product-first", label: "Bold Product First", desc: "Lead with the benefit, punchy and direct, numbers over vague claims" },
];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 8 ? "var(--success)" : score >= 5 ? "var(--warning)" : "var(--error)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${score * 10}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color, minWidth: 28 }}>{score}/10</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      background: "var(--accent-dim)", border: "1px solid var(--accent-mid)",
      fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)",
      letterSpacing: "0.02em",
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
      letterSpacing: "0.14em", textTransform: "uppercase",
      color: "var(--muted)", marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        padding: "3px 10px", borderRadius: 6,
        background: copied ? "var(--success)" : "var(--surface-r)",
        border: "1px solid var(--border)", cursor: "pointer",
        fontFamily: "var(--font-mono)", fontSize: 10,
        color: copied ? "#fff" : "var(--muted)",
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function EmailView({ onConvertToCarousel }: Props) {
  const [competitorText, setCompetitorText] = useState("");
  const [stylePreset, setStylePreset] = useState<StylePreset>("minimal-modern");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [activeSubject, setActiveSubject] = useState(0);
  const [sideBy, setSideBy] = useState(false);

  async function handleGenerate() {
    if (competitorText.trim().length < 100) {
      setError("Paste at least 100 characters of email text to analyze.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setImageUrl(null);
    setImageError(null);
    setSavedId(null);

    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorText, stylePreset }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      setResult(data);
      setImagePrompt(data.imagePrompt ?? "");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageError(null);
    try {
      const res = await fetch("/api/email/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error ?? "Image generation failed");
        return;
      }
      setImageUrl(data.url);
    } catch {
      setImageError("Image generation failed — try again.");
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/email/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorText,
          stylePreset,
          anatomy: result.anatomy,
          score: result.score,
          scoreDiagnosis: result.scoreDiagnosis,
          frameworkLabel: result.frameworkLabel,
          sendTimingChip: result.sendTimingChip,
          generated: result.generated,
          imageUrl,
          imagePrompt,
        }),
      });
      const data = await res.json();
      if (res.ok) setSavedId(data.id);
    } finally {
      setSaving(false);
    }
  }

  function handleConvertToCarousel() {
    if (!result || !onConvertToCarousel) return;
    onConvertToCarousel({
      frameworkLabel: result.frameworkLabel,
      subjectLines: result.generated.subjectLines,
      preheader: result.generated.preheader,
      sections: result.generated.sections,
    });
  }

  const charCount = competitorText.length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
        <h1 style={{
          fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 600,
          margin: "0 0 6px", letterSpacing: "-0.02em",
        }}>
          Email Intelligence
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", margin: 0 }}>
          Paste a competitor email. Get the framework breakdown, a Lunia remix, and a bridge to carousel.
        </p>
      </div>

      {/* Input panel */}
      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: 24, marginBottom: 24 }}>
        <div>
          {/* Style picker */}
          <SectionLabel>Style</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {STYLE_PRESETS.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setStylePreset(key)}
                title={desc}
                style={{
                  padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: stylePreset === key ? 600 : 400,
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

          {/* Paste area */}
          <SectionLabel>Competitor Email</SectionLabel>
          <textarea
            value={competitorText}
            onChange={(e) => setCompetitorText(e.target.value)}
            placeholder="Paste the full email here — subject line, body, and P.S. if there is one. Plain text or forwarded email both work."
            style={{
              width: "100%", minHeight: 280, padding: 16, borderRadius: 10,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)",
              lineHeight: 1.6, resize: "vertical", boxSizing: "border-box",
              outline: "none",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)" }}>
              {charCount} chars{charCount > 8000 ? " — will be trimmed to 8000" : ""}
            </span>
            <button
              onClick={handleGenerate}
              disabled={loading || charCount < 100}
              style={{
                padding: "10px 24px", borderRadius: 8, cursor: loading || charCount < 100 ? "not-allowed" : "pointer",
                background: loading || charCount < 100 ? "var(--surface-h)" : "var(--accent)",
                border: "none", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
                color: loading || charCount < 100 ? "var(--muted)" : "var(--bg)",
                transition: "all 0.15s",
              }}
            >
              {loading ? "Analyzing..." : "Analyze + Remix →"}
            </button>
          </div>
          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(160,64,64,0.08)", border: "1px solid var(--error)", color: "var(--error)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Right panel: side-by-side competitor when toggled */}
        {result && sideBy && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <SectionLabel>Competitor (original)</SectionLabel>
            </div>
            <div style={{
              padding: 16, borderRadius: 10, background: "var(--surface-r)",
              border: "1px solid var(--border)", minHeight: 280,
              fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)",
              lineHeight: 1.7, overflowY: "auto", maxHeight: 600,
              whiteSpace: "pre-wrap",
            }}>
              {competitorText.slice(0, 3000)}{competitorText.length > 3000 ? "\n\n[truncated for display]" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Score + framework bar */}
          <div style={{
            padding: "20px 24px", borderRadius: 12,
            background: "var(--surface)", border: "1px solid var(--border)",
            display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center",
          }}>
            <div style={{ flex: "0 0 auto", minWidth: 180 }}>
              <SectionLabel>Competitor Score</SectionLabel>
              <ScoreBar score={result.score} />
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                {result.scoreDiagnosis}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <Chip>{result.frameworkLabel}</Chip>
                <Chip>Send pattern: {result.sendTimingChip}</Chip>
                {result.anatomy.hasPsLine && <Chip>Has P.S.</Chip>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setSideBy(v => !v)}
                style={{
                  padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                  background: sideBy ? "var(--accent-dim)" : "var(--surface-r)",
                  border: sideBy ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                  fontFamily: "var(--font-ui)", fontSize: 12,
                  color: sideBy ? "var(--accent)" : "var(--muted)",
                }}
              >
                {sideBy ? "Hide original" : "Side-by-side"}
              </button>
              {onConvertToCarousel && (
                <button
                  onClick={handleConvertToCarousel}
                  style={{
                    padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                    background: "var(--surface-r)", border: "1px solid var(--border)",
                    fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)",
                  }}
                >
                  → Carousel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !!savedId}
                style={{
                  padding: "7px 14px", borderRadius: 8, cursor: saving || savedId ? "default" : "pointer",
                  background: savedId ? "var(--success)" : "var(--accent)",
                  border: "none", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
                  color: savedId ? "#fff" : "var(--bg)",
                }}
              >
                {savedId ? "Saved" : saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {/* Two-column output */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left: Anatomy */}
            <div style={{ padding: "20px 24px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <SectionLabel>Email Anatomy</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["Subject formula", result.anatomy.subjectFormula],
                  ["Preheader", result.anatomy.preheaderStrategy],
                  ["Visual structure", result.anatomy.visualStructure],
                  ["Image ratio", result.anatomy.inferredImageRatio + " (estimated)"],
                  ["Copy framework", result.anatomy.copyFramework],
                  ["CTA type", result.anatomy.ctaType],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Generated subject lines */}
            <div style={{ padding: "20px 24px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <SectionLabel>Subject Lines (Lunia remix)</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {result.generated.subjectLines.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveSubject(i)}
                    style={{
                      padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                      background: activeSubject === i ? "var(--accent-dim)" : "var(--surface-r)",
                      border: activeSubject === i ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                      fontFamily: "var(--font-ui)", fontSize: 13,
                      color: activeSubject === i ? "var(--text)" : "var(--muted)",
                      transition: "all 0.12s",
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                    }}
                  >
                    <span>{s}</span>
                    <CopyButton text={s} />
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Preheader</div>
                <div style={{
                  padding: "10px 14px", borderRadius: 8, background: "var(--surface-r)",
                  border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)" }}>{result.generated.preheader}</span>
                  <CopyButton text={result.generated.preheader} />
                </div>
              </div>
            </div>
          </div>

          {/* Email body sections */}
          <div style={{ padding: "20px 24px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <SectionLabel>Email Body</SectionLabel>
              <CopyButton text={result.generated.sections.map(s => (s.heading ? `${s.heading}\n\n` : "") + s.body).join("\n\n")} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {result.generated.sections.map((section, i) => (
                <div key={i} style={{ paddingBottom: 16, borderBottom: i < result.generated.sections.length - 1 ? "1px solid var(--border)" : "none" }}>
                  {section.heading && (
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                      {section.heading}
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
                    {section.body}
                  </div>
                </div>
              ))}
              {/* CTA */}
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>CTA</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{result.generated.cta}</div>
                </div>
                <CopyButton text={result.generated.cta} />
              </div>
              {/* P.S. */}
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--surface-r)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>P.S.</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", lineHeight: 1.6, fontStyle: "italic" }}>{result.generated.ps}</div>
                </div>
                <CopyButton text={`P.S. ${result.generated.ps}`} />
              </div>
            </div>
          </div>

          {/* Image zone */}
          <div style={{ padding: "20px 24px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <SectionLabel>Image Zone</SectionLabel>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <textarea
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                placeholder="Image prompt (edit before generating)..."
                rows={3}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8,
                  background: "var(--surface-r)", border: "1px solid var(--border)",
                  fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)",
                  lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", outline: "none",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                onClick={handleGenerateImage}
                disabled={imageLoading || !imagePrompt.trim()}
                style={{
                  padding: "10px 18px", borderRadius: 8, cursor: imageLoading || !imagePrompt.trim() ? "not-allowed" : "pointer",
                  background: imageLoading || !imagePrompt.trim() ? "var(--surface-h)" : "var(--surface-r)",
                  border: "1px solid var(--border)", fontFamily: "var(--font-ui)", fontSize: 12,
                  color: imageLoading || !imagePrompt.trim() ? "var(--subtle)" : "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {imageLoading ? "Generating..." : "Generate image →"}
              </button>
            </div>
            {imageError && (
              <div style={{ marginTop: 10, color: "var(--error)", fontFamily: "var(--font-ui)", fontSize: 12 }}>
                {imageError}
              </div>
            )}
            {imageUrl && (
              <div style={{ marginTop: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Generated email hero image"
                  style={{ maxWidth: 320, borderRadius: 10, border: "1px solid var(--border)", display: "block" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <a
                    href={imageUrl}
                    download="lunia-email-image.png"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                      background: "var(--surface-r)", border: "1px solid var(--border)",
                      fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)",
                      textDecoration: "none",
                    }}
                  >
                    Download
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
