"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";

export function ProofScene({
  scene,
  image,
  fontScale = 1,
}: {
  scene: VideoAdScene;
  image?: SceneImageConfig;
  fontScale?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
        background: BRAND.surface,
        justifyContent: "center",
        padding: `0 ${BRAND.paddingX}px`,
        alignItems: "flex-start",
      }}
    >
      {image && <SceneImageBackground image={image} overlayOpacity={0.55} />}

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
              color: BRAND.accent,
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
              color: BRAND.muted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {scene.caption}
          </div>
        </div>
      )}

      {/* Headline */}
      <div style={{ transform: `translateY(${textY}px)`, opacity: textOpacity }}>
        <div
          style={{
            fontFamily: BRAND.fontFamily,
            fontSize: BRAND.fontHeadline * fontScale,
            fontWeight: 600,
            color: BRAND.text,
            lineHeight: 1.15,
          }}
        >
          {scene.headline}
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
              background: BRAND.accent,
              clipPath:
                "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}
