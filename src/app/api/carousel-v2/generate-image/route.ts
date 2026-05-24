import { fal, buildPrompt } from '@/lib/fal';
import { checkRateLimit, getAssets } from '@/lib/kv';
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
// 20-30s). 60s was clipping the long tail and producing 504s. 120s was the
// previous setting. GPT Image 2 at quality:high routinely takes 90-180s,
// so we raise the cap to 300s to cover the slowest engine in the mix.
export const maxDuration = 300;

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

    // Editorial Scientific preset locks the mood to the Lunia editorial look.
    const stylePreset: string | undefined = typeof body.stylePreset === 'string' ? body.stylePreset : undefined;
    const isEditorial = stylePreset === 'editorial-scientific';

    // Parse the structured hook image spec early — we need it both for the
    // ref-attachment decision and for the prompt assembly below.
    type HookSpec = { brandMood: string; subject: string; composition: string; sceneElements: string[]; overlay?: string };
    const hookImageSpec: HookSpec | undefined =
      body.hookImageSpec && typeof body.hookImageSpec === 'object' ? body.hookImageSpec as HookSpec : undefined;

    /** Decide whether to attach the Lunia bottle reference for the editorial
     *  hook. Only when the structured spec genuinely calls for the product —
     *  otherwise the hook turns into a product shot, which the user has
     *  explicitly said they don't want. The logo is never attached to the
     *  hook image (user direction: no logo in hook). */
    const editorialSceneMentionsProduct = (() => {
      if (!isEditorial || !hookImageSpec) return false;
      const haystack = [
        hookImageSpec.subject,
        hookImageSpec.composition,
        ...(hookImageSpec.sceneElements ?? []),
      ].join(' ').toLowerCase();
      return /\b(lunia|restore|bottle|capsule|supplement|amber bottle|amber-glass|pill|dose|tincture|magnesium|theanine|apigenin|ashwagandha|glycinate|ingredient|formula)\b/.test(haystack);
    })();

    // Pick a visual mood for this generation. If the caller passes one (e.g.
    // "regenerate with the same mood"), respect it; otherwise random.
    const requestedMoodId = isEditorial ? 'editorial-scientific' : body.moodId;
    const mood: VisualMood = getMoodById(requestedMoodId) ?? pickRandomMood();

    const explicitEngine = (body.imageEngine && ['recraft', 'ideogram', 'flux2', 'gpt-image-2'].includes(body.imageEngine))
      ? (body.imageEngine as ImageEngine)
      : undefined;
    // Lifestyle Health renders best on gpt-image-2 — sunlit DTC-wellness
    // photography is its strongest lane. Caller-supplied imageEngine still wins.
    const moodDefaultEngine: ImageEngine | undefined =
      mood.id === 'lifestyle-health' || mood.id === 'editorial-scientific' ? 'gpt-image-2' : undefined;
    const override = explicitEngine ?? moodDefaultEngine;
    const textInImage: boolean = Boolean(body.textInImage);
    const engine = chooseImageEngine({ slideIndex, imageStyle, textInImage, override, stylePreset });

    const basePrompt = imagePrompt?.trim() ? imagePrompt : buildPrompt(slideIndex, topic, hook);

    // Reference attachment policy:
    //  • Lifestyle Health + gpt-image-2  → always attach bottle + logo (this
    //    mood is a product-photography lane).
    //  • Editorial Scientific + gpt-image-2 → attach only what Claude's spec
    //    actually references. Bottle if scene mentions the product, logo if
    //    scene mentions the wordmark. For purely lifestyle/biology topics,
    //    skip refs so the hook image doesn't shoehorn the product in.
    //  • Other moods + engines → no refs.
    let referenceImageUrls: string[] = [];
    if (engine === 'gpt-image-2') {
      // Lifestyle Health = product-photography lane: bottle + logo.
      // Editorial Scientific hook = product reference ONLY when the spec
      // actually calls for it. Never the logo (user direction).
      const wantsBottle = mood.id === 'lifestyle-health' || (mood.id === 'editorial-scientific' && editorialSceneMentionsProduct);
      const wantsLogo   = mood.id === 'lifestyle-health';
      if (wantsBottle || wantsLogo) {
        try {
          const assets = await getAssets();
          referenceImageUrls = assets
            .filter((a) =>
              (wantsLogo   && a.assetType === 'logo') ||
              (wantsBottle && a.assetType === 'product-image'))
            .map((a) => a.url)
            .slice(0, 10);
        } catch (assetErr) {
          console.warn('[v2/generate-image] getAssets failed, generating without refs:', assetErr);
        }
      }
    }

    // When real Lunia assets are attached, tell gpt-image-2 to actually USE
    // them instead of inventing a generic bottle / logo. Same phrasing pattern
    // as the email-review prompts.
    const referenceDirective = referenceImageUrls.length > 0
      ? `\n\nUse the uploaded reference image for the Lunia Restore bottle — match its exact shape, label, proportions. Use the uploaded reference image for the Lunia logo, small and discreet, rendered exactly as supplied. The reference images win over any generic product description.`
      : '';

    // ─── Editorial-Scientific HOOK uses a content-aware structured prompt ──
    // (Only the hook — slideIndex 0. Content slides keep mood.styleBlock.) The
    // structured spec was parsed earlier; here we wrap it in the fixed brand
    // chrome (text-to-bake, palette, fonts, references).
    const hookHeadline: string = typeof hook?.headline === 'string' ? hook.headline : '';
    const hookSubline:  string = typeof hook?.subline  === 'string' ? hook.subline  : '';

    const useEditorialHookFramework =
      slideIndex === 0 && isEditorial && hookImageSpec && hookImageSpec.subject;

    // customPrompt — if the caller (Edit hook-image prompt panel in PreviewStep)
    // passes a verbatim prompt string, send THAT to fal/gpt and skip the
    // server-side assembly. References still attach per the existing rules.
    const customPrompt: string | undefined =
      typeof body.customPrompt === 'string' && body.customPrompt.trim().length > 0
        ? body.customPrompt
        : undefined;

    const assembledPrompt = useEditorialHookFramework
      ? buildEditorialHookPrompt({
          spec: hookImageSpec!,
          headline: hookHeadline,
          subline:  hookSubline,
          hasRefs:  referenceImageUrls.length > 0,
        })
      : `${basePrompt}\n\nVisual mood — ${mood.label}: ${mood.styleBlock}.${referenceDirective}`;

    const prompt = customPrompt ?? assembledPrompt;

    // previewOnly — return the prompt without calling fal.ai. Used by the
    // "Edit hook-image prompt" UI to populate the textarea so the user can
    // see exactly what would be sent (or edit it before generating).
    if (body.previewOnly === true) {
      return Response.json({
        prompt,
        source: customPrompt ? 'custom' : (useEditorialHookFramework ? 'editorial-framework' : 'mood-assembled'),
        engine,
        mood: { id: mood.id, label: mood.label },
        refs: referenceImageUrls.length,
      });
    }

    console.log(`[v2/generate-image] slide=${slideIndex} engine=${engine} mood=${mood.id} refs=${referenceImageUrls.length} prompt_source=${customPrompt ? 'custom' : (imagePrompt?.trim() ? 'claude' : 'fallback')} prompt="${prompt.slice(0, 100)}..."`);

    let url: string | undefined;
    try {
      url = await runEngine(engine, { prompt, imageStyle, imageSize, imageAspect, referenceImageUrls });
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

// ─── Editorial Scientific hook framework ─────────────────────────────────────
// Content-aware structured prompt assembled from Claude's hookImageSpec + the
// chosen hook's headline / subline. Brand chrome (palette, fonts, references,
// guardrails) is fixed scaffolding shared by every editorial hook.
function buildEditorialHookPrompt(args: {
  spec: { brandMood: string; subject: string; composition: string; sceneElements: string[]; overlay?: string };
  headline: string;
  subline: string;
  hasRefs: boolean;
}): string {
  const { spec, headline, subline, hasRefs } = args;
  // Strip any bottle / product / logo references from sceneElements when the
  // topic isn't product-related (hasRefs gates the bottle, refs only attach
  // when the spec genuinely calls for it). The logo is NEVER part of the
  // hook image — user direction.
  const FORBIDDEN_SCENE_TOKENS = /\b(logo|wordmark|brand[- ]?mark|lunia life mark)\b/i;
  const filteredScene = (spec.sceneElements ?? [])
    .filter(Boolean)
    .filter((el) => !FORBIDDEN_SCENE_TOKENS.test(el));
  const scene = filteredScene.join(", ");

  const productLine = hasRefs
    ? "Use the uploaded reference for the Lunia Restore amber bottle — match its exact shape, label, proportions. The reference image wins over any generic product description."
    : "Do NOT include any supplement bottle, capsule, pill, tincture or product packaging in the scene. The product is intentionally absent from this hook.";

  return [
    `Create an editorial poster image for Lunia Life, a premium women's sleep & longevity brand. Brand mood: ${spec.brandMood}.`,
    "",
    `Subject: ${spec.subject}.`,
    `Composition: ${spec.composition}.${scene ? ` Scene elements: ${scene}.` : ""}`,
    "",
    "Bake the following text into the image as the ONLY typography in the scene. Use the Inter font family at the specified weights, with crisp anti-aliased rendering. Place the text on the LEFT half of the frame with generous negative space; the visual subject sits on the RIGHT.",
    `  • Headline (Inter Light 300, 72pt feel): "${headline}"`,
    `  • Body (Inter ExtraLight 200, 36pt feel, italic-ish editorial cadence): "${subline}"`,
    spec.overlay ? `  • Overlay accent (Inter Light 300, 18pt feel, uppercase, wide tracking): "${spec.overlay}"` : "",
    "Text colour: #01253f (rich navy). The text is the ONLY chromatic anchor in the image — never any other colour for the text. Body subline may render at 70-80% opacity of the same navy. No drop shadows, no glow, no outlines on the text.",
    "",
    "Aesthetic & palette — natural warm-ivory editorial wellness photography:",
    "  • Background fills the entire frame edge-to-edge in soft pearl ivory (#EFEFF4) — clean, calm, almost paper-like.",
    "  • The photograph itself is naturally lit through a soft window — gentle warm-neutral daylight, NOT a desaturated grey-blue cast. Subjects keep their own natural colours (a chamomile cup looks like real chamomile, linen looks like real linen, skin looks like real skin), but the overall scene bathes in pearl-ivory light so the image reads as a single coherent ivory editorial frame.",
    "  • Think Aesop / Hims / Vacation Inc. / Goop ivory editorial — minimal, sunlit, expensive, calm. Warm pearl ivory NOT cool grey.",
    "  • Navy #01253f is reserved for the typography baked into the image. #2C3F51 may appear only as subtle deepest shadow tones, never as a colour wash.",
    "  • Forbidden hues that would pull the image off-brand: NO teal, NO sage green, NO mint, NO mustard yellow, NO orange, NO pink, NO purple, NO heavy saturation. Natural muted earth tones from the subject itself are fine.",
    "",
    productLine,
    "",
    "Photographic feel: magazine-cover quality, ultra-clean composition, generous negative space, photoreal with a soft editorial finish, gentle film grain acceptable. NOT a desaturated black-and-white-ish image — keep it natural and ivory-warm.",
    "",
    "HARD GUARDRAILS (do not violate):",
    "  • NO logos of any kind. No Lunia logo, no wordmark, no brand mark, no constellation symbol, no monogram, no signature, no watermark.",
    "  • NO additional text beyond the headline / body / overlay listed above. No labels, no captions, no signage, no UI, no price tags, no quotes.",
    "  • Background is always pearl ivory #EFEFF4, text always navy #01253f. No other CHROMATIC accents.",
    "  • NO secondary subjects that distract from the focal subject.",
    "  • DO NOT desaturate the image to grey or blue-grey. Keep the natural ivory editorial feel.",
  ].filter(Boolean).join("\n");
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
  referenceImageUrls?: string[];
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
    // Route to the /edit endpoint when we have reference images (logo +
    // bottle for lifestyle-health). Same pattern as email-image-engine.
    const refs = (input.referenceImageUrls ?? []).filter(Boolean);
    const gptEndpoint = refs.length > 0 ? 'openai/gpt-image-2/edit' : endpoint;
    const gptInput: Record<string, unknown> = {
      prompt: input.prompt,
      image_size: input.imageSize,
      quality: 'high',
    };
    if (refs.length > 0) gptInput.image_urls = refs.slice(0, 10);
    const result = await fal.subscribe(gptEndpoint, { input: gptInput, logs: false });
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
