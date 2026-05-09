import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { BrandStyle } from "@/lib/types";
import { isDarkColor, INK_LIGHT, INK_DARK } from "@/lib/color";

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
  /** Override the slide background with any color. Auto-derives ink from luminance. */
  slideBgColor?: string;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;     // v2: bolder, more visible watermark
  reels?: boolean;                  // 9:16 Reels format (1920px height, expanded padding)
};

export default function CTASlide({ headline, followLine, scale = 1, id, brandStyle, backgroundImage, shimmer = false, logoScale = 1, darkBackground = false, slideBgColor, showLuniaLifeWatermark = false, prominentWatermark = false, reels = false }: Props) {
  const slideH = reels ? 1920 : 1350;
  const contentTop = reels ? 200 : 110;
  const parts = followLine.split("@lunia_life");

  const fallbackBg = darkBackground ? '#F7F4EF' : '#01253f';
  const brandBg = darkBackground ? brandStyle?.hookBackground : brandStyle?.background;
  const bg = slideBgColor ?? brandBg ?? fallbackBg;
  const bgIsDark = isDarkColor(bg);
  const useAutoInk = slideBgColor !== undefined;
  const ink = bgIsDark ? INK_LIGHT : INK_DARK;

  const headlineColor = useAutoInk
    ? ink
    : (darkBackground ? (brandStyle?.headline ?? INK_DARK) : (brandStyle?.hookHeadline ?? INK_LIGHT));
  const followColor = useAutoInk
    ? (bgIsDark ? 'rgba(247,244,239,0.8)' : '#01253f')
    : (darkBackground ? (brandStyle?.headline ?? '#01253f') : 'rgba(247,244,239,0.8)');
  const useDarkInk = useAutoInk ? !bgIsDark : darkBackground;

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: bg }}>
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

      <LuniaLogo variant={useDarkInk ? "dark" : "light"} sizeScale={logoScale} />
      {showLuniaLifeWatermark && (
        <div style={{
          position: 'absolute',
          bottom: prominentWatermark ? 30 : 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Jost, Montserrat, sans-serif',
          fontWeight: prominentWatermark ? 500 : 300,
          fontSize: prominentWatermark ? 22 : 18,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: useDarkInk ? '#01253f' : '#F7F4EF',
          opacity: prominentWatermark ? 0.55 : 0.13,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          LUNIA LIFE
        </div>
      )}
      <div style={{ position: "absolute", top: contentTop, left: 72, right: 72 }}>
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
