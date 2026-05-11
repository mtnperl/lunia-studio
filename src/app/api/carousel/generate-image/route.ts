import { fal, buildPrompt } from '@/lib/fal';
import { checkRateLimit } from '@/lib/kv';
import type { Hook } from '@/lib/types';

// Upgraded to Recraft V4 Pro (same engine as carousel-v2).
// V4 Pro does not accept V3's style enum — style direction goes into the prompt.
// maxDuration raised to 120s: V4 Pro takes 40-90s at higher resolutions.
export const maxDuration = 120;

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
    const imagePrompt: string | undefined = body.imagePrompt;
    const VALID_ASPECTS = ['4:5', '9:16'] as const;
    const imageAspect = VALID_ASPECTS.includes(body.imageAspect) ? body.imageAspect as '4:5' | '9:16' : '4:5';
    // Raised from 1024×1280 / 864×1536 to match or exceed Instagram native
    // (1080×1350 for 4:5, 1080×1920 for 9:16). Uploading above-native lets
    // Instagram compress down rather than upscale, keeping edges crisp.
    const imageSize = imageAspect === '9:16'
      ? { width: 1080, height: 1920 }   // 9:16 — Instagram native (Stories/Reels)
      : { width: 1440, height: 1800 };  // 4:5 — 33% above Instagram native (1080×1350)

    if (!topic.trim()) {
      return Response.json({ error: 'Topic required' }, { status: 400 });
    }
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 4) {
      return Response.json({ error: 'slideIndex must be 0–4' }, { status: 400 });
    }

    const prompt = imagePrompt?.trim() ? imagePrompt : buildPrompt(slideIndex, topic, hook);
    console.log(`[v1/generate-image] slide=${slideIndex} engine=recraft-v4-pro prompt_source=${imagePrompt?.trim() ? 'claude' : 'fallback'} prompt="${prompt.slice(0, 80)}..."`);

    const result = await fal.subscribe('fal-ai/recraft/v4/pro/text-to-image', {
      input: {
        prompt,
        image_size: imageSize,
      },
      logs: false,
    });

    const url: string | undefined = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
    if (!url) throw new Error('No image URL in fal.ai response');

    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/carousel/generate-image]', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
