import { fal } from '@/lib/fal';
import { checkRateLimit } from '@/lib/kv';
import { isDarkColor } from '@/lib/color';

export const maxDuration = 120;

const RECRAFT_ENDPOINT = 'fal-ai/recraft/v4/text-to-image/pro';

function buildBgPrompt(args: {
  headline: string;
  body: string;
  topic?: string;
  slideBgColor?: string;
}): string {
  const { headline, body, topic, slideBgColor } = args;
  const subject = `${headline}. ${body}`.slice(0, 280);
  const isDark = slideBgColor ? isDarkColor(slideBgColor) : true;

  // Palette guidance the engine should hit. Keep it abstract so it never
  // competes with the structured graphic + text overlaid on top.
  const palette = isDark
    ? 'deep midnight navy, warm off-white accents, soft luminous highlights'
    : 'warm off-white base, dusty navy accents, soft cream highlights';

  return [
    `Abstract editorial background texture inspired by: ${subject}.`,
    topic ? `Topical context: ${topic}.` : '',
    'Soft, painterly, atmospheric. Subtle organic shapes, gentle gradient transitions.',
    'No literal objects, no people, no animals, no text, no symbols, no logos.',
    `Palette: ${palette}.`,
    'Premium wellness brand aesthetic. Looks great when dimmed by 50% behind text and infographics.',
  ].filter(Boolean).join(' ');
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '127.0.0.1';

  const allowed = await checkRateLimit(ip, 'images');
  if (!allowed) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const headline: string = typeof body.headline === 'string' ? body.headline : '';
    const slideBody: string = typeof body.body === 'string' ? body.body : '';
    const topic: string | undefined = typeof body.topic === 'string' ? body.topic : undefined;
    const slideBgColor: string | undefined = typeof body.slideBgColor === 'string' ? body.slideBgColor : undefined;
    const VALID_ASPECTS = ['4:5', '9:16'] as const;
    const imageAspect = VALID_ASPECTS.includes(body.imageAspect) ? (body.imageAspect as '4:5' | '9:16') : '4:5';
    const imageSize = imageAspect === '9:16'
      ? { width: 864, height: 1536 }
      : { width: 1024, height: 1280 };

    if (!headline.trim() && !slideBody.trim()) {
      return Response.json({ error: 'headline or body required' }, { status: 400 });
    }

    const prompt = buildBgPrompt({ headline, body: slideBody, topic, slideBgColor });
    console.log(`[v2/generate-slide-bg] prompt="${prompt.slice(0, 120)}..."`);

    const result = await fal.subscribe(RECRAFT_ENDPOINT, {
      input: { prompt, image_size: imageSize },
      logs: false,
    });
    const url = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
    if (!url) return Response.json({ error: 'No image URL in response' }, { status: 500 });

    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/carousel-v2/generate-slide-bg]', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
