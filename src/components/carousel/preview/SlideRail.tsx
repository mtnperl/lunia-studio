"use client";
import { useRef, useState, type ReactNode } from "react";

type Props = {
  /** Thumbnail width in px. The editor rail passes what fits. */
  thumbW?: number;
  /** Slide nodes already rendered at PREVIEW_SCALE. */
  slides: ReactNode[];
  labels: string[];
  focused: number;
  onSelect: (index: number) => void;
  /** Width of a slide node as rendered (px). */
  slideW: number;
  /** Height of a slide node as rendered (px). */
  slideH: number;
  /** Which slides can be dragged, and dropped onto. The hook and the close
   *  stay put, so the editor passes content slides only. */
  canReorder?: (index: number) => boolean;
  /** Drag-and-drop finished: move the slide at `from` to `to` (rail indices). */
  onReorder?: (from: number, to: number) => void;
  /** Controls drawn under a thumbnail (move, duplicate, delete). */
  actions?: (index: number) => ReactNode;
};

const RAIL_THUMB_W = 92;

/**
 * Vertical slide navigator. Each thumbnail is the real slide node scaled down,
 * so the rail always reflects live edits. Click to focus a slide in the canvas;
 * drag a content slide onto another to reorder.
 */
export default function SlideRail({ slides, labels, focused, onSelect, slideW, slideH, thumbW = RAIL_THUMB_W, canReorder, onReorder, actions }: Props) {
  const thumbScale = thumbW / slideW;
  const thumbH = Math.round(slideH * thumbScale);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  // Read by dragover/drop, which can fire before the state above re-renders.
  const dragFromRef = useRef<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const reorderable = (i: number) => !!onReorder && !!canReorder?.(i);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {slides.map((slide, i) => {
        const active = focused === i;
        const dropTarget = dragFrom !== null && dropAt === i && dragFrom !== i;
        return (
          <div
            key={i}
            draggable={reorderable(i)}
            onDragStart={(e) => {
              if (!reorderable(i)) return;
              dragFromRef.current = i;
              setDragFrom(i);
              e.dataTransfer.effectAllowed = "move";
              // Firefox won't start a drag without data.
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              if (dragFromRef.current === null || !reorderable(i)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dropAt !== i) setDropAt(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragFromRef.current;
              if (from !== null && reorderable(i) && from !== i) onReorder?.(from, i);
              dragFromRef.current = null;
              setDragFrom(null);
              setDropAt(null);
            }}
            onDragEnd={() => { dragFromRef.current = null; setDragFrom(null); setDropAt(null); }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: 6,
              border: `1px solid ${dropTarget || active ? "var(--accent)" : "var(--border)"}`,
              background: dropTarget ? "var(--accent-mid)" : active ? "var(--accent-dim)" : "transparent",
              borderRadius: 8,
              opacity: dragFrom === i ? 0.45 : 1,
              cursor: reorderable(i) ? "grab" : undefined,
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(i)}
              title={reorderable(i) ? `${labels[i]} · drag to reorder` : labels[i]}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: thumbW,
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
                  width: "100%",
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
            {actions?.(i)}
          </div>
        );
      })}
    </div>
  );
}
