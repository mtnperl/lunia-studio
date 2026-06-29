'use client';

import React from 'react';
import ArrowIcons from '@/components/carousel/shared/ArrowIcons';
import LuniaLogo from '@/components/carousel/shared/LuniaLogo';
import SlideWrapper from '@/components/carousel/shared/SlideWrapper';
import { StatCallout } from '@/components/carousel/graphics/StatCallout';
import { ComparisonBars } from '@/components/carousel/graphics/ComparisonBars';
import { StepList } from '@/components/carousel/graphics/StepList';
import { DotChainGraphic } from '@/components/carousel/graphics/DotChainGraphic';
import { WaveGraphic } from '@/components/carousel/graphics/WaveGraphic';
import { IconGrid } from '@/components/carousel/graphics/IconGrid';
import { DonutChart } from '@/components/carousel/graphics/DonutChart';
import { VersusCard } from '@/components/carousel/graphics/VersusCard';
import { TimelineGraphic } from '@/components/carousel/graphics/TimelineGraphic';
import { SplitBar } from '@/components/carousel/graphics/SplitBar';
import { ChecklistGraphic } from '@/components/carousel/graphics/ChecklistGraphic';
import { CalloutQuote } from '@/components/carousel/graphics/CalloutQuote';
import { ComparisonTable } from '@/components/carousel/graphics/ComparisonTable';
import { PyramidGraphic } from '@/components/carousel/graphics/PyramidGraphic';
import { RadialProgress } from '@/components/carousel/graphics/RadialProgress';
import { CircleStats } from '@/components/carousel/graphics/CircleStats';
import { SpectrumBar } from '@/components/carousel/graphics/SpectrumBar';
import { FunnelChart } from '@/components/carousel/graphics/FunnelChart';
import { ScoreCard } from '@/components/carousel/graphics/ScoreCard';
import { BubbleCluster } from '@/components/carousel/graphics/BubbleCluster';
import { IconStat } from '@/components/carousel/graphics/IconStat';
import { Matrix2x2 } from '@/components/carousel/graphics/Matrix2x2';
import { StackedBar } from '@/components/carousel/graphics/StackedBar';
import { ProcessFlow } from '@/components/carousel/graphics/ProcessFlow';
import { HeatGrid } from '@/components/carousel/graphics/HeatGrid';
import { VectorIllustration } from '@/components/carousel/graphics/VectorIllustration';
import { GraphicErrorBoundary } from '@/components/carousel/graphics/GraphicErrorBoundary';
import { HubSpokeGraphic } from '@/components/carousel/graphics/HubSpokeGraphic';
import { IcebergGraphic } from '@/components/carousel/graphics/IcebergGraphic';
import { BridgeGraphic } from '@/components/carousel/graphics/BridgeGraphic';
import { CircularCycleGraphic } from '@/components/carousel/graphics/CircularCycleGraphic';
import { BentoTiles } from '@/components/carousel/graphics/BentoTiles';
import { ConceptFlowGraphic } from '@/components/carousel/graphics/ConceptFlowGraphic';
import { IconGraphic } from '@/components/carousel/graphics/IconGraphic';
import { IconLayout } from '@/components/carousel/graphics/IconLayout';
import { BrandStyle, GraphicSpec, GraphicStyle } from '@/lib/types';
import { extractGraphicData, parseGraphicSpec } from '@/lib/carousel-utils';
import { isDarkColor, INK_LIGHT, INK_DARK } from '@/lib/color';

// ─── Layout tokens ────────────────────────────────────────────────────────────
const SLIDE_PADDING = { x: 72, y: 80 };
const SECTION_GAP = 32;
const GRAPHIC_MIN_HEIGHT = 280;
const SLIDE_H = { carousel: 1350, reels: 1920 };

// ─── Rendering priority:
//   Path 1 — GraphicSpec JSON (new generation)  → curated React component
//   Path 2 — raw SVG string (saved carousels)   → sanitizeSvg + dangerouslySetInnerHTML
//   Path 3 — graphicStyle enum (saved carousels) → LegacyGraphicZone (position:absolute)
//   Path 4 — null / empty / parse failure       → no graphic rendered

// Strip potentially harmful attributes and elements from Claude-generated SVG (Path 2).
// Block both inline event handlers and structural XSS vectors (foreignObject, use, animate, set).
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Strip elements that can embed external content or execute code inside SVG
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<use\s[^>]*>/gi, '')
    .replace(/<animate\b[^>]*>/gi, '')
    .replace(/<set\b[^>]*>/gi, '')
    .replace(/<handler\b[^>]*>/gi, '')
    // Strip event handlers (quoted and unquoted, any case)
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    // Ensure SVG fills the full 936px container width
    .replace(/<svg(?![^>]*\bwidth=)/, '<svg width="100%"');
}

// ─── GRAPHIC_COMPONENT_MAP ───────────────────────────────────────────────────
// Maps GraphicSpec.component → React component.
// When adding a new component: update this map + types.ts + carousel-prompts.ts.
const GRAPHIC_COMPONENT_MAP: Partial<Record<GraphicSpec['component'], React.FC<any>>> = {
  stat: StatCallout,
  bars: ComparisonBars,
  steps: StepList,
  dotchain: DotChainGraphic,
  wave: WaveGraphic,
  iconGrid: IconGrid,
  donut: DonutChart,
  versus: VersusCard,
  timeline: TimelineGraphic,
  split: SplitBar,
  checklist: ChecklistGraphic,
  callout: CalloutQuote,
  table: ComparisonTable,
  pyramid: PyramidGraphic,
  // Tier 1
  radial: RadialProgress,
  circleStats: CircleStats,
  spectrum: SpectrumBar,
  funnel: FunnelChart,
  scorecard: ScoreCard,
  bubbles: BubbleCluster,
  iconStat: IconStat,
  // Tier 2
  matrix2x2: Matrix2x2,
  stackedBar: StackedBar,
  processFlow: ProcessFlow,
  heatGrid: HeatGrid,
  vector: VectorIllustration as React.FC<any>,
  // Layout Infographics (Tier 3)
  hubSpoke: HubSpokeGraphic as React.FC<any>,
  iceberg: IcebergGraphic as React.FC<any>,
  bridge: BridgeGraphic as React.FC<any>,
  circularCycle: CircularCycleGraphic as React.FC<any>,
  bento: BentoTiles as React.FC<any>,
  conceptFlow: ConceptFlowGraphic as React.FC<any>,
  icon: IconGraphic as React.FC<any>,
  iconLayout: IconLayout as React.FC<any>,
};

function renderGraphicSpec(spec: GraphicSpec, brandStyle?: BrandStyle): React.ReactNode {
  const GraphicComponent = GRAPHIC_COMPONENT_MAP[spec.component];
  if (!GraphicComponent) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[GraphicSpec] No component registered for key: "${spec.component}"`);
    }
    return null;
  }
  return <GraphicComponent {...(spec.data as object)} brandStyle={brandStyle} />;
}

// ─── Legacy graphic zone (Path 3) ────────────────────────────────────────────
// Kept at position:absolute; bottom:60 — separate DOM branch from the flex column.
// SlideWrapper is position:relative, so this resolves correctly.
/**
 * @deprecated Path 3 only — used for saved carousels with graphicStyle enum.
 */
function LegacyGraphicZone({ style, headline, body, brandStyle }: {
  style: GraphicStyle;
  headline: string;
  body: string;
  brandStyle?: BrandStyle;
}) {
  if (style === 'textOnly') return null;
  const data = extractGraphicData(style, headline, body);
  let graphic: React.ReactNode;
  switch (data.style) {
    case 'stat':     graphic = <StatCallout stat={data.data.stat} label={data.data.label} brandStyle={brandStyle} />; break;
    case 'bars':     graphic = <ComparisonBars items={data.data.items} brandStyle={brandStyle} />; break;
    case 'steps':    graphic = <StepList steps={data.data.steps} brandStyle={brandStyle} />; break;
    case 'dotchain': graphic = <DotChainGraphic labels={data.data.labels} brandStyle={brandStyle} />; break;
    case 'wave':     graphic = <WaveGraphic brandStyle={brandStyle} />; break;
    case 'iconGrid': graphic = <IconGrid brandStyle={brandStyle} />; break;
    default:         return null;
  }
  return (
    <div style={{ position: 'absolute', bottom: 60, left: SLIDE_PADDING.x, right: SLIDE_PADDING.x }}>
      {graphic}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  headline: string;
  body: string;
  citation: string;
  graphic?: string;            // GraphicSpec JSON (Path 1) or raw SVG (Path 2)
  graphicStyle?: GraphicStyle; // legacy enum for saved carousels (Path 3)
  graphicImageUrl?: string;    // Path 0: fal.ai AI-generated image for TIER B/C slides
  shimmerGraphic?: boolean;    // show shimmer in graphic zone while fal image generates
  brandStyle?: BrandStyle;
  scale?: number;
  id?: string;
  logoScale?: number;
  arrowScale?: number;
  darkBackground?: boolean;         // match hook slide dark background
  /** Override the slide background with any color. When set, headline/body/citation/arrows + logo + watermark all auto-flip to the contrasting brand ink (#F7F4EF on dark, #01253f on light). */
  slideBgColor?: string;
  /** Optional fal.ai-generated full-bleed background image. The slide bg color is overlaid on top so structured content stays readable. */
  bgImageUrl?: string;
  /** Show a shimmer in place of the bg image while it's being generated. */
  bgImageShimmer?: boolean;
  /** 0..1 — opacity of the bg color OVERLAY on top of the bg image. Higher = image more muted. Default 0.55. */
  bgImageOverlayOpacity?: number;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;     // v2: bolder, more visible watermark
  citationFontSize?: number;        // override the default 18px citation size
  reels?: boolean;                  // 9:16 Reels format (1920px height, expanded padding)
  headlineScale?: number;           // multiplier on the auto-sized headline (default 1)
  bodyScale?: number;               // multiplier on the auto-sized body (default 1)
  stylePreset?: "default" | "editorial-scientific";
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
};

// ─── ContentSlide ─────────────────────────────────────────────────────────────
export default function ContentSlide({
  headline,
  body,
  citation,
  graphic,
  graphicStyle = 'textOnly',
  graphicImageUrl,
  shimmerGraphic = false,
  brandStyle,
  scale = 1,
  id,
  logoScale = 1,
  arrowScale = 1,
  darkBackground = false,
  slideBgColor,
  bgImageUrl,
  bgImageShimmer = false,
  bgImageOverlayOpacity = 0.55,
  showLuniaLifeWatermark = false,
  prominentWatermark = false,
  citationFontSize = 18,
  reels = false,
  headlineScale = 1,
  bodyScale = 1,
  stylePreset = "default",
  showSlideArrows = true,
  showSlideNumbers: _showSlideNumbers = true,
  showCitationBars = true,
}: Props) {
  const isEditorial = stylePreset === "editorial-scientific";
  const editorialFontFamily = "Inter, system-ui, -apple-system, sans-serif";
  const slideH = reels ? SLIDE_H.reels : SLIDE_H.carousel;
  const py = reels ? 220 : SLIDE_PADDING.y;
  const sectionGapBase = reels ? 46 : SECTION_GAP;
  const graphicMinH = reels ? 120 : GRAPHIC_MIN_HEIGHT;
  // Determine rendering path
  // Path 0: fal.ai AI-generated image (TIER B/C) — highest priority, overrides SVG components
  const hasAiGraphicImage = !!graphicImageUrl || shimmerGraphic; // Path 0
  const graphicSpec = !hasAiGraphicImage ? parseGraphicSpec(graphic) : null;
  const hasGraphicSpec = graphicSpec !== null;                  // Path 1
  // Path 2: raw SVG only — if graphic is JSON (starts with { or [) but failed Zod validation,
  // treat as Path 4 (no graphic) rather than rendering malformed JSON as innerHTML.
  const isJsonLike = !!graphic && (graphic.trimStart().startsWith('{') || graphic.trimStart().startsWith('['));
  const hasSvg = !hasAiGraphicImage && !hasGraphicSpec && !isJsonLike && !!graphic && graphic.trim().length > 10; // Path 2
  const hasLegacyGraphic = !hasAiGraphicImage && !hasGraphicSpec && !hasSvg && graphicStyle !== 'textOnly'; // Path 3
  const hasInlineGraphic = hasAiGraphicImage || hasGraphicSpec || hasSvg;   // shown inside flex column
  // Tighten gap when graphic needs space
  const sectionGap = (hasInlineGraphic || hasLegacyGraphic) ? Math.round(sectionGapBase * 0.6) : sectionGapBase;

  // Colors. Resolution order:
  //   1. `slideBgColor` (user-picked) — auto-derives ink from luminance
  //   2. brandStyle from the saved template
  //   3. `darkBackground` toggle (legacy two-mode preset)
  //   4. Dark navy default
  const fallbackBg = darkBackground ? '#F7F4EF' : '#01253f';
  const brandBg = darkBackground ? brandStyle?.hookBackground : brandStyle?.background;
  const bg = slideBgColor ?? brandBg ?? fallbackBg;
  const bgIsDark = isDarkColor(bg);
  const ink = bgIsDark ? INK_LIGHT : INK_DARK;
  // When slideBgColor is explicit OR the auto-derived ink is needed, prefer luminance-based ink
  // and fall back to brandStyle ONLY when it agrees with the bg luminance — otherwise the
  // template's text color may collide with a custom bg. The two preset modes still respect
  // brandStyle for back-compat when no custom color is set.
  const useAutoInk = slideBgColor !== undefined;
  const headlineColor = useAutoInk
    ? ink
    : (darkBackground ? (brandStyle?.headline ?? INK_DARK) : (brandStyle?.hookHeadline ?? INK_LIGHT));
  const bodyColor = useAutoInk
    ? (bgIsDark ? 'rgba(247,244,239,0.88)' : '#1a2535')
    : (darkBackground ? (brandStyle?.body ?? '#1a2535') : 'rgba(247,244,239,0.88)');
  const citationColor = useAutoInk
    ? (bgIsDark ? 'rgba(247,244,239,0.55)' : '#6b7280')
    : (darkBackground ? (brandStyle?.secondary ?? '#6b7280') : 'rgba(247,244,239,0.55)');
  const arrowColor = useAutoInk
    ? (bgIsDark ? 'rgba(247,244,239,0.4)' : '#9ab0b8')
    : (darkBackground ? (brandStyle?.secondary ?? '#9ab0b8') : 'rgba(247,244,239,0.4)');
  // Logo + watermark variant flips with the resolved bg luminance.
  const useDarkInk = useAutoInk ? !bgIsDark : darkBackground;

  // Synthesize a brandStyle for the *infographic graphics* whose accent / body /
  // secondary always contrast with the resolved slide bg. Otherwise a teal
  // brandStyle.accent (the historical default) reads "blueish" on a dark navy
  // slide and washes out on a light cream slide. We keep the explicit
  // brandStyle.background + hook* fields when set so other consumers downstream
  // are unaffected.
  const inkMutedStrong = bgIsDark ? 'rgba(247,244,239,0.78)' : 'rgba(1,37,63,0.78)';
  const inkMutedSoft = bgIsDark ? 'rgba(247,244,239,0.55)' : 'rgba(1,37,63,0.55)';
  const graphicBrandStyle: BrandStyle = {
    background: bg,
    hookBackground: brandStyle?.hookBackground ?? '#01253f',
    headline: ink,
    hookHeadline: brandStyle?.hookHeadline ?? '#ffffff',
    body: inkMutedStrong,
    accent: ink,
    secondary: inkMutedSoft,
  };

  // Split body into bold first sentence + remaining body
  // Require uppercase after period to avoid splitting on decimals (7.5) or abbreviations (N.R.E.M.)
  const firstPeriod = body.search(/[.!?]\s+[A-Z]/);
  const boldSentence = firstPeriod >= 0 ? body.slice(0, firstPeriod + 1) : body;
  const restBody = firstPeriod >= 0 ? body.slice(firstPeriod + 2).trim() : "";

  // Fixed, consistent type sizes for EVERY content slide — no per-slide,
  // length-based resizing — so the three content slides read as one set.
  // Long copy is absorbed by the flexible graphic zone below (which shrinks),
  // never by resizing the text. headlineScale/bodyScale still apply uniformly.
  const BASE_HEADLINE = reels ? 72 : 56;
  const BASE_BODY = reels ? 40 : 34;
  const headlineFontSize = Math.round(BASE_HEADLINE * headlineScale);
  const bodyFontSize = Math.round(BASE_BODY * bodyScale);

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: bg, overflow: 'hidden' }}>
      {/* AI-generated bg image — full-bleed, then a slide-color overlay keeps text + structured graphic readable. Mirrors the hook slide pattern. */}
      {bgImageUrl ? (
        <>
          <img
            src={bgImageUrl}
            crossOrigin="anonymous"
            alt=""
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              display: 'block',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: bg, opacity: bgImageOverlayOpacity }} />
        </>
      ) : bgImageShimmer ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: bgIsDark
            ? 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)'
            : 'linear-gradient(90deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.02) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }} />
      ) : null}
      {showSlideArrows && <ArrowIcons color={arrowColor} sizeScale={arrowScale} />}
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
      <LuniaLogo variant={useDarkInk ? "dark" : "light"} sizeScale={logoScale} />

      {/* Flex column layout — headline / body / graphic / citation */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: py,
        paddingBottom: py,
        paddingLeft: SLIDE_PADDING.x,
        paddingRight: SLIDE_PADDING.x,
        gap: sectionGap,
        boxSizing: 'border-box',
      }}>
        {/* Headline zone */}
        <div style={isEditorial ? {
          fontFamily: editorialFontFamily,
          fontWeight: 400,
          fontSize: headlineFontSize,
          color: headlineColor,
          textTransform: 'none',
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          flexShrink: 0,
        } : {
          fontFamily: 'Jost, Montserrat, sans-serif',
          fontWeight: 400,
          fontSize: headlineFontSize,
          color: headlineColor,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          lineHeight: 1.2,
          flexShrink: 0,
        }}>
          {headline}
        </div>

        {/* Body — fixed size, never clipped (the graphic zone flexes instead). */}
        <div style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: bodyFontSize,
          color: bodyColor,
          lineHeight: 1.55,
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: isEditorial ? 400 : 700 }}>{boldSentence}</span>
          {restBody ? <span style={{ fontWeight: 300 }}>{' '}{restBody}</span> : null}
        </div>

        {/* Graphic zone — sits BETWEEN body and citation. Flexes to fill the gap
            and shrinks gracefully so it never collides with the citation. */}
        {hasInlineGraphic ? (
          <div style={{ minHeight: graphicMinH, flex: '1 1 0px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasAiGraphicImage ? (
              // Path 0 — fal.ai AI-generated image for TIER B/C slides
              graphicImageUrl ? (
                <img
                  src={graphicImageUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    width: '100%',
                    maxHeight: 500,
                    objectFit: 'contain',
                    objectPosition: 'center bottom',
                    display: 'block',
                    borderRadius: 8,
                  }}
                />
              ) : (
                // Shimmer while AI image is generating
                <div style={{
                  width: '100%',
                  height: 300,
                  borderRadius: 8,
                  background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.6s ease-in-out infinite',
                }}
                />
              )
            ) : hasGraphicSpec ? (
              // Path 1 — React SVG component (TIER A data-precise)
              <GraphicErrorBoundary graphicSpec={graphicSpec}>
                {renderGraphicSpec(graphicSpec, graphicBrandStyle)}
              </GraphicErrorBoundary>
            ) : (
              // Path 2 — raw SVG (saved carousels only)
              <div
                style={{ overflow: 'hidden' }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(graphic!) }}
              />
            )}
          </div>
        ) : (
          // No graphic — spacer so the citation still settles near the bottom.
          <div style={{ flex: '1 1 0px' }} />
        )}

        {/* Citation — below the graphic, lifted off the bottom edge. */}
        {showCitationBars && (
          <div style={{
            fontFamily: isEditorial ? editorialFontFamily : 'Cormorant Garamond, Lora, serif',
            fontWeight: isEditorial ? 300 : 400,
            fontStyle: isEditorial ? 'normal' : 'italic',
            fontSize: citationFontSize,
            color: citationColor,
            lineHeight: 1.4,
            flexShrink: 0,
            marginBottom: reels ? 40 : 28,
          }}>
            {citation}
          </div>
        )}
      </div>

      {/* Path 3 — Legacy graphic zone (saved carousels with graphicStyle enum).
          Stays position:absolute; bottom:60 — separate from flex column.
          SlideWrapper is position:relative so this resolves correctly. */}
      {hasLegacyGraphic && (
        <LegacyGraphicZone
          style={graphicStyle}
          headline={headline}
          body={body}
          brandStyle={graphicBrandStyle}
        />
      )}
    </SlideWrapper>
  );
}
