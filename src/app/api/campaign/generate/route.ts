import { createContentMessage, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_LONG } from "@/lib/anthropic";
import { checkRateLimit, getAssets } from "@/lib/kv";
import type { CampaignContent, CampaignImageSlot, AssetType } from "@/lib/types";
import { randomUUID } from "crypto";

export const maxDuration = 60;

const LUNIA_VOICE_SPEC = `Lunia Life brand voice: Aspirational, minimal, wellness-science grounded. Tone: calm confidence. No hype. No FOMO manipulation. Language: clear, direct, sophisticated. Target reader: health-conscious adult, 28-45, optimizing their sleep. Write like a trusted expert friend, not a marketer. Lunia Life sells a sleep supplement (magnesium glycinate, L-theanine, apigenin — transparent dosing, melatonin-free).`;

type RawImage = {
  role: "hero" | "secondary";
  source: "generated" | "asset";
  prompt?: string;
  assetTypeHint?: string;
};

type RawCampaign = {
  subjectLines: string[];
  previewText: string;
  promoBand?: string;
  blocks: { body: string; align?: "left" | "center"; italic?: boolean }[];
  cta: string;
  images: RawImage[];
};

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
    const topic: string = (body.topic ?? "").trim();
    const occasion: string = (body.occasion ?? "").trim();
    const offer: string = (body.offer ?? "").trim();
    const ctaUrl: string = (body.ctaUrl ?? "").trim() || "https://www.lunialife.com/products/lunia-sleep-vitamins";
    const tone: string = (body.tone ?? "calm, editorial").trim();

    if (topic.length < 4) {
      return Response.json({ error: "Describe the campaign in a few words." }, { status: 400 });
    }

    const prompt = `${LUNIA_VOICE_SPEC}

Write a complete marketing email campaign for Lunia Life.

Campaign brief:
- Topic / angle: ${topic}
${occasion ? `- Occasion: ${occasion}` : ""}
${offer ? `- Offer: ${offer}` : ""}
- Desired tone: ${tone}

The email layout is fixed: a hero image, an optional promo band, an intro text block, a row of 2–4 secondary images, one or two closing text blocks (the last is a short italic urgency line), and a single CTA button.

Image rules — CRITICAL:
- "source": "asset" for ANY image that shows the Lunia product, the supplement bottle, the label, or the Lunia logo. These are NOT generated — they come from an uploaded asset library. Give an "assetTypeHint" of "product-image" (bottle/product shots) or "logo".
- "source": "generated" for pure lifestyle / atmosphere images (a calm bedroom, soft morning light, someone resting). For these write a detailed photorealistic "prompt". The prompt MUST NOT contain any text, words, signage, logos, bottles, or product packaging — only an editorial wellness lifestyle scene. Describe scene, light, mood, palette (warm, calm, dim, natural).
- The hero is almost always "asset" (it carries the product). Provide 2 to 4 secondary images, a mix of asset and generated.

Return ONLY valid JSON, no markdown, matching this exact schema:

{
  "subjectLines": ["string", "string", "string"],
  "previewText": "string — preheader, extends the subject",
  "promoBand": "string — short uppercase-style promo line e.g. 'MEMORIAL DAY WEEKEND SALE'; empty string if this is not a promotional email",
  "blocks": [
    { "body": "string — intro text block, left-aligned", "align": "left", "italic": false },
    { "body": "string — closing text block, centered", "align": "center", "italic": false },
    { "body": "string — short italic urgency line", "align": "left", "italic": true }
  ],
  "cta": "string — CTA button label, e.g. 'Start Sleeping Better'",
  "images": [
    { "role": "hero", "source": "asset", "assetTypeHint": "product-image" },
    { "role": "secondary", "source": "asset", "assetTypeHint": "product-image" },
    { "role": "secondary", "source": "generated", "prompt": "..." }
  ]
}

Provide exactly 3 subjectLines, 2–3 blocks, and 3–5 images total (1 hero + 2–4 secondary).`;

    const response = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const jsonText = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: RawCampaign;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("[api/campaign/generate] JSON parse failed:", raw.slice(0, 400));
      return Response.json({ error: "Generation failed — please try again." }, { status: 422 });
    }

    if (!parsed.images?.length || !parsed.blocks?.length || !parsed.subjectLines?.length) {
      return Response.json({ error: "Incomplete campaign — please try again." }, { status: 422 });
    }

    // Resolve AI-suggested assets for "asset" slots.
    const assets = await getAssets();
    function suggestAsset(hint?: string): { assetId?: string; url?: string } {
      const wanted: AssetType = hint === "logo" ? "logo" : "product-image";
      const match =
        assets.find((a) => a.assetType === wanted) ??
        assets.find((a) => a.assetType === "product-image" || a.assetType === "logo");
      return match ? { assetId: match.id, url: match.url } : {};
    }

    const images: CampaignImageSlot[] = parsed.images.slice(0, 5).map((img) => {
      const role: "hero" | "secondary" = img.role === "hero" ? "hero" : "secondary";
      const aspect: "4:5" | "1:1" = role === "hero" ? "4:5" : "1:1";
      if (img.source === "asset") {
        const { assetId, url } = suggestAsset(img.assetTypeHint);
        return { id: randomUUID(), role, source: "asset", aspect, assetId, url: url ?? null };
      }
      const genPrompt = img.prompt?.trim()
        ? img.prompt
        : "A calm, photoreal wellness lifestyle scene — soft natural light, warm neutral tones, a quiet restful mood.";
      return { id: randomUUID(), role, source: "generated", aspect, prompt: genPrompt, mood: "lifestyle-health", url: null };
    });
    // Guarantee exactly one hero.
    if (!images.some((i) => i.role === "hero") && images[0]) images[0].role = "hero";

    const content: CampaignContent = {
      subjectLines: parsed.subjectLines.slice(0, 3),
      selectedSubject: 0,
      previewText: parsed.previewText ?? "",
      promoBand: parsed.promoBand?.trim() || undefined,
      blocks: parsed.blocks.map((b) => ({
        id: randomUUID(),
        body: b.body ?? "",
        align: b.align === "center" ? "center" : "left",
        italic: !!b.italic,
      })),
      cta: { label: parsed.cta ?? "Shop now", url: ctaUrl },
      images,
    };

    return Response.json({ topic, content });
  } catch (err) {
    console.error("[api/campaign/generate]", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
