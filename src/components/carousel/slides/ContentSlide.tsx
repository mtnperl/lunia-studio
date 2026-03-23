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
import { GraphicErrorBoundary } from '@/components/carousel/graphics/GraphicErrorBoundary';
import { BrandStyle, GraphicSpec, GraphicStyle } from '@/lib/types';
import { extractGraphicData, parseGraphicSpec } from '@/lib/carousel-utils';

// ─── Layout tokens ────────────────────────────────────────────────────────────
const SLIDE_PADDING = { x: 72, y: 80 };
const SECTION_GAP = 32;
const GRAPHIC_MIN_HEIGHT = 440;

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

  // Colors
  const bg = brandStyle?.background ?? '#f0ece6';
  const headlineColor = brandStyle?.headline ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const citationColor = brandStyle?.secondary ?? '#6b7280';
  const arrowColor = brandStyle?.secondary ?? '#9ab0b8';

  // Body font size: smaller when a graphic occupies the graphic zone
  const bodyFontSize = hasInlineGraphic ? 27 : (hasLegacyGraphic ? 30 : 34);

  return (
    <SlideWrapper scale={scale} id={id} style={{ background: bg }}>
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

      <ArrowIcons color={arrowColor} />
      <LuniaLogo variant="dark" />

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
          fontSize: 52,
          color: headlineColor,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          lineHeight: 1.2,
          flexShrink: 0,
        }}>
          {headline}
        </div>

        {/* Body zone — grows to fill remaining space above graphic */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 400,
            fontSize: bodyFontSize,
            color: bodyColor,
            lineHeight: 1.6,
          }}>
            {body}
          </div>

          <div style={{
            fontFamily: 'Cormorant Garamond, Lora, serif',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: 17,
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
