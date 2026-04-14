import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { BrandStyle } from "@/lib/types";

type Props = {
  headline: string;
  commentKeyword: string;
  followLine?: string;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  backgroundImage?: string | null;
  shimmer?: boolean;
  logoScale?: number;
  showLuniaLifeWatermark?: boolean;
  reels?: boolean;
};

export default function CommentCTASlide({
  headline,
  commentKeyword,
  followLine = "We'll DM you the full breakdown.",
  scale = 1,
  id,
  brandStyle,
  backgroundImage,
  shimmer = false,
  logoScale = 1,
  showLuniaLifeWatermark = false,
  reels = false,
}: Props) {
  const slideH = reels ? 1920 : 1350;
  const bg = brandStyle?.hookBackground ?? "linear-gradient(160deg, #0a1628 0%, #0d2137 40%, #0a2a3a 100%)";
  const headlineColor = brandStyle?.hookHeadline ?? "#ffffff";
  const accentColor = brandStyle?.accent ?? "#c8dde8";

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: bg, overflow: "hidden" }}>
      {/* Background image — subtle */}
      {backgroundImage ? (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.12,
        }} />
      ) : shimmer ? (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.6s ease-in-out infinite",
        }} />
      ) : null}

      <LuniaLogo variant="light" sizeScale={logoScale} />

      {showLuniaLifeWatermark && (
        <div style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: 300,
          fontSize: 18,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "#ffffff",
          opacity: 0.13,
          pointerEvents: "none",
          userSelect: "none",
        }}>
          LUNIA LIFE
        </div>
      )}

      {/* Content — centered flex column */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: reels ? "220px 72px" : "80px 72px",
        boxSizing: "border-box",
        textAlign: "center",
      }}>
        {/* Headline */}
        <div style={{
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: 400,
          fontSize: 56,
          color: headlineColor,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          lineHeight: 1.15,
          marginBottom: 48,
        }}>
          {headline}
        </div>

        {/* Keyword callout — the visual anchor */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: "Jost, Montserrat, sans-serif",
            fontWeight: 300,
            fontSize: 28,
            color: headlineColor,
            opacity: 0.7,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            Comment
          </div>
          <div style={{
            fontFamily: "Jost, Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 64,
            color: accentColor,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "8px 32px",
            border: `2px solid ${accentColor}`,
            borderRadius: 8,
          }}>
            {commentKeyword}
          </div>
          <div style={{
            fontFamily: "Jost, Montserrat, sans-serif",
            fontWeight: 300,
            fontSize: 28,
            color: headlineColor,
            opacity: 0.7,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            below
          </div>
        </div>

        {/* Sub-instruction */}
        <div style={{
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          fontWeight: 400,
          fontSize: 32,
          color: headlineColor,
          opacity: 0.6,
          lineHeight: 1.5,
          maxWidth: 700,
        }}>
          {followLine}
        </div>

        {/* Follow line */}
        <div style={{
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: 24,
          color: accentColor,
          opacity: 0.5,
          marginTop: 40,
          letterSpacing: "0.02em",
        }}>
          Follow @lunia_life for science-based sleep strategies.
        </div>
      </div>
    </SlideWrapper>
  );
}
