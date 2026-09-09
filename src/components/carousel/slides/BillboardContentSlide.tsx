// Billboard content slide: the headline pair left-aligned at the top, Inter
// light body, an italic citation, a faint watermark behind, and the four
// corners with the deck's pillar lit. No photo, no graphic: the cover carries
// the picture and the body slides carry the argument.

import type { CSSProperties } from "react";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { PaperTexture } from "@/components/carousel/shared/EssayChrome";
import { ContentCorners, HeadlinePair, ProgressRule, Watermark, billboardPaper, DEFAULT_PILLAR } from "@/components/carousel/shared/BillboardChrome";
import { BILLBOARD_COLORS as C, BILLBOARD_FONTS as F, BILLBOARD_TYPE as T, BILLBOARD_LAYOUT as L, SLIDE, type PaperSettings } from "@/lib/brand-tokens";
import type { BillboardPillar } from "@/lib/types";

type Props = {
  headline: string;
  body: string;
  citation?: string;
  /** The heavy line of the headline. Absent: the last words. "": none. */
  headlineEmphasis?: string;
  /** Viral-style body phrase; drawn at weight 500 in the same ink. */
  emphasis?: string;
  pillar?: BillboardPillar;
  paper?: Partial<PaperSettings>;
  scale?: number;
  id?: string;
  reels?: boolean;
  frameH?: number;
  /** 0-based content index and content count, for the counter and the rule. */
  slideIndex?: number;
  slideTotal?: number;
  headlineScale?: number;
  bodyScale?: number;
  citationFontSize?: number;
  showCitationBars?: boolean;
  // Accepted for call-site compatibility with the other content slides.
  graphic?: string;
  graphicImageUrl?: string;
  bgImageUrl?: string;
  brandStyle?: unknown;
  logoScale?: number;
  arrowScale?: number;
  darkBackground?: boolean;
  slideBgColor?: string;
  showLuniaLifeWatermark?: boolean;
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  iconScale?: number;
  bgOverlayOpacity?: number;
  essayAccent?: unknown;
  figure?: string;
  stylePreset?: string;
  prominentWatermark?: boolean;
  isEssay?: boolean;
  essayNumber?: string;
  essayDate?: string;
};

function Emphasised({ text, phrase }: { text: string; phrase?: string }) {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (!phrase || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span style={{ fontWeight: 500 }}>{phrase}</span>
      {text.slice(at + phrase.length)}
    </>
  );
}

export default function BillboardContentSlide({
  headline, body, citation, headlineEmphasis, emphasis, pillar = DEFAULT_PILLAR, paper, scale = 1, id, reels = false, frameH,
  slideIndex = 0, slideTotal = 3, headlineScale = 1, bodyScale = 1, citationFontSize, showCitationBars = true,
}: Props) {
  const slideH = frameH ?? (reels ? SLIDE.height.reels : SLIDE.height.carousel);
  const p = billboardPaper(paper);
  const pad = (n: number) => String(n).padStart(2, "0");
  // Counter counts the cover as 01, so content slide 0 is 02 of the deck.
  const counter = `${pad(slideIndex + 2)} / ${pad(slideTotal + 2)}`;
  // The generator is asked for 40 to 70 words; past that the body steps
  // down so eleven lines still clear the rule.
  const words = body.split(/\s+/).filter(Boolean).length;
  const bodyPx = Math.round(T.body * bodyScale * (words > 90 ? 0.82 : words > 70 ? 0.9 : 1));
  const bodyStyle: CSSProperties = {
    fontFamily: F.thin, fontWeight: 300, fontSize: bodyPx, lineHeight: 1.45, color: C.ink, maxWidth: 880, whiteSpace: "pre-wrap",
  };
  const paragraphs = body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: C.paper }}>
      <PaperTexture opacity={p.grain} vignette={p.vignette} />
      <Watermark top={Math.round(slideH * 0.36)} opacity={0.7} />

      <div style={{ position: "absolute", left: L.padX, right: L.padX, top: L.contentTop, bottom: 190, display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 44, overflow: "hidden" }}>
        <HeadlinePair text={headline} heavy={headlineEmphasis} thinSize={Math.round(T.thin * headlineScale)} heavySize={Math.round(T.heavy * headlineScale)} align="left" />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {paragraphs.map((para, i) => (
            <div key={i} style={bodyStyle}><Emphasised text={para} phrase={emphasis} /></div>
          ))}
        </div>
        {showCitationBars && citation && (
          // Two lines at most. A full journal reference runs to five, and the
          // rule and the handle sit right under this column.
          <div style={{
            fontFamily: F.thin, fontWeight: 300, fontStyle: "italic", fontSize: citationFontSize ?? T.cite, color: C.inkMuted, lineHeight: 1.3,
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
          }}>{citation}</div>
        )}
      </div>

      <ProgressRule index={slideIndex + 2} total={slideTotal + 2} bottom={130} />
      <ContentCorners pillar={pillar} counter={counter} slideH={slideH} />
    </SlideWrapper>
  );
}
