"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";

export function ScienceScene({ scene, image }: { scene: VideoAdScene; image?: SceneImageConfig }) {
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
        background: BRAND.surface,
        justifyContent: "center",
        padding: `0 ${BRAND.paddingX}px`,
      }}
    >
      {image && <SceneImageBackground image={image} overlayOpacity={0.55} />}
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
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontSize: BRAND.fontStat,
              fontWeight: 400,
              color: BRAND.accent,
              lineHeight: 1,
              letterSpacing: "-0.03em",
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
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: BRAND.fontHeadline,
            fontWeight: 300,
            color: BRAND.text,
            lineHeight: 1.15,
            marginBottom: 20,
          }}
        >
          {scene.headline}
        </div>

        {scene.subline && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: BRAND.fontSubline,
              fontWeight: 300,
              color: BRAND.muted,
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
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontSize: BRAND.fontCaption,
              color: BRAND.muted,
              opacity: 0.6,
              letterSpacing: "0.04em",
            }}
          >
            {scene.caption}
          </div>
        )}
      </div>

      {/* Left gold bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "20%",
          bottom: "20%",
          width: 3,
          background: BRAND.accent,
          opacity: interpolate(frame, [5, 20], [0, 0.5], { extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
}
