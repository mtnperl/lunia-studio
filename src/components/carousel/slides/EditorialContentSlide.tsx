"use client";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { BrandStyle } from "@/lib/types";
import { CAROUSEL_ICONS } from "@/lib/carousel-icons";

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
      return parsed.data as IconLayoutData;
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
}: Props) {
  const slideH = reels ? SLIDE_H.reels : SLIDE_H.carousel;
  const py = reels ? 200 : PAD.y;

  // Lunia palette defaults — preset already passes EDITORIAL_BRAND_STYLE in.
  const bg          = brandStyle?.background     ?? "#F7F4EF";
  const headlineCol = brandStyle?.headline       ?? "#102635";
  const bodyCol     = brandStyle?.body           ?? "#2c3f51";
  const ruleCol     = brandStyle?.secondary      ?? "#2c3f51";
  const citationCol = brandStyle?.secondary      ?? "#2c3f51";
  const wordmarkCol = brandStyle?.headline       ?? "#102635";

  const iconLayout = parseIconLayout(graphic);
  const iconRows = iconLayout
    ? iconLayout.icons
        .slice(0, 4)
        .map((i) => CAROUSEL_ICONS.find((c) => c.id === i.id))
        .filter(Boolean) as { id: string; label: string; svg: string; category: string }[]
    : [];
  const hasPhoto = !!bgImageUrl;
  const hasRightCol = hasPhoto || iconRows.length > 0;

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

      {/* Optional product/lifestyle photo on the right */}
      {hasPhoto && (
        <img
          src={bgImageUrl}
          crossOrigin="anonymous"
          alt=""
          style={{
            position: "absolute",
            top: py + 80,
            right: PAD.x,
            width: 420,
            height: slideH - py * 2 - 80,
            objectFit: "cover",
            borderRadius: 12,
          }}
        />
      )}

      {/* Main editorial column — headline + rule + body + stat rows.
          Stat rows live INSIDE the main column under the body (like the
          reference layouts), not floated over the photo. */}
      <div style={{
        position: "absolute",
        top: py + 140,                                              // sit below the brand mark
        left: PAD.x,
        right: hasRightCol ? PAD.x + 460 : PAD.x,                   // make room for the right column
        bottom: py + 80,                                            // leave room for the citation
        display: "flex", flexDirection: "column", gap: 28,
      }}>
        <h1 style={{
          margin: 0,
          fontFamily: EDITORIAL_FONT,
          fontWeight: 400,
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
          fontWeight: 300,
          fontSize: bodySize,
          color: bodyCol,
          lineHeight: 1.5,
          maxWidth: 740,
        }}>
          {body}
        </p>

        {/* Stat-icon rows — under the body, in the main column. Renders only
            when the slide's graphic is an icon layout. */}
        {iconRows.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 8 }}>
            {iconRows.map((ic) => (
              <div key={ic.id} style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: headlineCol,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={bg} strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ width: 36, height: 36 }}
                    dangerouslySetInnerHTML={{ __html: ic.svg }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{
                    fontFamily: EDITORIAL_FONT,
                    fontWeight: 500,
                    fontSize: 30,
                    color: headlineCol,
                    letterSpacing: "0.03em",
                  }}>
                    {ic.label}
                  </div>
                  <div style={{
                    fontFamily: EDITORIAL_FONT,
                    fontWeight: 300,
                    fontSize: 16,
                    color: bodyCol,
                    opacity: 0.7,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}>
                    Cited by name
                  </div>
                </div>
              </div>
            ))}
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

      {/* Re-use the existing brand-mark badge only as a soft watermark when toggled on */}
      {showLuniaLifeWatermark && (
        <div style={{
          position: "absolute", bottom: prominentWatermark ? 28 : 22,
          right: PAD.x,
          fontFamily: EDITORIAL_FONT,
          fontWeight: 500,
          fontSize: prominentWatermark ? 18 : 14,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: headlineCol,
          opacity: prominentWatermark ? 0.45 : 0.18,
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
