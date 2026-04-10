import { fal, buildPrompt } from '@/lib/fal';
import { checkRateLimit } from '@/lib/kv';
import type { Hook } from '@/lib/types';

// Valid recraft-v3 style values: https://fal.ai/models/fal-ai/recraft-v3
const FAL_STYLE_MAP: Record<string, string> = {
  realistic: 'realistic_image',
  cartoon: 'digital_illustration',
  anime: 'digital_illustration/2d_art_poster',
  vector: 'vector_illustration',
};

export const maxDuration = 60; // seconds — recraft-v3 can take ~20-30s

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1';

  const allowed = await checkRateLimit(ip, 'images');
  if (!allowed) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const slideIndex: number = Number(body.slideIndex);
    const topic: string = body.topic ?? '';
    const hook: Hook | undefined = body.hook;
    const imagePrompt: string | undefined = body.imagePrompt; // Claude-written prompt takes priority
    const imageStyle: string = body.imageStyle ?? 'realistic';
    const falStyle = FAL_STYLE_MAP[imageStyle] ?? 'realistic_image';
    const VALID_ASPECTS = ['4:5', '9:16'] as const;
    const imageAspect = VALID_ASPECTS.includes(body.imageAspect) ? body.imageAspect as '4:5' | '9:16' : '4:5';
    const imageSize = imageAspect === '9:16'
      ? { width: 864, height: 1536 }   // 9:16 for Reels (864/1536 = exact 9:16, multiples of 32)
      : { width: 1024, height: 1280 };  // 4:5 for carousel (default)

    if (!topic.trim()) {
      return Response.json({ error: 'Topic required' }, { status: 400 });
    }
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 4) {
      return Response.json({ error: 'slideIndex must be 0–4' }, { status: 400 });
    }

    // Use Claude-generated prompt if available, otherwise fall back to keyword-based builder
    const prompt = imagePrompt?.trim() ? imagePrompt : buildPrompt(slideIndex, topic, hook);
    console.log(`[generate-image] slide=${slideIndex} style=${falStyle} prompt_source=${imagePrompt?.trim() ? 'claude' : 'fallback'} prompt="${prompt.slice(0, 80)}..."`);

    const result = await fal.subscribe('fal-ai/recraft-v3', {
      input: {
        prompt,
        image_size: imageSize,
        style: falStyle,
        num_images: 1,
      },
      logs: false,
    });

    const url: string | undefined = (result.data as any)?.images?.[0]?.url;
    if (!url) throw new Error('No image URL in fal.ai response');

    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/carousel/generate-image]', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
