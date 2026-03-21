import { anthropic } from "@/lib/anthropic";
import { GENERATE_CAROUSEL_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit, getAssets, getCarouselTemplateById } from "@/lib/kv";
import { CarouselContent, HookTone } from "@/lib/types";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

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

    if (!topic || topic.trim().length === 0) {
      return Response.json({ error: "Topic required" }, { status: 400 });
    }
    if (topic.length > 500) {
      return Response.json({ error: "Topic too long (max 500 characters)" }, { status: 400 });
    }

    // Fetch carousel-style reference images (up to 2)
    const allAssets = await getAssets().catch(() => []);
    const styleRefs = allAssets
      .filter((a) => a.assetType === "carousel-style")
      .slice(0, 2);

    // Fetch template if provided
    const template = templateId ? await getCarouselTemplateById(templateId).catch(() => null) : null;

    const hasStyleRef = styleRefs.length > 0;
    const promptText = GENERATE_CAROUSEL_PROMPT(topic, hookTone, hasStyleRef, template);

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

    const results = await Promise.all(
      Array.from({ length: count }, async (): Promise<CarouselContent | null> => {
        try {
          const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            messages,
          });
          const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
          const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          return JSON.parse(text) as CarouselContent;
        } catch {
          return null;
        }
      })
    );

    const variants = results.filter((v): v is CarouselContent => v !== null);
    if (variants.length === 0) {
      return Response.json({ error: "Failed to generate content. Please try again." }, { status: 500 });
    }

    const warning =
      variants.length < count
        ? `${count - variants.length} of ${count} variants failed — showing ${variants.length}`
        : undefined;

    return Response.json({
      variants,
      styleRefsUsed: styleRefs.length,
      templateUsed: template?.name,
      ...(warning ? { warning } : {}),
    });
  } catch (err) {
    console.error("[api/carousel/generate]", err);
    return Response.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
