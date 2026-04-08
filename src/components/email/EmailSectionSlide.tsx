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
  onSectionChange: (updated: EmailSection) => void;
  onGenerateImage: () => void;
  imageLoading: boolean;
  imageError: string | null;
};

export function EmailSectionSlide({
  section,
  onSectionChange,
  onGenerateImage,
  imageLoading,
  imageError,
}: Props) {
  const [promptOpen, setPromptOpen] = useState(false);
  const hasImage = !!section.imageUrl;
  const style = section.imageStyle ?? "realistic";

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid var(--border)",
      background: "var(--surface)",
      overflow: "hidden",
    }}>
      {/* Image area + text overlay */}
      <div style={{ position: "relative", height: 220 }}>
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.imageUrl}
              alt=""
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Text overlay on image */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "rgba(0,0,0,0.52)",
              padding: "12px 14px",
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
                    color: "#fff", lineHeight: 1.4, marginBottom: 4,
                    boxSizing: "border-box",
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
                  color: "rgba(255,255,255,0.88)", lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Placeholder */}
            <div style={{
              position: "absolute", inset: 0,
              background: "var(--surface-r)",
              border: "2px dashed var(--border-s)",
              borderRadius: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--subtle)", letterSpacing: "0.08em" }}>
                No image yet
              </span>
            </div>
            {/* Text below placeholder */}
          </>
        )}
      </div>

      {/* Text fields when no image */}
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
                color: "var(--text)", lineHeight: 1.4, marginBottom: 6,
                boxSizing: "border-box",
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
              color: "var(--muted)", lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Controls bar */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Image style chips */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 4 }}>
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
            <span style={{ transform: promptOpen ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.15s" }}>›</span>
            Prompt
          </button>
          {promptOpen && (
            <textarea
              value={section.imagePrompt ?? ""}
              onChange={e => onSectionChange({ ...section, imagePrompt: e.target.value })}
              rows={3}
              placeholder="Image prompt (edit before generating)..."
              style={{
                marginTop: 6, width: "100%", resize: "vertical",
                padding: "8px 10px", borderRadius: 6,
                background: "var(--surface-r)", border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text)",
                lineHeight: 1.6, boxSizing: "border-box", outline: "none",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--accent)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          )}
        </div>

        {/* Generate button + error */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onGenerateImage}
            disabled={imageLoading}
            style={{
              padding: "6px 16px", borderRadius: 6, cursor: imageLoading ? "not-allowed" : "pointer",
              background: imageLoading ? "var(--surface-h)" : "var(--surface-r)",
              border: "1px solid var(--border-s)",
              fontFamily: "var(--font-ui)", fontSize: 12,
              color: imageLoading ? "var(--subtle)" : "var(--muted)",
              transition: "all 0.12s",
            }}
          >
            {imageLoading ? "Generating..." : hasImage ? "↺ Regenerate" : "Generate image →"}
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
