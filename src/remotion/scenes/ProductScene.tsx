"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoAdScene, SceneImageConfig } from "@/lib/types";
import { BRAND } from "../lib/brand";
import { SceneImageBackground } from "../lib/SceneImageBackground";

export function ProductScene({
  scene,
  image,
}: {
  scene: VideoAdScene;
  image?: SceneImageConfig;
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
              border: `1px solid ${BRAND.border}`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 28,
                color: BRAND.accent,
                textAlign: "center",
                fontWeight: 300,
              }}
            >
              Lunia
              <br />
              Restore
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
          background: "linear-gradient(to top, rgba(13,12,10,0.92) 0%, rgba(13,12,10,0.6) 60%, transparent 100%)",
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: BRAND.fontHeadline,
            fontWeight: 300,
            color: BRAND.text,
            lineHeight: 1.15,
            marginBottom: 16,
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
            }}
          >
            {scene.subline}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
