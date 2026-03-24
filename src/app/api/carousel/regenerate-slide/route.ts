import { anthropic } from "@/lib/anthropic";
import { REGENERATE_SLIDE_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";
import { CarouselContentSlide, HookTone } from "@/lib/types";

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

    if (!topic || topic.trim().length === 0) {
      return Response.json({ error: "Topic required" }, { status: 400 });
    }
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 2) {
      return Response.json({ error: "slideIndex must be 0–2" }, { status: 400 });
    }

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [
        { role: "user", content: REGENERATE_SLIDE_PROMPT(topic, hookTone, slideIndex) },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
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

    return Response.json({ slide });
  } catch (err) {
    console.error("[api/carousel/regenerate-slide]", err);
    return Response.json({ error: "Failed to regenerate slide" }, { status: 500 });
  }
}
