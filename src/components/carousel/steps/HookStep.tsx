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
  const imagePrompt = content.imagePrompt ?? "";

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
        Choose your hook
      </h2>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>
        Pick the opening slide that will stop the scroll.
      </p>

      <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 8, marginBottom: 36 }}>
        {content.hooks.map((hook, i) => {
          const isSelected = selectedHook === i;
          return (
            <div
              key={i}
              onClick={() => onSelectHook(i)}
              style={{
                flexShrink: 0,
                cursor: "pointer",
                position: "relative",
                borderRadius: 10,
                overflow: "hidden",
                outline: isSelected ? "3px solid #1e7a8a" : "3px solid transparent",
                outlineOffset: 2,
                transition: "outline-color 0.15s",
                boxShadow: isSelected ? "0 0 0 6px rgba(30,122,138,0.15)" : "none",
              }}
            >
              <HookSlide headline={hook.headline} subline={hook.subline} topic={topic} scale={0.28} brandStyle={brandStyle ?? undefined} backgroundImageUrl={backgroundImageUrl ?? undefined} />

              {isSelected && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#1e7a8a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              <div style={{
                marginTop: 8, textAlign: "center",
                fontSize: 12, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? "#1e7a8a" : "var(--muted)",
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
              Claude wrote this prompt specifically for hook {selectedHook + 1}. You can edit it before generating.
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
              }}
            />
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
