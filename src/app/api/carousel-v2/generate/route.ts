import { createContentMessage, extractText, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_LONG } from "@/lib/anthropic";
import { GENERATE_CAROUSEL_PROMPT, GENERATE_DID_YOU_KNOW_PROMPT, GENERATE_ENGAGEMENT_CAROUSEL_PROMPT } from "@/lib/carousel-prompts";
import { lintDidYouKnowContent } from "@/lib/did-you-know-lint";
import { checkRateLimit, getAssets, getCarouselTemplateById } from "@/lib/kv";
import { CarouselContent, CarouselFormat, DidYouKnowContent, DidYouKnowVariantsResponseSchema, EngagementSubType, HookTone } from "@/lib/types";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export const maxDuration = 300;

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
    const promptText = format === "engagement"
      ? GENERATE_ENGAGEMENT_CAROUSEL_PROMPT(topic, engagementSubType, hasStyleRef, template, template?.brandStyle)
      : GENERATE_CAROUSEL_PROMPT(topic, hookTone, hasStyleRef, template, template?.brandStyle, concise);

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
            messages,
          });
          const raw = extractText(msg);
          const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          const parsed = JSON.parse(text) as CarouselContent;
          // Ensure every hook has a sourceNote (trust liner) — LLM sometimes omits it
          if (parsed.hooks) {
            for (const hook of parsed.hooks) {
              if (!hook.sourceNote || hook.sourceNote.trim().length === 0) {
                console.warn("[generate] hook missing sourceNote, adding fallback");
                hook.sourceNote = "Based on peer-reviewed sleep research";
              }
            }
          }
          return parsed;
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

    const warning =
      variants.length < count
        ? `${count - variants.length} of ${count} variants failed — showing ${variants.length}`
        : undefined;

    return Response.json({
      variants,
      styleRefsUsed: styleRefs.length,
      templateUsed: template?.name,
      brandStyle: template?.brandStyle ?? null,
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
