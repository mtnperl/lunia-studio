import { fal, buildPrompt } from '@/lib/fal';
import { checkRateLimit, getAssets } from '@/lib/kv';
import type { Hook, HookHeadlineWeight } from '@/lib/types';
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
    const isEditorial = stylePreset === 'editorial-scientific' || stylePreset === 'viral';
    const isFreePress = stylePreset === 'free-press';

    // Editorial extras: interpretive lane + paper tone. Both only meaningful
    // when isEditorial. Defaults preserve the previous behavior:
    //   • imageDirection "auto" → server rotates lanes per regen
    //   • paperTone     "white" → original #EFEFF4 cool ivory palette
    const VALID_DIRECTIONS = ['auto', 'macro', 'environmental', 'abstract', 'symbolic', 'natural'] as const;
    type EditorialDirection = typeof VALID_DIRECTIONS[number];
    const imageDirection: EditorialDirection = (VALID_DIRECTIONS as readonly string[]).includes(body.imageDirection)
      ? (body.imageDirection as EditorialDirection)
      : 'auto';
    const VALID_PAPER_TONES = ['white', 'warm'] as const;
    type PaperTone = typeof VALID_PAPER_TONES[number];
    const paperTone: PaperTone = (VALID_PAPER_TONES as readonly string[]).includes(body.paperTone)
      ? (body.paperTone as PaperTone)
      : 'white';
    // Contrast mode. "standard" is the original flat edge-to-edge ivory look and
    // is what every caller gets unless it explicitly asks otherwise. "high"
    // swaps the palette for a two-zone frame — an ivory type band over a
    // near-black subject ground with a single luminous focal element — which is
    // the shape of the hook images that actually stop the scroll.
    const VALID_CONTRAST_MODES = ['standard', 'high'] as const;
    type ContrastMode = typeof VALID_CONTRAST_MODES[number];
    const contrastMode: ContrastMode = (VALID_CONTRAST_MODES as readonly string[]).includes(body.contrastMode)
      ? (body.contrastMode as ContrastMode)
      : 'standard';
    // Headline boldness — same levels as the HTML-overlay hook (HookSlide),
    // baked into the prompt so Editorial Scientific images (text-in-pixels)
    // stay in sync with the non-editorial HTML rendering.
    const VALID_HEADLINE_WEIGHTS: readonly HookHeadlineWeight[] = ['default', 'medium', 'bold', 'black'];
    const headlineWeight: HookHeadlineWeight = (VALID_HEADLINE_WEIGHTS as readonly string[]).includes(body.headlineWeight)
      ? (body.headlineWeight as HookHeadlineWeight)
      : 'default';
    // "Generate other weights" — edit-based regeneration. When present, we skip
    // the concept/composition prompt entirely and ask gpt-image-2 to edit the
    // supplied image in place (same composition, only the headline weight
    // changes), via the /edit endpoint. Hook-only; requires Editorial Scientific.
    const editSourceImageUrl: string | undefined =
      typeof body.editSourceImageUrl === 'string' && body.editSourceImageUrl.trim()
        ? body.editSourceImageUrl.trim()
        : undefined;
    const isHeadlineWeightEdit = slideIndex === 0 && isEditorial && Boolean(editSourceImageUrl);

    // Subject lock — orthogonal to Direction. "auto" preserves prior behavior
    // (engine chooses). "person" hard-requires a partial-frame human element;
    // "still-life" forbids humans; "environment" permits but does not require
    // a person. Defaults to "auto" so unrelated callers stay unchanged.
    const VALID_IMAGE_SUBJECTS = ['auto', 'person', 'still-life', 'environment'] as const;
    type ImageSubject = typeof VALID_IMAGE_SUBJECTS[number];
    const imageSubject: ImageSubject = (VALID_IMAGE_SUBJECTS as readonly string[]).includes(body.imageSubject)
      ? (body.imageSubject as ImageSubject)
      : 'auto';

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
    // Headline-weight edits always go through gpt-image-2's /edit endpoint —
    // that's the only engine capable of editing a supplied image in place.
    const engine = isHeadlineWeightEdit ? 'gpt-image-2' : chooseImageEngine({ slideIndex, imageStyle, textInImage, override, stylePreset });

    const basePrompt = imagePrompt?.trim() ? imagePrompt : buildPrompt(slideIndex, topic, hook);

    // Reference attachment policy:
    //  • Headline-weight edit → the source image is the only reference; skip
    //    the asset lookup below entirely.
    //  • Lifestyle Health + gpt-image-2  → always attach bottle + logo (this
    //    mood is a product-photography lane).
    //  • Editorial Scientific + gpt-image-2 → attach only what Claude's spec
    //    actually references. Bottle if scene mentions the product, logo if
    //    scene mentions the wordmark. For purely lifestyle/biology topics,
    //    skip refs so the hook image doesn't shoehorn the product in.
    //  • Other moods + engines → no refs.
    let referenceImageUrls: string[] = [];
    if (isHeadlineWeightEdit) {
      referenceImageUrls = [editSourceImageUrl!];
    } else if (engine === 'gpt-image-2') {
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

    const assembledPrompt = isHeadlineWeightEdit
      ? buildHeadlineWeightEditPrompt({
          headline: hookHeadline,
          subline:  hookSubline,
          overlay:  hookImageSpec?.overlay,
          headlineWeight,
        })
      : slideIndex === 0 && isFreePress
      ? buildFreePressHookPrompt({
          concept: hookImageSpec?.concept,
          topic,
          userPrompt: imagePrompt,
        })
      : useEditorialHookFramework
      ? buildEditorialHookPrompt({
          spec: hookImageSpec!,
          headline: hookHeadline,
          subline:  hookSubline,
          topic:    topic,
          hasRefs:  referenceImageUrls.length > 0,
          userPrompt: imagePrompt,
          direction: imageDirection,
          paperTone,
          contrastMode,
          imageSubject,
          headlineWeight,
        })
      : `${basePrompt}\n\nVisual mood — ${mood.label}: ${mood.styleBlock}.${referenceDirective}`;

    const prompt = customPrompt ?? assembledPrompt;

    // previewOnly — return the prompt without calling fal.ai. Used by the
    // "Edit hook-image prompt" UI to populate the textarea so the user can
    // see exactly what would be sent (or edit it before generating).
    if (body.previewOnly === true) {
      return Response.json({
        prompt,
        source: customPrompt ? 'custom' : isHeadlineWeightEdit ? 'headline-weight-edit' : (useEditorialHookFramework ? 'editorial-framework' : 'mood-assembled'),
        engine,
        mood: { id: mood.id, label: mood.label },
        refs: referenceImageUrls.length,
        // Emitted only when on, so the standard response stays byte-identical.
        ...(contrastMode === 'high' ? { contrastMode } : {}),
      });
    }

    console.log(`[v2/generate-image] slide=${slideIndex} engine=${engine} mood=${mood.id}${contrastMode === 'high' ? ' contrast=high' : ''} refs=${referenceImageUrls.length} prompt_source=${customPrompt ? 'custom' : (imagePrompt?.trim() ? 'claude' : 'fallback')} prompt="${prompt.slice(0, 100)}..."`);

    let url: string | undefined;
    try {
      url = await runEngine(engine, { prompt, imageStyle, imageSize, imageAspect, referenceImageUrls });
    } catch (engineErr) {
      const detail = extractFalError(engineErr);

      // ── Content-policy rejection ────────────────────────────────────────
      // A sleep brand generates bedroom imagery, and the image engines' safety
      // classifiers reject some of it. A real example: "a partial silhouette of
      // a shoulder and bare foot beyond the glass" — ordinary editorial styling
      // for a slide about bedroom temperature, refused outright.
      //
      // Retrying the identical prompt is guaranteed to fail again, which is why
      // the old "Try again" button could never help. The offending text is
      // almost always the free-text `concept`, which the writing model composes
      // in prose. So the retry drops the concept and keeps the structured
      // fields: the same editorial look, without the sentence that described a
      // body. One retry only — if a brand-safe assembled prompt is also refused,
      // that is a real answer and the user should hear it.
      if (isContentPolicyRejection(detail) && useEditorialHookFramework && hookImageSpec?.concept) {
        const saferPrompt = buildEditorialHookPrompt({
          spec: { ...hookImageSpec, concept: undefined },
          headline: hookHeadline,
          subline:  hookSubline,
          topic:    topic,
          hasRefs:  referenceImageUrls.length > 0,
          userPrompt: undefined,
          direction: imageDirection,
          paperTone,
          contrastMode,
          imageSubject,
          headlineWeight,
        });
        console.warn(`[v2/generate-image] slide=${slideIndex} concept refused by content checker — retrying without it`);
        try {
          url = await runEngine(engine, { prompt: saferPrompt, imageStyle, imageSize, imageAspect, referenceImageUrls });
        } catch (retryErr) {
          const retryDetail = extractFalError(retryErr);
          console.error(`[api/carousel-v2/generate-image] ${engine} refused the re-roll too:`, retryDetail);
          return Response.json({
            error: `${engine} declined this image on content grounds, twice.`,
            kind: "content_policy",
          }, { status: 422 });
        }
      } else {
        console.error(`[api/carousel-v2/generate-image] ${engine} call failed:`, detail);
        return Response.json({
          error: `${engine} failed: ${detail}`,
          kind: isContentPolicyRejection(detail) ? "content_policy" : "engine_error",
        }, { status: isContentPolicyRejection(detail) ? 422 : 500 });
      }
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
// Editorial interpretive lanes — when the user picks "auto", we rotate
// through these per regen so gpt-image-2 stops converging on a single
// composition for a given concept. Lane names match the EDITORIAL_SYSTEM_PROMPT
// rotator in regenerate-image-prompt/route.ts for consistency.
const EDITORIAL_LANES: Record<
  'macro' | 'environmental' | 'abstract' | 'symbolic' | 'natural',
  string
> = {
  macro:
    "Direction — MACRO / CLOSE-UP: render this as an extreme close-up of a single physical object or texture that embodies the concept. Tight crop, shallow depth of field, tactile surface detail. No wide environments.",
  environmental:
    "Direction — ENVIRONMENTAL / WIDE: render this as a calm, lived-in interior or landscape scene at scale. Architecture, daylight through a window, soft ambient depth. The viewer feels like they walked into the room. No tight close-ups.",
  abstract:
    "Direction — ABSTRACT / GRAPHIC: render this as a clean geometric or shape-driven editorial composition. Forms, planes, gradients, negative space. Minimal, modern, almost poster-like. No literal photography of objects.",
  symbolic:
    "Direction — SYMBOLIC / SURREAL: render this as an unexpected juxtaposition or visual metaphor — two unrelated objects in dialogue, or a familiar object behaving in a quietly surprising way. Restrained surrealism, never busy.",
  natural:
    "Direction — NATURAL / ORGANIC: render this through botany, biology, mineral or other organic material — plant cross-sections, water, stone, skin, fibre — textures that mirror the concept. No man-made objects in the focal area.",
};

// Faithful lane — used when the user has written a concrete scene and left
// Direction on "auto". The random-lane rotator exists to add variety to a
// vague concept; it must NOT fire when the prompt already names a specific
// scene, or it silently swaps the described subject for botany / macro / etc.
const FAITHFUL_LANE =
  "Direction — FAITHFUL TO BRIEF: render the scene exactly as described in the Concept above. Honour the specific objects, setting, lighting, framing and mood it names — do NOT substitute a different subject, material or visual metaphor. You choose only the fine compositional details (precise crop, camera angle, focal length, prop placement).";

function pickEditorialLane(
  direction: string,
  authoritative: boolean,
): { key: string; instruction: string } {
  if (direction in EDITORIAL_LANES) {
    const key = direction as keyof typeof EDITORIAL_LANES;
    return { key, instruction: EDITORIAL_LANES[key] };
  }
  // auto / unknown. When the user wrote a concrete scene, stay faithful to it
  // instead of rolling a random lane that would override the subject.
  if (authoritative) return { key: 'faithful', instruction: FAITHFUL_LANE };
  // Vague concept → random lane each call for variety.
  const keys = Object.keys(EDITORIAL_LANES) as (keyof typeof EDITORIAL_LANES)[];
  const key = keys[Math.floor(Math.random() * keys.length)];
  return { key, instruction: EDITORIAL_LANES[key] };
}

// Paper-tone palette block. `white` keeps the original #EFEFF4 cool ivory.
// `warm` ships the Aesop-style #F4ECE0 warm ivory the user asked for.
function paperToneBlock(tone: 'white' | 'warm'): string {
  if (tone === 'warm') {
    return [
      "PALETTE & LIGHT — STRICT:",
      "  • Background / paper / wall tone: #EFE1C8 (warm ecru cream) filling the entire frame edge-to-edge. Uncoated cream paper / lime-washed plaster wall feel — the kind of surface that absorbs and re-emits warm light. Highlights may tip toward #F3E7D0; shadows fall to #E2D2B0.",
      "  • Light quality: warm golden late-afternoon / candle-lit light, the kind that pours through gauzy curtains at the end of the day. Visible light direction (window glow on one side, soft falloff into deeper warm shadow on the other). This is the defining aesthetic — NOT clinical daylight on warm paper, but warm light on warm paper.",
      "  • Text: #01253f (rich navy) — the only chromatic anchor.",
      "  • Subject treatment: skin, hair, fabric, linen, all gently warmed by the ambient light. Bedding and pillow read as cream linen, not white. Subjects feel inhabited by the light, not lit from a separate clinical source.",
    ].join("\n");
  }
  return [
    "PALETTE — STRICT:",
    "  • Background: #EFEFF4 (clean neutral ivory) filling the entire frame edge-to-edge. NOT warm cream, NOT yellow-tinted, NOT golden, NOT desaturated grey-blue. A clean modern ivory like premium uncoated magazine paper.",
    "  • Text: #01253f (rich navy) — the only chromatic anchor.",
    "  • Natural subject colours are fine but must live comfortably inside this restrained ivory + navy palette. Skin, fabric and natural textures should read true to life, not pushed warm and not pushed cool.",
  ].join("\n");
}

// High-contrast palette block — the alternative to paperToneBlock above.
//
// The flat-ivory palette is what makes most editorial hooks dull: it demands
// ivory "edge-to-edge", bans every accent hue, and asks for calm. The images
// that actually earn views do the opposite — a clean ivory band holding the
// type, a near-black photographic ground below it, and one thing down there
// emitting light. This block encodes that as the value structure rather than
// leaving it to chance, and composes with paperTone: the tone still picks the
// ivory of the TYPE ZONE, the subject zone goes near-black either way.
function contrastPaletteBlock(tone: 'white' | 'warm'): string {
  const typeZone = tone === 'warm'
    ? "  • TYPE ZONE — the upper third to half of the frame: #EFE1C8 (warm ecru cream), flat and evenly lit, like uncoated cream paper. The warmth lives in the paper itself, not in a directional warm light raking across the scene. It holds the navy type and nothing else — quiet, clean, near-empty."
    : "  • TYPE ZONE — the upper third to half of the frame: #EFEFF4 (clean neutral ivory), flat and evenly lit, like premium uncoated magazine paper. It holds the navy type and nothing else — quiet, clean, near-empty.";
  return [
    "PALETTE & VALUE — STRICT (this is the defining instruction for this image; where any softer styling note above disagrees with it, this wins):",
    "  • The frame is built from TWO zones with a real, visible edge between them — not a gradient, not a soft vignette, not a blur. A viewer must be able to point at the line where one ends and the other begins. That edge belongs to the scene, not to a graphic-design layer: a soil line, a waterline, a horizon, a table edge, the lip of a vessel, a wall meeting its own shadow.",
    typeZone,
    "  • SUBJECT ZONE — the rest of the frame: a genuinely dark, near-black ground, #0B0A09 through #1A1714. Soil, deep water, night air, unlit interior, dark stone, shadow. Real shadow detail stays readable inside it — dark, not empty.",
    "  • Both zones must be present in the SAME frame: paper-bright above, near-black below. That value gap IS the composition. Never ivory-on-ivory, never an all-mid-tone image, never a uniformly dark one.",
    "  • LUMINOUS FOCAL EVENT — exactly one element inside the dark zone emits or catches light, and it is the brightest thing in the lower half: glowing roots under soil, a lit filament, embers, a cold shaft of light through water, one lit edge of mineral or glass. Small, precise, and clearly the reason this picture exists. The eye lands on it first, then travels up into the type.",
    "  • Text: #01253f (rich navy), set on the paper zone only.",
    "  • ONE accent hue is permitted: the colour the luminous element's own light would actually be (warm amber, cold blue-white, deep ember), plus the short falloff it throws on the surfaces immediately around it. Nothing else in the frame carries that hue. It is emitted light, never painted colour.",
    "  • Natural subject colours are fine but must live comfortably inside this paper + near-black + navy palette. Skin, fabric and natural textures read true to life.",
  ].join("\n");
}

// Subject-lock instruction blocks. Injected into the editorial hook prompt
// after the lane instruction so the lane sets the camera/composition and the
// subject sets WHO/WHAT must appear. "auto" injects nothing — current behavior.
const SUBJECT_BLOCKS: Record<'person' | 'still-life' | 'environment', string> = {
  person:
    "SUBJECT (HARD REQUIREMENT — overrides any 'no people' rule the lane carries): a single human element MUST appear in the focal area of the composition. Partial framing only — a hand resting on a temple, a hand on linen bedding, a back-of-head silhouette against a window, an over-the-shoulder crop, or an editorial close-crop of a closed-eye face. Never a full studio portrait. Never direct eye contact with the camera. Never a smiling stock model. The person is a quiet, real, contemplative detail inside the editorial frame, not the spectacle. Skin reads natural — never airbrushed, never glossy, never pushed warm or cool beyond the palette. Their presence anchors the science concept emotionally.",
  'still-life':
    "SUBJECT (HARD REQUIREMENT): an object-only still life. NO human figures, NO hands, NO faces, NO silhouettes, NO body parts in the frame. Build the composition from inanimate subjects — linen, ceramic, glass, paper, fabric, plant matter, stone, water, light on surface. The science concept reads through object choice and light, not through a person.",
  environment:
    "SUBJECT (HARD REQUIREMENT): a wide architectural interior or landscape scene at scale — a bedroom at dawn, a kitchen by a window, a quiet corridor with daylight, an open landscape. A person is permitted but optional, and never the focal subject. If included, they appear as a small partial silhouette, back-of-frame detail, or distant figure. Privilege architecture, daylight direction, ambient depth, and negative space.",
};

// Mirrors HookSlide's HTML-overlay weights (400/500/700/900) so the baked-in
// Editorial Scientific image matches what the non-editorial HTML render
// would show at the same boldness level.
function headlineWeightLabel(headlineWeight: HookHeadlineWeight): string {
  return headlineWeight === 'black' ? 'Inter Black 900, extra bold'
    : headlineWeight === 'bold' ? 'Inter Bold 700'
    : headlineWeight === 'medium' ? 'Inter Medium 500'
    : 'Inter Light 300';
}

// "Generate other weights" — asks gpt-image-2's /edit endpoint to re-render
// ONLY the headline's font weight on a supplied source image, preserving
// composition/lighting/background as closely as the edit model allows. Far
// cheaper in intent (and closer to "one hook, N strengths") than a fresh
// from-scratch generation, which rolls a brand-new random photo every call.
function buildHeadlineWeightEditPrompt(args: {
  headline: string;
  subline: string;
  overlay?: string;
  headlineWeight: HookHeadlineWeight;
}): string {
  const { headline, subline, overlay, headlineWeight } = args;
  return [
    "Edit this image. Keep everything about it identical — the exact same composition, subject, camera angle, lighting, colors, background, and palette. Do not regenerate or reinterpret the scene.",
    "",
    "The ONLY permitted change: re-render the headline text at a different font weight, same position, same size, same line breaks as it appears now.",
    `  • Headline (change to ${headlineWeightLabel(headlineWeight)}): "${headline}"`,
    `  • Body (leave exactly as-is, Inter ExtraLight 200): "${subline}"`,
    overlay ? `  • Overlay accent (leave exactly as-is, Inter Light 300, uppercase, wide tracking): "${overlay}"` : "",
    "Text colour stays rich navy (#01253f). Only the stroke weight of the headline letterforms changes — no drop shadows, no glow, no outlines, no repositioning.",
  ].filter(Boolean).join("\n");
}

/**
 * Did the image engine refuse this on content grounds?
 *
 * Matches on the machine-readable `content_policy_violation` type and on the
 * human sentence fal returns alongside it, because the two engines word it
 * differently and only one of them is a stable contract.
 */
function isContentPolicyRejection(detail: string): boolean {
  return /content_policy_violation|flagged by a content checker|safety system/i.test(detail);
}

/**
 * Cover-photograph prompt for the Free Press preset.
 *
 * Why this exists rather than reusing either neighbour:
 *
 *   • buildPrompt()'s deriveHookSubject() is a KEYWORD LOOKUP. Any topic
 *     containing "sleep" returns the same pristine-linens hotel bedroom, so a
 *     carousel about pregnancy, shift work or menopause got a stock bedroom
 *     with nothing to do with its subject. That is the bug this fixes.
 *   • buildEditorialHookPrompt bakes the headline INTO the pixels. The Free
 *     Press cover draws its headline in HTML over the photo, so any baked text
 *     would double up.
 *
 * So: Claude's per-topic concept drives the subject, and the prompt is
 * explicit that the frame contains no text at all.
 */
function buildFreePressHookPrompt(args: {
  concept?: string;
  topic?: string;
  userPrompt?: string;
}): string {
  const { concept, topic, userPrompt } = args;

  // The live "CURRENT PROMPT" textarea wins, then Claude's concept, then the
  // topic itself. The topic is a far better last resort than a keyword table:
  // it is at least about the right thing.
  const subject =
    userPrompt?.trim() ||
    concept?.trim() ||
    topic?.trim() ||
    'the science of sleep and overnight recovery';

  return [
    'Editorial documentary photograph for the cover of a sleep-science article.',
    '',
    `SUBJECT — photograph this, and nothing else: ${subject}`,
    '',
    'The subject above is the whole brief. Do not substitute a generic bedroom, an empty bed, or a person sleeping unless the subject actually calls for one.',
    '',
    'TREATMENT',
    '- Real photography. Natural light, honest colour, documentary rather than staged stock.',
    '- Muted, desaturated palette. No teal-and-orange grade, no neon, no heavy vignette.',
    '- Leave the CENTRE of the frame comparatively simple. A headline is composited over the lower third and a small mark sits top left, so keep those bands free of busy detail.',
    '- Portrait orientation, shallow depth of field, a single clear focal point.',
    '',
    'HARD CONSTRAINTS',
    '- NO text, letters, numbers, words, captions, watermarks, logos or signage anywhere in the image. The headline is added afterwards in HTML and any baked text would collide with it.',
    '- NO supplement bottles, pill jars, capsules or packaging.',
    '- NO collage, no split screens, no borders, no frames, no UI, no charts.',
  ].join('\n');
}

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
  userPrompt?: string;  // live "CURRENT PROMPT" textarea — authoritative when present
  direction: 'auto' | 'macro' | 'environmental' | 'abstract' | 'symbolic' | 'natural';
  paperTone: 'white' | 'warm';
  contrastMode: 'standard' | 'high';
  imageSubject: 'auto' | 'person' | 'still-life' | 'environment';
  headlineWeight: HookHeadlineWeight;
}): string {
  const { spec, headline, subline, topic, userPrompt, direction, paperTone, contrastMode, imageSubject, headlineWeight } = args;
  const isHighContrast = contrastMode === 'high';

  // Concept resolution, in priority order:
  //   1. The live "CURRENT PROMPT" the user sees and edits — authoritative.
  //   2. Claude's saved hookImageSpec.concept.
  //   3. Legacy subject/composition fields (pre-concept-rewrite carousels).
  //   4. Topic, then a safe fallback.
  // Previously (1) was ignored entirely, so the editable prompt didn't drive
  // the image — the engine only ever saw the saved spec.concept.
  const userConcept = userPrompt?.trim();
  const concept = (() => {
    if (userConcept) return userConcept;
    if (spec.concept && spec.concept.trim()) return spec.concept.trim();
    const legacy = [spec.subject, spec.composition].filter(Boolean).join(". ");
    return legacy || topic || "the science of sleep and overnight recovery";
  })();

  // Interpretive lane — the variation lever. When the user wrote a concrete
  // scene (userConcept present), "auto" stays faithful to it instead of
  // rolling a random lane that would override the described subject.
  const lane = pickEditorialLane(direction, Boolean(userConcept));

  // Tiny variation nonce — each call should produce a genuinely different
  // visual even with identical concept + text. Plain-language seed phrase.
  const variationNonce = Math.random().toString(36).slice(2, 8);

  // Background hex referenced in guardrail copy below so the "no warm cream"
  // line doesn't contradict the warm-paper palette when that tone is chosen.
  const paperHex = paperTone === 'warm' ? '#EFE1C8' : '#EFEFF4';
  // In high contrast the off-tone guard has a different job: the failure mode is
  // no longer a colour cast on flat paper, it is the two zones collapsing into
  // each other — the dark drifting up to grey, or a veil dragging the paper down.
  const offToneGuard = isHighContrast
    ? (paperTone === 'warm'
        ? "The paper zone stays warm ecru with no cool daylight cast, but that warmth STOPS at the zone edge — it must not spread into the dark ground, which stays neutral near-black."
        : "The paper zone stays clean neutral ivory — no grey-blue cast, no warm cream cast. The dark ground stays neutral near-black, not navy-tinted.")
    : paperTone === 'warm'
    ? "NO cool daylight cast on the warm paper — the LIGHT itself must be warm. NO clinical or fluorescent light. NO pure yellow, NO orange, NO golden-amber-dominant, NO pink. The warmth is late-afternoon / candle-lit on cream paper, never neon or sunset-saturated."
    : "NO desaturated grey-blue cast and NO warm cream / golden cast. Keep it clean neutral ivory.";

  const subjectBlock = imageSubject !== 'auto' ? SUBJECT_BLOCKS[imageSubject] : '';

  return [
    "Create an editorial poster image for Lunia Life, a sleep & longevity brand.",
    "",
    // ── Concept (the WHAT — only direction the image engine gets) ──
    topic ? `Topic: ${topic}.` : "",
    `Concept: ${concept}`,
    "",
    lane.instruction,
    subjectBlock,
    "",
    subjectBlock
      ? "Within that direction and subject lock, you — the image engine — still choose composition, lighting, props and styling freely so long as the result reads as a calm, contemplative editorial poster for a sleep & longevity brand. Each generation should feel like a fresh take on the concept."
      : "Within that direction, you — the image engine — still choose subject, composition, lighting, props and styling freely so long as the result reads as a calm, contemplative editorial poster for a sleep & longevity brand. Each generation should feel like a fresh take on the concept.",
    "",
    // ── Mandatory baked text (the only prescriptive part) ──
    isHighContrast
      ? "MANDATORY — bake the following text into the image as the ONLY typography in the scene. Render it crisp, perfectly legible, anti-aliased, in the Inter font family at the specified weights. Place ALL of it inside the paper type zone described in the palette below — every line of type sits on paper. NO type of any kind enters the dark subject zone."
      : "MANDATORY — bake the following text into the image as the ONLY typography in the scene. Render it crisp, perfectly legible, anti-aliased, in the Inter font family at the specified weights. Place it where it reads best within an editorial layout.",
    `  • Headline (${headlineWeightLabel(headlineWeight)}): "${headline}"`,
    `  • Body (Inter ExtraLight 200, lighter weight): "${subline}"`,
    spec.overlay ? `  • Overlay accent (Inter Light 300, uppercase, wide tracking, small): "${spec.overlay}"` : "",
    // The "only chromatic anchor" claim is dropped in high contrast — it would
    // contradict the one accent hue the luminous element is allowed to emit.
    isHighContrast
      ? "Text colour: rich navy (#01253f), on paper only — never navy on the dark ground, never reversed to white or ivory type, never a second text colour. Body subline may render at 70–80% opacity of the same navy. No drop shadows, no glow, no outlines."
      : "Text colour: rich navy (#01253f). The navy text is the only chromatic anchor in the image. Body subline may render at 70–80% opacity of the same navy. No drop shadows, no glow, no outlines.",
    "",
    // ── Palette (strict) ──
    isHighContrast ? contrastPaletteBlock(paperTone) : paperToneBlock(paperTone),
    "",
    // ── Hard guardrails ──
    "HARD GUARDRAILS (do not violate):",
    "  • NO logos of any kind. NO Lunia logo, wordmark, brand mark, constellation symbol, monogram, signature, or watermark.",
    "  • NO product, NO supplement bottle, capsule, pill, tincture, jar, dropper, amber glass, or any packaging.",
    "  • NO additional text beyond the headline / body / overlay listed above. No labels, captions, signage, UI, quotes, or price tags.",
    isHighContrast
      ? "  • NO chromatic accents beyond paper, navy, the near-black ground, and the single hue emitted by the luminous element. NO second accent colour, NO teal / sage / mint / mustard / pink / purple wash, NO colour grade laid over the whole frame, NO heavy saturation anywhere."
      : "  • NO chromatic accents beyond ivory + navy. NO teal, sage, mint, mustard, orange, pink, purple, gold or heavy saturation.",
    isHighContrast
      ? "  • NO muddy mid-tone image — the dark ground must not drift up into grey and the paper must not be dragged down into it. NO crushed blacks that swallow all shadow detail. NO HDR bloom, lens flare, god rays or glowing haze filling the frame: the light source is small, physical and local. NO dark veil or scrim across the paper zone."
      : "",
    `  • ${offToneGuard}`,
    "",
    isHighContrast
      ? `Photoreal, magazine-cover quality. Calm and contemplative in mood, but high-contrast in value — the stillness comes from the composition and the emptiness of the type zone, not from flat even light. (paper: ${paperHex}, ground: near-black, contrast: high, lane: ${lane.key}, variation seed: ${variationNonce})`
      : `Photoreal, magazine-cover quality, calm and contemplative. (paper: ${paperHex}, lane: ${lane.key}, variation seed: ${variationNonce})`,
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
