"use client";
// Two controls every picture in the editor shares.
//
// SwapStrip: the library, ranked for this picture's copy, one click from the
// picture itself. Trying an image used to mean Images tab → Assets tab →
// folder → find → click, and the tab forgot the folder after every pick, so
// comparing three candidates cost a dozen clicks. Here it is one click, or an
// arrow key, per try.
//
// ShapePicker: the shape the picture is cropped to. Email HTML cannot crop, so
// the shape is baked in by useShapedPick; this only chooses it.
import { useMemo, useRef, useState } from "react";
import type { AssetMetadata } from "@/lib/types";
import { rankByOverlap } from "@/lib/asset-shortlist";
import { hasBakedText } from "@/lib/asset-baked-text";
import { useAssets } from "./useAssets";

/** Never a picture in an email body. */
const HIDDEN_TYPES = new Set(["logo", "carousel-style"]);
/** A strip, not a gallery: past this, search is the faster way in. */
const STRIP_LIMIT = 60;

export function SwapStrip({
  currentUrl,
  copy,
  exclude,
  onPick,
}: {
  /** The picture in place now, as its library url (the crop's source). */
  currentUrl?: string;
  /** The words this picture sits beside; ranks the strip. */
  copy: string;
  /** Pictures already elsewhere in this email. */
  exclude?: string[];
  onPick: (asset: AssetMetadata) => void;
}) {
  const assets = useAssets();
  const [query, setQuery] = useState("");
  const rowRef = useRef<HTMLDivElement | null>(null);

  const list = useMemo(() => {
    if (!assets) return [];
    const usable = assets.filter((a) => a.url && !HIDDEN_TYPES.has(a.assetType));
    const q = query.trim().toLowerCase();
    if (q) {
      // A search is a deliberate ask, so it reaches everything, baked-in text included.
      return usable
        .filter((a) => `${a.name} ${a.assetType} ${a.description ?? ""}`.toLowerCase().includes(q))
        .slice(0, STRIP_LIMIT);
    }
    const skip = new Set(exclude);
    if (currentUrl) skip.delete(currentUrl);
    const pool = usable.filter((a) => !skip.has(a.url) && !hasBakedText(a));
    return rankByOverlap(pool, (a) => `${a.name} ${a.description ?? ""}`, copy, (a) => a.assetType).slice(0, STRIP_LIMIT);
  }, [assets, query, copy, exclude, currentUrl]);

  function step(dir: 1 | -1) {
    if (list.length === 0) return;
    const at = list.findIndex((a) => a.url === currentUrl);
    const next = list[(at + dir + list.length) % list.length]!;
    onPick(next);
    rowRef.current
      ?.querySelector(`[data-asset="${CSS.escape(next.id)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
          Swap
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the library"
          aria-label="Search the library"
          style={{
            flex: 1, minWidth: 0, padding: "4px 8px", borderRadius: 5, fontSize: 11,
            border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit",
          }}
        />
        <span style={{ fontSize: 10, color: "var(--subtle)", whiteSpace: "nowrap" }} title="Click the strip, then use the arrow keys">← → to flick</span>
      </div>
      {!assets && <div style={{ fontSize: 11, color: "var(--muted)" }}>Loading the library…</div>}
      {assets && list.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{query.trim() ? `Nothing matches "${query.trim()}".` : "No library pictures left to try."}</div>
      )}
      {list.length > 0 && (
        <div
          ref={rowRef}
          role="listbox"
          aria-label="Library pictures"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
          }}
          style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4, outline: "none" }}
        >
          {list.map((a) => {
            const on = a.url === currentUrl;
            return (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={on}
                data-asset={a.id}
                onClick={() => onPick(a)}
                title={[a.name, a.description].filter(Boolean).join("\n\n")}
                style={{
                  flex: "0 0 auto", width: 56, height: 56, padding: 0, borderRadius: 5, overflow: "hidden",
                  border: on ? "2px solid var(--accent)" : "1px solid var(--border)",
                  background: "var(--bg)", cursor: "pointer",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type PictureShape = "1:1" | "4:5" | "16:9";

const SHAPES: { key: PictureShape; label: string }[] = [
  { key: "1:1", label: "Square" },
  { key: "4:5", label: "4:5" },
  { key: "16:9", label: "16:9" },
];

export function ShapePicker({ value, onChange }: { value: PictureShape; onChange: (shape: PictureShape) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Shape</span>
      <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 5, overflow: "hidden", background: "var(--bg)" }}>
        {SHAPES.map((s, i) => {
          const on = value === s.key;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => { if (!on) onChange(s.key); }}
              title={`Crop to ${s.label}`}
              style={{
                padding: "3px 9px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", lineHeight: 1.6,
                border: "none", borderRight: i === SHAPES.length - 1 ? "none" : "1px solid var(--border)",
                background: on ? "var(--accent-dim)" : "transparent",
                color: on ? "var(--text)" : "var(--muted)", cursor: "pointer",
              }}
            >{s.label}</button>
          );
        })}
      </div>
    </div>
  );
}
