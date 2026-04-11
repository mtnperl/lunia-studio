'use client';

import ArrowIcons from '@/components/carousel/shared/ArrowIcons';
import LuniaLogo from '@/components/carousel/shared/LuniaLogo';
import SlideWrapper from '@/components/carousel/shared/SlideWrapper';
import { BrandStyle } from '@/lib/types';

// ─── Layout tokens ────────────────────────────────────────────────────────────
const SLIDE_PADDING = { x: 72, y: 80 };
const SECTION_GAP = 32;
const SLIDE_H = { carousel: 1350, reels: 1920 };

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
  logoScale?: number;
  arrowScale?: number;
  showLuniaLifeWatermark?: boolean;
  reels?: boolean;       // 9:16 Reels format (1920px height, expanded padding)
};

export default function HookSlide({ headline, subline, sourceNote, topic: _topic, scale = 1, id, brandStyle, backgroundImageUrl, isFalImage = false, shimmer = false, logoScale = 1, arrowScale = 1, showLuniaLifeWatermark = false, reels = false }: Props) {
  const slideH = reels ? SLIDE_H.reels : SLIDE_H.carousel;
  const py = reels ? 220 : SLIDE_PADDING.y;
  const gap = reels ? 46 : SECTION_GAP;
  const bg = brandStyle?.hookBackground ?? 'linear-gradient(160deg, #0a1628 0%, #0d2137 40%, #0a2a3a 100%)';
  const headlineColor = brandStyle?.hookHeadline ?? '#ffffff';
  const sublineColor = brandStyle?.accent ?? '#c8dde8';
  const arrowColor = brandStyle?.secondary ?? '#4a7c8e';

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: bg, overflow: 'hidden' }}>
      {/* Background layer — fal.ai image or template image, painted first in DOM so
          all subsequent elements stack above without needing explicit z-index.
          Use <img> instead of CSS background-image so html-to-image captures it
          correctly on mobile Safari (getComputedStyle drops large data URLs). */}
      {backgroundImageUrl ? (
        <>
          <img
            src={backgroundImageUrl}
            crossOrigin="anonymous"
            alt=""
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              display: 'block',
            }}
          />
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

      {/* Flex column content block — headline + subline stacked with padding tokens */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: py,
        paddingBottom: py,
        paddingLeft: SLIDE_PADDING.x,
        paddingRight: SLIDE_PADDING.x,
        gap: gap,
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
          fontWeight: 600,
          fontSize: 50,
          color: sublineColor,
          lineHeight: 1.4,
        }}>
          {subline}
        </div>

        {/* Trust liner — sits directly beneath the subline */}
        {sourceNote && (
          <div style={{
            fontFamily: 'Jost, Montserrat, sans-serif',
            fontWeight: 400,
            fontSize: 20,
            color: sublineColor,
            opacity: 0.85,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: -8,
          }}>
            {sourceNote}
          </div>
        )}
      </div>

      {showLuniaLifeWatermark && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Jost, Montserrat, sans-serif',
          fontWeight: 300,
          fontSize: 18,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#ffffff',
          opacity: 0.13,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          LUNIA LIFE
        </div>
      )}
      <LuniaLogo sizeScale={logoScale} />
    </SlideWrapper>
  );
}
