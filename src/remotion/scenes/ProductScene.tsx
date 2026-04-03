"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";

export function ProductScene({
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

  const textY = interpolate(
    spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [40, 0]
  );
  const textOpacity = interpolate(frame, [18, 32], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {image && <SceneImageBackground image={image} overlayOpacity={0.4} />}

      {/* Placeholder when no image */}
      {!image && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BRAND.surface,
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
                color: BRAND.accent,
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
          background: `linear-gradient(to top, rgba(16,38,53,0.95) 0%, rgba(16,38,53,0.65) 60%, transparent 100%)`,
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            fontFamily: BRAND.fontFamily,
            fontSize: BRAND.fontHeadline * fontScale,
            fontWeight: 700,
            color: BRAND.text,
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
              fontSize: BRAND.fontSubline * fontScale,
              fontWeight: 500,
              color: BRAND.muted,
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
