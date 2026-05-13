import { fal, buildPrompt } from '@/lib/fal';
import { checkRateLimit } from '@/lib/kv';
import type { Hook } from '@/lib/types';
import { chooseImageEngine, FAL_ENDPOINTS, type ImageEngine } from '@/lib/carousel-image-engine';
import { pickRandomMood, getMoodById, type VisualMood } from '@/lib/carousel-visual-moods';

// Ideogram V3 style values: https://fal.ai/models/fal-ai/ideogram/v3
const IDEOGRAM_STYLE_MAP: Record<string, string> = {
  realistic: 'REALISTIC',
  cartoon: 'DESIGN',
  anime: 'DESIGN',
  vector: 'DESIGN',
};

// Recraft V4 Pro consistently takes 40-90s on fal.ai (slower than V3's
// 20-30s). 60s was clipping the long tail and producing 504s. 120s gives
// headroom without inviting hung requests.
export const maxDuration = 120;

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1';

  const allowed = await checkRateLimit(ip, 'images');
  if (!allowed) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const slideIndex: number = Number(body.slideIndex);
    const topic: string = body.topic ?? '';
    const hook: Hook | undefined = body.hook;
    const imagePrompt: string | undefined = body.imagePrompt;
    const imageStyle: string = body.imageStyle ?? 'realistic';
    const VALID_ASPECTS = ['4:5', '9:16'] as const;
    const imageAspect = VALID_ASPECTS.includes(body.imageAspect) ? (body.imageAspect as '4:5' | '9:16') : '4:5';
    // Raised to exceed Instagram native (1080×1350 for 4:5, 1080×1920 for 9:16).
    // Uploading above-native lets Instagram compress down rather than upscale.
    const imageSize = imageAspect === '9:16'
      ? { width: 1080, height: 1920 }   // 9:16 — Instagram native
      : { width: 1440, height: 1800 };  // 4:5 — 33% above Instagram native

    if (!topic.trim()) return Response.json({ error: 'Topic required' }, { status: 400 });
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 4) {
      return Response.json({ error: 'slideIndex must be 0–4' }, { status: 400 });
    }

    const override = (body.imageEngine && ['recraft', 'ideogram', 'flux2', 'gpt-image-2'].includes(body.imageEngine))
      ? (body.imageEngine as ImageEngine)
      : undefined;
    const textInImage: boolean = Boolean(body.textInImage);
    const engine = chooseImageEngine({ slideIndex, imageStyle, textInImage, override });

    // Pick a visual mood for this generation. If the caller passes one (e.g.
    // "regenerate with the same mood"), respect it; otherwise random.
    const mood: VisualMood = getMoodById(body.moodId) ?? pickRandomMood();

    const basePrompt = imagePrompt?.trim() ? imagePrompt : buildPrompt(slideIndex, topic, hook);
    // Append the mood's style block. Placing it AFTER the Claude-written
    // subject prompt biases the model toward the mood's color/lighting/finish
    // while keeping Claude's compositional direction intact.
    const prompt = `${basePrompt}\n\nVisual mood — ${mood.label}: ${mood.styleBlock}.`;
    console.log(`[v2/generate-image] slide=${slideIndex} engine=${engine} mood=${mood.id} prompt_source=${imagePrompt?.trim() ? 'claude' : 'fallback'} prompt="${prompt.slice(0, 100)}..."`);

    let url: string | undefined;
    try {
      url = await runEngine(engine, { prompt, imageStyle, imageSize, imageAspect });
    } catch (engineErr) {
      // Surface fal.ai's actual error body so we can see what's wrong client-side
      const detail = extractFalError(engineErr);
      console.error(`[api/carousel-v2/generate-image] ${engine} call failed:`, detail);
      return Response.json({ error: `${engine} failed: ${detail}` }, { status: 500 });
    }
    if (!url) throw new Error(`No image URL in ${engine} response`);

    return Response.json({ url, engine, mood: { id: mood.id, label: mood.label } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/carousel-v2/generate-image]', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

function extractFalError(err: unknown): string {
  if (!err) return "unknown error";
  if (err instanceof Error) {
    // fal client wraps API errors with a `body` or `response` field
    const e = err as Error & { body?: unknown; response?: { status?: number; data?: unknown } };
    if (e.body) {
      try { return typeof e.body === "string" ? e.body : JSON.stringify(e.body); } catch { /* fallthrough */ }
    }
    if (e.response?.data) {
      try { return JSON.stringify(e.response.data); } catch { /* fallthrough */ }
    }
    return err.message || String(err);
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

type RunInput = {
  prompt: string;
  imageStyle: string;
  imageSize: { width: number; height: number };
  imageAspect: '4:5' | '9:16';
};

async function runEngine(engine: ImageEngine, input: RunInput): Promise<string | undefined> {
  const endpoint = FAL_ENDPOINTS[engine];

  if (engine === 'recraft') {
    // Match lib/fal.ts generateAdImage() shape exactly — verbatim prompt,
    // image_size as {width,height}, no style enum (V4 Pro doesn't accept V3's).
    // Style intent is already woven into the prompt by the upstream Claude
    // image-prompt generator (see regenerate-image-prompt route).
    const result = await fal.subscribe(endpoint, {
      input: {
        prompt: input.prompt,
        image_size: input.imageSize,
      },
      logs: false,
    });
    return (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
  }

  if (engine === 'ideogram') {
    const result = await fal.subscribe(endpoint, {
      input: {
        prompt: input.prompt,
        aspect_ratio: input.imageAspect === '9:16' ? '9:16' : '4:5',
        rendering_speed: 'BALANCED',
        style: IDEOGRAM_STYLE_MAP[input.imageStyle] ?? 'AUTO',
      },
      logs: false,
    });
    return (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
  }

  if (engine === 'gpt-image-2') {
    const result = await fal.subscribe(endpoint, {
      input: {
        prompt: input.prompt,
        image_size: input.imageSize,
        quality: 'high',
      },
      logs: false,
    });
    return (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
  }

  // flux2
  const result = await fal.subscribe(endpoint, {
    input: {
      prompt: input.prompt,
      image_size: input.imageSize,
    },
    logs: false,
  });
  return (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
}
