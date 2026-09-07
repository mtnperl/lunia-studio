import { isStoryBeat } from "@/lib/story-spine";
import { isCarouselStructure, type CarouselStructure } from "@/lib/carousel-structures";
import { createContentMessage, extractText, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_LONG, CONTENT_MAX_TOKENS_SHORT, EFFORT_MEDIUM } from "@/lib/anthropic";
import { BRIEF_PROMPT, parseBrief, EDITOR_READ_PROMPT, parseEditorRead, applyEditorRead, recentDecksBlock, type CarouselBrief } from "@/lib/carousel-brief";
import { STRUCTURES } from "@/lib/carousel-structures";
import { GENERATE_CAROUSEL_PROMPT, GENERATE_DID_YOU_KNOW_PROMPT, GENERATE_ENGAGEMENT_CAROUSEL_PROMPT } from "@/lib/carousel-prompts";
import { ledgerBlockFor } from "@/lib/facts-gate";
import { lintDidYouKnowContent } from "@/lib/did-you-know-lint";
import { checkRateLimit, getAssets, getCarouselTemplateById, getCarouselById, getCarousels, saveCarousel } from "@/lib/kv";
import { structurePromptBlock } from "@/lib/carousel-looks";
import { validateOrFallbackGraphic } from "@/lib/carousel-utils";
import { CarouselContent, CarouselFormat, CarouselStylePreset, DidYouKnowContent, DidYouKnowVariantsResponseSchema, EngagementSubType, HookTone, SavedCarousel } from "@/lib/types";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

// A ten-slide structured deck takes two to three minutes to write. The
// route said 300 but vercel.json still said 90, and the lower one cut the
// function off mid-generation: the model call was billed, the client saw
// "Network error", and the deck was gone. Both now say 300, and the
// server-side save below is the second half of the fix.
// Pro plan with fluid compute allows 800 s. A ten-slide structured deck on
// Opus at effort medium lands in two to four minutes; high effort crossed
// five minutes and the platform cut it.
export const maxDuration = 800;

// Convert any failure (Anthropic SDK error, JSON parse, Zod validation) into a
// human-readable label that's safe to surface to the user. Keeps the raw error
// in console for server-side debugging.
function describeGenerateError(err: unknown, context: string): string {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  if (status === 401 || status === 403) return "Anthropic API key invalid or revoked";
  if (status === 429) return "Anthropic rate limited — wait a moment and try again";
  if (status === 404) return "Anthropic model unavailable — check model access";
  if (status && status >= 500) return `Anthropic service error (${status}) — try again`;
  if (message.startsWith("Invalid response shape")) return `${context}: ${message}`;
  if (message.includes("JSON")) return `${context}: model returned malformed JSON — try again`;
  return `${context}: ${message.slice(0, 160)}`;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json(
      { error: "Too many requests. Please try again in an hour." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const topic: string = body.topic ?? "";
    const hookTone: HookTone = body.hookTone ?? "educational";
    const count: number = Math.max(1, Math.min(5, Number(body.count) || 1));
    const templateId: string | undefined = typeof body.templateId === "string" ? body.templateId : undefined;
    const concise: boolean = body.concise ?? false;
    const format: CarouselFormat =
      body.format === "engagement" ? "engagement"
      : body.format === "did_you_know" ? "did_you_know"
      : "standard";
    const engagementSubType: EngagementSubType = body.engagementSubType === "diagnostic" ? "diagnostic" : "reveal";
    const structure: CarouselStructure | undefined = isCarouselStructure(body.structure) ? body.structure : undefined;
    // Client-minted id. The finished deck is saved under it before the
    // response goes out, so a dropped connection loses nothing: the client
    // polls for this id and opens the deck when it lands.
    const requestId: string | undefined = typeof body.requestId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.requestId) ? body.requestId : undefined;
    const slideCount: number | undefined = Number(body.slideCount) === 10 ? 10 : Number(body.slideCount) === 5 ? 5 : undefined;
    const stylePreset: string | undefined = typeof body.stylePreset === "string" ? body.stylePreset : undefined;
    // SEO / GEO footer toggle. Default true — every Lunia caption should
    // carry the brand-bridge sentence + entity line so AI crawlers and LLM
    // training pipelines build a strong entity graph for the brand.
    const includeSeoFooter: boolean = body.includeSeoFooter === false ? false : true;

    if (!topic || topic.trim().length === 0) {
      return Response.json({ error: "Topic required" }, { status: 400 });
    }
    if (topic.length > 500) {
      return Response.json({ error: "Topic too long (max 500 characters)" }, { status: 400 });
    }

    if (format === "did_you_know") {
      return await generateDidYouKnow(topic, count);
    }

    // Fetch carousel-style reference images (up to 2)
    const allAssets = await getAssets().catch(() => []);
    const styleRefs = allAssets
      .filter((a) => a.assetType === "carousel-style")
      .slice(0, 2);

    // Fetch template if provided
    const template = templateId ? await getCarouselTemplateById(templateId).catch(() => null) : null;
    console.log("[generate] templateId:", templateId, "→ found:", template ? `"${template.name}" (${template.images.length} images)` : "null");

    const hasStyleRef = styleRefs.length > 0;
    // Claims ledger: verified facts for this subject are quoted, not recalled.
    const ledgerBlock = await ledgerBlockFor(topic, typeof body.subjectId === "string" ? body.subjectId : undefined);
    // Duplicate and vary: mirror an earlier carousel's slide structure.
    const structureFromId: string | undefined = typeof body.structureFrom?.documentId === "string" ? body.structureFrom.documentId : undefined;
    const structureSource = structureFromId ? await getCarouselById(structureFromId).catch(() => null) : null;
    const structureBlock = structureSource ? structurePromptBlock(structureSource) : "";
    if (ledgerBlock) console.log(`[generate] ledger: ${ledgerBlock.split("\n").filter((l) => l.startsWith("- ")).length} verified facts attached`);
    // What ran recently, so this deck does not reprint last week's hook,
    // scene or lead figure. Read once, given to the brief and to the cut.
    const recentBlock = recentDecksBlock((await getCarousels().catch(() => [])) as SavedCarousel[], { excludeId: requestId });
    if (recentBlock) console.log(`[generate] memory: ${recentBlock.split("\n").filter((l) => l.startsWith("- ")).length} recent decks attached`);
    // Stage 1: the brief. The argument in prose, before any slide exists.
    // Engagement decks keep their own prompt and skip it.
    const brief = format === "standard" ? await writeBrief(topic, ledgerBlock, structure, recentBlock) : null;
    const promptText = (format === "engagement"
      ? GENERATE_ENGAGEMENT_CAROUSEL_PROMPT(topic, engagementSubType, hasStyleRef, template, template?.brandStyle, includeSeoFooter)
      : GENERATE_CAROUSEL_PROMPT(topic, hookTone, hasStyleRef, template, template?.brandStyle, concise, /* v2Mode */ true, stylePreset, includeSeoFooter, structure ? (slideCount ?? 5) : stylePreset === "viral" ? (slideCount ?? 5) : undefined, structure, brief)) + ledgerBlock + structureBlock + recentBlock;

    // Build message content
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "url"; url: string } };

    const userContent: ContentBlock[] = [{ type: "text", text: promptText }];

    // Template images first (all slides of the template)
    if (template) {
      for (const img of template.images) {
        userContent.push({ type: "image", source: { type: "url", url: img.url } });
      }
    }

    // Style reference images
    for (const ref of styleRefs) {
      userContent.push({ type: "image", source: { type: "url", url: ref.url } });
    }

    const messages: MessageParam[] = [{ role: "user", content: userContent }];

    let firstError: unknown = null;
    const results = await Promise.all(
      Array.from({ length: count }, async (): Promise<CarouselContent | null> => {
        try {
          const msg = await createContentMessage({
            model: CONTENT_MODEL,
            max_tokens: CONTENT_MAX_TOKENS_LONG,
            thinking: CONTENT_THINKING,
            // Medium effort: the prompt already carries the structure, the
            // ledger and the claim check, so the model has little to work out.
            // High effort pushed a structured deck past the function limit.
            output_config: { effort: EFFORT_MEDIUM },
            messages,
          });
          const raw = extractText(msg);
          const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          const parsed = JSON.parse(text) as CarouselContent;
          // An empty sourceNote is a CORRECT result, not a defect to patch over.
          //
          // This used to backfill "Based on peer-reviewed sleep research" onto any
          // hook the model left unsourced. That manufactured a trust signal for a
          // claim nothing had verified — in the one case where the model behaved
          // correctly and declined to cite, the server overrode it and invented a
          // source. It is how wrong information shipped in Aug 2026.
          //
          // The prompts now bless "" explicitly (see carousel-prompts.ts hook rules),
          // so an empty sourceNote means "no real source found" and must survive to
          // the UI, where the hook renders without a trust liner and the verification
          // layer flags it. Never re-add a fallback here.
          if (parsed.hooks) {
            // Essay preset: the boxed word must be a substring of the headline
            // or the cover has nothing to draw. Case-insensitive, then stored
            // as the headline's own casing.
            for (const h of parsed.hooks) {
              const hh = h as { headline?: string; emphasis?: unknown };
              if (typeof hh.emphasis === "string" && typeof hh.headline === "string") {
                const e = hh.emphasis.trim();
                const at = e.length > 0 ? hh.headline.toLowerCase().indexOf(e.toLowerCase()) : -1;
                hh.emphasis = at >= 0 ? hh.headline.slice(at, at + e.length) : undefined;
              } else delete hh.emphasis;
            }
            const unsourced = parsed.hooks.filter(
              (h) => !h.sourceNote || h.sourceNote.trim().length === 0
            ).length;
            if (unsourced > 0) {
              console.info(
                `[generate] ${unsourced}/${parsed.hooks.length} hooks returned without a source — preserved as unsourced`
              );
            }
          }
          // Normalize the optional Takeaway slide. The model occasionally returns
          // a partial object (missing points/interaction); the renderers read
          // those fields directly, so an incomplete shape crashes the content
          // stage. Drop a malformed takeaway entirely — every consumer guards on
          // its truthiness and falls back to the 5-slide deck.
          const tk = parsed.takeaway;
          if (tk) {
            const points = Array.isArray(tk.points)
              ? tk.points.filter((p) => typeof p === "string" && p.trim().length > 0)
              : [];
            const interactionOk =
              !!tk.interaction &&
              typeof tk.interaction.label === "string" &&
              tk.interaction.label.trim().length > 0 &&
              ["save", "send", "comment"].includes(tk.interaction.type as string);
            if (!tk.headline || typeof tk.headline !== "string" || points.length === 0 || !interactionOk) {
              console.warn("[generate] malformed takeaway dropped");
              delete parsed.takeaway;
            } else {
              tk.points = points;
            }
          }
          // Validate every graphic shape now, not just at render time — a
          // mismatch between what Claude sent and the component's real data
          // contract otherwise ships silently and only blanks out later.
          // The story spine: four short strings, or nothing. A partial spine is
          // worse than none, because rewrites would write inside a broken story.
          const sp = (parsed as { spine?: unknown }).spine;
          if (sp && typeof sp === "object") {
            const o = sp as Record<string, unknown>;
            const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, 240) : "");
            const spine = { moment: str("moment"), villain: str("villain"), turn: str("turn"), payoff: str("payoff"), image: str("image") || undefined, who: str("who") || undefined };
            if (spine.moment && spine.turn && spine.payoff) parsed.spine = spine;
            else delete parsed.spine;
          } else delete parsed.spine;
          if (Array.isArray(parsed.slides)) {
            for (const slide of parsed.slides) {
              if (!isStoryBeat(slide.beat)) delete slide.beat;
              if (slide.graphic) {
                slide.graphic = validateOrFallbackGraphic(slide.graphic, slide.body ?? slide.headline);
              }
              // Viral-only fields. A figure is a short token; an emphasis must
              // still be a substring of the body or the renderer has nothing
              // to mark. Anything else is dropped rather than drawn wrong.
              if (typeof slide.figure === "string") {
                const f = slide.figure.trim();
                slide.figure = f.length > 0 && f.length <= 8 ? f : undefined;
              } else delete slide.figure;
              // The base prompt sets headlines in caps for the poster presets;
              // Viral wants sentence case and the model does not always comply.
              if (stylePreset === "viral" && typeof slide.headline === "string") slide.headline = sentenceCase(slide.headline);
              if (typeof slide.emphasis === "string") {
                const e = slide.emphasis.trim();
                slide.emphasis = e.length > 0 && (slide.body ?? "").includes(e) ? e : undefined;
              } else delete slide.emphasis;
            }
          }
          if (stylePreset === "viral" && typeof parsed.cta?.headline === "string") parsed.cta.headline = sentenceCase(parsed.cta.headline);
          if (parsed.cta?.graphic) {
            // CTA graphic is decorative icon-row only — drop rather than
            // force an unsupported fallback component onto that slide.
            parsed.cta.graphic = validateOrFallbackGraphic(parsed.cta.graphic);
          }
          if (brief) parsed.brief = brief;
          // Stage 3: the editor read. A cold reader judges the cut against the
          // brief and its fixes are written in. A failed read keeps the deck.
          return await editorRead(parsed, brief, stylePreset);
        } catch (err) {
          if (firstError === null) firstError = err;
          console.error("[generate] variant failed:", err instanceof Error ? err.message : err);
          return null;
        }
      })
    );

    const variants = results.filter((v): v is CarouselContent => v !== null);
    if (variants.length === 0) {
      const reason = firstError ? describeGenerateError(firstError, "Generation") : "Failed to generate content. Please try again.";
      return Response.json({ error: reason }, { status: 500 });
    }

    // Server-side append of the static brand entity line. Variant index seed
    // makes each of the 3 variants pick a different line so they're
    // visually distinguishable; the same variant always renders the same
    // line on re-render (deterministic by topic + variant index).
    if (includeSeoFooter) {
      const { appendEntityLine } = await import("@/lib/lunia-brand");
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (typeof v.caption === "string" && v.caption.trim().length > 0) {
          v.caption = appendEntityLine(v.caption, `${topic}|${i}`);
        }
      }
    }

    const warning =
      variants.length < count
        ? `${count - variants.length} of ${count} variants failed — showing ${variants.length}`
        : undefined;

    // Editorial Scientific preset overrides any inferred / template brandStyle
    // with the Lunia April-2026 palette so every slide reads on-brand.
    const { getStylePresetBrandStyle } = await import("@/lib/carousel-style-presets");
    const resolvedBrandStyle =
      getStylePresetBrandStyle(stylePreset as CarouselStylePreset | undefined) ??
      template?.brandStyle ??
      null;

    if (requestId) {
      const record: SavedCarousel = {
        id: requestId,
        topic,
        hookTone,
        ...(structure ? { structure } : {}),
        content: variants[0],
        selectedHook: 0,
        brandStyle: resolvedBrandStyle ?? undefined,
        stylePreset: (stylePreset as CarouselStylePreset | undefined) ?? undefined,
        format,
        engagementSubType: format === "engagement" ? engagementSubType : undefined,
        savedAt: new Date().toISOString(),
      };
      await saveCarousel(record).catch((e) => console.warn("[generate] could not save the deck under its request id", e));
    }

    return Response.json({
      variants,
      savedId: requestId ?? null,
      styleRefsUsed: styleRefs.length,
      templateUsed: template?.name,
      brandStyle: resolvedBrandStyle,
      stylePreset: stylePreset ?? "default",
      ...(warning ? { warning } : {}),
    });
  } catch (err) {
    console.error("[api/carousel/generate]", err);
    return Response.json({ error: describeGenerateError(err, "Generation") }, { status: 500 });
  }
}

async function callDidYouKnow(topic: string, variantCount: number, violations?: string[]): Promise<DidYouKnowContent[]> {
  const prompt = GENERATE_DID_YOU_KNOW_PROMPT(topic, variantCount, violations);
  const msg = await createContentMessage({
    model: CONTENT_MODEL,
    max_tokens: CONTENT_MAX_TOKENS_LONG,
    thinking: CONTENT_THINKING,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  });
  const raw = extractText(msg);
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const json = JSON.parse(text);
  const result = DidYouKnowVariantsResponseSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid response shape: ${result.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return result.data.variants;
}

async function generateDidYouKnow(topic: string, count: number): Promise<Response> {
  const variantCount = Math.max(1, Math.min(3, count || 3));
  let variants: DidYouKnowContent[] = [];

  try {
    variants = await callDidYouKnow(topic, variantCount);
  } catch (err) {
    console.error("[generate/did_you_know] first attempt failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: describeGenerateError(err, "Did-you-know generation") }, { status: 500 });
  }

  // Per-variant compliance lint with single reprompt — run reprompts in parallel
  const finalVariants: DidYouKnowContent[] = await Promise.all(
    variants.map(async (variant): Promise<DidYouKnowContent> => {
      const lint = lintDidYouKnowContent(variant);
      if (lint.ok) return variant;
      console.warn("[generate/did_you_know] lint violations:", lint.violations);
      try {
        const reprompted = await callDidYouKnow(variant.topic || topic, 1, lint.violations);
        const fixed = reprompted[0];
        if (!fixed) {
          variant.violations = lint.violations;
          return variant;
        }
        const recheck = lintDidYouKnowContent(fixed);
        if (!recheck.ok) {
          console.warn("[generate/did_you_know] reprompt still has violations:", recheck.violations);
          fixed.violations = recheck.violations;
        }
        return fixed;
      } catch (err) {
        console.error("[generate/did_you_know] reprompt failed:", err instanceof Error ? err.message : err);
        variant.violations = lint.violations;
        return variant;
      }
    })
  );

  if (finalVariants.length === 0) {
    return Response.json({ error: "Generation produced no usable variants. Try again." }, { status: 500 });
  }

  return Response.json({ variants: finalVariants });
}

/** All-caps to sentence case, keeping tokens that are meant to be caps
 *  (REM, GABA, 3AM) and the brand URL. Mixed-case input is left alone. */
function sentenceCase(text: string): string {
  const t = text.trim();
  if (t !== t.toUpperCase()) return t;
  const keep = /^(REM|NREM|GABA|CBT-I|CBT|ADHD|DHA|EPA|HRV|SWS|OSA|IU|MG|NIH|AASM|\d+AM|\d+PM|[A-Z]\.)$/;
  const words = t.toLowerCase().split(/(\s+)/).map((w) => {
    const up = w.toUpperCase();
    if (keep.test(up) || up === "I") return up;
    if (/lunialife\.com/i.test(w)) return "lunialife.com";
    return w;
  });
  const out = words.join("");
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Stage 1. Null when the model returns nothing usable, in which case the
 *  deck is written the old way, from the topic and the ledger. */
async function writeBrief(topic: string, ledgerBlock: string, structure?: CarouselStructure, recentBlock = ""): Promise<CarouselBrief | null> {
  try {
    const hint = structure ? `${STRUCTURES[structure].label}: ${STRUCTURES[structure].info.what}` : undefined;
    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      output_config: { effort: EFFORT_MEDIUM },
      messages: [{ role: "user", content: BRIEF_PROMPT(topic, ledgerBlock, hint, recentBlock) }],
    });
    const brief = parseBrief(extractText(msg));
    console.log(brief ? `[generate] piece: ${brief.kind}, ${brief.owes.length} owed, ${brief.backing.length} backing fact(s), question "${brief.question.slice(0, 80)}"` : "[generate] piece: unusable, writing without it");
    return brief;
  } catch (err) {
    console.warn("[generate] brief failed, writing without it:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Stage 3. Returns the deck with the editor's fixes applied and the read
 *  recorded; on any failure, the deck as it was. */
async function editorRead(content: CarouselContent, brief: CarouselBrief | null, stylePreset?: string): Promise<CarouselContent> {
  try {
    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      output_config: { effort: EFFORT_MEDIUM },
      messages: [{ role: "user", content: EDITOR_READ_PROMPT(brief, content, { viral: stylePreset === "viral", essay: stylePreset === "essay" }) }],
    });
    const read = parseEditorRead(extractText(msg));
    if (!read) { console.warn("[generate] editor read: unusable response, deck kept as written"); return content; }
    const out = applyEditorRead(content, read);
    const applied = out.editorRead?.notes.filter((n) => n.applied).length ?? 0;
    console.log(`[generate] editor read: ${read.verdict}, ${applied} fix(es) applied`);
    return out;
  } catch (err) {
    console.warn("[generate] editor read failed, deck kept as written:", err instanceof Error ? err.message : err);
    return content;
  }
}
