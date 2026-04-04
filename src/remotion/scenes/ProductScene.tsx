"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND, getSceneStyle } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";
import type { VideoStyle } from "@/lib/types";

export function ProductScene({
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

  const textY = interpolate(
    spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [40, 0]
  );
  const textOpacity = interpolate(frame, [18, 32], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: S.bg }}>
      {image && <SceneImageBackground image={image} overlayOpacity={S.overlayOpacity} />}

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

      {/* Text block pinned to bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: `${BRAND.paddingY}px ${BRAND.paddingX}px`,
          background: `linear-gradient(to top, ${S.bg}f5 0%, ${S.bg}a0 60%, transparent 100%)`,
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            fontFamily: BRAND.fontFamily,
            fontSize: S.fontHeadline * fontScale,
            fontWeight: 700,
            color: S.headlineColor,
            lineHeight: 1.1,
            marginBottom: 16,
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
            }}
          >
            {scene.subline}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
