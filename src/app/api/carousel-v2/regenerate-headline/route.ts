import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { REGENERATE_HEADLINES_PROMPT } from "@/lib/carousel-prompts";
import type { CarouselBrief } from "@/lib/carousel-brief";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 120;

/** Alternative headlines for one slide or the takeaway. The body stays;
 *  the caller applies whichever headline it picks. */
export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });

  try {
    const body = await req.json();
    const topic: string = typeof body.topic === "string" ? body.topic.slice(0, 500) : "";
    const headline: string = typeof body.headline === "string" ? body.headline.slice(0, 300) : "";
    const slideBody: string = typeof body.body === "string" ? body.body.slice(0, 2000) : "";
    const label: string = typeof body.label === "string" ? body.label.slice(0, 40) : "slide";
    const isTakeaway = body.kind === "takeaway";
    const stylePreset = typeof body.stylePreset === "string" ? body.stylePreset : null;
    const brief = body.brief && typeof body.brief === "object" ? (body.brief as CarouselBrief) : null;
    const existing: string[] = Array.isArray(body.existing) ? body.existing.filter((h: unknown): h is string => typeof h === "string").map((h: string) => h.slice(0, 200)).slice(0, 24) : [];
    const count = Math.max(1, Math.min(8, Number(body.count) || 4));
    if (!topic || !slideBody) return Response.json({ error: "topic and body required" }, { status: 400 });

    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      messages: [{ role: "user", content: REGENERATE_HEADLINES_PROMPT(topic, { headline, body: slideBody, label, isTakeaway, stylePreset, brief, existing: [headline, ...existing], count }) }],
    });
    const raw = extractText(msg).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const match = raw.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(match ? match[0] : raw) as { headlines?: unknown };
    const seen = new Set([headline.trim().toLowerCase(), ...existing.map((h) => h.trim().toLowerCase())]);
    const headlines = (Array.isArray(obj.headlines) ? obj.headlines : [])
      .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
      .map((h) => h.trim())
      .filter((h) => { const k = h.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, count);
    if (headlines.length === 0) return Response.json({ error: "No headlines returned. Please try again." }, { status: 500 });
    return Response.json({ headlines });
  } catch (err) {
    console.error("[api/carousel-v2/regenerate-headline]", err);
    return Response.json({ error: "Failed to write headlines" }, { status: 500 });
  }
}
