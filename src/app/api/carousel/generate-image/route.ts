import { fal, buildPrompt } from '@/lib/fal';
import { checkRateLimit } from '@/lib/kv';
import type { CarouselContentSlide, Hook } from '@/lib/types';

export const maxDuration = 45; // seconds — flux/dev can take ~15-20s

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
    const slide: CarouselContentSlide | undefined = body.slide;

    if (!topic.trim()) {
      return Response.json({ error: 'Topic required' }, { status: 400 });
    }
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 4) {
      return Response.json({ error: 'slideIndex must be 0–4' }, { status: 400 });
    }

    const prompt = buildPrompt(slideIndex, topic, hook, slide);

    const result = await fal.subscribe('fal-ai/flux/dev', {
      input: {
        prompt,
        image_size: { width: 1024, height: 1280 }, // 4:5 — closest to 1080×1350, multiples of 64
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: false,
    });

    const url: string | undefined = (result.data as any)?.images?.[0]?.url;
    if (!url) throw new Error('No image URL in fal.ai response');

    return Response.json({ url });
  } catch (err) {
    console.error('[api/carousel/generate-image]', err);
    return Response.json({ error: 'Image generation failed' }, { status: 500 });
  }
}
