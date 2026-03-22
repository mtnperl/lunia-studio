import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { BrandStyle } from "@/lib/types";

type Props = { headline: string; followLine: string; scale?: number; id?: string; brandStyle?: BrandStyle };

export default function CTASlide({ headline, followLine, scale = 1, id, brandStyle }: Props) {
  const parts = followLine.split("@lunia_life");

  const bg = brandStyle?.background ?? "#f0ece6";
  const headlineColor = brandStyle?.headline ?? "#1e7a8a";
  const followColor = brandStyle?.headline ?? "#1e7a8a";
  const arrowColor = brandStyle?.secondary ?? "#9ab0b8";

  return (
    <SlideWrapper scale={scale} id={id} style={{ background: bg }}>
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
