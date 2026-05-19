import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { REGENERATE_HOOKS_PROMPT } from "@/lib/carousel-prompts";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 300;

type Hook = { headline: string; subline: string; sourceNote: string };

export async function POST(req: Request): Promise<Response> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const topic: string = body.topic ?? "";
    const hookTone: string = body.hookTone ?? "educational";
    const guidelines: string = (body.guidelines ?? "").slice(0, 400); // cap to limit prompt injection
    const slides: { headline: string; body: string }[] = Array.isArray(body?.content?.slides)
      ? body.content.slides.map((s: { headline?: string; body?: string }) => ({
          headline: String(s?.headline ?? ""),
          body: String(s?.body ?? ""),
        }))
      : [];

    if (!topic && slides.length === 0) {
      return Response.json({ error: "topic or content required" }, { status: 400 });
    }

    const prompt = REGENERATE_HOOKS_PROMPT(topic, hookTone, slides, guidelines);

    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractText(msg).trim();
    if (!raw) {
      return Response.json({ error: "Failed to regenerate hooks" }, { status: 500 });
    }

    let hooks: Hook[] = [];
    const parse = (s: string): Hook[] => {
      const obj = JSON.parse(s);
      const arr = Array.isArray(obj) ? obj : obj?.hooks;
      if (!Array.isArray(arr)) return [];
      return arr
        .map((h: { headline?: string; subline?: string; sourceNote?: string }) => ({
          headline: String(h?.headline ?? "").trim(),
          subline: String(h?.subline ?? "").trim(),
          sourceNote: String(h?.sourceNote ?? "").trim(),
        }))
        .filter((h: Hook) => h.headline && h.subline);
    };
    try {
      hooks = parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          hooks = parse(match[0]);
        } catch {
          hooks = [];
        }
      }
    }

    if (hooks.length === 0) {
      console.error("[api/carousel-v2/regenerate-hooks] no hooks parsed:", raw);
      return Response.json({ error: "Failed to parse hooks. Please try again." }, { status: 500 });
    }

    return Response.json({ hooks });
  } catch (err) {
    console.error("[api/carousel-v2/regenerate-hooks]", err);
    return Response.json({ error: "Failed to regenerate hooks" }, { status: 500 });
  }
}
