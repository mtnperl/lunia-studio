import { createContentMessage, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_LONG } from "@/lib/anthropic";
import { checkRateLimit, getAssets } from "@/lib/kv";
import { generateCampaignSlotImage } from "@/lib/campaign-image";
import { CAMPAIGN_IMAGE_MOOD_TRIO } from "@/lib/brand-tokens";
import type { CampaignContent, CampaignImageSlot, AssetType } from "@/lib/types";
import { randomUUID } from "crypto";

// Long enough for the LLM pass + three parallel gpt-image-2 generations.
export const maxDuration = 240;

const LUNIA_VOICE_SPEC = `Lunia Life brand voice: Aspirational, minimal, wellness-science grounded. Tone: calm confidence. No hype. No FOMO manipulation. Language: clear, direct, sophisticated. Target reader: health-conscious adult, 28-45, optimizing their sleep. Write like a trusted expert friend, not a marketer. Lunia Life sells a sleep supplement (magnesium glycinate, L-theanine, apigenin. Transparent dosing. Melatonin-free).

HARD BRAND RULE — NEVER use em dashes (—) or en dashes (–) ANYWHERE in any field you return. Use commas, periods, semicolons, parentheses, or short sentences instead. Em dashes are a hard no in Lunia copy. This rule overrides any stylistic instinct you have and applies to every string in the JSON output.`;

type RawImage = {
  role: "hero" | "secondary";
  source: "generated" | "asset";
  prompt?: string;
  /** 0-based index of the text block this image illustrates. */
  blockIndex?: number;
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
    const test: boolean = body.test === true;

    if (topic.length < 4) {
      return Response.json({ error: "Describe the campaign in a few words." }, { status: 400 });
    }

    // ── Test mode ──────────────────────────────────────────────────────────
    // Skip the LLM call AND skip image generation. Returns a canned campaign
    // wired to existing asset-library images, so you can dogfood layout
    // changes (top banner, logo, hero overlay, etc.) without burning tokens
    // or waiting on image generation. Hero + every secondary use "asset"
    // source so the editor never tries to render through gpt-image-2.
    if (test) {
      const assets = await getAssets();
      const logoAsset = assets.find((a) => a.assetType === "logo");
      const productPool = assets.filter((a) => a.assetType === "product-image");
      if (productPool.length === 0) {
        return Response.json({ error: "Test mode needs at least one product-image asset in the library." }, { status: 400 });
      }
      const pickAsset = (i: number) => productPool[i % productPool.length]!;
      const heroAsset = pickAsset(0);
      const sec1 = pickAsset(1);
      const sec2 = pickAsset(2);
      const sec3 = pickAsset(3);
      const testContent: CampaignContent = {
        subjectLines: [
          `Test: ${topic.slice(0, 60)}`,
          "Test subject line — alternate phrasing",
          "Test subject line — third option",
        ],
        selectedSubject: 0,
        previewText: "Test preview text. Layout dry run, no LLM calls.",
        logoUrl: logoAsset?.url ?? null,
        promoBand: undefined,
        blocks: [
          {
            id: randomUUID(),
            body: "This is a test campaign rendered without any AI calls. Every line of copy here is fixed sample text, and every image is pulled straight from the asset library. Use this mode to dogfood layout changes, font choices, spacing, and the top banner / logo / hero overlay without spending tokens.",
            align: "left",
            italic: false,
          },
          {
            id: randomUUID(),
            body: "A calmer nervous system is the foundation. Everything else, the deeper sleep, the steadier mornings, the clearer days, follows from there.",
            align: "center",
            italic: false,
          },
          {
            id: randomUUID(),
            body: "Test italic urgency line.",
            align: "left",
            italic: true,
          },
        ],
        cta: { label: "Test CTA", url: ctaUrl },
        images: [
          { id: randomUUID(), role: "hero", source: "asset", aspect: "4:5", assetId: heroAsset.id, url: heroAsset.url },
          { id: randomUUID(), role: "secondary", source: "asset", aspect: "1:1", assetId: sec1.id, url: sec1.url },
          { id: randomUUID(), role: "secondary", source: "asset", aspect: "1:1", assetId: sec2.id, url: sec2.url },
          { id: randomUUID(), role: "secondary", source: "asset", aspect: "1:1", assetId: sec3.id, url: sec3.url },
        ],
      };
      return Response.json({ topic, content: testContent });
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
- Provide EXACTLY three "source": "generated" images: one hero + two secondary. Each one must be tied to a specific text block of the email: set "blockIndex" to the index (0-based) of the block it illustrates, and write a detailed photorealistic "prompt" that visually expresses THAT block's specific message (not a generic wellness scene). The prompt MUST NOT contain any text, words, signage, logos, bottles, or product packaging — only an editorial wellness lifestyle scene. Describe scene, light, mood, palette.
- The hero is always the first generated image and illustrates the campaign's core angle (blockIndex 0).
- The three generated prompts must describe three clearly DIFFERENT scenes (different setting, subject, and time of day) — they will also be rendered in three different photographic styles downstream.
- Optionally add ONE extra "source": "asset" secondary showing the Lunia product. Assets are NOT generated — they come from an uploaded library. Give "assetTypeHint": "product-image" (bottle/product shots) or "logo". Include it only when a bottle shot genuinely strengthens this campaign.

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
    { "role": "hero", "source": "generated", "blockIndex": 0, "prompt": "..." },
    { "role": "secondary", "source": "generated", "blockIndex": 1, "prompt": "..." },
    { "role": "secondary", "source": "generated", "blockIndex": 2, "prompt": "..." },
    { "role": "secondary", "source": "asset", "assetTypeHint": "product-image" }
  ]
}

Provide exactly 3 subjectLines, 2–3 blocks, exactly 3 generated images (1 hero + 2 secondary), and at most 1 asset image.`;

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
      return Response.json({ error: "Generation failed, please try again." }, { status: 422 });
    }

    if (!parsed.images?.length || !parsed.blocks?.length || !parsed.subjectLines?.length) {
      return Response.json({ error: "Incomplete campaign, please try again." }, { status: 422 });
    }

    // Resolve AI-suggested assets for "asset" slots. Rotate through the pool
    // so every asset-source image gets a DIFFERENT asset where possible;
    // we only repeat when the pool runs out. Previously this just grabbed
    // the first matching asset every time → hero + secondaries collapsed to
    // the same bottle shot.
    const assets = await getAssets();
    const logoAsset = assets.find((a) => a.assetType === "logo");
    const productPool = assets.filter((a) => a.assetType === "product-image");
    const logoPool = assets.filter((a) => a.assetType === "logo");
    const fallbackPool = productPool.length > 0 ? productPool : logoPool;
    const usedAssetIds = new Set<string>();
    function suggestAsset(hint?: string): { assetId?: string; url?: string } {
      const wanted: AssetType = hint === "logo" ? "logo" : "product-image";
      const primary = wanted === "logo" ? logoPool : productPool;
      const pool = primary.length > 0 ? primary : fallbackPool;
      if (pool.length === 0) return {};
      const unused = pool.find((a) => !usedAssetIds.has(a.id));
      const pick = unused ?? pool[usedAssetIds.size % pool.length];
      if (!pick) return {};
      usedAssetIds.add(pick.id);
      return { assetId: pick.id, url: pick.url };
    }

    // ── The three-image contract ───────────────────────────────────────────
    // Every campaign ships exactly 3 generated images (1 hero + 2 secondary),
    // each tied to a text block and assigned a DISTINCT visual mood from the
    // brand-safe trio, so no two images in one email read as the same style.
    // At most one extra asset (bottle) secondary is kept from the LLM output.
    const rawGenerated = parsed.images.filter((i) => i.source === "generated");
    const rawAsset = parsed.images.filter((i) => i.source === "asset").slice(0, 1);

    const fallbackPromptFor = (blockIndex: number): string => {
      const block = parsed.blocks[blockIndex]?.body ?? parsed.blocks[0]?.body ?? topic;
      return `A calm, photoreal wellness lifestyle scene that visually expresses: "${block.slice(0, 200)}". Soft natural light, warm neutral tones, a quiet restful mood.`;
    };

    // Normalize to exactly 3 generated slots, synthesizing block-tied prompts
    // for any the model failed to supply.
    const generatedSlots: CampaignImageSlot[] = [0, 1, 2].map((i) => {
      const raw = rawGenerated[i];
      const role: "hero" | "secondary" = i === 0 ? "hero" : "secondary";
      const aspect: "4:5" | "1:1" = role === "hero" ? "4:5" : "1:1";
      const blockIndex = typeof raw?.blockIndex === "number" ? raw.blockIndex : Math.min(i, parsed.blocks.length - 1);
      return {
        id: randomUUID(),
        role,
        source: "generated",
        aspect,
        prompt: raw?.prompt?.trim() || fallbackPromptFor(blockIndex),
        mood: CAMPAIGN_IMAGE_MOOD_TRIO[i],
        url: null,
      };
    });

    const assetSlots: CampaignImageSlot[] = rawAsset.map((img) => {
      const { assetId, url } = suggestAsset(img.assetTypeHint);
      return { id: randomUUID(), role: "secondary", source: "asset", aspect: "1:1", assetId, url: url ?? null };
    });

    // Auto-generate the three images in parallel at creation time. A failed
    // slot keeps url: null — the editor's per-slot Generate button remains the
    // manual fallback, so one flaky generation never fails the campaign.
    if (process.env.FAL_KEY) {
      await Promise.allSettled(
        generatedSlots.map(async (slot) => {
          try {
            slot.url = await generateCampaignSlotImage({
              prompt: slot.prompt!,
              aspect: slot.aspect,
              mood: slot.mood,
              topic,
              role: slot.role,
            });
          } catch (err) {
            console.warn(`[api/campaign/generate] auto-image (${slot.role}) failed:`, err);
          }
        }),
      );
    }

    const images: CampaignImageSlot[] = [...generatedSlots, ...assetSlots];

    // Defensive em / en dash scrubber — replaces any em-dash with a comma
    // and any en-dash with a hyphen. Belt-and-braces in case the model
    // ignored the HARD BRAND RULE in the prompt. Used on every string
    // field that gets surfaced to the user.
    function stripDashes(s: string): string {
      return s
        .replace(/\s*—\s*/g, ", ")  // em dash → comma + space
        .replace(/\s*–\s*/g, "-")   // en dash → hyphen
        .replace(/\s{2,}/g, " ")    // collapse double spaces left behind
        .trim();
    }

    const content: CampaignContent = {
      subjectLines: parsed.subjectLines.slice(0, 3).map(stripDashes),
      selectedSubject: 0,
      previewText: stripDashes(parsed.previewText ?? ""),
      logoUrl: logoAsset?.url ?? null,
      promoBand: parsed.promoBand?.trim() ? stripDashes(parsed.promoBand) : undefined,
      blocks: parsed.blocks.map((b) => ({
        id: randomUUID(),
        body: stripDashes(b.body ?? ""),
        align: b.align === "center" ? "center" : "left",
        italic: !!b.italic,
      })),
      cta: { label: stripDashes(parsed.cta ?? "Shop now"), url: ctaUrl },
      images,
    };

    return Response.json({ topic, content });
  } catch (err) {
    console.error("[api/campaign/generate]", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
