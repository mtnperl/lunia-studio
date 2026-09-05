import { createContentMessage, extractText, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { REGENERATE_SLIDE_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";
import { CarouselContentSlide, HookTone } from "@/lib/types";
import { isStoryBeat, type StorySpine } from "@/lib/story-spine";

export const maxDuration = 300;

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
    const slideIndex: number = Number(body.slideIndex);
    // The deck can be any length now (a viral deck runs to eight content
    // slides), so the bound comes from the caller rather than a fixed 3.
    const slideTotal: number = Number(body.slideTotal) > 0 ? Number(body.slideTotal) : 3;
    const stylePreset: string | undefined = typeof body.stylePreset === "string" ? body.stylePreset : undefined;
    const comment: string = typeof body.comment === "string" ? body.comment : "";
    const current = body.current && typeof body.current === "object" ? body.current as CarouselContentSlide : undefined;
    const spine = body.spine && typeof body.spine === "object" ? body.spine as StorySpine : null;
    const prev = body.prev && typeof body.prev === "object" ? body.prev as { headline?: string; body?: string } : null;
    const next = body.next && typeof body.next === "object" ? body.next as { headline?: string; body?: string } : null;

    if (!topic || topic.trim().length === 0) {
      return Response.json({ error: "Topic required" }, { status: 400 });
    }
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex >= slideTotal) {
      return Response.json({ error: `slideIndex must be 0 to ${slideTotal - 1}` }, { status: 400 });
    }

    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      messages: [
        { role: "user", content: REGENERATE_SLIDE_PROMPT(topic, hookTone, slideIndex, { current, comment, stylePreset, slideTotal, spine, prev, next }) },
      ],
    });

    const text = extractText(msg);
    let slide: CarouselContentSlide;
    try {
      slide = JSON.parse(text) as CarouselContentSlide;
    } catch {
      console.error("[api/carousel/regenerate-slide] JSON parse failed:", text);
      return Response.json(
        { error: "Failed to parse slide. Please try again." },
        { status: 500 }
      );
    }

    // Same sanitising the generate route applies: an emphasis that is not in
    // the body has nothing to mark, and an over-long figure is not a figure.
    if (typeof slide.figure === "string") {
      const f = slide.figure.trim();
      slide.figure = f.length > 0 && f.length <= 8 ? f : undefined;
    }
    if (typeof slide.emphasis === "string") {
      const e = slide.emphasis.trim();
      slide.emphasis = e.length > 0 && (slide.body ?? "").includes(e) ? e : undefined;
    }
    if (!isStoryBeat(slide.beat)) slide.beat = current?.beat;
    // A rewrite that dropped the citation but kept a claim keeps the old one
    // rather than shipping an unsourced figure.
    if (current?.citation && !slide.citation) slide.citation = current.citation;

    return Response.json({ slide });
  } catch (err) {
    console.error("[api/carousel/regenerate-slide]", err);
    return Response.json({ error: "Failed to regenerate slide" }, { status: 500 });
  }
}
