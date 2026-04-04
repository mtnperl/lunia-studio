"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND, getSceneStyle } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";
import type { VideoStyle } from "@/lib/types";

export function HookScene({
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

  const headlineY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 120 } }),
    [0, 1],
    [60, 0]
  );
  const headlineOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const sublineY = interpolate(
    spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [40, 0]
  );
  const sublineOpacity = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: "clamp" });

  const accentOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: S.bg, justifyContent: "center", padding: `0 ${BRAND.paddingX}px` }}>
      {image && <SceneImageBackground image={image} overlayOpacity={S.overlayOpacity} />}

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

      <div style={{ transform: `translateY(${headlineY}px)`, opacity: headlineOpacity }}>
        <div
          style={{
            fontFamily: BRAND.fontFamily,
            fontSize: S.fontHero * fontScale,
            fontWeight: 700,
            color: S.headlineColor,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {scene.headline}
        </div>
      </div>

      {scene.subline && (
        <div
          style={{
            transform: `translateY(${sublineY}px)`,
            opacity: sublineOpacity,
            marginTop: 32,
          }}
        >
          <div
            style={{
              fontFamily: BRAND.fontFamily,
              fontSize: S.fontSubline * fontScale,
              fontWeight: 500,
              color: S.sublineColor,
              lineHeight: 1.5,
            }}
          >
            {scene.subline}
          </div>
        </div>
      )}

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
