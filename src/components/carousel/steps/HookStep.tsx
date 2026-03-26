"use client";
import { useState } from "react";
import HookSlide from "@/components/carousel/slides/HookSlide";
import { BrandStyle, CarouselContent } from "@/lib/types";

type Props = {
  content: CarouselContent;
  selectedHook: number;
  onSelectHook: (i: number) => void;
  onNext: () => void;
  onImagePromptChange?: (prompt: string) => void;
  brandStyle?: BrandStyle | null;
  backgroundImageUrl?: string | null;
  topic?: string;
};

export default function HookStep({ content, selectedHook, onSelectHook, onNext, onImagePromptChange, brandStyle, backgroundImageUrl, topic }: Props) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [guidelines, setGuidelines] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const imagePrompt = content.imagePrompt ?? "";
  const hook = content.hooks[selectedHook];

  async function handleRegeneratePrompt() {
    setRegenerating(true);
    setRegenError(null);
    setAlternatives([]);
    try {
      const res = await fetch("/api/carousel/regenerate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          headline: hook?.headline ?? "",
          subline: hook?.subline ?? "",
          currentPrompt: imagePrompt,
          guidelines: guidelines.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setRegenError(data.error ?? "Failed to regenerate prompt");
      } else {
        onImagePromptChange?.(data.prompt);
        if (Array.isArray(data.alternatives) && data.alternatives.length > 0) {
          setAlternatives(data.alternatives);
        }
      }
    } catch {
      setRegenError("Network error — please try again");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
        Choose your hook
      </h2>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>
        Pick the opening slide that will stop the scroll.
      </p>

      <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 8, marginBottom: 36 }}>
        {content.hooks.map((h, i) => {
          const isSelected = selectedHook === i;
          return (
            <div
              key={i}
              onClick={() => { onSelectHook(i); setAlternatives([]); }}
              style={{
                flexShrink: 0,
                cursor: "pointer",
                position: "relative",
                borderRadius: 10,
                overflow: "hidden",
                outline: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                outlineOffset: 2,
                transition: "outline-color 0.15s",
                boxShadow: isSelected ? "0 0 0 6px rgba(30,122,138,0.15)" : "none",
              }}
            >
              <HookSlide headline={h.headline} subline={h.subline} topic={topic} scale={0.28} brandStyle={brandStyle ?? undefined} backgroundImageUrl={backgroundImageUrl ?? undefined} showDecoration={false} />

              {isSelected && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              <div style={{
                marginTop: 8, textAlign: "center",
                fontSize: 12, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? "var(--accent)" : "var(--muted)",
                paddingBottom: 4,
              }}>
                {isSelected ? `✓ Hook ${i + 1} selected` : `Hook ${i + 1}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image prompt — expandable */}
      <div style={{ marginBottom: 28, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <button
          onClick={() => setPromptOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface)", border: "none", padding: "10px 14px",
            fontSize: 12, fontWeight: 600, color: "var(--muted)", cursor: "pointer",
            fontFamily: "inherit", textAlign: "left",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>🎨</span>
            Hook image prompt
            <span style={{ fontWeight: 400, color: "var(--subtle)", marginLeft: 4 }}>
              — sent to Recraft V3 when you click Preview
            </span>
          </span>
          <span style={{ fontSize: 16, lineHeight: 1, transform: promptOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            ›
          </span>
        </button>

        {promptOpen && (
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, marginTop: 0 }}>
              Claude wrote this prompt for hook {selectedHook + 1}. Edit it directly, or add guidelines and regenerate.
            </p>
            <textarea
              value={imagePrompt}
              onChange={(e) => onImagePromptChange?.(e.target.value)}
              rows={4}
              placeholder="No image prompt generated yet."
              style={{
                width: "100%", fontSize: 13, lineHeight: 1.6,
                resize: "vertical", fontFamily: "inherit",
                color: imagePrompt ? "var(--text)" : "var(--subtle)",
                marginBottom: 12,
              }}
            />

            {/* Guidelines + regenerate */}
            <div style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "10px 12px",
              marginBottom: 8,
            }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: "0.06em",
                display: "block", marginBottom: 6,
              }}>
                Guidelines (optional)
              </label>
              <textarea
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                rows={2}
                placeholder="e.g. warmer tones, focus on water droplets, more abstract, moonlight scene..."
                style={{
                  width: "100%", fontSize: 12, lineHeight: 1.5,
                  resize: "vertical", fontFamily: "inherit",
                  color: "var(--text)", background: "transparent",
                  border: "none", outline: "none", padding: 0,
                }}
              />
            </div>

            {regenError && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: "0 0 8px" }}>{regenError}</p>
            )}

            <button
              onClick={handleRegeneratePrompt}
              disabled={regenerating}
              style={{
                background: regenerating ? "var(--surface)" : "var(--text)",
                color: regenerating ? "var(--muted)" : "var(--bg)",
                border: "none", borderRadius: 6,
                padding: "8px 16px", fontSize: 12, fontWeight: 700,
                fontFamily: "inherit", cursor: regenerating ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s",
              }}
            >
              {regenerating ? (
                <>
                  <span style={{
                    display: "inline-block", width: 12, height: 12,
                    border: "2px solid var(--muted)", borderTopColor: "transparent",
                    borderRadius: "50%", animation: "spin 0.7s linear infinite",
                  }} />
                  Generating 3 directions...
                </>
              ) : (
                <>↺ Generate 3 prompt directions</>
              )}
            </button>

            {/* Alternative prompt suggestions */}
            {alternatives.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "var(--muted)",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
                }}>
                  2 more directions — click to use
                </div>
                {alternatives.map((alt, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      marginBottom: 6,
                      fontSize: 12,
                      color: "var(--text)",
                      lineHeight: 1.5,
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}
                    onClick={() => onImagePromptChange?.(alt)}
                    title="Click to use this prompt"
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "var(--accent)",
                      background: "var(--accent-dim)", borderRadius: 4,
                      padding: "2px 5px", flexShrink: 0, marginTop: 1,
                      fontFamily: "var(--font-ui)",
                    }}>
                      {i + 2}
                    </span>
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        style={{
          background: "var(--text)", color: "var(--bg)",
          border: "none", borderRadius: 8,
          padding: "14px 36px", fontSize: 15, fontWeight: 700,
          fontFamily: "inherit", cursor: "pointer", letterSpacing: "-0.01em",
        }}
      >
        Preview carousel →
      </button>
    </div>
  );
}
