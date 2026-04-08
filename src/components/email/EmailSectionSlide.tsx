"use client";
import { useState } from "react";
import { EmailSection } from "@/lib/types";

type ImageStyle = "realistic" | "illustration" | "anime" | "vector";

const IMAGE_STYLE_CHIPS: { key: ImageStyle; label: string }[] = [
  { key: "realistic", label: "Real" },
  { key: "illustration", label: "Illus" },
  { key: "vector", label: "Vec" },
  { key: "anime", label: "Anime" },
];

type Props = {
  section: EmailSection;
  topic: string;
  onSectionChange: (updated: EmailSection) => void;
  onGenerateImage: () => void;
  imageLoading: boolean;
  imageError: string | null;
};

// ─── Download helper ──────────────────────────────────────────────────────────
async function downloadImage(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `lunia-section-${Date.now()}.jpg`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export function EmailSectionSlide({
  section,
  topic,
  onSectionChange,
  onGenerateImage,
  imageLoading,
  imageError,
}: Props) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [bodyEnhancing, setBodyEnhancing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const hasImage = !!section.imageUrl;
  const style = section.imageStyle ?? "realistic";

  // ── Enhance body ──────────────────────────────────────────────────────────
  async function handleEnhanceBody() {
    if (!section.body.trim() || bodyEnhancing) return;
    setBodyEnhancing(true);
    try {
      const res = await fetch("/api/email/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: section.body, topic, type: "body" }),
      });
      const data = await res.json();
      if (res.ok && data.enhanced) {
        onSectionChange({ ...section, body: data.enhanced });
      }
    } catch { /* silent */ }
    setBodyEnhancing(false);
  }

  // ── Suggest prompts ───────────────────────────────────────────────────────
  async function handleSuggestPrompts() {
    if (suggestionsLoading) return;
    setSuggestionsLoading(true);
    setSuggestions(null);
    try {
      const res = await fetch("/api/email/suggest-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPrompt: section.imagePrompt,
          topic,
          sectionBody: section.body,
        }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch {
      setSuggestions([]);
    }
    setSuggestionsLoading(false);
  }

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid var(--border)",
      background: "var(--surface)",
      overflow: "hidden",
    }}>
      {/* ── Image area + text overlay ── */}
      <div style={{ position: "relative", height: 220 }}>
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.imageUrl}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Download button */}
            <button
              onClick={() => downloadImage(section.imageUrl!)}
              title="Download image"
              style={{
                position: "absolute", top: 8, right: 8, zIndex: 2,
                width: 28, height: 28, borderRadius: 6,
                background: "rgba(0,0,0,0.55)", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 1v8M3.5 6.5l3 3 3-3M1 11h11" />
              </svg>
            </button>
            {/* Text overlay */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "rgba(0,0,0,0.52)", padding: "12px 14px",
            }}>
              {section.heading !== undefined && (
                <textarea
                  value={section.heading}
                  onChange={e => onSectionChange({ ...section, heading: e.target.value })}
                  rows={1}
                  placeholder="Section heading..."
                  style={{
                    width: "100%", resize: "none", background: "transparent",
                    border: "none", outline: "none", padding: 0,
                    fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
                    color: "#fff", lineHeight: 1.4, marginBottom: 4, boxSizing: "border-box",
                  }}
                />
              )}
              <textarea
                value={section.body}
                onChange={e => onSectionChange({ ...section, body: e.target.value })}
                rows={3}
                style={{
                  width: "100%", resize: "none", background: "transparent",
                  border: "none", outline: "none", padding: 0,
                  fontFamily: "var(--font-ui)", fontSize: 13,
                  color: "rgba(255,255,255,0.88)", lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>
          </>
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: "var(--surface-r)", border: "2px dashed var(--border-s)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--subtle)", letterSpacing: "0.08em" }}>
              No image yet
            </span>
          </div>
        )}
      </div>

      {/* ── Text fields when no image ── */}
      {!hasImage && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
          {section.heading !== undefined && (
            <textarea
              value={section.heading}
              onChange={e => onSectionChange({ ...section, heading: e.target.value })}
              rows={1}
              placeholder="Section heading..."
              style={{
                width: "100%", resize: "none",
                background: "transparent", border: "none", outline: "none", padding: 0,
                fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
                color: "var(--text)", lineHeight: 1.4, marginBottom: 6, boxSizing: "border-box",
              }}
            />
          )}
          <textarea
            value={section.body}
            onChange={e => onSectionChange({ ...section, body: e.target.value })}
            rows={3}
            style={{
              width: "100%", resize: "none",
              background: "transparent", border: "none", outline: "none", padding: 0,
              fontFamily: "var(--font-ui)", fontSize: 13,
              color: "var(--muted)", lineHeight: 1.6, boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* ── Controls bar ── */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Image style chips */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)",
            letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 4,
          }}>
            Style
          </span>
          {IMAGE_STYLE_CHIPS.map(chip => (
            <button
              key={chip.key}
              onClick={() => onSectionChange({ ...section, imageStyle: chip.key })}
              style={{
                padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: 10,
                background: style === chip.key ? "var(--accent-dim)" : "var(--surface-r)",
                border: style === chip.key ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                color: style === chip.key ? "var(--accent)" : "var(--subtle)",
                transition: "all 0.12s",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Prompt row (collapsible) */}
        <div>
          <button
            onClick={() => setPromptOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            <span style={{
              transform: promptOpen ? "rotate(90deg)" : "rotate(0deg)",
              display: "inline-block", transition: "transform 0.15s",
            }}>›</span>
            Prompt
          </button>
          {promptOpen && (
            <div style={{ marginTop: 6 }}>
              <textarea
                value={section.imagePrompt ?? ""}
                onChange={e => {
                  onSectionChange({ ...section, imagePrompt: e.target.value });
                  setSuggestions(null); // reset suggestions when user edits
                }}
                rows={3}
                placeholder="Image prompt (edit before generating)..."
                style={{
                  width: "100%", resize: "vertical",
                  padding: "8px 10px", borderRadius: 6,
                  background: "var(--surface-r)", border: "1px solid var(--border)",
                  fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text)",
                  lineHeight: 1.6, boxSizing: "border-box", outline: "none",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />

              {/* Suggest alternatives */}
              <div style={{ marginTop: 8 }}>
                {!suggestions && (
                  <button
                    onClick={handleSuggestPrompts}
                    disabled={suggestionsLoading}
                    style={{
                      padding: "4px 12px", borderRadius: 6, cursor: suggestionsLoading ? "default" : "pointer",
                      background: "var(--surface-r)", border: "1px solid var(--border)",
                      fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)",
                      letterSpacing: "0.06em", opacity: suggestionsLoading ? 0.6 : 1,
                    }}
                  >
                    {suggestionsLoading ? "Generating suggestions..." : "✦ Suggest 3 alternatives"}
                  </button>
                )}
                {suggestions && suggestions.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
                      letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2,
                    }}>
                      Tap to use
                    </div>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onSectionChange({ ...section, imagePrompt: s });
                          setSuggestions(null);
                        }}
                        style={{
                          padding: "7px 10px", borderRadius: 6, cursor: "pointer",
                          background: "var(--surface-r)", border: "1px solid var(--border)",
                          fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)",
                          textAlign: "left", lineHeight: 1.5, transition: "all 0.1s",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-mid)";
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                        }}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      onClick={() => setSuggestions(null)}
                      style={{
                        padding: "3px 8px", borderRadius: 5, cursor: "pointer",
                        background: "none", border: "none",
                        fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
                        alignSelf: "flex-start",
                      }}
                    >
                      ✕ dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action row: generate image + enhance body */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onGenerateImage}
            disabled={imageLoading || !section.imagePrompt?.trim()}
            style={{
              padding: "6px 16px", borderRadius: 6,
              cursor: imageLoading || !section.imagePrompt?.trim() ? "not-allowed" : "pointer",
              background: imageLoading || !section.imagePrompt?.trim() ? "var(--surface-h)" : "var(--surface-r)",
              border: "1px solid var(--border-s)",
              fontFamily: "var(--font-ui)", fontSize: 12,
              color: imageLoading || !section.imagePrompt?.trim() ? "var(--subtle)" : "var(--muted)",
              transition: "all 0.12s",
            }}
          >
            {imageLoading ? "Generating..." : hasImage ? "↺ Regenerate" : "Generate image →"}
          </button>

          {/* Enhance body button */}
          <button
            onClick={handleEnhanceBody}
            disabled={bodyEnhancing || !section.body.trim()}
            title="Enhance body copy with AI"
            style={{
              padding: "6px 12px", borderRadius: 6,
              cursor: bodyEnhancing || !section.body.trim() ? "not-allowed" : "pointer",
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 12,
              color: bodyEnhancing ? "var(--subtle)" : "var(--muted)",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all 0.12s",
              opacity: !section.body.trim() ? 0.4 : 1,
            }}
          >
            <span style={{ fontSize: 11 }}>✦</span>
            {bodyEnhancing ? "Enhancing..." : "Enhance body"}
          </button>

          {imageError && (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--error)" }}>
              {imageError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
