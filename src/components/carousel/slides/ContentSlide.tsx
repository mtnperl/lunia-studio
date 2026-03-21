import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import WaveGraphic from "@/components/carousel/graphics/WaveGraphic";
import DotChainGraphic from "@/components/carousel/graphics/DotChainGraphic";
import ComparisonBars from "@/components/carousel/graphics/ComparisonBars";
import StepList from "@/components/carousel/graphics/StepList";
import StatCallout from "@/components/carousel/graphics/StatCallout";
import IconGrid from "@/components/carousel/graphics/IconGrid";
import { GraphicStyle } from "@/lib/types";
import { extractGraphicData } from "@/lib/carousel-utils";

type Props = {
  headline: string;
  body: string;
  citation: string;
  graphicStyle: GraphicStyle;
  scale?: number;
  id?: string;
};

function GraphicZone({ style, headline, body }: { style: GraphicStyle; headline: string; body: string }) {
  if (style === "textOnly") return null;
  const data = extractGraphicData(style, headline, body);
  let graphic: React.ReactNode;
  switch (data.style) {
    case "stat":     graphic = <StatCallout stat={data.data.stat} label={data.data.label} />; break;
    case "bars":     graphic = <ComparisonBars items={data.data.items} />; break;
    case "steps":    graphic = <StepList steps={data.data.steps} />; break;
    case "dotchain": graphic = <DotChainGraphic labels={data.data.labels} />; break;
    case "wave":     graphic = <WaveGraphic />; break;
    case "iconGrid": graphic = <IconGrid />; break;
    default:         return null;
  }
  return (
    <div style={{
      position: "absolute",
      bottom: 60,
      left: 72,
      right: 72,
    }}>
      {graphic}
    </div>
  );
}

export default function ContentSlide({ headline, body, citation, graphicStyle, scale = 1, id }: Props) {
  const isTextOnly = graphicStyle === "textOnly";
  return (
    <SlideWrapper scale={scale} id={id} style={{ background: "#f0ece6" }}>
      <ArrowIcons color="#9ab0b8" />
      <div style={{ position: "absolute", top: 80, left: 72, right: 72 }}>
        <div style={{
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 52,
          color: "#1e7a8a",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          lineHeight: 1.2,
        }}>
          {headline}
        </div>
        <div style={{
          fontFamily: "Lora, Merriweather, serif",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: isTextOnly ? 34 : 30,
          color: "#1a2535",
          lineHeight: 1.6,
          marginTop: 40,
          maxWidth: 936,
        }}>
          {body}
        </div>
        <div style={{
          fontFamily: "Lora, Merriweather, serif",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: 22,
          color: "#4a5568",
          marginTop: 32,
          maxWidth: 936,
        }}>
          Research: {citation}
        </div>
      </div>
      <GraphicZone style={graphicStyle} headline={headline} body={body} />
    </SlideWrapper>
  );
}
