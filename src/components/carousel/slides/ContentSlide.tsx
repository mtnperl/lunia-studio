import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import WaveGraphic from "@/components/carousel/graphics/WaveGraphic";
import DotChainGraphic from "@/components/carousel/graphics/DotChainGraphic";
import ComparisonBars from "@/components/carousel/graphics/ComparisonBars";
import StepList from "@/components/carousel/graphics/StepList";
import StatCallout from "@/components/carousel/graphics/StatCallout";
import IconGrid from "@/components/carousel/graphics/IconGrid";
import { GraphicStyle } from "@/lib/types";

type Props = {
  headline: string;
  body: string;
  citation: string;
  graphicStyle: GraphicStyle;
  scale?: number;
  id?: string;
};

function GraphicZone({ style, body }: { style: GraphicStyle; body: string }) {
  if (style === "textOnly") return null;
  const map: Record<GraphicStyle, React.ReactNode> = {
    wave: <WaveGraphic />,
    dotchain: <DotChainGraphic />,
    bars: <ComparisonBars />,
    steps: <StepList />,
    stat: <StatCallout />,
    iconGrid: <IconGrid />,
    textOnly: null,
  };
  return (
    <div style={{
      position: "absolute",
      bottom: 60,
      left: 72,
      right: 72,
    }}>
      {map[style]}
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
          fontFamily: "Outfit, sans-serif",
          fontWeight: 700,
          fontSize: 52,
          color: "#1e7a8a",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          lineHeight: 1.2,
        }}>
          {headline}
        </div>
        <div style={{
          fontFamily: "Outfit, sans-serif",
          fontWeight: 400,
          fontSize: isTextOnly ? 36 : 32,
          color: "#1a2535",
          lineHeight: 1.55,
          marginTop: 40,
          maxWidth: 936,
        }}>
          {body}
        </div>
        <div style={{
          fontFamily: "Outfit, sans-serif",
          fontWeight: 300,
          fontStyle: "italic",
          fontSize: 24,
          color: "#4a5568",
          marginTop: 32,
          maxWidth: 936,
        }}>
          Research: {citation}
        </div>
      </div>
      <GraphicZone style={graphicStyle} body={body} />
    </SlideWrapper>
  );
}
