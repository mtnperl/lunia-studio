import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { BrandStyle } from "@/lib/types";
import { isDarkColor, INK_LIGHT, INK_DARK } from "@/lib/color";
import { CAROUSEL_ICONS } from "@/lib/carousel-icons";

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
  stylePreset?: "default" | "editorial-scientific";
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
  /** Optional GraphicSpec JSON — currently only iconLayout is honoured on the
   *  CTA, rendered as a centred icon row under the follow line (editorial only). */
  graphic?: string;
};

type IconLayoutData = { icons: { id: string }[]; showLabels?: boolean };

function parseCtaIconLayout(graphic?: string): IconLayoutData | null {
  if (!graphic) return null;
  try {
    const parsed = JSON.parse(graphic);
    if (parsed?.component === "iconLayout" && Array.isArray(parsed.data?.icons)) {
      const data = parsed.data as IconLayoutData;
      return { icons: data.icons, showLabels: data.showLabels !== false };
    }
    if (parsed?.component === "icon" && parsed.data?.id) {
      return { icons: [{ id: parsed.data.id as string }], showLabels: false };
    }
  } catch { /* ignore */ }
  return null;
}

export default function CTASlide({ headline, followLine, scale = 1, id, brandStyle, backgroundImage, shimmer = false, logoScale = 1, darkBackground = false, slideBgColor, showLuniaLifeWatermark = false, prominentWatermark = false, reels = false, stylePreset = "default", showSlideArrows: _showSlideArrows = true, showSlideNumbers: _showSlideNumbers = true, showCitationBars: _showCitationBars = true, graphic }: Props) {
  const isEditorial = stylePreset === "editorial-scientific";
  const slideH = reels ? 1920 : 1350;
  const contentTop = reels ? 200 : 110;
  const parts = followLine.split("@lunia_life");

  const fallbackBg = darkBackground ? '#F7F4EF' : '#01253f';
  const brandBg = darkBackground ? brandStyle?.hookBackground : brandStyle?.background;
  // Editorial preset always matches the content-slide pearl-ivory background,
  // regardless of `darkBackground` — the CTA is part of the same editorial
  // spread and must not flip to a contrasting palette.
  const bg = isEditorial
    ? (slideBgColor ?? brandStyle?.background ?? '#EFEFF4')
    : (slideBgColor ?? brandBg ?? fallbackBg);
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

      {/* Editorial spread omits the constellation logo — the centred LUNIA LIFE
          wordmark is the only brand mark, matching the content-slide chrome. */}
      {!isEditorial && (
        <LuniaLogo variant={useDarkInk ? "dark" : "light"} sizeScale={logoScale} />
      )}
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
        <div style={isEditorial ? {
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          fontWeight: 300,
          fontSize: 80,
          color: headlineColor,
          textTransform: "none",
          letterSpacing: "-0.015em",
          lineHeight: 1.1,
        } : {
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
        <div style={isEditorial ? {
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          fontWeight: 200,
          fontSize: 36,
          color: followColor,
          lineHeight: 1.45,
          marginTop: 56,
        } : {
          fontFamily: "Cormorant Garamond, Lora, serif",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: 36,
          color: followColor,
          lineHeight: 1.4,
          marginTop: 56,
        }}>
          {parts[0]}
          <span style={{ fontWeight: isEditorial ? 500 : 700 }}>@lunia_life</span>
          {parts[1]}
        </div>

        {/* Editorial CTA icon row — centred under the follow line. */}
        {isEditorial && (() => {
          const layout = parseCtaIconLayout(graphic);
          if (!layout || layout.icons.length === 0) return null;
          const showLabels = layout.showLabels !== false;
          const rows = layout.icons
            .slice(0, 4)
            .map((i) => CAROUSEL_ICONS.find((c) => c.id === i.id))
            .filter(Boolean) as { id: string; label: string; svg: string; category: string }[];
          if (rows.length === 0) return null;
          const ink = useDarkInk ? "#01253f" : "#F7F4EF";
          const labelCol = useDarkInk ? "#01253f" : "#F7F4EF";
          return (
            <div style={{
              marginTop: 80,
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: showLabels ? 56 : 36,
              alignItems: "center",
              justifyContent: "center",
            }}>
              {rows.map((ic) => (
                <div key={ic.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 68, height: 68, borderRadius: "50%",
                    background: ink,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={bg} strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ width: 34, height: 34 }}
                      dangerouslySetInnerHTML={{ __html: ic.svg }} />
                  </div>
                  {showLabels && (
                    <div style={{
                      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                      fontWeight: 400,
                      fontSize: 18,
                      color: labelCol,
                      letterSpacing: "0.04em",
                      textAlign: "center",
                      maxWidth: 160,
                    }}>{ic.label}</div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </SlideWrapper>
  );
}
