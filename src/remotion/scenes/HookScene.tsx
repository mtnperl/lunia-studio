"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig, TextPosition, VideoTextStyle } from "@/lib/types";
import { BRAND, getSceneStyle, formatHeadline, getBackdropStyle, getTextStyle } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";
import type { VideoStyle } from "@/lib/types";

export function HookScene({
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
  const textPos: TextPosition = scene.textPosition ?? "center";
  const effectiveOverlay = textStyle?.overlayOpacity ?? S.overlayOpacity;
  const headline = formatHeadline(scene.headline, textStyle);
  const subline = scene.subline ? formatHeadline(scene.subline, textStyle) : undefined;

  const headlineY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 120 } }),
    [0, 1],
    [60, 0]
  );
  const headlineOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const accentOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: S.bg,
      paddingLeft: BRAND.paddingX,
      paddingRight: BRAND.paddingX,
      paddingTop: textPos === "top" ? BRAND.paddingY : 0,
      paddingBottom: textPos === "bottom" ? BRAND.paddingY : 0,
      justifyContent: textPos === "top" ? "flex-start" : textPos === "bottom" ? "flex-end" : "center",
    }}>
      {image && <SceneImageBackground image={image} overlayOpacity={effectiveOverlay} />}

      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: S.accentColor,
          opacity: accentOpacity,
        }}
      />

      <div style={{ transform: `translateY(${headlineY}px)`, opacity: headlineOpacity, ...getBackdropStyle(textStyle) }}>
        <div
          style={{
            fontFamily: BRAND.fontFamily,
            fontSize: S.fontHero * fontScale,
            color: S.headlineColor,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textShadow: BRAND.textShadow,
            ...getTextStyle(textStyle),
          }}
        >
          {headline}
        </div>

        {subline && (
          <div
            style={{
              marginTop: textStyle?.textBackdrop ? 16 : 32,
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

      {/* Bottom accent bar */}
      <div
        style={{
          position: "absolute",
          bottom: BRAND.paddingY,
          left: BRAND.paddingX,
          width: 48,
          height: 3,
          background: S.accentColor,
          opacity: interpolate(frame, [20, 30], [0, 0.8], { extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
}
