"use client";

import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig, TextPosition } from "@/lib/types";
import { BRAND, getSceneStyle } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";
import type { VideoStyle } from "@/lib/types";

export function CTAScene({
  scene,
  image,
  logoUrl,
  fontScale = 1,
  videoStyle = "cinematic",
}: {
  scene: VideoAdScene;
  image?: SceneImageConfig;
  logoUrl?: string;
  fontScale?: number;
  videoStyle?: VideoStyle;
}) {
  const S = getSceneStyle(videoStyle);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const textPos: TextPosition = scene.textPosition ?? "center";

  const bgProgress = spring({ frame, fps, config: { damping: 20, stiffness: 60 } });
  const overlayOpacity = interpolate(bgProgress, [0, 1], [0, 0.85]);

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
    <AbsoluteFill style={{ background: S.bg }}>
      {image && <SceneImageBackground image={image} overlayOpacity={S.overlayOpacity} />}

      {/* Radial glow overlay (cinematic/serene only) */}
      {videoStyle !== "bold" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at center, rgba(191,251,248,0.12) 0%, transparent 70%)`,
            opacity: overlayOpacity,
          }}
        />
      )}

      {/* Center content */}
      <AbsoluteFill
        style={{
          justifyContent: textPos === "top" ? "flex-start" : textPos === "bottom" ? "flex-end" : "center",
          alignItems: "center",
          paddingLeft: BRAND.paddingX,
          paddingRight: BRAND.paddingX,
          paddingTop: textPos === "top" ? BRAND.paddingY : 0,
          paddingBottom: textPos === "bottom" ? BRAND.paddingY : 0,
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

        {/* Subline */}
        {scene.subline && (
          <div style={{ opacity: sublineOpacity, textAlign: "center" }}>
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
              background: S.accentColor,
              color: videoStyle === "bold" ? "#000000" : BRAND.bg,
              fontFamily: BRAND.fontFamily,
              fontSize: 30 * fontScale,
              fontWeight: 700,
              letterSpacing: "0.1em",
              padding: "22px 60px",
              borderRadius: 4,
            }}
          >
            SHOP NOW
          </div>
        </div>

        {/* Logo */}
        <div
          style={{
            position: "absolute",
            bottom: BRAND.paddingY,
            opacity: logoOpacity,
            textAlign: "center",
          }}
        >
          {logoUrl ? (
            <Img
              src={logoUrl}
              style={{
                height: 64 * fontScale,
                width: "auto",
                maxWidth: 320,
                objectFit: "contain",
                mixBlendMode: "screen",
              }}
            />
          ) : (
            <div
              style={{
                fontFamily: BRAND.fontFamily,
                fontSize: 40 * fontScale,
                fontWeight: 700,
                color: S.accentColor,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              LUNIA LIFE
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Top/bottom accent lines */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: S.accentColor,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: S.accentColor,
          opacity: 0.7,
        }}
      />
    </AbsoluteFill>
  );
}
