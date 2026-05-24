"use client";
import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { BrandStyle } from "@/lib/types";
import { CAROUSEL_ICONS } from "@/lib/carousel-icons";
import { parseGraphicSpec } from "@/lib/carousel-utils";
import { renderGraphicSpec } from "@/components/carousel/graphics/graphicComponentMap";

const SLIDE_W = 1080;
const SLIDE_H = { carousel: 1350, reels: 1920 };
const PAD = { x: 84, y: 88 };

const EDITORIAL_FONT = "Inter, system-ui, -apple-system, sans-serif";

type Props = {
  headline: string;
  body: string;
  citation: string;
  /** GraphicSpec JSON — if it parses to an `iconLayout`, the icons render as stat rows. */
  graphic?: string;
  /** Optional product / lifestyle photo shown in the right column. */
  bgImageUrl?: string;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  logoScale?: number;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
  citationFontSize?: number;
  reels?: boolean;
  headlineScale?: number;
  bodyScale?: number;
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
  // Accepted (but visually ignored) so this component is drop-in compatible
  // with the existing ContentSlide call sites in PreviewStep:
  arrowScale?: number;
  darkBackground?: boolean;
  slideBgColor?: string;
  bgImageShimmer?: boolean;
  bgImageOverlayOpacity?: number;
  stylePreset?: "default" | "editorial-scientific";
};

type IconLayoutData = { icons: { id: string }[]; showLabels?: boolean };

function parseIconLayout(graphic?: string): IconLayoutData | null {
  if (!graphic) return null;
  try {
    const parsed = JSON.parse(graphic);
    if (parsed?.component === "iconLayout" && Array.isArray(parsed.data?.icons)) {
      // Default showLabels=true to match the editor's "Show labels" checkbox
      // default; if the saved spec explicitly sets false, respect it.
      const data = parsed.data as IconLayoutData;
      return { icons: data.icons, showLabels: data.showLabels !== false };
    }
    if (parsed?.component === "icon" && parsed.data?.id) {
      return { icons: [{ id: parsed.data.id as string }], showLabels: false };
    }
  } catch { /* ignore */ }
  return null;
}

export default function EditorialContentSlide({
  headline,
  body,
  citation,
  graphic,
  bgImageUrl,
  scale = 1,
  id,
  brandStyle,
  logoScale = 1,
  showLuniaLifeWatermark = false,
  prominentWatermark = false,
  citationFontSize = 22,
  reels = false,
  headlineScale = 1,
  bodyScale = 1,
  showCitationBars = true,
  showSlideArrows = true,
  arrowScale = 1,
}: Props) {
  const slideH = reels ? SLIDE_H.reels : SLIDE_H.carousel;
  const py = reels ? 200 : PAD.y;

  // Lunia palette defaults — preset already passes EDITORIAL_BRAND_STYLE in.
  const bg          = brandStyle?.background     ?? "#EFEFF4";
  const headlineCol = brandStyle?.headline       ?? "#01253f";
  const bodyCol     = brandStyle?.body           ?? "#01253f";
  const ruleCol     = brandStyle?.secondary      ?? "#2C3F51";
  const citationCol = brandStyle?.secondary      ?? "#2C3F51";
  const wordmarkCol = brandStyle?.headline       ?? "#01253f";
  const arrowCol    = brandStyle?.secondary      ?? "#2C3F51";

  const iconLayout = parseIconLayout(graphic);
  const showIconLabels = iconLayout?.showLabels !== false;
  const iconRows = iconLayout
    ? iconLayout.icons
        .slice(0, 4)
        .map((i) => CAROUSEL_ICONS.find((c) => c.id === i.id))
        .filter(Boolean) as { id: string; label: string; svg: string; category: string }[]
    : [];
  // Non-icon graphic specs (stat, bars, donut, hubSpoke, iceberg, vector, …)
  // render via the shared component map below the body — same components the
  // default carousel slide uses, so any infographic the editor offers works in
  // the editorial preset too.
  const otherGraphicSpec = !iconLayout ? parseGraphicSpec(graphic) : null;
  const hasOtherGraphic = !!otherGraphicSpec;
  const hasPhoto = !!bgImageUrl;

  // Headline + body sizes — scale-aware so the existing PreviewStep size sliders still bite.
  const headlineSize = Math.round(96 * headlineScale);
  const bodySize     = Math.round(38 * bodyScale);

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: bg }}>
      {/* Brand mark — top-left wordmark instead of the default bottom badge */}
      <div style={{
        position: "absolute", top: py, left: PAD.x,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        {/* compact constellation */}
        <svg width={64} height={48} viewBox="0 0 352 264">
          <g fill={wordmarkCol}>
            {[[132,44],[220,44],[132,132],[220,132],[44,220],[132,220],[220,220],[308,220]].map(([cx,cy],i) => (
              <path key={i} d={`M${cx},${cy - 44}Q${cx},${cy} ${cx + 44},${cy}Q${cx},${cy} ${cx},${cy + 44}Q${cx},${cy} ${cx - 44},${cy}Q${cx},${cy} ${cx},${cy - 44}Z`} />
            ))}
          </g>
        </svg>
        <span style={{
          fontFamily: EDITORIAL_FONT,
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: "0.16em",
          color: wordmarkCol,
        }}>LUNIA LIFE</span>
      </div>

      {/* Optional product/lifestyle photo on the right — bleeds to the slide
          edge like the reference layouts (bottle-on-pedestal, bottle-on-rock). */}
      {hasPhoto && (
        <img
          src={bgImageUrl}
          crossOrigin="anonymous"
          alt=""
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 520,
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      )}

      {/* Main editorial column — headline + rule + body + (optional) icon row.
          The icon row sits INSIDE this column right under the body so the
          icons hug the text instead of floating at the bottom of the slide. */}
      <div style={{
        position: "absolute",
        top: py + 140,                                              // sit below the brand mark
        left: PAD.x,
        // Only narrow the column when a product photo actually sits on the right.
        right: hasPhoto ? 560 : PAD.x,
        bottom: py + 60,                                            // just enough room for the citation
        display: "flex", flexDirection: "column", gap: 28,
      }}>
        <h1 style={{
          margin: 0,
          fontFamily: EDITORIAL_FONT,
          fontWeight: 300,
          fontSize: headlineSize,
          color: headlineCol,
          lineHeight: 1.04,
          letterSpacing: "-0.02em",
        }}>
          {headline}
        </h1>

        {/* Thin editorial rule */}
        <div style={{ height: 2, width: 96, background: ruleCol, opacity: 0.7 }} />

        <p style={{
          margin: 0,
          fontFamily: EDITORIAL_FONT,
          fontWeight: 200,
          fontSize: bodySize,
          color: bodyCol,
          lineHeight: 1.5,
          // No artificial cap — let the body fill the column so the page breathes.
        }}>
          {body}
        </p>

        {iconRows.length > 0 && (
          <div style={{
            // Bullet list — each row has the label on the LEFT and the
            // contextual icon on the RIGHT, hugging the body copy above.
            // When the editor toggles "Show labels" off, render just the
            // icons in a horizontal row instead of the labelled list.
            marginTop: 8,
            display: "flex",
            flexDirection: showIconLabels ? "column" : "row",
            gap: showIconLabels ? 16 : 24,
            alignItems: showIconLabels ? "stretch" : "center",
            flexWrap: showIconLabels ? "nowrap" : "wrap",
          }}>
            {iconRows.map((ic) => (
              <div key={ic.id} style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                paddingBottom: showIconLabels ? 14 : 0,
                borderBottom: showIconLabels ? `1px solid ${ruleCol}` : "none",
                opacity: 1,
                flex: showIconLabels ? "0 0 auto" : "0 0 auto",
              }}>
                {showIconLabels && (
                  <div style={{
                    fontFamily: EDITORIAL_FONT,
                    fontWeight: 300,
                    fontSize: Math.round(bodySize * 0.82),
                    color: headlineCol,
                    letterSpacing: "0.01em",
                    flex: 1,
                    textAlign: "left",
                  }}>
                    {ic.label}
                  </div>
                )}
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: headlineCol,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={bg} strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ width: 28, height: 28 }}
                    dangerouslySetInnerHTML={{ __html: ic.svg }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasOtherGraphic && otherGraphicSpec && (
          <div style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            width: "100%",
            // Cap the infographic so it doesn't dominate the editorial layout
            // when the column is wide (no photo on the right).
            maxWidth: hasPhoto ? "100%" : 720,
          }}>
            {renderGraphicSpec(otherGraphicSpec, brandStyle)}
          </div>
        )}
      </div>

      {/* Citation — small navy text at the bottom. Centered horizontally when a
          product photo is present (so it doesn't crowd the left column). */}
      {showCitationBars && citation && (
        <div style={{
          position: "absolute",
          left: PAD.x, right: PAD.x, bottom: py,
          fontFamily: EDITORIAL_FONT,
          fontWeight: 300,
          fontSize: citationFontSize,
          color: citationCol,
          opacity: 0.75,
          lineHeight: 1.4,
          textAlign: hasPhoto ? "center" : "left",
        }}>
          {citation}
        </div>
      )}

      {/* Slide-navigation arrows — render above the LUNIA LIFE watermark so
          the editorial slides match the hook/CTA chrome. */}
      {showSlideArrows && <ArrowIcons color={arrowCol} sizeScale={arrowScale} />}

      {/* Re-use the existing brand-mark badge only as a soft watermark when toggled on. Centered horizontally to match HookSlide / CTASlide. */}
      {showLuniaLifeWatermark && (
        <div style={{
          position: "absolute",
          bottom: prominentWatermark ? 28 : 22,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: EDITORIAL_FONT,
          fontWeight: 500,
          fontSize: prominentWatermark ? 18 : 14,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: headlineCol,
          opacity: prominentWatermark ? 0.45 : 0.18,
          pointerEvents: "none",
          userSelect: "none",
        }}>LUNIA LIFE</div>
      )}

      {/* Keep the existing constellation badge available (hidden by default in editorial),
          enabled via logoScale > 0. logoScale defaults to 1 so it shows; pass 0 to hide. */}
      {logoScale > 0 && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }}>
          <LuniaLogo variant="dark" sizeScale={logoScale} />
        </div>
      )}
    </SlideWrapper>
  );
}
