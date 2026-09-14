import { isCarouselStructure } from "@/lib/carousel-structures";
import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_MED } from "@/lib/anthropic";
import { HOOK_SPREAD_PROMPT } from "@/lib/carousel-prompts";
import { normalizeSpread, isHookAngle } from "@/lib/hook-angles";
import type { CarouselBrief } from "@/lib/carousel-brief";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 300;

/** A spread hook carries the angle it was written for, so the builder can
 *  label it and the writer chooses a strategy instead of a synonym. */
type SpreadHook = {
  headline: string;
  subline: string;
  sourceNote: string;
  angle?: string;
  angleNote?: string;
  emphasis?: string;
};

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

    const angles = normalizeSpread(body.angles);
    const spine = body.content?.spine && typeof body.content.spine === "object" ? body.content.spine : null;
    const structure = isCarouselStructure(body.structure) ? body.structure : null;
    const stylePreset = typeof body.stylePreset === "string" ? body.stylePreset : null;
    const existing: { headline: string; subline?: string }[] = Array.isArray(body.existing)
      ? body.existing
          .filter((h: unknown) => h && typeof h === "object")
          .map((h: { headline?: string; subline?: string }) => ({
            headline: String(h.headline ?? "").slice(0, 200),
            subline: String(h.subline ?? "").slice(0, 200),
          }))
          .slice(0, 20)
      : [];
    const brief = body.brief && typeof body.brief === "object" ? (body.brief as CarouselBrief) : null;

    const prompt = HOOK_SPREAD_PROMPT(topic, angles, slides, guidelines, spine, structure, stylePreset, { existing, brief });

    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_MED,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractText(msg).trim();
    if (!raw) {
      return Response.json({ error: "The writer returned nothing. Please try again." }, { status: 502 });
    }

    const parse = (s: string): SpreadHook[] => {
      const obj = JSON.parse(s);
      const arr = Array.isArray(obj) ? obj : obj?.hooks;
      if (!Array.isArray(arr)) return [];
      return arr
        .map((h: { headline?: string; subline?: string; sourceNote?: string; angle?: string; angleNote?: string; emphasis?: string }) => {
          const headline = String(h?.headline ?? "").trim();
          return {
            headline,
            subline: String(h?.subline ?? "").trim(),
            sourceNote: String(h?.sourceNote ?? "").trim(),
            // The angle is kept only when it is one this spread asked for, so a
            // hallucinated id never reaches the builder's chip labels.
            ...(isHookAngle(h?.angle) && angles.includes(h.angle as string) ? { angle: h.angle as string } : {}),
            ...(typeof h?.angleNote === "string" && h.angleNote.trim() ? { angleNote: h.angleNote.trim().slice(0, 120) } : {}),
            // Essay/billboard presets: the boxed word, kept only when it is in the headline.
            ...(typeof h?.emphasis === "string" && h.emphasis.trim() && headline.toLowerCase().includes(h.emphasis.trim().toLowerCase())
              ? { emphasis: h.emphasis.trim() }
              : {}),
          };
        })
        .filter((h: SpreadHook) => h.headline && h.subline);
    };

    let hooks: SpreadHook[] = [];
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
      console.error("[api/carousel-v2/hook-spread] no hooks parsed:", raw);
      return Response.json({ error: "Failed to parse hooks. Please try again." }, { status: 502 });
    }

    return Response.json({ hooks, angles });
  } catch (err) {
    console.error("[api/carousel-v2/hook-spread]", err);
    return Response.json({ error: "Failed to write the hook spread" }, { status: 500 });
  }
}
