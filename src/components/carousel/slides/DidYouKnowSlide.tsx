import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import type { DidYouKnowSlideContent, DidYouKnowToken } from "@/lib/types";

type Props = {
  slide: DidYouKnowSlideContent;
  scale?: number;
  id?: string;
};

const BG = "#EEEBE3";
const HEADER_COLOR = "#1E6B8C";
const HIGHLIGHT_COLOR = "#1E6B8C";
const BODY_COLOR = "#1A1A1A";
const FOOTER_COLOR = "#1A1A1A";

function renderTokens(tokens: DidYouKnowToken[]) {
  return tokens.map((t, i) => (
    <span
      key={i}
      style={t.highlight ? { color: HIGHLIGHT_COLOR, fontWeight: 700 } : undefined}
    >
      {t.text}
    </span>
  ));
}

function LuniaLifeMark() {
  return (
    <div style={{
      position: "absolute",
      top: 80,
      left: 0,
      right: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 14,
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 2 L28 20 L46 24 L28 28 L24 46 L20 28 L2 24 L20 20 Z" fill={HEADER_COLOR} />
      </svg>
      <div style={{
        fontFamily: "Jost, Montserrat, sans-serif",
        fontWeight: 500,
        fontSize: 22,
        letterSpacing: "0.32em",
        color: "#1A1A1A",
        textTransform: "uppercase",
      }}>
        LUNIA LIFE
      </div>
    </div>
  );
}

function Chevrons() {
  return (
    <svg
      width="160"
      height="48"
      viewBox="0 0 160 48"
      fill="none"
      style={{ position: "absolute", bottom: 70, right: 80 }}
    >
      <polyline points="20,8 44,24 20,40" stroke={HEADER_COLOR} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3" />
      <polyline points="68,8 92,24 68,40" stroke={HEADER_COLOR} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      <polyline points="116,8 140,24 116,40" stroke={HEADER_COLOR} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="1" />
    </svg>
  );
}

export default function DidYouKnowSlide({ slide, scale = 1, id }: Props) {
  return (
    <SlideWrapper scale={scale} height={1350} id={id} style={{ background: BG }}>
      <LuniaLifeMark />

      <div style={{
        position: "absolute",
        top: 380,
        left: 96,
        right: 96,
        fontFamily: "Inter, 'Helvetica Neue', sans-serif",
        fontWeight: 700,
        fontStyle: "italic",
        fontSize: 76,
        letterSpacing: "0.02em",
        color: HEADER_COLOR,
        lineHeight: 1.05,
      }}>
        {slide.header}
      </div>

      <div style={{
        position: "absolute",
        top: 540,
        left: 96,
        right: 96,
        fontFamily: "Inter, 'Helvetica Neue', sans-serif",
        fontWeight: 400,
        fontSize: 38,
        lineHeight: 1.32,
        color: BODY_COLOR,
        letterSpacing: "-0.005em",
        wordBreak: "normal",
        hyphens: "none",
      }}>
        <p style={{ margin: 0 }}>{renderTokens(slide.body1)}</p>
        <p style={{ margin: "28px 0 0 0" }}>{renderTokens(slide.body2)}</p>
      </div>

      <div style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: "Jost, Montserrat, sans-serif",
        fontWeight: 400,
        fontSize: 22,
        letterSpacing: "0.18em",
        color: FOOTER_COLOR,
        opacity: 0.78,
      }}>
        lunialife.com
      </div>

      <Chevrons />
    </SlideWrapper>
  );
}
