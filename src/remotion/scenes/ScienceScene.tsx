"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND, getSceneStyle } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";
import type { VideoStyle } from "@/lib/types";

export function ScienceScene({
  scene,
  image,
  fontScale = 1,
  videoStyle = "cinematic",
}: {
  scene: VideoAdScene;
  image?: SceneImageConfig;
  fontScale?: number;
  videoStyle?: VideoStyle;
}) {
  const S = getSceneStyle(videoStyle);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const statScale = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const statOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  const contentY = interpolate(
    spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [30, 0]
  );
  const contentOpacity = interpolate(frame, [15, 28], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: S.surface,
        justifyContent: "center",
        padding: `0 ${BRAND.paddingX}px`,
      }}
    >
      {image && <SceneImageBackground image={image} overlayOpacity={S.overlayOpacity} />}

      {/* Stat */}
      {scene.stat && (
        <div
          style={{
            transform: `scale(${interpolate(statScale, [0, 1], [0.6, 1])})`,
            opacity: statOpacity,
            marginBottom: 24,
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

      {/* Headline + subline */}
      <div style={{ transform: `translateY(${contentY}px)`, opacity: contentOpacity }}>
        <div
          style={{
            fontFamily: BRAND.fontFamily,
            fontSize: S.fontHeadline * fontScale,
            fontWeight: 600,
            color: S.headlineColor,
            lineHeight: 1.15,
            marginBottom: 20,
          }}
        >
          {scene.headline}
        </div>

        {scene.subline && (
          <div
            style={{
              fontFamily: BRAND.fontFamily,
              fontSize: S.fontSubline * fontScale,
              fontWeight: 500,
              color: S.sublineColor,
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            {scene.subline}
          </div>
        )}

        {scene.caption && (
          <div
            style={{
              fontFamily: BRAND.fontFamily,
              fontSize: BRAND.fontCaption * fontScale,
              fontWeight: 400,
              color: S.captionColor,
              opacity: 0.7,
              letterSpacing: "0.04em",
            }}
          >
            {scene.caption}
          </div>
        )}
      </div>

      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "20%",
          bottom: "20%",
          width: 4,
          background: S.accentColor,
          opacity: interpolate(frame, [5, 20], [0, 0.7], { extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
}
