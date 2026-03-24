// ─── fal.ai client — server-side only ─────────────────────────────────────────
// NEVER import this file from a 'use client' component.
// It is only used inside src/app/api/ route handlers.
import 'server-only';
import { fal } from '@fal-ai/client';
import type { Hook } from './types';

fal.config({ credentials: process.env.FAL_KEY });

export { fal };

// ─── Visual cohesion token ─────────────────────────────────────────────────────
// Recraft V3 realistic_image prompt style: descriptive scene composition,
// specify lighting, mood, colours, and what to exclude.
const STYLE_TOKEN =
  'editorial photography, dark blue-midnight colour palette, ' +
  'soft directional natural light, ultra-sharp detail, ' +
  'premium wellness brand aesthetic, minimalist composition, ' +
  'no text, no people, no faces, no logos, no watermarks';

// ─── Prompt builder ────────────────────────────────────────────────────────────
// slideIndex: 0 = hook, 4 = CTA (content slides 1-3 no longer use fal.ai)
export function buildPrompt(
  slideIndex: number,
  topic: string,
  hook?: Hook,
): string {
  if (slideIndex === 0) {
    // Hook: dramatic full-bleed hero shot that evokes the topic emotionally
    const subject = deriveHookSubject(topic);
    return (
      `${subject}. Dramatic cinematic composition, deep shadows, selective highlights, ` +
      `dark atmospheric scene. ${STYLE_TOKEN}`
    );
  }

  // CTA slide (index 4): warm, elegant closer — slightly warmer than hook
  return (
    `Elegant minimal abstract scene: smooth dark stone surface, ` +
    `soft warm side-lighting, premium texture closeup, ` +
    `shallow depth of field, serene and inviting. ${STYLE_TOKEN}`
  );
}

// Derive a visual scene from the topic string for the hook slide
function deriveHookSubject(topic: string): string {
  const lower = topic.toLowerCase();

  if (/cortisol|stress|anxiety|nervous/.test(lower))
    return 'Close-up of still dark water at night, single ripple, moonlight reflection, deep shadows';
  if (/sleep|melatonin|circadian|rem|deep sleep/.test(lower))
    return 'Dark bedroom scene, single shaft of moonlight through curtains, clean white bedding, absolute stillness';
  if (/magnesium|glycinate|mineral/.test(lower))
    return 'Macro photography of raw mineral crystals, dark slate background, soft side-lighting, crystalline detail';
  if (/theanine|botanical|herb|plant/.test(lower))
    return 'Botanical macro photography, dark green leaves with water droplets, black background, moody studio lighting';
  if (/supplement|capsule|ingredient/.test(lower))
    return 'Overhead flat lay of dark botanical ingredients on matte black surface, dramatic side-lighting';
  if (/gut|digestion|microbiome/.test(lower))
    return 'Abstract organic biological macro forms, dark blue-black background, bioluminescent-style glow';
  if (/longevity|aging|lifespan/.test(lower))
    return 'Ancient dark wood grain texture, deep forest scene at night, atmospheric fog, timeless stillness';
  if (/routine|ritual|habit|wind.?down/.test(lower))
    return 'Minimalist dark nightstand scene, single lit candle, soft warm glow, absolute calm';
  if (/hormone|testosterone|estrogen/.test(lower))
    return 'Abstract dark molecular structure, glowing nodes on black background, scientific editorial';
  if (/recovery|performance|muscle/.test(lower))
    return 'Dark athletic scene, motion blur of still water, cool blue tones, strength and recovery';

  // Generic wellness / Lunia fallback
  return `Abstract dark editorial scene evoking "${topic}", deep shadows, premium wellness brand aesthetic`;
}
