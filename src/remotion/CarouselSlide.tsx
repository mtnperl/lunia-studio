import React from "react";
import { AbsoluteFill } from "remotion";
import { loadFont as loadJost } from "@remotion/google-fonts/Jost";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import EditorialContentSlide from "@/components/carousel/slides/EditorialContentSlide";
import type { BrandStyle } from "@/lib/types";

// Register the fonts ContentSlide + its graphics use so headless Chromium has
// them before the still is painted. loadFont() wires delayRender internally.
loadJost("normal", { weights: ["400", "500"], subsets: ["latin"] });
loadInter("normal", { weights: ["300", "400", "700"], subsets: ["latin"] });
loadCormorant("normal", { weights: ["400"], subsets: ["latin"] });
loadOutfit("normal", { weights: ["500", "700"], subsets: ["latin"] });

// Faithful pass-through of the real slide props (see ContentSlide). `type` (not
// interface) so it satisfies Remotion's `Props extends Record<string, unknown>`.
export type CarouselSlideProps = {
  headline: string;
  body: string;
  citation: string;
  graphic?: string;
  graphicImageUrl?: string;
  brandStyle?: BrandStyle;
  slideBgColor?: string;
  darkBackground?: boolean;
  citationFontSize?: number;
  reels?: boolean;
  headlineScale?: number;
  bodyScale?: number;
  logoScale?: number;
  arrowScale?: number;
  stylePreset?: "default" | "editorial-scientific";
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
};

/**
 * Renders the REAL carousel content slide (default or editorial preset) inside a
 * Remotion composition, so a server-side `renderStill` produces a pixel-faithful
 * PNG identical to the in-app preview — no parallel/divergent slide design.
 */
export const CarouselSlide: React.FC<CarouselSlideProps> = (props) => {
  return (
    <AbsoluteFill style={{ background: props.slideBgColor ?? "#01253f" }}>
      {props.stylePreset === "editorial-scientific" ? (
        <EditorialContentSlide {...props} scale={1} />
      ) : (
        <ContentSlide {...props} scale={1} />
      )}
    </AbsoluteFill>
  );
};

export default CarouselSlide;
