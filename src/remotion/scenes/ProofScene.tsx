"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";

export function ProofScene({ scene, image }: { scene: VideoAdScene; image?: SceneImageConfig }) {
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
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontSize: BRAND.fontStat,
              fontWeight: 400,
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
        <div
          style={{
            opacity: statOpacity,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: BRAND.fontCaption,
              fontWeight: 400,
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
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: BRAND.fontHeadline,
            fontWeight: 300,
            color: BRAND.text,
            lineHeight: 1.15,
          }}
        >
          {scene.headline}
        </div>
      </div>

      {/* Stars / trust signals */}
      <div
        style={{
          position: "absolute",
          bottom: BRAND.paddingY,
          left: BRAND.paddingX,
          opacity: starOpacity,
          display: "flex",
          gap: 8,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 24,
              height: 24,
              background: BRAND.accent,
              clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
              opacity: 0.8,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}
