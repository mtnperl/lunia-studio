'use client';

import ArrowIcons from '@/components/carousel/shared/ArrowIcons';
import LuniaLogo from '@/components/carousel/shared/LuniaLogo';
import SlideWrapper from '@/components/carousel/shared/SlideWrapper';
import { BrandStyle } from '@/lib/types';
import { FrameOverlay, VignetteOverlay, GrainOverlay, BackgroundWashOverlay, buildColorGradeFilter, type HookOverlaySettings } from '@/components/carousel/shared/HookOverlays';

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
  /** v2: render the LUNIA LIFE footer at higher visibility (bolder, less ghosty). */
  prominentWatermark?: boolean;
  /** v2: layered overlays applied on top of the background image (frame, vignette, color grade, grain). */
  overlays?: HookOverlaySettings;
  reels?: boolean;       // 9:16 Reels format (1920px height, expanded padding)
  /** Carousel-wide style preset — "editorial-scientific" swaps typography to Inter and tones down hook treatment. */
  stylePreset?: "default" | "editorial-scientific";
  /** Decoration toggles (default true) — let the user hide the swipe-cue arrows, the slide-number badge, or the source-note rail. */
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
};

export default function HookSlide({ headline, subline, sourceNote, topic: _topic, scale = 1, id, brandStyle, backgroundImageUrl, isFalImage = false, shimmer = false, logoScale = 1, arrowScale = 1, showLuniaLifeWatermark = false, prominentWatermark = false, overlays, reels = false, stylePreset = "default", showSlideArrows = true, showSlideNumbers: _showSlideNumbers = true, showCitationBars = true }: Props) {
  const isEditorial = stylePreset === "editorial-scientific";
  const slideH = reels ? SLIDE_H.reels : SLIDE_H.carousel;
  const py = reels ? 220 : SLIDE_PADDING.y;
  const gap = reels ? 46 : SECTION_GAP;
  // Hook stays dark by default so white text reads cleanly; users can override via brandStyle.hookBackground.
  const bg = brandStyle?.hookBackground ?? '#01253f';
  const headlineColor = brandStyle?.hookHeadline ?? '#ffffff';
  const sublineColor = brandStyle?.accent ?? '#F7F4EF';
  const arrowColor = brandStyle?.secondary ?? 'rgba(247,244,239,0.55)';

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
              filter: overlays?.colorGrade.enabled ? buildColorGradeFilter(overlays.colorGrade.intensity) : undefined,
            }}
          />
          {/* Background wash. When configured, the user controls dark/light/none;
              otherwise legacy scrim: lighter (0.45) for fal images to show more
              drama, heavier (0.82) for template images. */}
          {overlays?.backgroundWash ? (
            <BackgroundWashOverlay darkColor={bg} wash={overlays.backgroundWash} />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: bg,
              opacity: isFalImage ? 0.45 : 0.82,
            }} />
          )}
          {overlays?.vignette.enabled && <VignetteOverlay intensity={overlays.vignette.intensity} />}
          {overlays?.grain.enabled && <GrainOverlay opacity={overlays.grain.opacity} />}
          {overlays?.frame.enabled && (
            <FrameOverlay
              color={overlays.frame.color}
              opacity={overlays.frame.opacity}
              inset={overlays.frame.inset}
            />
          )}
        </>
      ) : shimmer ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }} />
      ) : null}

      {showSlideArrows && <ArrowIcons color={arrowColor} sizeScale={arrowScale} />}

      {/*
        Editorial Scientific: when the hook image is ready, the text is already
        baked INTO the image by gpt-image-2, so we skip the HTML overlay to
        avoid duplicated text. If the image is still generating or failed, we
        fall through to the HTML overlay so the editor preview isn't empty.
      */}
      {!(isEditorial && backgroundImageUrl) && (
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
        <div style={isEditorial ? {
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 300,
          fontSize: 72,
          color: headlineColor,
          textTransform: 'none',
          letterSpacing: '-0.015em',
          lineHeight: 1.1,
        } : {
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
        <div style={isEditorial ? {
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 200,
          fontSize: 42,
          color: sublineColor,
          lineHeight: 1.45,
        } : {
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          fontWeight: 500,
          fontSize: 50,
          color: sublineColor,
          lineHeight: 1.4,
        }}>
          {subline}
        </div>

        {/* Trust liner — sits directly beneath the subline */}
        {showCitationBars && sourceNote && (
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
          color: '#ffffff',
          opacity: prominentWatermark ? 0.55 : 0.13,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          LUNIA LIFE
        </div>
      )}
      <LuniaLogo variant="light" sizeScale={logoScale} />
    </SlideWrapper>
  );
}
