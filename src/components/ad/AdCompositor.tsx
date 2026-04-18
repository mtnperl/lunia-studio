"use client";
/**
 * AdCompositor — the programmatic canvas for Framework #4.
 *
 * Renders a composited Meta ad as a DOM element (not an HTML canvas):
 *   1. Background image (AI-generated, no product, no text)
 *   2. Product image (user-uploaded BrandAsset, positioned by brief.composition)
 *   3. Typography block (overlay + headline, positioned by brief.composition)
 *   4. Logo (bottom-right, small watermark)
 *   5. Accent element (thin aqua rule or yellow dot, or none)
 *
 * Scaled for display via CSS transform; exported to PNG via html-to-image.
 *
 * Brand color tokens (hard-coded — never pull from CSS vars in this component
 * because html-to-image cannot resolve CSS custom properties reliably):
 *   Navy   #102635  Slate  #2c3f51  Ivory  #F7F4EF
 *   Aqua   #bffbf8  Yellow #ffd800
 */

import { forwardRef, useMemo } from "react";
import type { AdBrief, AdComposition } from "@/lib/ad-brief";
import {
  CANVAS_DIMS,
  CANVAS_MARGIN,
  BRAND_COLORS,
  LOGO_SPEC,
  ACCENT_SPECS,
  isDarkTone,
  getTypeLayers,
  type AdAspectKey,
  type BackgroundTone,
} from "@/lib/ad-typography";

// ─── Props ────────────────────────────────────────────────────────────────────

export type AdCompositorProps = {
  brief: AdBrief;
  backgroundImageUrl?: string | null;    // AI-generated background
  productAssetUrl?: string | null;       // BrandAsset URL for the product
  logoAssetUrl?: string | null;          // BrandAsset URL for the logo
  aspect: AdAspectKey;
  /** Display scale — compositor renders at full resolution then CSS-scales to fit container */
  displayWidth: number;
};

// ─── Positioning helpers ───────────────────────────────────────────────────────

function productStyle(
  anchor: AdComposition["productAnchor"],
  scale: number,
  canvasH: number,
): React.CSSProperties {
  const h = Math.round(canvasH * scale);
  const base: React.CSSProperties = {
    position: "absolute",
    height: h,
    width: "auto",
    objectFit: "contain",
  };
  switch (anchor) {
    case "center":
      return { ...base, top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
    case "right":
      return { ...base, top: "50%", right: CANVAS_MARGIN, transform: "translateY(-50%)" };
    case "left":
      return { ...base, top: "50%", left: CANVAS_MARGIN, transform: "translateY(-50%)" };
    case "bottom-right":
      return { ...base, bottom: CANVAS_MARGIN, right: CANVAS_MARGIN };
    case "bottom-left":
      return { ...base, bottom: CANVAS_MARGIN, left: CANVAS_MARGIN };
    case "bottom-center":
      return { ...base, bottom: CANVAS_MARGIN, left: "50%", transform: "translateX(-50%)" };
  }
}

function textBlockStyle(
  anchor: AdComposition["textAnchor"],
  canvasW: number,
): React.CSSProperties {
  const third = Math.round(canvasW / 3) - Math.round(CANVAS_MARGIN * 1.5);
  const base: React.CSSProperties = {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  };
  switch (anchor) {
    case "top":
      return { ...base, top: CANVAS_MARGIN, left: CANVAS_MARGIN, right: CANVAS_MARGIN };
    case "bottom":
      return { ...base, bottom: CANVAS_MARGIN, left: CANVAS_MARGIN, right: CANVAS_MARGIN };
    case "left-third":
      return { ...base, top: "50%", left: CANVAS_MARGIN, width: third, transform: "translateY(-50%)" };
    case "right-third":
      return { ...base, top: "50%", right: CANVAS_MARGIN, width: third, transform: "translateY(-50%)", alignItems: "flex-end" };
    case "top-left":
      return { ...base, top: CANVAS_MARGIN, left: CANVAS_MARGIN, maxWidth: Math.round(canvasW * 0.65) };
    case "top-right":
      return { ...base, top: CANVAS_MARGIN, right: CANVAS_MARGIN, maxWidth: Math.round(canvasW * 0.65), alignItems: "flex-end" };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccentMark({
  type,
  onDark,
}: {
  type: AdComposition["accentElement"];
  onDark: boolean;
}) {
  if (type === "none") return null;
  const spec = ACCENT_SPECS[type];
  if (!spec) return null;

  if (type === "aqua-rule") {
    return (
      <div
        style={{
          width: (spec as typeof ACCENT_SPECS["aqua-rule"]).width,
          height: (spec as typeof ACCENT_SPECS["aqua-rule"]).thickness,
          background: BRAND_COLORS.aqua,
        }}
      />
    );
  }
  // yellow-dot
  const r = (spec as typeof ACCENT_SPECS["yellow-dot"]).radius;
  return (
    <div
      style={{
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: onDark ? BRAND_COLORS.yellow : BRAND_COLORS.yellow,
      }}
    />
  );
}

// ─── Main Compositor ──────────────────────────────────────────────────────────

const AdCompositor = forwardRef<HTMLDivElement, AdCompositorProps>(
  function AdCompositor(
    { brief, backgroundImageUrl, productAssetUrl, logoAssetUrl, aspect, displayWidth },
    ref,
  ) {
    const dims = CANVAS_DIMS[aspect];
    const scale = displayWidth / dims.w;
    const layers = useMemo(() => getTypeLayers(aspect), [aspect]);

    const composition = brief.composition;
    const bgTone = composition.backgroundTone as BackgroundTone;
    const dark = isDarkTone(bgTone);
    const bgFallback = bgTone === "dark-navy" ? BRAND_COLORS.navy
      : bgTone === "mid-slate" ? BRAND_COLORS.slate
      : BRAND_COLORS.ivory;

    const textColor = (onDark: boolean, layer: "headline" | "caption" | "overlay" | "tag") =>
      onDark ? layers[layer].colorOnDark : layers[layer].colorOnLight;

    // Scrim — semi-transparent overlay behind the text block for legibility
    // on complex backgrounds. Very subtle.
    const scrimColor = dark
      ? "rgba(16,38,53,0.55)"    // navy scrim on dark
      : "rgba(247,244,239,0.72)"; // ivory scrim on light

    return (
      /* Outer wrapper — sets the display dimensions */
      <div
        style={{
          width: displayWidth,
          height: Math.round(dims.h * scale),
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Inner canvas — full resolution, CSS-scaled */}
        <div
          ref={ref}
          style={{
            width: dims.w,
            height: dims.h,
            position: "relative",
            overflow: "hidden",
            background: bgFallback,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          {/* 1. Background image */}
          {backgroundImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backgroundImageUrl}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }}
            />
          )}

          {/* 2. Product image */}
          {productAssetUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={productAssetUrl}
              alt=""
              crossOrigin="anonymous"
              style={productStyle(composition.productAnchor, composition.productScale, dims.h)}
            />
          )}

          {/* 3. Typography block */}
          <div style={textBlockStyle(composition.textAnchor, dims.w)}>
            {/* Scrim card behind the text */}
            <div
              style={{
                position: "absolute",
                inset: -CANVAS_MARGIN / 2,
                background: scrimColor,
                backdropFilter: "blur(0px)",
                borderRadius: 4,
                zIndex: 0,
              }}
            />

            {/* Content — sits above the scrim */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Tag / credential — mono, small, spaced */}
              <div
                style={{
                  fontFamily: layers.tag.family,
                  fontSize: layers.tag.size,
                  lineHeight: `${layers.tag.leading}px`,
                  fontWeight: layers.tag.weight,
                  letterSpacing: `${layers.tag.tracking}em`,
                  color: textColor(dark, "tag"),
                  textTransform: "uppercase",
                }}
              >
                {/* Auto-derive a tag from proof points based on angle */}
                {angleToTag(brief.angle)}
              </div>

              {/* Accent mark */}
              <AccentMark type={composition.accentElement} onDark={dark} />

              {/* Headline — Cormorant Garamond, display serif */}
              <div
                style={{
                  fontFamily: layers.headline.family,
                  fontSize: layers.headline.size,
                  lineHeight: `${layers.headline.leading}px`,
                  fontWeight: layers.headline.weight,
                  letterSpacing: `${layers.headline.tracking}em`,
                  color: textColor(dark, "headline"),
                  maxWidth: `${Math.round(layers.headline.maxWidthFraction * dims.w)}px`,
                }}
              >
                {brief.copy.headline}
              </div>

              {/* Overlay text — Inter bold, the scroll-stopper */}
              <div
                style={{
                  fontFamily: layers.overlay.family,
                  fontSize: layers.overlay.size,
                  lineHeight: `${layers.overlay.leading}px`,
                  fontWeight: layers.overlay.weight,
                  letterSpacing: `${layers.overlay.tracking}em`,
                  color: textColor(dark, "overlay"),
                  maxWidth: `${Math.round(layers.overlay.maxWidthFraction * dims.w)}px`,
                }}
              >
                {brief.copy.overlayText}
              </div>
            </div>
          </div>

          {/* 4. Logo — bottom-right watermark */}
          {logoAssetUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoAssetUrl}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: "absolute",
                bottom: LOGO_SPEC.margin,
                right: LOGO_SPEC.margin,
                height: Math.round(dims.h * LOGO_SPEC.heightFraction),
                width: "auto",
                objectFit: "contain",
                opacity: 0.85,
              }}
            />
          )}
        </div>
      </div>
    );
  },
);

AdCompositor.displayName = "AdCompositor";

export default AdCompositor;

// ─── Angle → Credential Tag ───────────────────────────────────────────────────
// Each angle has a natural credential that anchors credibility on the image.
// These are short, accurate, Lunia proof points.

function angleToTag(angle: string): string {
  switch (angle) {
    case "credibility":     return "700 published studies";
    case "price-anchor":    return "Under $1 a night";
    case "skeptic-convert": return "78,000+ customers";
    case "outcome-first":   return "Melatonin-free";
    case "formula":         return "3 ingredients. Full doses.";
    case "comparison":      return "No melatonin. No groggy.";
    case "social-proof":    return "4.9 stars · 78,000 reviews";
    default:                return "Lunia Life";
  }
}
