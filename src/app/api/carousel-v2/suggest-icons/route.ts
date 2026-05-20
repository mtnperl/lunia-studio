import { createContentMessage, extractText, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { CAROUSEL_ICONS, getIconById } from "@/lib/carousel-icons";

export const maxDuration = 60;

export async function POST(req: Request) {
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
    const headline: string = body.headline ?? "";
    const slideBody: string = body.body ?? "";

    if (!headline.trim()) {
      return Response.json({ error: "headline required" }, { status: 400 });
    }

    // Compact library catalog — id | label | category. ~150 lines, ~5KB.
    const catalog = CAROUSEL_ICONS.map((ic) => `${ic.id} | ${ic.label} | ${ic.category}`).join("\n");

    const systemPrompt = `You pick icons for an Instagram carousel slide on health, sleep, wellness, fitness, or lifestyle topics.

From the icon library below, choose EXACTLY 3 icons that together illustrate this slide. Pick complementary icons that tell a small visual story — never 3 redundant icons of the same concept. Mix categories when it makes sense (e.g. a "magnesium for sleep" slide could be supplement + moon + breathing).

Library (id | label | category):
${catalog}

Rules (hard):
- Return ONLY a JSON array of exactly 3 ids from the library above. No prose, no labels, no markdown, no code fence.
- Each id MUST appear verbatim in the library — do not invent ids.
- Format: ["id1","id2","id3"]`;

    const userMessage = [
      `Slide headline: "${headline}"`,
      slideBody ? `Slide body: "${slideBody}"` : null,
      topic ? `Carousel topic: "${topic}"` : null,
      `\nReturn 3 icon ids as a JSON array.`,
    ].filter(Boolean).join("\n");

    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = extractText(msg).trim();

    // Parse JSON array; fall back to extracting the first [...] block.
    let candidates: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) candidates = parsed.map(String);
    } catch {
      const match = raw.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) candidates = parsed.map(String);
        } catch { /* fallthrough */ }
      }
    }

    // Validate ids against the library. Keep order, dedupe.
    const seen = new Set<string>();
    const validIds: string[] = [];
    for (const id of candidates) {
      if (seen.has(id)) continue;
      if (getIconById(id)) {
        validIds.push(id);
        seen.add(id);
      }
      if (validIds.length >= 3) break;
    }

    // If Claude returned fewer than 3 valid ids, top up from a safe default
    // pool so the UI always gets exactly 3.
    const FALLBACK_POOL = ["heart", "leaf", "moon", "brain", "energy", "flow"];
    for (const fid of FALLBACK_POOL) {
      if (validIds.length >= 3) break;
      if (seen.has(fid)) continue;
      if (getIconById(fid)) {
        validIds.push(fid);
        seen.add(fid);
      }
    }

    if (validIds.length === 0) {
      return Response.json({ error: "Failed to suggest icons" }, { status: 500 });
    }

    return Response.json({ icons: validIds.slice(0, 3) });
  } catch (err) {
    console.error("[api/carousel-v2/suggest-icons]", err);
    return Response.json({ error: "Failed to suggest icons" }, { status: 500 });
  }
}
