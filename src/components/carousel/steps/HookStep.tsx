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
  content: CarouselContent;
  selectedHook: number;
  graphicStyles: [GraphicStyle, GraphicStyle, GraphicStyle];
  onSelectHook: (i: number) => void;
  onSelectStyle: (slideIdx: number, style: GraphicStyle) => void;
  onNext: () => void;
};

export default function HookStep({ content, selectedHook, graphicStyles, onSelectHook, onSelectStyle, onNext }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1e7a8a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Choose hook + graphics</h2>
      <p style={{ color: "#4a5568", marginBottom: 32, fontSize: 16 }}>Pick your hook, then a graphic style for each slide.</p>

      {/* Hook picker */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Select a hook</div>
        <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 8 }}>
          {content.hooks.map((hook, i) => (
            <div
              key={i}
              onClick={() => onSelectHook(i)}
              style={{
                flexShrink: 0,
                cursor: "pointer",
                border: `3px solid ${selectedHook === i ? "#1e7a8a" : "transparent"}`,
                borderRadius: 8,
                overflow: "hidden",
                transition: "border-color 0.15s",
              }}
            >
              <HookSlide headline={hook.headline} subline={hook.subline} scale={0.26} />
            </div>
          ))}
        </div>
      </div>

      {/* Graphic style picker */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Graphic style per slide</div>
        {content.slides.map((slide, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2535", marginBottom: 12 }}>
              Slide {i + 2}: {slide.headline}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {GRAPHIC_STYLES.map((gs) => (
                <button
                  key={gs.key}
                  onClick={() => onSelectStyle(i, gs.key)}
                  style={{
                    padding: "8px 16px",
                    border: `2px solid ${graphicStyles[i] === gs.key ? "#1e7a8a" : "#e2e8f0"}`,
                    background: graphicStyles[i] === gs.key ? "#f0f9fa" : "#ffffff",
                    color: graphicStyles[i] === gs.key ? "#1e7a8a" : "#4a5568",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "Outfit, sans-serif",
                    cursor: "pointer",
                    transition: "all 0.15s",
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
        style={{ background: "#1e7a8a", color: "#ffffff", border: "none", borderRadius: 10, padding: "16px 40px", fontSize: 16, fontWeight: 600, fontFamily: "Outfit, sans-serif", cursor: "pointer", letterSpacing: "0.05em" }}
      >
        Generate carousel →
      </button>
    </div>
  );
}
