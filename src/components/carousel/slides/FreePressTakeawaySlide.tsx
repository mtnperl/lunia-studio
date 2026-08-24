"use client";

// Free Press closer — the last slide of the deck.
//
// The default TakeawaySlide is a different design: numbered accent circles, a
// bordered interaction pill, an eyebrow in accent colour. That is a good slide
// and it is the wrong slide here. This preset earns its look by having almost
// nothing on the artboard, and a numbered-circle stack plus a bordered CTA card
// would make the closer the loudest frame in a deck that spent four slides
// being quiet.
//
// So: a tracked kicker, the recap points separated by hairlines, and the same
// navy indicator the body slides end on. The `interaction` prop is accepted and
// not rendered for exactly that reason — the ask lives in the follow line,
// which is one line of text rather than a card.
//
// Arrows are deliberately absent. There is nothing after this slide, and an
// arrow pointing past the end of the deck is a small lie.

import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import { BrandStyle } from "@/lib/types";
import { SLIDE, FP_SANS, FP_COLORS, FP_TYPE } from "@/lib/brand-tokens";

type Interaction = { type: "save" | "send" | "comment"; label: string };

type Props = {
  headline: string;
  points: string[];
  interaction: Interaction;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  logoScale?: number;
  reels?: boolean;
  followLine?: string;

  // Accepted and ignored — see the header.
  backgroundImage?: string | null;
  shimmer?: boolean;
  arrowScale?: number;
  darkBackground?: boolean;
  slideBgColor?: string;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
  showSlideArrows?: boolean;
  stylePreset?: string;
};

export default function FreePressTakeawaySlide({
  headline,
  points,
  scale = 1,
  id,
  brandStyle,
  logoScale = 1,
  reels = false,
  followLine,
}: Props) {
  const slideH = reels ? SLIDE.height.reels : SLIDE.height.carousel;
  const paper = brandStyle?.background ?? FP_COLORS.paper;
  const ink = brandStyle?.body ?? FP_COLORS.ink;
  const indicator = brandStyle?.accent ?? FP_COLORS.indicator;

  const rows = (points ?? []).filter((p) => p && p.trim().length > 0).slice(0, 3);
  // The headline stands in for the kicker when the generator wrote one, so the
  // slide is never captioned with a hardcoded string that contradicts it.
  const kicker = (headline && headline.trim()) || "The takeaway";

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: paper }}>
      <LuniaLogo variant="dark" sizeScale={logoScale} placement="top-left" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: `${reels ? 190 : 150}px ${SLIDE.pad.x + 4}px ${reels ? 150 : 110}px`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: FP_SANS,
              fontWeight: 600,
              fontSize: FP_TYPE.takeawayKicker,
              letterSpacing: "0.19em",
              textTransform: "uppercase",
              color: FP_COLORS.inkMuted,
              textAlign: "center",
              marginBottom: 38,
            }}
          >
            {kicker}
          </div>

          {rows.map((p, i) => (
            <div
              key={i}
              style={{
                fontFamily: FP_SANS,
                fontWeight: 700,
                fontSize: FP_TYPE.takeawayPoint,
                lineHeight: 1.18,
                color: ink,
                textAlign: "center",
                padding: "36px 0",
                borderTop: `2px solid ${FP_COLORS.inkHairline}`,
                // Only the last row closes the stack, so the rules read as
                // separators between items rather than as a boxed table.
                ...(i === rows.length - 1
                  ? { borderBottom: `2px solid ${FP_COLORS.inkHairline}` }
                  : {}),
              }}
            >
              {p}
            </div>
          ))}
        </div>

        <div
          style={{
            flexShrink: 0,
            fontFamily: FP_SANS,
            fontWeight: 700,
            fontSize: FP_TYPE.indicator,
            letterSpacing: "0.17em",
            textTransform: "uppercase",
            color: indicator,
            textAlign: "center",
          }}
        >
          {followLine && followLine.trim() ? followLine : "Follow @lunia_life"}
        </div>
      </div>
    </SlideWrapper>
  );
}
