import { fal } from '@/lib/fal';
import { checkRateLimit, getAssets } from '@/lib/kv';
import { isDarkColor } from '@/lib/color';
import { generateEmailImage } from '@/lib/email-image-engine';

export const maxDuration = 240;

const RECRAFT_ENDPOINT = 'fal-ai/recraft/v4/pro/text-to-image';

/** Editorial Scientific bg prompt — features the Lunia Restore amber bottle as
 *  the focal subject, framed to the right of the composition so it sits naturally
 *  in the slide's right column. Echoes the reference look (bottle on rock,
 *  bottle on cube, bottle on linen). */
function buildEditorialBgPrompt(args: { headline: string; body: string; topic?: string }): string {
  const subject = `${args.headline}. ${args.body}`.slice(0, 240);
  return [
    'Editorial scientific product photograph of the Lunia Restore amber-glass supplement bottle on a calm minimalist surface (linen, smooth stone, marble pedestal, or matte ceramic).',
    'Composition: the bottle is positioned to the RIGHT of the frame with generous negative space on the left for editorial text.',
    `Subject context: ${subject}.`,
    args.topic ? `Topical context: ${args.topic}.` : '',
    'Aesthetic: clinical premium DTC wellness, magazine-cover quality, soft natural daylight, soft ivory / warm cream palette with deep navy accents, no harsh shadows.',
    'Photoreal, sharp focus, premium still-life product photography. Background is uncluttered.',
    'Absolutely NO text, NO words, NO logos, NO labels, NO signage, NO supplement-label typography in the scene.',
  ].filter(Boolean).join(' ');
}

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
    const stylePreset: string | undefined = typeof body.stylePreset === 'string' ? body.stylePreset : undefined;
    const VALID_ASPECTS = ['4:5', '9:16'] as const;
    const imageAspect = VALID_ASPECTS.includes(body.imageAspect) ? (body.imageAspect as '4:5' | '9:16') : '4:5';
    const imageSize = imageAspect === '9:16'
      ? { width: 864, height: 1536 }
      : { width: 1024, height: 1280 };

    if (!headline.trim() && !slideBody.trim()) {
      return Response.json({ error: 'headline or body required' }, { status: 400 });
    }

    // Editorial Scientific routes through gpt-image-2/edit with the Lunia
    // bottle + logo attached, so the slide image actually shows the product.
    if (stylePreset === 'editorial-scientific') {
      const editorialPrompt = buildEditorialBgPrompt({ headline, body: slideBody, topic });
      let referenceImageUrls: string[] = [];
      try {
        const assets = await getAssets();
        referenceImageUrls = assets
          .filter((a) => a.assetType === 'logo' || a.assetType === 'product-image')
          .map((a) => a.url)
          .slice(0, 10);
      } catch (assetErr) {
        console.warn('[v2/generate-slide-bg] getAssets failed, generating without refs:', assetErr);
      }
      const refDirective = referenceImageUrls.length > 0
        ? '\n\nUse the uploaded reference image for the Lunia Restore bottle — match its exact shape, label, proportions. The reference images win over any generic product description.'
        : '';
      // email-image-engine speaks 4:5 / 1:1 / 16:9. Reels carousels fall back
      // to 4:5; the slide cover-fits the image so the crop is acceptable.
      const url = await generateEmailImage({
        prompt: editorialPrompt + refDirective,
        aspect: '4:5',
        quality: 'medium',
        referenceImageUrls,
      });
      console.log(`[v2/generate-slide-bg] editorial refs=${referenceImageUrls.length} prompt="${editorialPrompt.slice(0, 120)}..."`);
      return Response.json({ url });
    }

    // Default v2 path — Recraft V4 Pro with an abstract editorial palette.
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
