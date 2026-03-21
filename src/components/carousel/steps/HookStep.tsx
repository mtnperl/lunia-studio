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
  variants,
  selectedVariant,
  onSelectVariant,
  content,
  selectedHook,
  graphicStyles,
  onSelectHook,
  onSelectStyle,
  onNext,
}: Props) {
  const showVariantPicker = variants.length > 1;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
        {showVariantPicker ? "Compare variants & choose hook" : "Choose hook + graphics"}
      </h2>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>
        {showVariantPicker
          ? "Pick your favourite variant, then choose a hook and graphic style."
          : "Pick your hook, then a graphic style for each slide."}
      </p>

      {/* Variant picker */}
      {showVariantPicker && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Select a variant ({variants.length} generated)
          </div>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {variants.map((v, i) => (
              <div
                key={i}
                onClick={() => onSelectVariant(i)}
                style={{
                  flexShrink: 0,
                  cursor: "pointer",
                  border: `2px solid ${selectedVariant === i ? "var(--text)" : "var(--border)"}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "border-color 0.12s",
                  background: selectedVariant === i ? "var(--surface)" : "var(--bg)",
                }}
              >
                <div style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                  Variant {i + 1}
                </div>
                <div style={{ padding: 8 }}>
                  <HookSlide headline={v.hooks[0].headline} subline={v.hooks[0].subline} scale={0.22} />
                </div>
                <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--muted)", borderTop: "1px solid var(--border)", lineHeight: 1.4 }}>
                  {v.hooks[0].subline}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hook picker */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          {showVariantPicker ? "Hook for selected variant" : "Select a hook"}
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
          {content.hooks.map((hook, i) => (
            <div
              key={i}
              onClick={() => onSelectHook(i)}
              style={{
                flexShrink: 0,
                cursor: "pointer",
                border: `2px solid ${selectedHook === i ? "var(--text)" : "transparent"}`,
                borderRadius: 8,
                overflow: "hidden",
                transition: "border-color 0.12s",
              }}
            >
              <HookSlide headline={hook.headline} subline={hook.subline} scale={0.26} />
            </div>
          ))}
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
