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
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;     // v2: bolder, more visible watermark
  citationFontSize?: number;        // override the default 18px citation size
  reels?: boolean;                  // 9:16 Reels format (1920px height, expanded padding)
  headlineScale?: number;           // multiplier on the auto-sized headline (default 1)
  bodyScale?: number;               // multiplier on the auto-sized body (default 1)
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
  showLuniaLifeWatermark = false,
  prominentWatermark = false,
  citationFontSize = 18,
  reels = false,
  headlineScale = 1,
  bodyScale = 1,
}: Props) {
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

  // Colors — `darkBackground` now means "match the (light) hook"; default is dark navy.
  const bg = darkBackground ? (brandStyle?.hookBackground ?? '#F7F4EF') : (brandStyle?.background ?? '#01253f');
  const headlineColor = darkBackground ? (brandStyle?.headline ?? '#01253f') : (brandStyle?.hookHeadline ?? '#F7F4EF');
  const bodyColor = darkBackground ? (brandStyle?.body ?? '#1a2535') : 'rgba(247,244,239,0.88)';
  const citationColor = darkBackground ? (brandStyle?.secondary ?? '#6b7280') : 'rgba(247,244,239,0.55)';
  const arrowColor = darkBackground ? (brandStyle?.secondary ?? '#9ab0b8') : 'rgba(247,244,239,0.4)';

  // Split body into bold first sentence + remaining body
  // Require uppercase after period to avoid splitting on decimals (7.5) or abbreviations (N.R.E.M.)
  const firstPeriod = body.search(/[.!?]\s+[A-Z]/);
  const boldSentence = firstPeriod >= 0 ? body.slice(0, firstPeriod + 1) : body;
  const restBody = firstPeriod >= 0 ? body.slice(firstPeriod + 2).trim() : "";

  // Dynamic font sizes — when graphic present, text is compact to give graphic space
  function bodySize(len: number, hasGraphic: boolean): number {
    if (hasGraphic) {
      if (len < 80)  return 36;
      if (len < 160) return 30;
      return 26;
    } else {
      if (len < 80)  return 72;
      if (len < 160) return 62;
      if (len < 240) return 52;
      return 44;
    }
  }
  function headlineSize(len: number): number {
    if (len < 20) return 76;
    if (len < 35) return 64;
    if (len < 50) return 56;
    return 48;
  }

  // When a graphic is present, cap the body zone so the graphic still has
  // breathing room. Cap scales up with bodyScale so larger body text gets
  // a bigger zone before it starts clipping.
  const contentH = slideH - py * 2;           // 1350 − 160 = 1190
  const bodyZoneFraction = Math.min(0.78, 0.5 + Math.max(0, bodyScale - 1) * 0.35);
  const bodyMaxH = (hasInlineGraphic || hasLegacyGraphic)
    ? Math.floor(contentH * bodyZoneFraction)
    : undefined;

  const bodyFontSize = Math.round(bodySize(body.length, hasInlineGraphic || hasLegacyGraphic) * bodyScale);
  const headlineFontSize = Math.round(headlineSize(headline.length) * headlineScale);

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: bg }}>
      <ArrowIcons color={arrowColor} sizeScale={arrowScale} />
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
          color: darkBackground ? '#01253f' : '#F7F4EF',
          opacity: prominentWatermark ? 0.55 : 0.13,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          LUNIA LIFE
        </div>
      )}
      <LuniaLogo variant={darkBackground ? "dark" : "light"} sizeScale={logoScale} />

      {/* Flex column layout — headline / body+citation / graphic */}
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
        <div style={{
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

        {/* Body zone — shares space with graphic; capped when graphic present */}
        <div style={{
          flex: hasInlineGraphic ? '0 0 auto' : 1,
          maxHeight: bodyMaxH,
          overflow: bodyMaxH ? 'hidden' : undefined,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <div style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: bodyFontSize,
            color: bodyColor,
            lineHeight: 1.55,
          }}>
            <span style={{ fontWeight: 700 }}>{boldSentence}</span>
            {restBody ? <span style={{ fontWeight: 400 }}>{' '}{restBody}</span> : null}
          </div>

          <div style={{
            fontFamily: 'Cormorant Garamond, Lora, serif',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: citationFontSize,
            color: citationColor,
            lineHeight: 1.4,
          }}>
            {citation}
          </div>
        </div>

        {/* Graphic zone — Path 0 (AI image), Path 1 (GraphicSpec SVG), Path 2 (raw SVG) */}
        {hasInlineGraphic && (
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
                {renderGraphicSpec(graphicSpec, brandStyle)}
              </GraphicErrorBoundary>
            ) : (
              // Path 2 — raw SVG (saved carousels only)
              <div
                style={{ overflow: 'hidden' }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(graphic!) }}
              />
            )}
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
          brandStyle={brandStyle}
        />
      )}
    </SlideWrapper>
  );
}
