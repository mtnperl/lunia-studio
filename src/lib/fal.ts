// ─── fal.ai client — server-side only ─────────────────────────────────────────
// NEVER import this file from a 'use client' component.
// It is only used inside src/app/api/ route handlers.
import 'server-only';
import { fal } from '@fal-ai/client';
import type { CarouselContentSlide, Hook } from './types';

fal.config({ credentials: process.env.FAL_KEY });

export { fal };

// ─── Visual cohesion token ─────────────────────────────────────────────────────
// Appended to every prompt so all slides share the same colour temperature and mood.
const STYLE_TOKEN =
  'cinematic editorial photography, dark blue-midnight atmosphere, ' +
  'soft natural light, ultra sharp detail, premium wellness brand, ' +
  'minimalist composition, no text, no people, no logos';

// ─── Prompt builder ────────────────────────────────────────────────────────────
export function buildPrompt(
  slideIndex: number,   // 0 = hook, 1-3 = content, 4 = CTA
  topic: string,
  hook?: Hook,
  slide?: CarouselContentSlide,
): string {
  if (slideIndex === 0) {
    // Hook: dramatic, full-bleed, cinematic hero shot driven by the topic
    return (
      `${topic} — moody cinematic hero shot, dark atmospheric scene, ` +
      `deep shadows and selective highlights, editorial photography, ` +
      `${STYLE_TOKEN}`
    );
  }

  if (slideIndex >= 1 && slideIndex <= 3 && slide) {
    // Content slides: abstract or environmental, derived from headline keywords
    const subject = deriveSubject(slide.headline, topic);
    return (
      `${subject}, abstract editorial background, dark muted tones, ` +
      `environmental or botanical macro, subtle texture, ` +
      `${STYLE_TOKEN}`
    );
  }

  // CTA slide: elegant minimal closer — warmer than content slides
  return (
    `minimal elegant abstract dark texture, soft atmospheric depth, ` +
    `premium lifestyle, ${STYLE_TOKEN}`
  );
}

// Extract meaningful visual keywords from a slide headline + topic
function deriveSubject(headline: string, topic: string): string {
  const lower = headline.toLowerCase();

  if (/cortisol|stress|anxiety|nervous|adrenalin/.test(lower))
    return 'neural abstract biology, glowing synapse pathways, dark blue background';
  if (/sleep|rem|deep sleep|slow.?wave|circadian|melatonin/.test(lower))
    return 'dark atmospheric bedroom, moonlight through curtains, still night scene';
  if (/magnesium|glycinate|theanine|apigenin|ingredient|supplement/.test(lower))
    return 'botanical macro photography, dark moody herb close-up, mineral crystals';
  if (/gut|absorp|bioavail/.test(lower))
    return 'abstract biological macro, organic cellular forms, dark blue hues';
  if (/longevity|aging|lifespan|telomere/.test(lower))
    return 'abstract organic forms, aged wood grain texture, deep forest atmosphere';
  if (/routine|ritual|habit|wind.?down/.test(lower))
    return 'dark calm bedroom scene, soft candlelight, minimalist night ritual';
  if (/data|study|research|trial|proven|evidence/.test(lower))
    return 'dark abstract data visualization, geometric patterns, editorial science';

  // Fallback: derive from topic
  return `abstract dark editorial background inspired by "${topic}", atmospheric depth`;
}
