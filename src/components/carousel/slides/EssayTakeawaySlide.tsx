"use client";

// Essay takeaway slide: the last slide of an essay deck.
//
// Paper, the serial chrome, a "THE TAKEAWAY" kicker in the accent, the payoff
// headline in the display face, three numbered lines, the one interaction ask
// in a hairline box, the follow line, and the signature. It carries the
// follow line, so there is no CTA slide after it. Same props as TakeawaySlide
// so PreviewStep and the share page can swap it in by preset.

import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import { BrandStyle, CarouselStylePreset } from "@/lib/types";
import { SLIDE, ESSAY_COLORS, ESSAY_DISPLAY, ESSAY_TEXT, ESSAY_TYPE, type EssayAccent } from "@/lib/brand-tokens";
import { ESSAY_PAD, PaperTexture, ChromeRow, Counter, ProgressRule, Byline, BoxedHeadline, essayAccent, essayNumberFrom, essayDate, resolveEssayEmphasis } from "@/components/carousel/shared/EssayChrome";

type Interaction = { type: "save" | "send" | "comment"; label: string };

type Props = {
  headline: string;
  /** The boxed word of the headline. Absent: the slide picks one. "": none. */
  headlineEmphasis?: string;
  points: string[];
  interaction: Interaction;
  followLine?: string;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  arrowScale?: number;
  reels?: boolean;
  frameH?: number;
  showSlideArrows?: boolean;
  /** Essay-only. */
  essayAccent?: EssayAccent;
  essayNumber?: string;
  essayDate?: string;
  handle?: string;
  /** Content slides in the deck, for the counter. */
  slideTotal?: number;

  // Accepted for call-site compatibility, not drawn.
  backgroundImage?: string;
  shimmer?: boolean;
  logoScale?: number;
  darkBackground?: boolean;
  slideBgColor?: string;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
  stylePreset?: CarouselStylePreset | string;
};

const VERB: Record<Interaction["type"], string> = { save: "Save", send: "Send", comment: "Comment" };

export default function EssayTakeawaySlide({
  headline, headlineEmphasis, points, interaction, followLine, scale = 1, id, brandStyle, arrowScale = 1, reels = false, frameH,
  showSlideArrows = true, essayAccent: accentId, essayNumber, essayDate: dateText, handle = "@lunia_life", slideTotal = 3,
}: Props) {
  const slideH = frameH ?? (reels ? SLIDE.height.reels : SLIDE.height.carousel);
  const compact = slideH < SLIDE.height.carousel ? slideH / SLIDE.height.carousel : 1;
  const accent = essayAccent(accentId);
  const ink = brandStyle?.body ?? ESSAY_COLORS.ink;
  const deckTotal = slideTotal + 2;
  const shown = points.filter((p) => p && p.trim()).slice(0, 3);
  const headlineSize = Math.round((headline.length > 22 ? 84 : 104) * compact * (reels ? 1.08 : 1));
  const pointSize = Math.round(ESSAY_TYPE.takeawayPoint * compact * (reels ? 1.08 : 1));

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: ESSAY_COLORS.paper, overflow: "hidden" }}>
      <PaperTexture />
      <ChromeRow top={Math.round(ESSAY_PAD.y * compact)} left={handle.toUpperCase()} right={<Counter index={deckTotal} total={deckTotal} accent={accent.text} />} />
      {showSlideArrows && <ArrowIcons color={brandStyle?.secondary ?? ESSAY_COLORS.inkMuted} sizeScale={arrowScale} />}

      <div style={{ position: "absolute", left: ESSAY_PAD.x, right: ESSAY_PAD.x, top: Math.round((reels ? 210 : 176) * compact), bottom: Math.round((reels ? 190 : 150) * compact), display: "flex", flexDirection: "column", justifyContent: "center", gap: Math.round(44 * compact), overflow: "hidden" }}>
        <div>
          <div style={{ fontFamily: ESSAY_TEXT, fontWeight: 500, fontSize: ESSAY_TYPE.chrome, letterSpacing: "0.22em", textTransform: "uppercase", color: accent.text, marginBottom: Math.round(18 * compact) }}>
            The takeaway
          </div>
          <BoxedHeadline text={headline} emphasis={resolveEssayEmphasis(headline, headlineEmphasis)} fill={accent.fill} onFill={accent.onFill} style={{ fontSize: headlineSize, color: ink }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: Math.round(22 * compact) }}>
          {shown.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 26, borderTop: `1px solid ${ESSAY_COLORS.inkHairline}`, paddingTop: Math.round(20 * compact) }}>
              <div style={{ fontFamily: ESSAY_DISPLAY, fontSize: Math.round(pointSize * 0.9), lineHeight: 1.2, color: accent.text, minWidth: 52 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: ESSAY_TEXT, fontWeight: 300, fontSize: pointSize, lineHeight: 1.22, color: ink }}>
                {p}
              </div>
            </div>
          ))}
        </div>

        <div style={{ border: `2px solid ${ink}`, padding: `${Math.round(22 * compact)}px ${Math.round(28 * compact)}px`, display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ fontFamily: ESSAY_DISPLAY, fontSize: Math.round(30 * compact), textTransform: "uppercase", letterSpacing: "0.06em", background: accent.fill, color: accent.onFill, padding: "4px 12px", lineHeight: 1.1 }}>
            {VERB[interaction.type] ?? "Save"}
          </div>
          <div style={{ fontFamily: ESSAY_TEXT, fontWeight: 400, fontSize: Math.round(30 * compact), lineHeight: 1.25, color: ink }}>
            {interaction.label}
          </div>
        </div>

        {followLine && (
          <div style={{ fontFamily: ESSAY_TEXT, fontWeight: 300, fontSize: Math.round(26 * compact), lineHeight: 1.35, color: ESSAY_COLORS.inkMuted }}>
            {followLine}
          </div>
        )}
      </div>

      <Byline style={{ position: "absolute", left: ESSAY_PAD.x, bottom: Math.round(96 * compact) }} size={Math.round(ESSAY_TYPE.byline * compact)} />
      <ChromeRow bottom={Math.round(58 * compact)} left={<>ESSAY <span style={{ color: accent.text }}>&mdash;</span> {essayNumber ?? essayNumberFrom(headline)}</>} right={dateText ?? essayDate()} />
      <ProgressRule index={deckTotal} total={deckTotal} accent={accent.fill} />
    </SlideWrapper>
  );
}
