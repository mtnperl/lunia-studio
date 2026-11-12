import { createContentMessage, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_LONG, extractText } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { LayoutBlockSchema, layoutBlockToCampaignBlock } from "@/lib/campaign-layout-prompts";
import { z } from "zod";

export const maxDuration = 60;

const LUNIA_VOICE_SPEC = `Lunia Life brand voice: Aspirational, minimal, wellness-science grounded. Tone: calm confidence. No hype.

HARD BRAND RULE — NEVER use em dashes (—) or en dashes (–).`;

/** Returns 3 alternate versions of ONE block, same kind as the current one.
 *  Mirrors the existing `regenerate-prompt` pattern used for image prompts. */
export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  const VALID_KINDS: string[] = LayoutBlockSchema.options.map((o) => o.shape.kind.value);

  try {
    const body = await req.json();
    const requestedKind: string = body.kind ?? "text";
    const kind = VALID_KINDS.includes(requestedKind) ? requestedKind : "text";
    const currentFields: Record<string, unknown> = body.currentFields ?? {};
    const subject: string = (body.subject ?? "").trim();
    const topic: string = (body.topic ?? "").trim();

    const prompt = `${LUNIA_VOICE_SPEC}

Write 3 alternate versions of ONE email block. The block's kind is "${kind}" — every alternate must keep that exact kind and its exact field shape.

Current block content: ${JSON.stringify(currentFields)}
Email subject: ${subject || topic || "a Lunia Life sleep-wellness campaign"}
${topic ? `Topic: ${topic}` : ""}

Write 3 alternates that are each clearly DIFFERENT from the current content and from each other, but keep the same kind and roughly the same purpose.

Return ONLY valid JSON, no markdown fences: { "alternates": [ <block1>, <block2>, <block3> ] }, where each blockN has the exact same field shape as the current block content shown above (same "kind" value, same other keys).`;

    const response = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractText(response);
    const jsonText = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      console.error("[api/campaign/regenerate-block] JSON parse failed:", raw.slice(0, 400));
      return Response.json({ error: "Regeneration failed, please try again." }, { status: 422 });
    }

    // The model is instructed to echo "kind" on every alternate, but LLMs
    // reliably drop fields they consider "obviously the same as the input" —
    // we already know the kind from the request, so inject it defensively
    // rather than depending on instruction-following for a field we can
    // supply ourselves.
    if (parsedJson && typeof parsedJson === "object" && Array.isArray((parsedJson as { alternates?: unknown }).alternates)) {
      for (const alt of (parsedJson as { alternates: Record<string, unknown>[] }).alternates) {
        if (alt && typeof alt === "object" && !alt.kind) alt.kind = kind;
      }
    }

    const AlternatesSchema = z.object({ alternates: z.array(LayoutBlockSchema).min(1).max(3) });
    const result = AlternatesSchema.safeParse(parsedJson);
    if (!result.success) {
      console.error("[api/campaign/regenerate-block] schema validation failed:", result.error.message, "RAW:", JSON.stringify(parsedJson).slice(0, 800));
      return Response.json({ error: "Regeneration failed, please try again." }, { status: 422 });
    }

    const alternates = result.data.alternates.map(layoutBlockToCampaignBlock);
    return Response.json({ alternates });
  } catch (err) {
    console.error("[api/campaign/regenerate-block]", err);
    return Response.json({ error: "Regeneration failed" }, { status: 500 });
  }
}
