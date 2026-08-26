"use client";
// Crop a picked image to the shape its block needs.
//
// Email HTML cannot crop: the renderer sets `height:auto` and shows whatever
// shape the source is, which is how a square photo and a tall portrait ended
// up side by side in one grid row with the captions unable to line up. So the
// crop is baked into a new image here, on a canvas, and uploaded.
//
// The source is loaded through the existing image proxy. Vercel Blob and fal
// are cross-origin, and drawing a cross-origin image to a canvas taints it,
// which makes toBlob throw — the proxy already exists for exactly this reason
// and already allowlists both hosts.
import { useEffect, useRef, useState } from "react";
import {
  centreCrop, clampCrop, cropToPixels, outputSize,
  zoomTo, zoomLevelOf, clampZoom, MIN_ZOOM, MAX_ZOOM,
  anchorCrop, activeAnchor, ANCHORS, type AspectRatio,
} from "@/lib/image-crop";
import type { ImageCrop } from "@/lib/types";
import { Spinner } from "./Loaders";

/** Same-origin URL for a source we need to read pixels from. */
export function proxied(url: string): string {
  if (!url) return url;
  if (url.startsWith("/") || url.startsWith("data:")) return url;
  return `/api/carousel/image-proxy?url=${encodeURIComponent(url)}`;
}

/** Load an image we are allowed to read back. */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load that image"));
    img.src = proxied(url);
  });
}

/** Crop `sourceUrl` to `crop` at `aspect` and upload it. Returns the new URL. */
export async function renderCrop(sourceUrl: string, crop: ImageCrop, aspect: AspectRatio): Promise<string> {
  const img = await loadImage(sourceUrl);
  const { width, height } = outputSize(aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const { sx, sy, sWidth, sHeight } = cropToPixels(crop, img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
  if (!blob) throw new Error("Could not encode the crop");

  // Same endpoint the manual upload uses: lands under temp/ and is swept, so a
  // crop nobody keeps does not accumulate in Blob storage.
  const body = new FormData();
  body.append("file", new File([blob], "crop.jpg", { type: "image/jpeg" }));
  const res = await fetch("/api/campaign/upload-temp-image", { method: "POST", body });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

/** One press of − or +. A quarter of a step is fine enough to frame with and
 *  coarse enough that reaching 5x does not take twenty clicks. */
const ZOOM_STEP = 0.25;

export default function ImageCropper({
  sourceUrl,
  aspect,
  initialCrop,
  onCancel,
  onApply,
}: {
  sourceUrl: string;
  aspect: AspectRatio;
  initialCrop?: ImageCrop;
  onCancel: () => void;
  onApply: (result: { url: string; crop: ImageCrop; sourceUrl: string }) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<ImageCrop | null>(initialCrop ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The largest region of the right aspect that fits — what you see before
   *  touching anything, and the yardstick the zoom level is measured against. */
  const base = img ? centreCrop(img.naturalWidth, img.naturalHeight, aspect) : null;
  const level = base && crop ? zoomLevelOf(base, crop) : MIN_ZOOM;
  const anchor = crop ? activeAnchor(crop) : null;
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; crop: ImageCrop } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    loadImage(sourceUrl)
      .then((loaded) => {
        if (cancelled) return;
        setImg(loaded);
        // Only default the crop if we were not handed one — reopening the
        // editor must show the crop you last applied, not recentre it.
        setCrop((c) => c ?? centreCrop(loaded.naturalWidth, loaded.naturalHeight, aspect));
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load that image"); });
    return () => { cancelled = true; };
  }, [sourceUrl, aspect]);

  /** Pan. Movement is converted from screen px to source fractions through the
   *  displayed size, so dragging tracks the cursor at any zoom. */
  function onPointerDown(e: React.PointerEvent) {
    if (!crop) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, crop };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const frame = frameRef.current;
    if (!d || !frame) return;
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Dragging right should reveal what is to the LEFT, so the region moves
    // against the cursor.
    const dx = ((e.clientX - d.x) / rect.width) * d.crop.w;
    const dy = ((e.clientY - d.y) / rect.height) * d.crop.h;
    setCrop(clampCrop({ ...d.crop, x: d.crop.x - dx, y: d.crop.y - dy }));
  }
  function endDrag() { drag.current = null; }

  async function apply() {
    if (!crop || busy) return;
    setBusy(true);
    setError(null);
    try {
      const url = await renderCrop(sourceUrl, crop, aspect);
      onApply({ url, crop, sourceUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the crop");
    } finally {
      setBusy(false);
    }
  }

  // The visible frame is the TARGET shape; the source is scaled and offset
  // inside it so the kept region exactly fills it.
  const inner: React.CSSProperties = crop
    ? {
        position: "absolute",
        width: `${100 / crop.w}%`,
        height: `${100 / crop.h}%`,
        left: `${(-crop.x / crop.w) * 100}%`,
        top: `${(-crop.y / crop.h) * 100}%`,
        objectFit: "fill",
      }
    : {};

  const btn: React.CSSProperties = {
    padding: "5px 9px", borderRadius: 5, fontSize: 11, fontFamily: "inherit", cursor: "pointer",
    border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
  };

  return (
    <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Crop — drag to move, slider to zoom
        </span>
        <button onClick={onCancel} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {error && <div style={{ fontSize: 11, color: "var(--error)" }}>{error}</div>}
        {!img && !error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
            <Spinner size={13} /> Loading image…
          </div>
        )}

        {img && crop && base && (
          <>
            <div
              ref={frameRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                position: "relative", width: "100%", aspectRatio: String(aspect),
                overflow: "hidden", borderRadius: 6, border: "1px solid var(--border)",
                cursor: drag.current ? "grabbing" : "grab", touchAction: "none",
                background: "var(--surface)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proxied(sourceUrl)} alt="" draggable={false} style={inner} />
            </div>

            {/* Zoom is a LEVEL against the base region, not the region's own
                size. Reading min(w,h) meant a 1024x1536 source opened at 33 of
                100 with the bottom third unreachable, and every drag into it
                snapped the thumb back out from under the cursor. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)" }}>
              <span>Zoom</span>
              <button
                type="button"
                style={{ ...btn, minWidth: 26, padding: "3px 0", fontSize: 13, lineHeight: 1 }}
                onClick={() => setCrop(zoomTo(base, crop, level - ZOOM_STEP))}
                disabled={level <= MIN_ZOOM + 1e-6}
                title="Zoom out"
                aria-label="Zoom out"
              >−</button>
              <input
                type="range"
                min={MIN_ZOOM * 100}
                max={MAX_ZOOM * 100}
                value={Math.round(level * 100)}
                onChange={(e) => setCrop(zoomTo(base, crop, Number(e.target.value) / 100))}
                style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
                aria-label="Zoom"
              />
              <button
                type="button"
                style={{ ...btn, minWidth: 26, padding: "3px 0", fontSize: 13, lineHeight: 1 }}
                onClick={() => setCrop(zoomTo(base, crop, level + ZOOM_STEP))}
                disabled={level >= MAX_ZOOM - 1e-6}
                title="Zoom in"
                aria-label="Zoom in"
              >+</button>
              <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>
                {level.toFixed(1)}×
              </span>
              <button
                type="button"
                style={btn}
                onClick={() => setCrop(base)}
                title="Back to the full centred crop"
              >Reset</button>
            </div>

            {/* Which part of the picture ends up in the middle. Dragging does
                this too, but on an axis with no slack — a portrait cropped
                square has no horizontal play — dragging silently does nothing,
                and "the subject is at the top" is a thing you know before you
                start nudging. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Focus</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 22px)", gridTemplateRows: "repeat(3, 22px)", gap: 2 }}>
                {ANCHORS.map((a) => {
                  const on = !!anchor && anchor.x === a.x && anchor.y === a.y;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => setCrop(anchorCrop(crop, a.x, a.y))}
                      title={a.label}
                      aria-label={a.label}
                      aria-pressed={on}
                      style={{
                        padding: 0, borderRadius: 4, cursor: "pointer",
                        border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                        background: on ? "var(--accent-dim)" : "var(--bg)",
                      }}
                    >
                      <span style={{
                        display: "block", width: 5, height: 5, borderRadius: 1, margin: "0 auto",
                        background: on ? "var(--accent)" : "var(--subtle)",
                      }} />
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
                or drag the picture
              </span>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={apply} disabled={busy}
                style={{ ...btn, opacity: busy ? 0.5 : 1, cursor: busy ? "wait" : "pointer", fontWeight: 600 }}>
                {busy && <Spinner size={9} color="var(--text)" />}
                {busy ? " Saving…" : "Apply crop"}
              </button>
              <button type="button" onClick={onCancel} style={btn}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
