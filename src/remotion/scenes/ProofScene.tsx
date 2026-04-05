"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig, TextPosition, VideoTextStyle } from "@/lib/types";
import { BRAND, getSceneStyle, formatHeadline, getBackdropStyle, getTextStyle } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";
import type { VideoStyle } from "@/lib/types";

export function ProofScene({
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

  const statProgress = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const statOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const textY = interpolate(
    spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [30, 0]
  );
  const textOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });

  const starOpacity = interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: S.surface,
        paddingLeft: BRAND.paddingX,
        paddingRight: BRAND.paddingX,
        paddingTop: textPos === "top" ? BRAND.paddingY : 0,
        paddingBottom: textPos === "bottom" ? BRAND.paddingY : 0,
        justifyContent: textPos === "top" ? "flex-start" : textPos === "bottom" ? "flex-end" : "center",
        alignItems: "flex-start",
      }}
    >
      {image && <SceneImageBackground image={image} overlayOpacity={effectiveOverlay} />}

      {/* Large stat number */}
      {scene.stat && (
        <div
          style={{
            opacity: statOpacity,
            transform: `translateX(${interpolate(statProgress, [0, 1], [-30, 0])}px)`,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: BRAND.fontFamily,
              fontSize: BRAND.fontStat * fontScale,
              fontWeight: 700,
              color: S.statColor,
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {scene.stat}
          </div>
        </div>
      )}

      {/* Caption below stat */}
      {scene.caption && (
        <div style={{ opacity: statOpacity, marginBottom: 48 }}>
          <div
            style={{
              fontFamily: BRAND.fontFamily,
              fontSize: BRAND.fontCaption * fontScale,
              fontWeight: 500,
              color: S.captionColor,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {scene.caption}
          </div>
        </div>
      )}

      {/* Headline */}
      <div style={{ transform: `translateY(${textY}px)`, opacity: textOpacity, ...getBackdropStyle(textStyle) }}>
        <div
          style={{
            fontFamily: BRAND.fontFamily,
            fontSize: S.fontHeadline * fontScale,
            color: S.headlineColor,
            lineHeight: 1.15,
            textShadow: BRAND.textShadow,
            ...getTextStyle(textStyle),
          }}
        >
          {headline}
        </div>
      </div>

      {/* Stars */}
      <div
        style={{
          position: "absolute",
          bottom: BRAND.paddingY,
          left: BRAND.paddingX,
          opacity: starOpacity,
          display: "flex",
          gap: 10,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 28,
              height: 28,
              background: S.accentColor,
              clipPath:
                "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}
