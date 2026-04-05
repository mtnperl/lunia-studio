"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig, TextPosition, VideoTextStyle } from "@/lib/types";
import { BRAND, getSceneStyle, formatHeadline, getTextStyle } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";
import type { VideoStyle } from "@/lib/types";

export function ProductScene({
  scene,
  image,
  fontScale = 1,
  videoStyle = "cinematic",
  textStyle,
}: {
  scene: VideoAdScene;
  image?: SceneImageConfig;
  fontScale?: number;
  videoStyle?: VideoStyle;
  textStyle?: VideoTextStyle;
}) {
  const S = getSceneStyle(videoStyle);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const textPos: TextPosition = scene.textPosition ?? "bottom";
  const effectiveOverlay = textStyle?.overlayOpacity ?? S.overlayOpacity;
  const headline = formatHeadline(scene.headline, textStyle);
  const subline = scene.subline ? formatHeadline(scene.subline, textStyle) : undefined;

  const textY = interpolate(
    spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [40, 0]
  );
  const textOpacity = interpolate(frame, [18, 32], [0, 1], { extrapolateRight: "clamp" });

  const textBlockStyle: React.CSSProperties = textPos === "top" ? {
    position: "absolute",
    top: 0, left: 0, right: 0,
    padding: `${BRAND.paddingY}px ${BRAND.paddingX}px`,
    background: `linear-gradient(to bottom, ${S.bg}f0 0%, ${S.bg}80 60%, transparent 100%)`,
    transform: `translateY(${textY}px)`,
    opacity: textOpacity,
  } : textPos === "center" ? {
    position: "absolute",
    top: "50%",
    left: 0, right: 0,
    transform: `translateY(calc(-50% + ${textY}px))`,
    padding: `32px ${BRAND.paddingX}px`,
    background: `linear-gradient(to bottom, transparent 0%, ${S.bg}c0 20%, ${S.bg}c0 80%, transparent 100%)`,
    opacity: textOpacity,
  } : {
    // bottom (default)
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    padding: `${BRAND.paddingY}px ${BRAND.paddingX}px`,
    background: `linear-gradient(to top, ${S.bg}f5 0%, ${S.bg}a0 60%, transparent 100%)`,
    transform: `translateY(${textY}px)`,
    opacity: textOpacity,
  };

  return (
    <AbsoluteFill style={{ background: S.bg }}>
      {image && <SceneImageBackground image={image} overlayOpacity={effectiveOverlay} />}

      {/* Placeholder when no image */}
      {!image && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: S.surface,
          }}
        >
          <div
            style={{
              width: 280,
              height: 360,
              background: BRAND.accentDim,
              border: `2px solid ${BRAND.border}`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontFamily: BRAND.fontFamily,
                fontSize: 36 * fontScale,
                color: S.accentColor,
                textAlign: "center",
                fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              LUNIA
              <br />
              RESTORE
            </div>
          </div>
        </div>
      )}

      {/* Text block */}
      <div style={textBlockStyle}>
        <div
          style={{
            fontFamily: BRAND.fontFamily,
            fontSize: S.fontHeadline * fontScale,
            color: S.headlineColor,
            lineHeight: 1.1,
            marginBottom: 16,
            textShadow: BRAND.textShadow,
            ...getTextStyle(textStyle),
          }}
        >
          {headline}
        </div>
        {subline && (
          <div
            style={{
              fontFamily: BRAND.fontFamily,
              fontSize: S.fontSubline * fontScale,
              fontWeight: textStyle?.fontWeight ?? 500,
              color: S.sublineColor,
              lineHeight: 1.5,
              textShadow: BRAND.textShadow,
              ...(textStyle?.textStroke ? { WebkitTextStroke: "1px rgba(0,0,0,0.5)" } : {}),
              ...(textStyle?.allCaps ? { textTransform: "uppercase" as const } : {}),
              ...(textStyle?.lineBreakChars ? { whiteSpace: "pre-line" as const } : {}),
            }}
          >
            {subline}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
