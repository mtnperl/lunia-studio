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
  'no text, no logos, no watermarks';

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
// Goal: aspirational lifestyle ad imagery, not literal ingredient shots
function deriveHookSubject(topic: string): string {
  const lower = topic.toLowerCase();

  if (/cortisol|stress|anxiety|nervous/.test(lower))
    return 'Empty leather journal open on a minimalist wooden desk, afternoon light casting long shadows, pen resting across the page, half-drunk glass of water, the stillness after the storm, warm neutrals';
  if (/sleep|melatonin|circadian|rem|deep sleep/.test(lower))
    return 'Pristine white linen sheets glowing in warm 8am light, minimalist nightstand with dimmed amber lamp, soft golden bokeh in background, luxury hotel suite stillness, aspirational morning calm';
  if (/magnesium|glycinate|mineral/.test(lower))
    return 'Warm morning bathroom counter, elegant amber glass bottle and a crystal-clear glass of water, soft diffused light through frosted window, premium spa aesthetic, serene and aspirational';
  if (/theanine|botanical|herb|plant/.test(lower))
    return 'Lush green tea garden at golden hour, soft mist rising, ancient stone path leading into the trees, cinematic travel photography, warmth and tranquility, nature as luxury';
  if (/supplement|capsule|ingredient/.test(lower))
    return 'Minimalist white marble bathroom shelf with a single premium glass bottle, morning light catching the amber liquid inside, luxury medicine cabinet aesthetic, clean and aspirational';
  if (/gut|digestion|microbiome/.test(lower))
    return 'Vibrant farmers market spread — deep greens, rich purples, fermented jars catching golden light, abundance and vitality, editorial food photography, warm earthy tones';
  if (/longevity|aging|lifespan/.test(lower))
    return 'Serene 80-year-old hands tending a thriving garden at sunrise, dew on the leaves, warm light, cinematic depth of field — the promise of decades ahead, timeless vitality';
  if (/routine|ritual|habit|wind.?down/.test(lower))
    return 'Luxury nightstand vignette: a lit candle, open book face-down, amber glass of water, warm low light, crisp white sheets in the background, the aesthetic of the perfect night';
  if (/hormone|testosterone|estrogen/.test(lower))
    return 'Athlete\'s hands gripping a clean white towel post-workout, sweat on warm skin, soft side lighting, cinematic crop, quiet confidence and physical vitality, warm neutral tones';
  if (/recovery|performance|muscle/.test(lower))
    return 'Cold plunge pool at dawn, steam rising off still water, luxury wellness resort aesthetic, blue and silver tones, the visual promise of recovery and peak performance';

  // Generic wellness / Lunia fallback
  return `Aspirational premium lifestyle scene evoking the feeling of "${topic}", warm editorial light, luxury wellness aesthetic, shallow depth of field`;
}
