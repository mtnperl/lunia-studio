"use client";
import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import FitBox from "@/components/carousel/shared/FitBox";
import { BrandStyle } from "@/lib/types";
import { CAROUSEL_ICONS } from "@/lib/carousel-icons";
import { parseGraphicSpec } from "@/lib/carousel-utils";
import { renderGraphicSpec } from "@/components/carousel/graphics/graphicComponentMap";

import { SLIDE, BRAND_FONT_FAMILY, FONT_WEIGHT } from "@/lib/brand-tokens";

const SLIDE_H = SLIDE.height;
const PAD = SLIDE.editorialPad;

const EDITORIAL_FONT = BRAND_FONT_FAMILY;

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
  /** Multiplier on rendered icon size when the graphic is an icon layout. */
  iconScale?: number;
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

type IconRowPosition = "hug-body" | "between";
type IconLayoutData = { icons: { id: string }[]; showLabels?: boolean; iconRowPosition?: IconRowPosition };

function parseIconLayout(graphic?: string): IconLayoutData | null {
  if (!graphic) return null;
  try {
    const parsed = JSON.parse(graphic);
    if (parsed?.component === "iconLayout" && Array.isArray(parsed.data?.icons)) {
      // Default showLabels=true to match the editor's "Show labels" checkbox
      // default; if the saved spec explicitly sets false, respect it.
      const data = parsed.data as IconLayoutData;
      const position: IconRowPosition = data.iconRowPosition === "between" ? "between" : "hug-body";
      return { icons: data.icons, showLabels: data.showLabels !== false, iconRowPosition: position };
    }
    if (parsed?.component === "icon" && parsed.data?.id) {
      return { icons: [{ id: parsed.data.id as string }], showLabels: false, iconRowPosition: "hug-body" };
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
  iconScale = 1,
  showCitationBars = true,
  showSlideArrows = true,
  arrowScale = 1,
}: Props) {
  const slideH = reels ? SLIDE_H.reels : SLIDE_H.carousel;
  const py = reels ? 200 : PAD.y;
  // Reserve a band at the bottom for the citation (up to ~2 lines) so the
  // editorial column never runs its graphic into it.
  const citationReserve = (showCitationBars && citation)
    ? Math.round(citationFontSize * 1.4 * 2) + 28
    : 48;
  // Cap the in-column graphic so it stays compact and hugs the body; FitBox
  // scales it down further when a long headline/body leaves less room.
  const graphicMaxH = reels ? 420 : 320;

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
  const iconPosition: IconRowPosition = iconLayout?.iconRowPosition ?? "hug-body";
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
        bottom: py + citationReserve,                              // clear the citation band below
        display: "flex", flexDirection: "column", gap: 28,
        // Backstop: clip the column so a tall body + graphic can never paint
        // over the citation that sits below it (bottom: py).
        overflow: "hidden",
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
          // Weight 300 (brand body weight) — 200 was never loaded in headless
          // renders, so Chromium synthesized it with different metrics than
          // the in-app preview (one root cause of the overflow drift).
          fontWeight: FONT_WEIGHT.body,
          fontSize: bodySize,
          color: bodyCol,
          lineHeight: 1.5,
          // No artificial cap — let the body fill the column so the page breathes.
        }}>
          {body}
        </p>

        {/* Hug-body position (default): icon block sits inside the body
            column, right under the copy. The "between" position renders the
            same block in a separate absolute container below this column. */}
        {iconRows.length > 0 && iconPosition === "hug-body" && (
          <IconBlock
            rows={iconRows}
            showLabels={showIconLabels}
            bodySize={bodySize}
            iconScale={iconScale}
            headlineCol={headlineCol}
            ruleCol={ruleCol}
            bg={bg}
            centered={false}
          />
        )}

        {hasOtherGraphic && otherGraphicSpec && (
          <div style={{
            marginTop: 12,
            // Hug the body and stay compact: capped height + FitBox so the
            // graphic scales down instead of running into the citation. The
            // spacer below pushes any slack to the bottom of the column.
            flex: "0 1 auto",
            minHeight: 0,
            maxHeight: graphicMaxH,
            overflow: "hidden",
            display: "flex",
            // Centre the graphic block in the body column so its internal
            // centred content (e.g. StatCallout's 75% rules + centred number)
            // aligns visually with the body text's column-centre.
            justifyContent: "center",
            width: "100%",
          }}>
            <div style={{
              // Soft cap so very wide graphics (tables, matrix2x2, etc.) don't
              // dominate the editorial layout when the column is wide.
              width: "100%",
              maxWidth: hasPhoto ? "100%" : 760,
              height: "100%",
            }}>
              <FitBox align="top">
                {renderGraphicSpec(otherGraphicSpec, brandStyle)}
              </FitBox>
            </div>
          </div>
        )}

        {/* "Between" position: icon block sits INSIDE the column at the end
            with auto top + bottom margins, so flexbox vertically centres it
            in the empty space below the body text. Lands roughly midway
            between where the body actually ends and where the citation
            starts, regardless of body length. */}
        {iconRows.length > 0 && iconPosition === "between" && (
          <div style={{
            marginTop: "auto",
            marginBottom: "auto",
            paddingTop: 24,
            paddingBottom: 24,
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}>
            <IconBlock
              rows={iconRows}
              showLabels={showIconLabels}
              bodySize={bodySize}
              iconScale={iconScale}
              headlineCol={headlineCol}
              ruleCol={ruleCol}
              bg={bg}
              centered={true}
            />
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

// Shared icon block — used both inside the body column ("hug-body") and as a
// centred standalone block ("between"). When centered=true, the labelled
// vertical list constrains its width and centres on its own axis; the icons-
// only horizontal row simply centres its row content.
function IconBlock({
  rows, showLabels, bodySize, iconScale = 1, headlineCol, ruleCol, bg, centered,
}: {
  rows: { id: string; label: string; svg: string; category: string }[];
  showLabels: boolean;
  bodySize: number;
  iconScale?: number;
  headlineCol: string;
  ruleCol: string;
  bg: string;
  centered: boolean;
}) {
  // Icon-size control: scale the circle and glyph together off the 56/28 base.
  const circle = Math.round(56 * iconScale);
  const glyph = Math.round(28 * iconScale);
  return (
    <div style={{
      marginTop: centered ? 0 : 8,
      display: "flex",
      flexDirection: showLabels ? "column" : "row",
      gap: showLabels ? 16 : 24,
      alignItems: showLabels ? "stretch" : "center",
      justifyContent: centered && !showLabels ? "center" : "flex-start",
      flexWrap: showLabels ? "nowrap" : "wrap",
      width: showLabels && centered ? 540 : undefined,
    }}>
      {rows.map((ic) => (
        <div key={ic.id} style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          paddingBottom: showLabels ? 14 : 0,
          borderBottom: showLabels ? `1px solid ${ruleCol}` : "none",
          flex: "0 0 auto",
        }}>
          {showLabels && (
            <div style={{
              fontFamily: "Inter, system-ui, -apple-system, sans-serif",
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
            width: circle, height: circle, borderRadius: "50%",
            background: headlineCol,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={bg} strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ width: glyph, height: glyph }}
              dangerouslySetInnerHTML={{ __html: ic.svg }} />
          </div>
        </div>
      ))}
    </div>
  );
}
