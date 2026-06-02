import { fal } from '@/lib/fal';
import { checkRateLimit, getAssets } from '@/lib/kv';
import { isDarkColor } from '@/lib/color';
import { generateEmailImage } from '@/lib/email-image-engine';

export const maxDuration = 240;

const RECRAFT_ENDPOINT = 'fal-ai/recraft/v4/pro/text-to-image';

/** Keywords that indicate the slide is actually about the Lunia product /
 *  supplement itself — only then do we feature the bottle. For unrelated
 *  topics (sleep biology, stress, lifestyle), the bottle would feel forced. */
const PRODUCT_KEYWORDS = [
  'lunia', 'restore', 'bottle', 'supplement', 'capsule', 'pill', 'dose', 'dosage',
  'magnesium', 'glycinate', 'l-theanine', 'theanine', 'apigenin', 'ashwagandha',
  'ingredient', 'formula', 'serving', 'mg', 'tincture',
];

function slideMentionsProduct(text: string): boolean {
  const lower = text.toLowerCase();
  return PRODUCT_KEYWORDS.some((k) => lower.includes(k));
}

/** Editorial Scientific bg prompt — if the slide is about the product, the
 *  Lunia Restore amber bottle becomes the focal subject (still-life on linen
 *  / stone / pedestal). Otherwise, we render an editorial scene that matches
 *  the slide's subject (calm bedroom, hands, surface) with NO product. */
function buildEditorialBgPrompt(args: { headline: string; body: string; topic?: string; includeBottle: boolean; paperTone: 'white' | 'warm' }): string {
  const subject = `${args.headline}. ${args.body}`.slice(0, 240);
  const palette = args.paperTone === 'warm'
    ? 'warm ecru cream (#EFE1C8) base filling the frame edge-to-edge — uncoated cream paper / lime-washed plaster wall feel, the kind of surface that absorbs and re-emits warm light. Highlights may tip toward #F3E7D0, shadows fall to #E2D2B0. Light quality: warm golden late-afternoon / candle-lit light through gauzy curtains, visible light direction (window glow on one side, soft falloff into deeper warm shadow on the other). The LIGHT itself is warm, not just the paper. Rich navy (#01253f) is reserved for any printed/text accents. Subjects (skin, hair, fabric, linen) are gently warmed by the ambient light — bedding reads as cream linen, not white. NOT clinical daylight on warm paper. NOT yellow, NOT orange, NOT golden-amber-dominant, NOT pink, NOT cool grey. Forbidden chromatic accents: NO teal, NO sage, NO mint, NO mustard, NO orange, NO pink, NO purple, NO heavy saturation. Aesthetic reference: warm Aesop catalogue / candle-lit editorial.'
    : 'soft pearl ivory (#EFEFF4) base filling the frame edge-to-edge, with rich navy (#01253f) reserved for any printed/text accents and slate blue (#2C3F51) limited to deepest shadow tones only. Aesthetic: natural warm-ivory editorial wellness photography — gentle window daylight, subjects in their natural colours but bathed in pearl-ivory light. Think Aesop / Hims / Goop ivory editorial — warm pearl ivory NOT cool grey, NOT desaturated black-and-white. Forbidden chromatic accents: NO teal, NO sage green, NO mint, NO mustard yellow, NO orange, NO pink, NO purple, NO heavy saturation. Natural muted earth tones from the subject itself are fine.';

  if (args.includeBottle) {
    return [
      'Editorial scientific product photograph of the Lunia Restore amber-glass supplement bottle on a calm minimalist surface (linen, smooth stone, marble pedestal, or matte ceramic).',
      'Composition: the bottle is positioned to the RIGHT of the frame with generous negative space on the left for editorial text.',
      `Subject context: ${subject}.`,
      args.topic ? `Topical context: ${args.topic}.` : '',
      `Aesthetic: clinical premium DTC wellness, magazine-cover quality, soft natural daylight, ${palette}, no harsh shadows.`,
      'Photoreal, sharp focus, premium still-life product photography. Background is uncluttered.',
      'Absolutely NO text, NO words, NO logos, NO labels, NO signage, NO supplement-label typography in the scene.',
    ].filter(Boolean).join(' ');
  }

  return [
    'Editorial scientific photograph for a premium wellness brand — calm, minimal, magazine-cover quality.',
    `Subject: ${subject}.`,
    args.topic ? `Topical context: ${args.topic}.` : '',
    'Composition: the focal subject is positioned to the RIGHT of the frame with generous negative space on the left for editorial text.',
    `Aesthetic: clinical premium DTC wellness, soft natural daylight, ${palette}, no harsh shadows.`,
    'Photoreal, sharp focus, premium editorial photography. Background is uncluttered.',
    'No bottles, no supplements, no product packaging. No people unless the subject explicitly calls for a person — then half-portraits or hands only, never a full portrait.',
    'Absolutely NO text, NO words, NO logos, NO labels, NO signage of any kind in the scene.',
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

    // Editorial Scientific routes through gpt-image-2/edit. Attach the Lunia
    // bottle + logo references ONLY when the slide is actually about the
    // product (mentions an ingredient, dose, the brand, etc.) — otherwise the
    // bottle would feel forced into unrelated topics.
    if (stylePreset === 'editorial-scientific') {
      const VALID_PAPER_TONES = ['white', 'warm'] as const;
      const paperTone: 'white' | 'warm' = (VALID_PAPER_TONES as readonly string[]).includes(body.paperTone)
        ? (body.paperTone as 'white' | 'warm')
        : 'white';
      const includeBottle = slideMentionsProduct(`${headline} ${slideBody} ${topic ?? ''}`);
      const editorialPrompt = buildEditorialBgPrompt({ headline, body: slideBody, topic, includeBottle, paperTone });

      let referenceImageUrls: string[] = [];
      if (includeBottle) {
        try {
          const assets = await getAssets();
          referenceImageUrls = assets
            .filter((a) => a.assetType === 'logo' || a.assetType === 'product-image')
            .map((a) => a.url)
            .slice(0, 10);
        } catch (assetErr) {
          console.warn('[v2/generate-slide-bg] getAssets failed, generating without refs:', assetErr);
        }
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
      console.log(`[v2/generate-slide-bg] editorial bottle=${includeBottle} refs=${referenceImageUrls.length} paper=${paperTone} prompt="${editorialPrompt.slice(0, 120)}..."`);
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
