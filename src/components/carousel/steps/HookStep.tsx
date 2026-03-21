"use client";
import HookSlide from "@/components/carousel/slides/HookSlide";
import { CarouselContent, GraphicStyle } from "@/lib/types";

const GRAPHIC_STYLES: { key: GraphicStyle; label: string }[] = [
  { key: "wave", label: "Wave" },
  { key: "dotchain", label: "Timeline" },
  { key: "bars", label: "Bars" },
  { key: "steps", label: "Steps" },
  { key: "stat", label: "Stat" },
  { key: "iconGrid", label: "Icons" },
  { key: "textOnly", label: "Text" },
];

type Props = {
  variants: CarouselContent[];
  selectedVariant: number;
  onSelectVariant: (i: number) => void;
  content: CarouselContent;
  selectedHook: number;
  graphicStyles: [GraphicStyle, GraphicStyle, GraphicStyle];
  onSelectHook: (i: number) => void;
  onSelectStyle: (slideIdx: number, style: GraphicStyle) => void;
  onNext: () => void;
};

export default function HookStep({
  content,
  selectedHook,
  graphicStyles,
  onSelectHook,
  onSelectStyle,
  onNext,
}: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
        Choose hook + graphics
      </h2>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>
        Pick a hook slide, then set graphic styles for each content slide.
      </p>

      {/* Hook picker */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
          Select a hook — click to choose
        </div>
        <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 8 }}>
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
                <HookSlide headline={hook.headline} subline={hook.subline} scale={0.28} />

                {/* Selected overlay badge */}
                {isSelected && (
                  <div style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#1e7a8a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Hook number + selected label */}
                <div style={{
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#1e7a8a" : "var(--muted)",
                  paddingBottom: 4,
                }}>
                  {isSelected ? "✓ Hook " + (i + 1) + " selected" : `Hook ${i + 1}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graphic style picker */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Graphic style per slide</div>
        {content.slides.map((slide, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Slide {i + 2}: {slide.headline}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {GRAPHIC_STYLES.map((gs) => (
                <button
                  key={gs.key}
                  onClick={() => onSelectStyle(i, gs.key)}
                  style={{
                    padding: "7px 14px",
                    border: `1.5px solid ${graphicStyles[i] === gs.key ? "var(--text)" : "var(--border)"}`,
                    background: graphicStyles[i] === gs.key ? "var(--surface)" : "var(--bg)",
                    color: graphicStyles[i] === gs.key ? "var(--text)" : "var(--muted)",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {gs.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        style={{
          background: "var(--text)",
          color: "var(--bg)",
          border: "none",
          borderRadius: 8,
          padding: "14px 36px",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: "pointer",
          letterSpacing: "-0.01em",
        }}
      >
        Preview carousel →
      </button>
    </div>
  );
}
