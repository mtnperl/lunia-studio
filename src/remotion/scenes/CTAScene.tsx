"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";

export function CTAScene({ scene, image }: { scene: VideoAdScene; image?: SceneImageConfig }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgProgress = spring({ frame, fps, config: { damping: 20, stiffness: 60 } });
  const overlayOpacity = interpolate(bgProgress, [0, 1], [0, 0.95]);

  const headlineY = interpolate(
    spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 16, stiffness: 100 } }),
    [0, 1],
    [50, 0]
  );
  const headlineOpacity = interpolate(frame, [8, 22], [0, 1], { extrapolateRight: "clamp" });

  const sublineOpacity = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: "clamp" });

  const buttonScale = spring({ frame: Math.max(0, frame - 40), fps, config: { damping: 14, stiffness: 120 } });
  const buttonOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" });

  const logoOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {image && <SceneImageBackground image={image} overlayOpacity={0.6} />}

      {/* Gold gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, ${BRAND.accentDim} 0%, transparent 70%)`,
          opacity: overlayOpacity,
        }}
      />

      {/* Center content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${BRAND.paddingX}px`,
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Headline */}
        <div
          style={{
            transform: `translateY(${headlineY}px)`,
            opacity: headlineOpacity,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              fontSize: BRAND.fontHero,
              fontWeight: 300,
              color: BRAND.text,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {scene.headline}
          </div>
        </div>

        {/* Subline */}
        {scene.subline && (
          <div style={{ opacity: sublineOpacity, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: BRAND.fontSubline,
                fontWeight: 300,
                color: BRAND.muted,
                lineHeight: 1.5,
              }}
            >
              {scene.subline}
            </div>
          </div>
        )}

        {/* CTA button */}
        <div
          style={{
            transform: `scale(${interpolate(buttonScale, [0, 1], [0.8, 1])})`,
            opacity: buttonOpacity,
            marginTop: 16,
          }}
        >
          <div
            style={{
              background: BRAND.accent,
              color: BRAND.bg,
              fontFamily: "'Inter', sans-serif",
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "0.08em",
              padding: "20px 56px",
              borderRadius: 4,
            }}
          >
            SHOP NOW
          </div>
        </div>

        {/* Logo wordmark */}
        <div
          style={{
            position: "absolute",
            bottom: BRAND.paddingY,
            opacity: logoOpacity,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              fontSize: 36,
              fontWeight: 300,
              color: BRAND.accent,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Lunia Life
          </div>
        </div>
      </AbsoluteFill>

      {/* Top/bottom accent lines */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: BRAND.accent,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: BRAND.accent,
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
}
