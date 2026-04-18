"use client";
// AdCanvas — renders the generated image with the overlay text burned in.
// Sized to 1080×1080 (1:1) or 1080×1350 (4:5) at scale=1 for export; shrink
// via the `scale` prop for preview thumbnails. Matches the carousel pattern of
// rendering at native pixel dimensions, transformed via CSS for UI.

import type { AdConcept } from "@/lib/types";

type Aspect = "1:1" | "4:5";

type Props = {
  imageUrl: string | null;
  concept: AdConcept;
  aspect: Aspect;
  scale?: number;          // 1 = export resolution; < 1 for preview
  isFalImage?: boolean;    // true → route through /api/ad/image-proxy
  showOverlay?: boolean;   // defaults true
};

function proxy(url: string | null | undefined, active: boolean): string | undefined {
  if (!url) return undefined;
  if (!active) return url;
  if (url.startsWith("/") || url.includes("vercel-storage.com")) return url;
  return `/api/ad/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function AdCanvas({
  imageUrl,
  concept,
  aspect,
  scale = 1,
  isFalImage = false,
  showOverlay = true,
}: Props) {
  const W = 1080;
  const H = aspect === "1:1" ? 1080 : 1350;

  // Overlay sits bottom-left with a subtle scrim for legibility. 3–7 word cap is
  // enforced upstream in the concept; we just render whatever we're given.
  const overlay = concept.overlayText?.trim();

  return (
    <div
      style={{
        width: W * scale,
        height: H * scale,
        overflow: "hidden",
        position: "relative",
        background: "#0D0C0A",
      }}
    >
      <div
        style={{
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxy(imageUrl, isFalImage)}
            alt=""
            crossOrigin="anonymous"
            style={{ width: W, height: H, objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: W, height: H, background: "#1a1a2e" }} />
        )}

        {/* Bottom scrim — earns legibility without darkening the product */}
        {showOverlay && overlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.30) 28%, rgba(0,0,0,0) 55%)",
              pointerEvents: "none",
            }}
          />
        )}

        {showOverlay && overlay && (
          <div
            style={{
              position: "absolute",
              left: 64,
              right: 64,
              bottom: 72,
              color: "#ffffff",
              fontFamily:
                "Helvetica, 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 700,
              fontSize: aspect === "1:1" ? 80 : 92,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              textShadow: "0 2px 18px rgba(0,0,0,0.55)",
              margin: 0,
            }}
          >
            {overlay}
          </div>
        )}
      </div>
    </div>
  );
}
