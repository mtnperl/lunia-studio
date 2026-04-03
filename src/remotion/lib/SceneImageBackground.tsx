"use client";

import { Img, interpolate, useCurrentFrame } from "remotion";
import { SceneImageConfig } from "@/lib/types";
import { BRAND } from "./brand";

/**
 * Full-bleed background image for any scene.
 * - fit="cover"   → fills the frame, may crop. position controls objectPosition.
 * - fit="contain" → letterboxed, never crops. Dark bg visible on the sides/top.
 */
export function SceneImageBackground({
  image,
  overlayOpacity = 0.35,
}: {
  image: SceneImageConfig;
  overlayOpacity?: number;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <>
      {/* Image layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.bg,
          opacity,
        }}
      >
        <Img
          src={image.url}
          style={{
            width: image.fit === "cover" ? "100%" : "auto",
            height: image.fit === "cover" ? "100%" : "auto",
            maxWidth: image.fit === "contain" ? "100%" : undefined,
            maxHeight: image.fit === "contain" ? "100%" : undefined,
            objectFit: image.fit,
            objectPosition: image.fit === "cover" ? (image.position ?? "50% 50%") : undefined,
          }}
        />
      </div>

      {/* Dark overlay so text stays legible */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(13,12,10,${overlayOpacity})`,
          opacity,
        }}
      />
    </>
  );
}
