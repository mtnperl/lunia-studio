import { z } from "zod";
import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { clientIp, logEntry, logExit } from "@/lib/ugc-api";

const bodySchema = z.object({
  script: z.object({
    videoHook: z.string().max(1000).default(""),
    textHook: z.string().max(500).default(""),
    narrative: z.string().max(8000).default(""),
    cta: z.string().max(500).default(""),
  }),
  angle: z.string().max(120).optional(),
  conceptLabel: z.string().max(200).optional(),
});

const SYSTEM_PROMPT = `You write short ad-name tags for Lunia Life UGC video briefs. The tag will be pasted into an ad name, so it needs to capture the CORE idea of the ad in a few words.

Rules (hard):
- 4 to 8 words total.
- Does NOT need to be a grammatical phrase. Keyword-style fragments are encouraged. Example style: "best investment & coffee value", "three am wake up fix", "melatonin free sleep stack".
- Capture the CORE of the ad — the hook, the contrast, the angle — not the outcome or result.
- Allowed characters: letters, numbers, spaces, apostrophes, and the ampersand (&) to join two ideas.
- No other punctuation. No periods, colons, hyphens, quotes, question marks, exclamation marks, em dashes.
- No emoji. No hashtags.
- No brand or product names (Lunia, Restore, etc.).
- Lowercase is fine. Do not force title case.

Output exactly the tag text. No quotes, no explanation, no trailing punctuation.`;

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/briefs/generate-heading", "generate");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/briefs/generate-heading", "generate", start, 429);
    return Response.json(
      { error: "Too many heading generations. Try again in an hour." },
      { status: 429 },
    );
  }
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs/generate-heading", "generate", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const { script, angle, conceptLabel } = parsed.data;

    const hasContent = [script.videoHook, script.textHook, script.narrative, script.cta]
      .some((s) => s.trim().length > 0);
    if (!hasContent) {
      logExit("/api/ugc/briefs/generate-heading", "generate", start, 400);
      return Response.json(
        { error: "Fill in the script first, then generate a heading." },
        { status: 400 },
      );
    }

    const userPrompt = `Write a heading for this UGC script.
${angle ? `Angle: ${angle}` : ""}
${conceptLabel ? `Concept: ${conceptLabel}` : ""}

SCRIPT:
Video hook: ${script.videoHook}
Text hook: ${script.textHook}
Narrative: ${script.narrative}
CTA: ${script.cta}

Return the heading only.`;

    const message = await createContentMessage({
      model: "claude-opus-4-7",
      max_tokens: 60,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const cleaned = sanitizeHeading(raw);

    logExit("/api/ugc/briefs/generate-heading", "generate", start, 200);
    return Response.json({ heading: cleaned });
  } catch (err) {
    console.error("[api/ugc/briefs/generate-heading] POST", err);
    logExit("/api/ugc/briefs/generate-heading", "generate", start, 500);
    return Response.json({ error: "Heading generation failed" }, { status: 500 });
  }
}

function sanitizeHeading(s: string): string {
  let out = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  out = out.replace(/[^A-Za-z0-9'& ]+/g, " ").replace(/\s+/g, " ").trim();
  const parts = out.split(" ").slice(0, 8);
  return parts.join(" ");
}
