// Opt-in "Improve with Claude": rewrite an imported email's COPY into Lunia
// voice in one pass — the subject and each body block — while leaving images,
// layout, promo band, and CTA URLs untouched. The editor stashes the pre-rewrite
// content so the user can revert. Verbatim import stays the default landing state.
import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

type Body = { topic?: string; subject?: string; blocks?: string[] };

function stripDashes(s: string): string {
  return s.replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, "-").replace(/\s{2,}/g, " ").trim();
}

function safeParse(raw: string): { subject?: string; blocks?: string[] } | null {
  const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(s); } catch { /* fall through */ }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch { /* noop */ } }
  return null;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) return Response.json({ error: "Rate limited" }, { status: 429 });

  try {
    const { topic, subject, blocks } = (await req.json()) as Body;
    const cleanBlocks = (blocks ?? []).map((b) => (b ?? "").trim());
    if (!subject?.trim() && cleanBlocks.filter(Boolean).length === 0) {
      return Response.json({ error: "nothing to rewrite" }, { status: 400 });
    }

    const prompt = `You are a senior copywriter for Lunia Life.

Lunia Life brand voice: aspirational, minimal, wellness-science grounded. Calm confidence. No hype, no FOMO, no urgency manipulation. Clear, direct, sophisticated. Target reader: health-conscious adult, 28-45, optimising their life.

HARD BRAND RULE: NEVER use em dashes (—) or en dashes (–) ANYWHERE. Use commas, periods, semicolons, or short sentences instead.

You are improving an existing marketing email${topic?.trim() ? ` about "${topic.trim()}"` : ""}. Rewrite the subject line and each body block in Lunia voice: sharper, more specific, more Lunia. Keep each block's core intent and roughly its length. Do NOT merge, split, reorder, add, or drop blocks — return exactly ${cleanBlocks.length} block(s) in the same order. Keep the subject under 60 characters.

HARD RULE: any block may contain personalization tokens like {{ first_name }} or inline markup like **bold** and [link text](url). Preserve every {{ ... }}, **...**, and [...](...) sequence EXACTLY verbatim, character-for-character, in the same position relative to the surrounding words. Never invent, remove, rename, or "clean up" one of these sequences, even if it looks unusual mid-sentence.

Subject: "${(subject ?? "").trim()}"

Blocks:
${cleanBlocks.map((b, i) => `[${i}] ${b}`).join("\n\n")}

Return ONLY minified JSON of this exact shape, no markdown, no em dashes:
{"subject":"...","blocks":["...", "..."]}`;

    const msg = await createContentMessage({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content.find((c) => c.type === "text");
    const parsed = text ? safeParse(text.text) : null;
    if (!parsed || !Array.isArray(parsed.blocks)) {
      return Response.json({ error: "Rewrite failed to parse" }, { status: 502 });
    }

    // Guard block count: if the model drifted, fall back to per-index originals
    // so we never lose content.
    const outBlocks = cleanBlocks.map((orig, i) => {
      const rewritten = parsed.blocks?.[i];
      return typeof rewritten === "string" && rewritten.trim() ? stripDashes(rewritten) : orig;
    });

    return Response.json({
      subject: parsed.subject ? stripDashes(parsed.subject) : subject,
      blocks: outBlocks,
    });
  } catch (err) {
    console.error("[api/campaign/rewrite-email]", err);
    return Response.json({ error: "Rewrite failed" }, { status: 500 });
  }
}
