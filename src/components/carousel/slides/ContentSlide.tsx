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
import HookDecoration, { getHookDecorationType } from '@/components/carousel/shared/HookDecoration';
import { BrandStyle, GraphicSpec, GraphicStyle } from '@/lib/types';
import { extractGraphicData, parseGraphicSpec } from '@/lib/carousel-utils';

// ─── Layout tokens ────────────────────────────────────────────────────────────
const SLIDE_PADDING = { x: 72, y: 80 };
const SECTION_GAP = 32;
const GRAPHIC_MIN_HEIGHT = 80;

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
  brandStyle?: BrandStyle;
  scale?: number;
  id?: string;
  backgroundImage?: string | null;  // fal.ai generated background, rendered at low opacity
  shimmer?: boolean;                // show shimmer while fal image is loading
  logoScale?: number;
  arrowScale?: number;
  darkBackground?: boolean;         // match hook slide dark background
};

// ─── ContentSlide ─────────────────────────────────────────────────────────────
export default function ContentSlide({
  headline,
  body,
  citation,
  graphic,
  graphicStyle = 'textOnly',
  brandStyle,
  scale = 1,
  id,
  backgroundImage,
  shimmer = false,
  logoScale = 1,
  arrowScale = 1,
  darkBackground = false,
}: Props) {
  // Determine rendering path
  const graphicSpec = parseGraphicSpec(graphic);
  const hasGraphicSpec = graphicSpec !== null;                  // Path 1
  // Path 2: raw SVG only — if graphic is JSON (starts with { or [) but failed Zod validation,
  // treat as Path 4 (no graphic) rather than rendering malformed JSON as innerHTML.
  const isJsonLike = !!graphic && (graphic.trimStart().startsWith('{') || graphic.trimStart().startsWith('['));
  const hasSvg = !hasGraphicSpec && !isJsonLike && !!graphic && graphic.trim().length > 10; // Path 2
  const hasLegacyGraphic = !hasGraphicSpec && !hasSvg && graphicStyle !== 'textOnly'; // Path 3
  const hasInlineGraphic = hasGraphicSpec || hasSvg;            // shown inside flex column

  // Colors — dark mode overrides when darkBackground=true
  const bg = darkBackground ? (brandStyle?.hookBackground ?? 'linear-gradient(160deg, #0a1628 0%, #0d2137 40%, #0a2a3a 100%)') : (brandStyle?.background ?? '#f0ece6');
  const headlineColor = darkBackground ? (brandStyle?.hookHeadline ?? '#ffffff') : (brandStyle?.headline ?? '#1e7a8a');
  const bodyColor = darkBackground ? 'rgba(255,255,255,0.88)' : (brandStyle?.body ?? '#1a2535');
  const citationColor = darkBackground ? 'rgba(255,255,255,0.55)' : (brandStyle?.secondary ?? '#6b7280');
  const arrowColor = darkBackground ? 'rgba(255,255,255,0.4)' : (brandStyle?.secondary ?? '#9ab0b8');

  // Split body into bold first sentence + remaining body
  // Require uppercase after period to avoid splitting on decimals (7.5) or abbreviations (N.R.E.M.)
  const firstPeriod = body.search(/[.!?]\s+[A-Z]/);
  const boldSentence = firstPeriod >= 0 ? body.slice(0, firstPeriod + 1) : body;
  const restBody = firstPeriod >= 0 ? body.slice(firstPeriod + 2).trim() : "";

  // Dynamic font sizes — generous caps; graphic zone reduced to 80px to free space
  function bodySize(len: number, hasGraphic: boolean): number {
    if (hasGraphic) {
      if (len < 80)  return 56;
      if (len < 160) return 48;
      return 40;
    } else {
      if (len < 80)  return 72;
      if (len < 160) return 62;
      if (len < 240) return 52;
      return 44;
    }
  }
  function headlineSize(len: number): number {
    if (len < 20) return 88;
    if (len < 35) return 76;
    if (len < 50) return 64;
    return 56;
  }

  const bodyFontSize = bodySize(body.length, hasInlineGraphic || hasLegacyGraphic);
  const headlineFontSize = headlineSize(headline.length);

  const decoAccent = brandStyle?.accent ?? '#1e7a8a';

  return (
    <SlideWrapper scale={scale} id={id} style={{ background: bg }}>
      {/* Dark background decoration — mirrors hook slide pattern at low opacity for continuity */}
      {darkBackground && (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none' }}>
          <HookDecoration
            type={getHookDecorationType(headline)}
            color="#ffffff"
            accent={decoAccent}
          />
        </div>
      )}

      {/* fal.ai background image — 15% opacity, purely atmospheric behind all content */}
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

      <ArrowIcons color={arrowColor} sizeScale={arrowScale} />
      <LuniaLogo variant={darkBackground ? "light" : "dark"} sizeScale={logoScale} />

      {/* Flex column layout — headline / body+citation / graphic */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: SLIDE_PADDING.y,
        paddingBottom: SLIDE_PADDING.y,
        paddingLeft: SLIDE_PADDING.x,
        paddingRight: SLIDE_PADDING.x,
        gap: SECTION_GAP,
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

        {/* Body zone — grows to fill remaining space above graphic */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            fontSize: 18,
            color: citationColor,
            lineHeight: 1.4,
          }}>
            {citation}
          </div>
        </div>

        {/* Graphic zone — Path 1 (GraphicSpec) or Path 2 (raw SVG) */}
        {hasInlineGraphic && (
          <div style={{ minHeight: GRAPHIC_MIN_HEIGHT, flexShrink: 0 }}>
            {hasGraphicSpec ? (
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
