// ─── fal.ai client — server-side only ─────────────────────────────────────────
// NEVER import this file from a 'use client' component.
// It is only used inside src/app/api/ route handlers.
import 'server-only';
import { fal } from '@fal-ai/client';
import type { BrandStyle, Hook } from './types';

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

// ─── Content slide background image generation ────────────────────────────────
// Generates a 1080×1350 editorial/realistic background for content slides.
// Rendered at low opacity (~22%) behind all slide content — text and SVG
// graphic components remain fully visible on top.

export interface SlideGraphicResult {
  url: string;
}

export async function generateSlideBackground(prompt: string): Promise<SlideGraphicResult> {
  const result = await fal.subscribe('fal-ai/recraft-v3', {
    input: {
      prompt,
      image_size: { width: 1080, height: 1350 },
      style: 'realistic_image',
      colors: [],
    },
  }) as { images?: Array<{ url: string }> };

  const url = result?.images?.[0]?.url;
  if (!url) throw new Error('fal.ai returned no image URL for slide background');
  return { url };
}

// Build an editorial/atmospheric background prompt from the slide headline + topic.
// Goal: premium wellness photography that enhances the slide's emotional tone
// without competing with text or data graphics.
export function buildSlideBackgroundPrompt(headline: string, topic: string = ''): string {
  const text = `${headline} ${topic}`.toLowerCase();

  if (/sleep|rem|melatonin|circadian|insomnia|slumber/.test(text))
    return `Serene dark bedroom at night, pristine white linens glowing in soft moonlight, sheer curtains diffusing city glow, peaceful and still. ${STYLE_TOKEN}`;
  if (/stress|cortisol|anxiety|tension/.test(text))
    return `Dimly lit minimalist desk at night, soft lamplight on scattered papers, an overturned hourglass casting long shadow, quiet tension and exhaustion. ${STYLE_TOKEN}`;
  if (/brain|neuron|cognitive|memory|neural|glymphatic/.test(text))
    return `Abstract neural pathways glowing in deep space, bioluminescent tendrils of light branching through darkness, scientific beauty, midnight blue. ${STYLE_TOKEN}`;
  if (/hormone|testosterone|estrogen|endocrine/.test(text))
    return `Athlete silhouette at golden hour, sharp form against gradient dusk sky, power and stillness, cinematic premium wellness. ${STYLE_TOKEN}`;
  if (/magnesium|supplement|mineral|glycinate|capsule/.test(text))
    return `Elegant amber glass bottle on dark marble surface, single soft spotlight, minimalist luxury wellness still life, deep shadows. ${STYLE_TOKEN}`;
  if (/gut|digestion|microbiome|probiotic/.test(text))
    return `Lush deep-green botanical spread, fermented jars catching low candlelight, dark moody earth tones, editorial wellness photography. ${STYLE_TOKEN}`;
  if (/longevity|aging|lifespan|telomere|epigenetic/.test(text))
    return `Weathered hands tending a thriving garden at dawn, dew on leaves, warm directional backlight, the promise of decades ahead, cinematic depth of field. ${STYLE_TOKEN}`;
  if (/recovery|performance|muscle|athlete|plunge/.test(text))
    return `Cold plunge pool at first light, steam rising over still dark water, luxury wellness resort, silver and midnight blue tones. ${STYLE_TOKEN}`;
  if (/light|blue light|circadian|photoreceptor/.test(text))
    return `Single blue glow of a screen in a dark room, long shadows, contrast of cold light against warm darkness, moody and cinematic. ${STYLE_TOKEN}`;
  if (/temperature|thermoregulation|cold|heat/.test(text))
    return `Minimal bathroom at night, steaming bath with soft candlelight reflections, dark polished stone, luxury spa stillness. ${STYLE_TOKEN}`;

  // Generic wellness fallback
  return `Premium wellness editorial evoking "${headline}", dark atmospheric scene, soft selective lighting, serene and aspirational. ${STYLE_TOKEN}`;
}

// TIER B/C classification — determines whether to use AI image or SVG component.
// Returns true for components that benefit from AI imagery (layout/concept).
// Returns false for data-precise components that need React SVG accuracy.
const TIER_A_COMPONENTS = new Set([
  'stat', 'bars', 'donut', 'radial', 'circleStats', 'spectrum',
  'stackedBar', 'funnel', 'scorecard', 'iconStat', 'heatGrid',
  'wave', 'timeline', 'matrix2x2', 'callout', 'split',
]);

export function isTierBC(graphicJson: string): boolean {
  try {
    const parsed = JSON.parse(graphicJson) as { component?: string };
    if (!parsed?.component) return false;
    return !TIER_A_COMPONENTS.has(parsed.component);
  } catch {
    return false;
  }
}

// Build a fallback fal.ai prompt when graphicImagePrompt is missing from LLM output.
export function buildSlideGraphicFallback(
  headline: string,
  graphicJson: string,
  brandStyle?: BrandStyle,
): string {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  try {
    const parsed = JSON.parse(graphicJson) as { component?: string; data?: Record<string, unknown> };
    const comp = parsed?.component ?? 'concept';
    const componentVisuals: Record<string, string> = {
      hubSpoke: 'central glowing node with 4 radiating arcs connecting to smaller circles, hub-and-spoke network diagram',
      iceberg: 'iceberg cross-section showing small peak above waterline and large hidden mass below, dark ocean gradient',
      bridge: 'elegant arc bridge connecting two elevated platforms, representing problem to solution transformation',
      bento: 'four clean tile cards in a 2x2 grid, each with an icon and minimal label, modern dashboard aesthetic',
      conceptFlow: 'three connected circular nodes with directional arrows, representing a causal chain or process flow',
      dotchain: 'five connected dots in a horizontal chain with arrows, step-by-step progression, minimal geometric',
      steps: 'three numbered ascending steps or staircase, clean geometric, upward progression metaphor',
      processFlow: 'four rectangular boxes connected by arrows in a horizontal sequence, biochemical pathway style',
      checklist: 'vertical list of three items with checkmark icons, clean minimal, task completion aesthetic',
      iconGrid: 'nine emoji-style icons arranged in a 3x3 grid, clean white background, colorful minimal icons',
      pyramid: 'three-tier pyramid structure with base widest, hierarchical representation, clean geometric',
      versus: 'split-screen composition, two contrasting halves with dividing line, comparison aesthetic',
      table: 'clean minimal data table with two columns and three rows, modern spreadsheet aesthetic',
      bubbles: 'floating circles of varying sizes representing concepts, organic cluster, minimal vector',
      vector: `abstract minimal illustration representing: ${headline}`,
    };
    const visual = componentVisuals[comp] ?? `abstract minimal illustration representing: ${headline}`;
    return `${visual}. Clean minimal vector illustration, no text, no labels, white background, ${accent} accent color highlights, soft geometric shadows, professional infographic aesthetic. Max 40 words.`;
  } catch {
    return `Abstract minimal illustration representing: ${headline}. Clean vector, white background, ${accent} highlights, no text.`;
  }
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
