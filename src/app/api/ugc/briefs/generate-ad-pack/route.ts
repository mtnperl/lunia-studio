import { z } from "zod";
import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { postProcess } from "@/lib/compliance";
import { clientIp, incrComplianceMetric, logEntry, logExit } from "@/lib/ugc-api";
import type { BriefComplianceFlag, MetaCtaType } from "@/lib/types";

const bodySchema = z.object({
  script: z.object({
    videoHook: z.string().max(1000).default(""),
    textHook: z.string().max(500).default(""),
    narrative: z.string().max(8000).default(""),
    cta: z.string().max(500).default(""),
  }),
  title: z.string().max(200).optional(),
  angle: z.string().max(120).optional(),
  conceptLabel: z.string().max(200).optional(),
});

const ALLOWED_CTAS: MetaCtaType[] = [
  "SHOP_NOW",
  "LEARN_MORE",
  "SIGN_UP",
  "SUBSCRIBE",
  "GET_OFFER",
  "ORDER_NOW",
  "SEE_MORE",
];

const SYSTEM_PROMPT = `You write Meta (Facebook/Instagram) Ads Manager copy packs for Lunia Life,
a melatonin-free sleep supplement brand for women in perimenopause and menopause.

This is PAID ADS copy — direct-response, benefit-first, swipe-stopping. Not an organic post.

Hard voice rules:
- NEVER use em dashes. Use commas, periods, or "..." instead.
- NEVER use "X is not Y, it's Z" structure.
- No "cures", "treats", "prevents", "diagnoses". Use "supports", "may help", "shown in studies to".
- No "click the link", "use my code", "game changer", "holy grail", "obsessed".
- No hashtags. No emojis in headlines/descriptions. Max one emoji per primary text, optional.
- Product mention should feel natural, not forced in the first four words.
- Respect the concept/angle provided — don't invent a different hook.

Format rules (Meta platform constraints):
- Primary text: 125 to 200 characters each. The first ~80 characters must hook (Meta truncates
  with "See more" at ~125 on mobile feed). Benefit-led opener.
- Headlines: under 40 characters. Punchy, value-forward. No period at the end.
- Descriptions: under 30 characters. Supporting line under the headline. No period at the end.
- CTA: must be one of: SHOP_NOW, LEARN_MORE, SIGN_UP, SUBSCRIBE, GET_OFFER, ORDER_NOW, SEE_MORE.
  For Lunia (DTC supplement), default to SHOP_NOW unless the angle is clearly educational
  (then LEARN_MORE) or offer-led (then GET_OFFER).

Output EXACTLY this JSON shape, no markdown, no prose, nothing else:
{
  "primaryTexts": ["...", "...", "...", "...", "..."],
  "headlines": ["...", "...", "...", "...", "..."],
  "descriptions": ["...", "...", "...", "...", "..."],
  "cta": "SHOP_NOW"
}

Exactly 5 of each. No fewer.`;

type AdPackJson = {
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  cta: string;
};

function isAdPackJson(x: unknown): x is AdPackJson {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    Array.isArray(o.primaryTexts) &&
    Array.isArray(o.headlines) &&
    Array.isArray(o.descriptions) &&
    typeof o.cta === "string"
  );
}

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/briefs/generate-ad-pack", "generate");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-ad-pack");
  if (!allowed) {
    logExit("/api/ugc/briefs/generate-ad-pack", "generate", start, 429);
    return Response.json(
      { error: "Too many ad pack generations. Try again in an hour." },
      { status: 429 },
    );
  }
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs/generate-ad-pack", "generate", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const { script, title, angle, conceptLabel } = parsed.data;

    const userPrompt = `Generate a Meta Ads copy pack for this Lunia Life UGC ad.
${title ? `Title: ${title}` : ""}
${angle ? `Angle: ${angle}` : ""}
${conceptLabel ? `Concept: ${conceptLabel}` : ""}

SCRIPT (for context on the video's message):
Video hook: ${script.videoHook}
Text hook: ${script.textHook}
Narrative: ${script.narrative}
CTA: ${script.cta}

Return exactly the JSON shape defined in the system prompt. Exactly 5 primary texts,
5 headlines, 5 descriptions, and 1 cta value from the allowed list.`;

    const message = await createContentMessage({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    // Strip any accidental code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch {
      logExit("/api/ugc/briefs/generate-ad-pack", "generate", start, 502);
      return Response.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }
    if (!isAdPackJson(parsedJson)) {
      logExit("/api/ugc/briefs/generate-ad-pack", "generate", start, 502);
      return Response.json({ error: "Model returned wrong shape" }, { status: 502 });
    }

    // Run each string through compliance postProcess, collect all flags
    const allFlags: BriefComplianceFlag[] = [];
    const sanitize = (arr: string[]): string[] =>
      arr.slice(0, 5).map((s) => {
        const { cleaned, result } = postProcess(s.trim());
        for (const v of result.violations) {
          allFlags.push({ severity: v.severity, rule: v.rule, match: v.match });
        }
        return cleaned;
      });

    const primaryTexts = sanitize(parsedJson.primaryTexts);
    const headlines = sanitize(parsedJson.headlines);
    const descriptions = sanitize(parsedJson.descriptions);
    const cta: MetaCtaType = (ALLOWED_CTAS as string[]).includes(parsedJson.cta)
      ? (parsedJson.cta as MetaCtaType)
      : "SHOP_NOW";

    const worstLevel = allFlags.some((f) => f.severity === "red")
      ? "red"
      : allFlags.length > 0
        ? "amber"
        : "green";
    await incrComplianceMetric(worstLevel);

    logExit("/api/ugc/briefs/generate-ad-pack", "generate", start, 200, {
      level: worstLevel,
      flagCount: allFlags.length,
    });
    return Response.json({
      primaryTexts,
      headlines,
      descriptions,
      cta,
      complianceFlags: allFlags,
      generatedAt: Date.now(),
    });
  } catch (err) {
    console.error("[api/ugc/briefs/generate-ad-pack] POST", err);
    logExit("/api/ugc/briefs/generate-ad-pack", "generate", start, 500);
    return Response.json({ error: "Ad pack generation failed" }, { status: 500 });
  }
}
