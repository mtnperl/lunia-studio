import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { BrandStyle } from "@/lib/types";

type Props = {
  headline: string;
  followLine: string;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  backgroundImage?: string | null;  // fal.ai generated background
  shimmer?: boolean;                // show shimmer while loading
};

export default function CTASlide({ headline, followLine, scale = 1, id, brandStyle, backgroundImage, shimmer = false }: Props) {
  const parts = followLine.split("@lunia_life");

  const bg = brandStyle?.background ?? "#f0ece6";
  const headlineColor = brandStyle?.headline ?? "#1e7a8a";
  const followColor = brandStyle?.headline ?? "#1e7a8a";
  const arrowColor = brandStyle?.secondary ?? "#9ab0b8";

  return (
    <SlideWrapper scale={scale} id={id} style={{ background: bg }}>
      {/* fal.ai background image — 15% opacity, atmospheric */}
      {backgroundImage ? (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
        }} />
      ) : shimmer ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.02) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }} />
      ) : null}

      <ArrowIcons color={arrowColor} />
      <LuniaLogo />
      <div style={{ position: "absolute", top: 110, left: 72, right: 72 }}>
        <div style={{
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: 400,
          fontSize: 72,
          color: headlineColor,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          lineHeight: 1.15,
        }}>
          {headline}
        </div>
        <div style={{
          fontFamily: "Cormorant Garamond, Lora, serif",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: 36,
          color: followColor,
          lineHeight: 1.4,
          marginTop: 56,
        }}>
          {parts[0]}
          <span style={{ fontWeight: 700 }}>@lunia_life</span>
          {parts[1]}
        </div>
      </div>
    </SlideWrapper>
  );
}
