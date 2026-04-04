"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring, Img } from "remotion";
import type { VideoCaptionsData } from "@/lib/types";
import { BRAND, getSceneStyle } from "./lib/brand";
import { SceneImageBackground } from "./lib/SceneImageBackground";

/**
 * Word-by-word caption animation — "TikTok" style vertical video.
 * Each caption block animates word by word, centered on screen.
 * Background: full-bleed image (if provided) + overlay, or plain brand bg.
 */
export function VideoAdCaptions(props: VideoCaptionsData) {
  const { captions, backgroundImageUrl, logoUrl, fontScale = 1, videoStyle = "cinematic" } = props;
  const S = getSceneStyle(videoStyle);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Each caption block gets FRAMES_PER_BLOCK frames; words animate within
  const FRAMES_PER_BLOCK = 75; // 2.5s each
  const WORDS_PER_SECOND = 2.8;
  const FRAMES_PER_WORD = Math.round(fps / WORDS_PER_SECOND);

  const currentBlock = Math.floor(frame / FRAMES_PER_BLOCK);
  const blockFrame = frame % FRAMES_PER_BLOCK;

  const blockIn = interpolate(
    spring({ frame: blockFrame, fps, config: { damping: 20, stiffness: 120 } }),
    [0, 1],
    [40, 0]
  );
  const blockOpacity = interpolate(blockFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const blockOut = interpolate(blockFrame, [FRAMES_PER_BLOCK - 12, FRAMES_PER_BLOCK], [1, 0], { extrapolateLeft: "clamp" });

  const logoOpacity = interpolate(frame, [fps * 0.5, fps], [0, 1], { extrapolateRight: "clamp" });

  const caption = captions[Math.min(currentBlock, captions.length - 1)] ?? "";
  const words = caption.split(" ");

  const bgImage: import("@/lib/types").SceneImageConfig | undefined = backgroundImageUrl
    ? { url: backgroundImageUrl, fit: "cover", position: "50% 50%" }
    : undefined;

  return (
    <AbsoluteFill style={{ background: S.bg }}>
      {bgImage && <SceneImageBackground image={bgImage} overlayOpacity={S.overlayOpacity + 0.1} />}

      {/* Bottom gradient for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, ${S.bg}e0 0%, ${S.bg}60 35%, transparent 65%)`,
        }}
      />

      {/* Caption block — vertically centered slightly below middle */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-start",
          padding: `0 ${BRAND.paddingX}px ${BRAND.paddingY * 2.5}px`,
        }}
      >
        <div
          style={{
            transform: `translateY(${blockIn}px)`,
            opacity: blockOpacity * blockOut,
          }}
        >
          <div
            style={{
              fontFamily: BRAND.fontFamily,
              fontSize: Math.round(BRAND.fontHeadline * 0.95 * fontScale),
              fontWeight: 700,
              color: S.headlineColor,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {words.map((word, wIdx) => {
              const wordStartFrame = wIdx * FRAMES_PER_WORD;
              const wOpacity = interpolate(blockFrame, [wordStartFrame, wordStartFrame + 4], [0, 1], { extrapolateRight: "clamp" });
              const wY = interpolate(
                spring({ frame: Math.max(0, blockFrame - wordStartFrame), fps, config: { damping: 20, stiffness: 160 } }),
                [0, 1],
                [16, 0]
              );
              const isHighlight = word.length > 5 && wIdx % 3 === 0;
              return (
                <span
                  key={wIdx}
                  style={{
                    display: "inline-block",
                    opacity: wOpacity,
                    transform: `translateY(${wY}px)`,
                    marginRight: "0.28em",
                    color: isHighlight ? S.accentColor : S.headlineColor,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          top: BRAND.paddingY,
          left: BRAND.paddingX,
          display: "flex",
          gap: 8,
          opacity: 0.7,
        }}
      >
        {captions.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentBlock ? 24 : 6,
              height: 6,
              borderRadius: 3,
              background: i <= currentBlock ? S.accentColor : "rgba(255,255,255,0.25)",
              transition: "width 0.2s",
            }}
          />
        ))}
      </div>

      {/* Logo bottom-right */}
      {logoUrl && (
        <div
          style={{
            position: "absolute",
            bottom: BRAND.paddingY,
            right: BRAND.paddingX,
            opacity: logoOpacity,
          }}
        >
          <Img
            src={logoUrl}
            style={{ height: 48 * fontScale, width: "auto", maxWidth: 200, objectFit: "contain", mixBlendMode: "screen" }}
          />
        </div>
      )}
      {!logoUrl && (
        <div
          style={{
            position: "absolute",
            bottom: BRAND.paddingY,
            right: BRAND.paddingX,
            opacity: logoOpacity * 0.6,
            fontFamily: BRAND.fontFamily,
            fontSize: 22 * fontScale,
            fontWeight: 700,
            color: S.accentColor,
            letterSpacing: "0.2em",
          }}
        >
          LUNIA LIFE
        </div>
      )}
    </AbsoluteFill>
  );
}
