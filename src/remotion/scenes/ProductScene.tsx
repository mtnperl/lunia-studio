"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring, Img } from "remotion";
import { VideoAdScene } from "@/lib/types";
import { BRAND } from "../lib/brand";

export function ProductScene({
  scene,
  productImageUrl,
}: {
  scene: VideoAdScene;
  productImageUrl: string | null;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imageScale = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 80 } }),
    [0, 1],
    [0.88, 1]
  );
  const imageOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const textY = interpolate(
    spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [40, 0]
  );
  const textOpacity = interpolate(frame, [18, 32], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Product image takes top 60% */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "60%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.surface,
        }}
      >
        {productImageUrl ? (
          <Img
            src={productImageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${imageScale})`,
              opacity: imageOpacity,
            }}
          />
        ) : (
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
              transform: `scale(${imageScale})`,
              opacity: imageOpacity,
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
        )}
      </div>

      {/* Text block bottom 40% */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "42%",
          padding: `40px ${BRAND.paddingX}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
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

      {/* Gold divider */}
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: BRAND.paddingX,
          right: BRAND.paddingX,
          height: 1,
          background: BRAND.accent,
          opacity: 0.3,
        }}
      />
    </AbsoluteFill>
  );
}
