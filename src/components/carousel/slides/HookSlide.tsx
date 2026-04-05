'use client';

import ArrowIcons from '@/components/carousel/shared/ArrowIcons';
import HookDecoration, { getHookDecorationType } from '@/components/carousel/shared/HookDecoration';
import LuniaLogo from '@/components/carousel/shared/LuniaLogo';
import SlideWrapper from '@/components/carousel/shared/SlideWrapper';
import { BrandStyle } from '@/lib/types';

// ─── Layout tokens ────────────────────────────────────────────────────────────
const SLIDE_PADDING = { x: 72, y: 80 };
const SECTION_GAP = 32;

type Props = {
  headline: string;
  subline: string;
  sourceNote?: string;
  topic?: string;        // used to pick the matching decoration
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  backgroundImageUrl?: string;
  isFalImage?: boolean;  // true = fal.ai generated; use lighter overlay (more dramatic)
  shimmer?: boolean;     // true = show loading shimmer while fal image generates
  showDecoration?: boolean;
  logoScale?: number;
  arrowScale?: number;
};

export default function HookSlide({ headline, subline, sourceNote, topic, scale = 1, id, brandStyle, backgroundImageUrl, isFalImage = false, shimmer = false, showDecoration = true, logoScale = 1, arrowScale = 1 }: Props) {
  const bg = brandStyle?.hookBackground ?? 'linear-gradient(160deg, #0a1628 0%, #0d2137 40%, #0a2a3a 100%)';
  const headlineColor = brandStyle?.hookHeadline ?? '#ffffff';
  const sublineColor = brandStyle?.accent ?? '#c8dde8';
  const decoAccent = brandStyle?.secondary ?? '#e8f4f8';
  const arrowColor = brandStyle?.secondary ?? '#4a7c8e';
  const decorationType = getHookDecorationType(topic ?? headline);

  return (
    <SlideWrapper scale={scale} id={id} style={{ background: bg, overflow: 'hidden' }}>
      {/* Background layer — fal.ai image or template image, painted first in DOM so
          all subsequent elements stack above without needing explicit z-index */}
      {backgroundImageUrl ? (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          {/* Overlay: lighter (0.45) for fal images to show more drama; heavier (0.82) for template images */}
          <div style={{
            position: 'absolute', inset: 0,
            background: bg,
            opacity: isFalImage ? 0.45 : 0.82,
          }} />
        </>
      ) : shimmer ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }} />
      ) : null}

      <ArrowIcons color={arrowColor} sizeScale={arrowScale} />

      {/* Topic-matched decoration — replaces static WaveLines */}
      {showDecoration && <HookDecoration type={decorationType} color="#ffffff" accent={decoAccent} />}

      {/* Flex column content block — headline + subline stacked with padding tokens */}
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
          fontSize: 64,
          color: headlineColor,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          lineHeight: 1.15,
        }}>
          {headline}
        </div>

        {/* Subline zone */}
        <div style={{
          fontFamily: 'Cormorant Garamond, Lora, serif',
          fontWeight: 400,
          fontStyle: 'italic',
          fontSize: 38,
          color: sublineColor,
          lineHeight: 1.4,
        }}>
          {subline}
        </div>
      </div>

      {/* Trust liner — "Based on X research" */}
      {sourceNote && (
        <div style={{
          position: 'absolute',
          bottom: SLIDE_PADDING.y + 72,  // sits just above the logo
          left: SLIDE_PADDING.x,
          right: SLIDE_PADDING.x,
          fontFamily: 'Jost, Montserrat, sans-serif',
          fontWeight: 400,
          fontSize: 20,
          color: sublineColor,
          opacity: 0.65,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {sourceNote}
        </div>
      )}

      <LuniaLogo sizeScale={logoScale} />
    </SlideWrapper>
  );
}
