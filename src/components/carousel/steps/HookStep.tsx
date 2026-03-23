"use client";
import HookSlide from "@/components/carousel/slides/HookSlide";
import { BrandStyle, CarouselContent } from "@/lib/types";

type Props = {
  content: CarouselContent;
  selectedHook: number;
  onSelectHook: (i: number) => void;
  onNext: () => void;
  brandStyle?: BrandStyle | null;
  backgroundImageUrl?: string | null;
};

export default function HookStep({ content, selectedHook, onSelectHook, onNext, brandStyle, backgroundImageUrl }: Props) {
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
              <HookSlide headline={hook.headline} subline={hook.subline} scale={0.28} brandStyle={brandStyle ?? undefined} backgroundImageUrl={backgroundImageUrl ?? undefined} />

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
