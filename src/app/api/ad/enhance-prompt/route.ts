import { anthropic } from "@/lib/anthropic";
import { buildPromptEnhancerMessage, GUIDELINE_CHIPS } from "@/lib/ad-prompts";
import { checkRateLimit } from "@/lib/kv";
import type { VisualFormat } from "@/lib/types";

export const maxDuration = 30;

const VALID_FORMATS = new Set<VisualFormat>([
  "product-dark",
  "lifestyle-flatlay",
  "text-dominant",
  "before-after",
  "ingredient-macro",
]);

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "ad");
  if (!allowed) {
    return Response.json(
      { error: "Too many requests. Please try again in an hour." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const rawPrompt: string = typeof body.rawPrompt === "string" ? body.rawPrompt.trim() : "";
    const visualFormat = body.visualFormat as VisualFormat;
    const activeChipKeys: string[] = Array.isArray(body.activeChipKeys)
      ? body.activeChipKeys.filter((x: unknown): x is string => typeof x === "string")
      : [];

    if (!rawPrompt) {
      return Response.json({ error: "rawPrompt required" }, { status: 400 });
    }
    if (rawPrompt.length > 2000) {
      return Response.json({ error: "rawPrompt too long" }, { status: 400 });
    }
    if (!VALID_FORMATS.has(visualFormat)) {
      return Response.json({ error: "invalid visualFormat" }, { status: 400 });
    }

    const chipMap = new Map(GUIDELINE_CHIPS.map((c) => [c.key, c.phrase]));
    const activeChipPhrases = activeChipKeys
      .map((k) => chipMap.get(k))
      .filter((p): p is string => typeof p === "string");

    const userMessage = buildPromptEnhancerMessage({
      rawPrompt,
      visualFormat,
      activeChipPhrases,
    });

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: userMessage }],
    });

    const enhanced = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join(" ")
      .trim();

    if (!enhanced) {
      throw new Error("Empty enhancement from Claude");
    }

    return Response.json({ prompt: enhanced });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ad/enhance-prompt]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
