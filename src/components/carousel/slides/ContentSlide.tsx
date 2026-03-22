import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import WaveGraphic from "@/components/carousel/graphics/WaveGraphic";
import DotChainGraphic from "@/components/carousel/graphics/DotChainGraphic";
import ComparisonBars from "@/components/carousel/graphics/ComparisonBars";
import StepList from "@/components/carousel/graphics/StepList";
import StatCallout from "@/components/carousel/graphics/StatCallout";
import IconGrid from "@/components/carousel/graphics/IconGrid";
import { BrandStyle, GraphicStyle } from "@/lib/types";
import { extractGraphicData } from "@/lib/carousel-utils";

// Strip potentially harmful attributes from Claude-generated SVG
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    // Ensure SVG fills the full 936px container width
    .replace(/<svg(?![^>]*\bwidth=)/, '<svg width="100%"');
}

type Props = {
  headline: string;
  body: string;
  citation: string;
  graphic?: string;            // SVG from Claude (new path)
  graphicStyle?: GraphicStyle; // legacy fallback for saved carousels
  brandStyle?: BrandStyle;
  scale?: number;
  id?: string;
};

// Legacy graphic zone (only used when no SVG graphic is present)
function LegacyGraphicZone({ style, headline, body }: { style: GraphicStyle; headline: string; body: string }) {
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
    <div style={{ position: "absolute", bottom: 60, left: 72, right: 72 }}>
      {graphic}
    </div>
  );
}

export default function ContentSlide({ headline, body, citation, graphic, graphicStyle = "textOnly", brandStyle, scale = 1, id }: Props) {
  const hasSvg = !!graphic && graphic.trim().length > 10;
  const hasLegacyGraphic = !hasSvg && graphicStyle !== "textOnly";

  const bg = brandStyle?.background ?? "#f0ece6";
  const headlineColor = brandStyle?.headline ?? "#1e7a8a";
  const bodyColor = brandStyle?.body ?? "#1a2535";
  const citationColor = brandStyle?.secondary ?? "#6b7280";
  const arrowColor = brandStyle?.secondary ?? "#9ab0b8";

  // Slightly smaller body text when a graphic occupies the bottom portion
  const bodyFontSize = hasSvg ? 27 : (hasLegacyGraphic ? 30 : 34);

  return (
    <SlideWrapper scale={scale} id={id} style={{ background: bg }}>
      <ArrowIcons color={arrowColor} />
      <LuniaLogo />
      <div style={{ position: "absolute", top: 80, left: 72, right: 72 }}>
        {/* Headline — Jost 400 */}
        <div style={{
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: 400,
          fontSize: 52,
          color: headlineColor,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          lineHeight: 1.2,
        }}>
          {headline}
        </div>

        {/* Body — Inter */}
        <div style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 400,
          fontSize: bodyFontSize,
          color: bodyColor,
          lineHeight: 1.6,
          marginTop: 36,
          maxWidth: 936,
        }}>
          {body}
        </div>

        {/* Citation — Cormorant Garamond italic, smaller */}
        <div style={{
          fontFamily: "Cormorant Garamond, Lora, serif",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: 17,
          color: citationColor,
          marginTop: 24,
          maxWidth: 936,
          lineHeight: 1.4,
        }}>
          {citation}
        </div>

        {/* SVG infographic from Claude */}
        {hasSvg && (
          <div
            style={{ marginTop: 32, overflow: "hidden" }}
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(graphic!) }}
          />
        )}
      </div>

      {/* Legacy graphic zone for saved carousels */}
      {hasLegacyGraphic && (
        <LegacyGraphicZone style={graphicStyle} headline={headline} body={body} />
      )}
    </SlideWrapper>
  );
}
