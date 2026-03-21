import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";

type Props = { headline: string; followLine: string; scale?: number; id?: string };

export default function CTASlide({ headline, followLine, scale = 1, id }: Props) {
  const parts = followLine.split("@lunia_life");
  return (
    <SlideWrapper scale={scale} id={id} style={{ background: "#f0ece6" }}>
      <ArrowIcons color="#9ab0b8" />
      <div style={{ position: "absolute", top: 110, left: 72, right: 72 }}>
        <div style={{
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: 400,
          fontSize: 72,
          color: "#1e7a8a",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          lineHeight: 1.15,
        }}>
          {headline}
        </div>
        <div style={{
          fontFamily: "Lora, Merriweather, serif",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: 36,
          color: "#1e7a8a",
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
