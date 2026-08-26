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
  centreCrop, clampCrop, zoomCrop, cropToPixels, outputSize, type AspectRatio,
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

        {img && crop && (
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

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)" }}>
              Zoom
              <input
                type="range"
                min={0}
                max={100}
                // The slider is a POSITION, not a delta: it maps to how much of
                // the source is kept, so dragging it back and forth is stable
                // rather than drifting the way repeated multiplication does.
                value={Math.round((1 - Math.min(crop.w, crop.h)) * 100)}
                onChange={(e) => {
                  const want = 1 - Number(e.target.value) / 100;
                  const now = Math.min(crop.w, crop.h);
                  if (now <= 0) return;
                  setCrop(zoomCrop(crop, Math.max(0.05, want) / now));
                }}
                style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
              />
              <button
                type="button"
                style={btn}
                onClick={() => setCrop(centreCrop(img.naturalWidth, img.naturalHeight, aspect))}
                title="Back to the full centred crop"
              >Reset</button>
            </label>

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
