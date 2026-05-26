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
    // ref-attachment decision and for the prompt assembly below. New shape
    // uses `concept` + optional `overlay`. Legacy fields are accepted for
    // backwards-compat with carousels saved before the concept-only rewrite.
    type HookSpec = {
      concept?: string;
      overlay?: string;
      brandMood?: string;
      subject?: string;
      composition?: string;
      sceneElements?: string[];
    };
    const hookImageSpec: HookSpec | undefined =
      body.hookImageSpec && typeof body.hookImageSpec === 'object' ? body.hookImageSpec as HookSpec : undefined;

    // Editorial hook never features the bottle. User direction (repeated):
    // the bottle dominates composition, kills regen variation, and pulls the
    // hook off-brand. Product photography lives on content slides only.
    const editorialSceneMentionsProduct = false;

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

    // Concept-only framework: enter the editorial branch whenever the slide is
    // the hook + editorial preset is selected, even if the spec only carries a
    // `concept`. Legacy specs that only have `subject` still work because
    // buildEditorialHookPrompt falls back to those fields when `concept` is
    // missing.
    const useEditorialHookFramework =
      slideIndex === 0 && isEditorial && hookImageSpec &&
      (Boolean(hookImageSpec.concept) || Boolean(hookImageSpec.subject));

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
          topic:    topic,
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
  spec: {
    concept?: string;
    overlay?: string;
    brandMood?: string;
    subject?: string;
    composition?: string;
    sceneElements?: string[];
  };
  headline: string;
  subline: string;
  topic?: string;
  hasRefs: boolean;  // kept for signature stability; editorial hook never has refs now
}): string {
  const { spec, headline, subline, topic } = args;

  // Concept-only framework: hand gpt-image-2 the topic concept + the exact
  // text to bake and let it choose the visual. If the saved spec is from
  // before the rewrite, derive a concept from the legacy subject so older
  // carousels still produce coherent images.
  const concept = (() => {
    if (spec.concept && spec.concept.trim()) return spec.concept.trim();
    const legacy = [spec.subject, spec.composition].filter(Boolean).join(". ");
    return legacy || topic || "the science of sleep and overnight recovery";
  })();

  // Tiny variation nonce — each call should produce a genuinely different
  // visual even with identical concept + text. Plain-language seed phrase.
  const variationNonce = Math.random().toString(36).slice(2, 8);

  return [
    "Create an editorial poster image for Lunia Life, a sleep & longevity brand.",
    "",
    // ── Concept (the WHAT — only direction the image engine gets) ──
    topic ? `Topic: ${topic}.` : "",
    `Concept: ${concept}`,
    "",
    "You — the image engine — interpret this concept visually as you see fit. The brief gives you the WHAT, not the HOW. Choose your own subject, composition, lighting, camera angle, props and styling so long as the result reads as a calm, contemplative editorial poster for a sleep & longevity brand. Each generation should feel like a fresh take on the concept.",
    "",
    // ── Mandatory baked text (the only prescriptive part) ──
    "MANDATORY — bake the following text into the image as the ONLY typography in the scene. Render it crisp, perfectly legible, anti-aliased, in the Inter font family at the specified weights. Place it where it reads best within an editorial layout.",
    `  • Headline (Inter Light 300): "${headline}"`,
    `  • Body (Inter ExtraLight 200, lighter weight): "${subline}"`,
    spec.overlay ? `  • Overlay accent (Inter Light 300, uppercase, wide tracking, small): "${spec.overlay}"` : "",
    "Text colour: rich navy (#01253f). The navy text is the only chromatic anchor in the image. Body subline may render at 70–80% opacity of the same navy. No drop shadows, no glow, no outlines.",
    "",
    // ── Palette (strict) ──
    "PALETTE — STRICT:",
    "  • Background: #EFEFF4 (clean neutral ivory) filling the entire frame edge-to-edge. NOT warm cream, NOT yellow-tinted, NOT golden, NOT desaturated grey-blue. A clean modern ivory like premium uncoated magazine paper.",
    "  • Text: #01253f (rich navy) — the only chromatic anchor.",
    "  • Natural subject colours are fine but must live comfortably inside this restrained ivory + navy palette. Skin, fabric and natural textures should read true to life, not pushed warm and not pushed cool.",
    "",
    // ── Hard guardrails ──
    "HARD GUARDRAILS (do not violate):",
    "  • NO logos of any kind. NO Lunia logo, wordmark, brand mark, constellation symbol, monogram, signature, or watermark.",
    "  • NO product, NO supplement bottle, capsule, pill, tincture, jar, dropper, amber glass, or any packaging.",
    "  • NO additional text beyond the headline / body / overlay listed above. No labels, captions, signage, UI, quotes, or price tags.",
    "  • NO chromatic accents beyond ivory + navy. NO teal, sage, mint, mustard, orange, pink, purple, gold or heavy saturation.",
    "  • NO desaturated grey-blue cast and NO warm cream / golden cast. Keep it clean neutral ivory.",
    "",
    `Photoreal, magazine-cover quality, calm and contemplative. (variation seed: ${variationNonce})`,
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
