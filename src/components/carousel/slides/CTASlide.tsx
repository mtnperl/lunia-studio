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
  logoScale?: number;
  darkBackground?: boolean;         // match hook slide dark background
  showLuniaLifeWatermark?: boolean;
};

export default function CTASlide({ headline, followLine, scale = 1, id, brandStyle, backgroundImage, shimmer = false, logoScale = 1, darkBackground = false, showLuniaLifeWatermark = false }: Props) {
  const parts = followLine.split("@lunia_life");

  const bg = darkBackground ? (brandStyle?.hookBackground ?? 'linear-gradient(160deg, #0a1628 0%, #0d2137 40%, #0a2a3a 100%)') : (brandStyle?.background ?? "#f0ece6");
  const headlineColor = darkBackground ? (brandStyle?.hookHeadline ?? '#ffffff') : (brandStyle?.headline ?? "#1e7a8a");
  const followColor = darkBackground ? 'rgba(255,255,255,0.8)' : (brandStyle?.headline ?? "#1e7a8a");

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

      <LuniaLogo variant={darkBackground ? "light" : "dark"} sizeScale={logoScale} />
      {showLuniaLifeWatermark && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Jost, Montserrat, sans-serif',
          fontWeight: 300,
          fontSize: 18,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: darkBackground ? '#ffffff' : '#0d2137',
          opacity: 0.13,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          LUNIA LIFE
        </div>
      )}
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
