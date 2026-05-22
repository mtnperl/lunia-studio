"use client";
import { type ReactNode } from "react";

type Props = {
  /** Slide nodes already rendered at PREVIEW_SCALE. */
  slides: ReactNode[];
  labels: string[];
  focused: number;
  onSelect: (index: number) => void;
  /** Width of a slide node as rendered (px). */
  slideW: number;
  /** Height of a slide node as rendered (px). */
  slideH: number;
};

const RAIL_THUMB_W = 92;

/**
 * Vertical slide navigator. Each thumbnail is the real slide node scaled down,
 * so the rail always reflects live edits. Click to focus a slide in the canvas.
 */
export default function SlideRail({ slides, labels, focused, onSelect, slideW, slideH }: Props) {
  const thumbScale = RAIL_THUMB_W / slideW;
  const thumbH = Math.round(slideH * thumbScale);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {slides.map((slide, i) => {
        const active = focused === i;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            title={labels[i]}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: 6,
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              background: active ? "var(--accent-dim)" : "transparent",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <div
              style={{
                width: RAIL_THUMB_W,
                height: thumbH,
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: slideW,
                  height: slideH,
                  transform: `scale(${thumbScale})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              >
                {slide}
              </div>
            </div>
            <span
              style={{
                fontSize: 9,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: active ? "var(--accent)" : "var(--subtle)",
                textAlign: "center",
              }}
            >
              {labels[i]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
