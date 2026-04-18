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

// ─── Ad Builder (Recraft V4 + Seedream 5 Lite Edit) ───────────────────────────
// These helpers are for the Meta static-ad builder. Recraft V4 is purpose-built
// for brand/product work; Seedream 5 Lite Edit is the reference-based editor for
// the iterate loop. Carousel generation continues to use Recraft V3 above.

export type AdAspectRatio = '1:1' | '4:5';

function adImageSize(aspect: AdAspectRatio): { width: number; height: number } {
  // Meta-feed-optimised output sizes
  return aspect === '1:1'
    ? { width: 1024, height: 1024 }
    : { width: 1024, height: 1280 };
}

/**
 * Generate a brand/product ad image with Recraft V4.
 */
export async function generateAdImage(opts: {
  prompt: string;
  aspect: AdAspectRatio;
}): Promise<string> {
  const { prompt, aspect } = opts;
  const result = await fal.subscribe('fal-ai/recraft/v4/pro/text-to-image', {
    input: {
      prompt,
      image_size: adImageSize(aspect),
    },
    logs: false,
  });
  const url: string | undefined = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
  if (!url) throw new Error('No image URL in fal-ai/recraft/v4/pro/text-to-image response');
  return url;
}

/**
 * Generate an ad image CONDITIONED on user-supplied reference images
 * (e.g. the real Lunia bottle + optional secondary refs). Uses Seedream v4
 * Edit — higher-fidelity than v5 Lite, accepts up to ~10 reference URLs, and
 * handles subject preservation well. This is what you use when the user has
 * attached a Product asset: FAL never hallucinates the bottle; it edits
 * *around* the real product.
 */
export async function generateAdImageWithReference(opts: {
  prompt: string;
  referenceUrls: string[];  // e.g. [productUrl, ...optionalExtras]
  aspect: AdAspectRatio;
}): Promise<string> {
  const { prompt, referenceUrls, aspect } = opts;
  if (referenceUrls.length === 0) {
    throw new Error('generateAdImageWithReference requires at least one reference URL');
  }
  const size = adImageSize(aspect);
  const result = await fal.subscribe('fal-ai/bytedance/seedream/v4/edit', {
    input: {
      prompt,
      image_urls: referenceUrls.slice(0, 10),
      image_size: size,
      num_images: 1,
      enable_safety_checker: true,
    },
    logs: false,
  });
  const url: string | undefined = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
  if (!url) throw new Error('No image URL in fal-ai/bytedance/seedream/v4/edit response');
  return url;
}

/**
 * Edit an existing ad image with Seedream 5.0 Lite Edit, using a natural-
 * language edit instruction. The input image is passed as a reference URL.
 */
export async function editAdImage(opts: {
  imageUrl: string;
  editInstruction: string;
  aspect: AdAspectRatio;
}): Promise<string> {
  const { imageUrl, editInstruction, aspect } = opts;
  const size = adImageSize(aspect);
  const result = await fal.subscribe('fal-ai/bytedance/seedream/v5/lite/edit', {
    input: {
      prompt: editInstruction,
      image_urls: [imageUrl],
      image_size: size,
      num_images: 1,
    },
    logs: false,
  });
  const url: string | undefined = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
  if (!url) throw new Error('No image URL in fal-ai/bytedance/seedream/v5/lite/edit response');
  return url;
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
