// Billboard takeaway: the headline pair, numbered rows on hairlines, the
// interaction as a boxed label, the follow line. Same corners, same rule.

import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { PaperTexture } from "@/components/carousel/shared/EssayChrome";
import { ContentCorners, HeadlinePair, ProgressRule, Watermark, billboardPaper, DEFAULT_PILLAR } from "@/components/carousel/shared/BillboardChrome";
import { BILLBOARD_COLORS as C, BILLBOARD_FONTS as F, BILLBOARD_TYPE as T, BILLBOARD_LAYOUT as L, SLIDE, type PaperSettings } from "@/lib/brand-tokens";
import type { BillboardPillar } from "@/lib/types";

type Props = {
  headline: string;
  headlineEmphasis?: string;
  points: string[];
  interaction: { type: "save" | "send" | "comment"; label: string };
  followLine?: string;
  pillar?: BillboardPillar;
  paper?: Partial<PaperSettings>;
  scale?: number;
  id?: string;
  reels?: boolean;
  frameH?: number;
  slideTotal?: number;
  headlineScale?: number;
  bodyScale?: number;
  // Accepted for call-site compatibility with the other takeaway slides.
  brandStyle?: unknown;
  logoScale?: number;
  arrowScale?: number;
  darkBackground?: boolean;
  slideBgColor?: string;
  showLuniaLifeWatermark?: boolean;
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  essayAccent?: unknown;
  essayNumber?: string;
  essayDate?: string;
  stylePreset?: string;
};

const VERB: Record<Props["interaction"]["type"], string> = { save: "Save", send: "Send", comment: "Comment" };

export default function BillboardTakeawaySlide({
  headline, headlineEmphasis, points, interaction, followLine, pillar = DEFAULT_PILLAR, paper, scale = 1, id, reels = false, frameH, slideTotal = 3, headlineScale = 1, bodyScale = 1,
}: Props) {
  const slideH = frameH ?? (reels ? SLIDE.height.reels : SLIDE.height.carousel);
  const p = billboardPaper(paper);
  const pad = (n: number) => String(n).padStart(2, "0");
  const total = slideTotal + 2;
  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: C.paper }}>
      <PaperTexture opacity={p.grain} vignette={p.vignette} />
      <Watermark top={Math.round(slideH * 0.36)} opacity={0.7} />

      <div style={{ position: "absolute", left: L.padX, right: L.padX, top: L.contentTop, bottom: 190, display: "flex", flexDirection: "column", gap: 44 }}>
        <div style={{ fontFamily: F.thin, fontWeight: 500, fontSize: T.corner, letterSpacing: "0.2em", textTransform: "uppercase", color: C.inkMuted }}>The takeaway</div>
        <HeadlinePair text={headline} heavy={headlineEmphasis} thinSize={Math.round(T.thin * headlineScale)} heavySize={Math.round(T.heavy * headlineScale)} align="left" style={{ marginTop: -20 }} />
        <div>
          {points.map((pt, i) => (
            <div key={i} style={{ display: "flex", gap: 28, alignItems: "baseline", padding: "20px 0", borderTop: `2px solid ${C.inkHairline}` }}>
              <span style={{ fontFamily: F.heavy, fontWeight: 700, fontSize: Math.round(36 * bodyScale), color: C.ink, minWidth: 56, fontVariantNumeric: "tabular-nums" }}>{pad(i + 1)}</span>
              <span style={{ fontFamily: F.thin, fontWeight: 300, fontSize: Math.round(T.body * bodyScale), lineHeight: 1.35, color: C.ink }}>{pt}</span>
            </div>
          ))}
          <div style={{ borderTop: `2px solid ${C.inkHairline}` }} />
        </div>
        {interaction?.label && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 18, alignSelf: "flex-start", border: `2px solid ${C.ink}`, padding: "12px 20px" }}>
            <span style={{ fontFamily: F.heavy, fontWeight: 700, fontSize: 26, letterSpacing: "0.12em", textTransform: "uppercase", background: C.ink, color: C.paper, padding: "4px 12px" }}>{VERB[interaction.type] ?? "Save"}</span>
            <span style={{ fontFamily: F.thin, fontWeight: 400, fontSize: 28, color: C.ink }}>{interaction.label}</span>
          </div>
        )}
        {followLine && (
          <div style={{ fontFamily: F.thin, fontWeight: 300, fontSize: 24, color: C.inkMuted }}>{followLine}</div>
        )}
      </div>

      <ProgressRule index={total} total={total} bottom={130} />
      <ContentCorners pillar={pillar} counter={`${pad(total)} / ${pad(total)}`} slideH={slideH} />
    </SlideWrapper>
  );
}
