import { checkRateLimit, getAssets } from "@/lib/kv";
import { generateCampaignSlotImage } from "@/lib/campaign-image";
import { CAMPAIGN_IMAGE_MOOD_TRIO } from "@/lib/brand-tokens";
import type { CampaignContent, CampaignImageSlot } from "@/lib/types";
import { randomUUID } from "crypto";

import { stripDashes } from "@/lib/strip-dashes";
import { runLayoutPass } from "@/lib/campaign-layout-pass";
import { buildGeneratePrompt, blocksToSourceText } from "@/lib/campaign-layout-prompts";
import { sampleBlock } from "@/lib/campaign-block-samples";
// The layout pass (one thinking call, plus a fast fix when the design review
// blocks) and then the pictures, generated in parallel.
export const maxDuration = 300;


/** The fields of the generate answer that are not the layout itself. */
type RawCampaign = {
  subjectLines?: string[];
  previewText?: string;
  promoBand?: string;
  ctaLabel?: string;
  heroPrompt?: string;
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
        showLogo: false,
        promoBand: undefined,
        // The same mix of kinds a real generation now produces, from the
        // block samples, so a dry run exercises the layouts people will see.
        blocks: [
          sampleBlock("lead", randomUUID()),
          sampleBlock("imagetext", randomUUID(), sec1.url),
          sampleBlock("steps", randomUUID()),
          sampleBlock("pullquote", randomUUID()),
          sampleBlock("product", randomUUID(), sec2.url),
          sampleBlock("badges", randomUUID()),
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

    // The claims ledger is gone (2026-09-22, with the subject library). Email
    // copy is written from the brief, the voice spec and the verified product
    // facts; a number with nothing behind it does not go in.
    //
    // The layout is no longer fixed. It used to be "intro paragraph, a 2-up
    // picture row, two closing paragraphs", which is three blocks of text in a
    // row on every email. Now the model writes a designed layout from the same
    // block vocabulary "Make it visual" uses, and the same design review runs
    // on it (campaign-layout-pass) before it is returned.
    const prompt = buildGeneratePrompt({ topic, occasion, offer, tone });

    const pass = await runLayoutPass({
      prompt,
      sourceText: (draft) => `Brief: ${topic}${occasion ? `\nOccasion: ${occasion}` : ""}${offer ? `\nOffer: ${offer}` : ""}\n\n${blocksToSourceText(draft)}`,
    });
    if (!pass.ok) {
      return Response.json({ error: "Generation failed, please try again." }, { status: 422 });
    }
    const parsed = (pass.firstJson ?? {}) as RawCampaign;
    const subjectLines = Array.isArray(parsed.subjectLines) ? parsed.subjectLines.filter((x) => typeof x === "string" && x.trim()) : [];
    if (subjectLines.length === 0) {
      return Response.json({ error: "Incomplete campaign, please try again." }, { status: 422 });
    }

    // The logo is email chrome (the header strip), never body content. Only
    // product-image assets are eligible for a picture, and there is no
    // fallback to the logo pool.
    const assets = await getAssets();
    const logoAsset = assets.find((a) => a.assetType === "logo");
    const productPool = assets.filter((a) => a.assetType === "product-image");

    const blocks = pass.blocks;
    // A product card shows the real product, never a generated bottle.
    for (const b of blocks) {
      if (b.kind === "product" && !b.imageUrl && productPool.length) {
        b.imageUrl = productPool[Math.floor(Math.random() * productPool.length)]!.url;
      }
    }

    const opensWithHeader = blocks[0]?.kind === "headerimage";
    const heroSlot: CampaignImageSlot | null = opensWithHeader ? null : {
      id: randomUUID(),
      role: "hero",
      source: "generated",
      aspect: "4:5",
      prompt: parsed.heroPrompt?.trim() || `A calm, photoreal scene that expresses: "${topic.slice(0, 200)}". Soft natural light, a quiet restful mood.`,
      mood: CAMPAIGN_IMAGE_MOOD_TRIO[0],
      url: null,
    };

    // Auto-generate the pictures in parallel at creation time: the hero (when
    // there is one) and every picture block that has a prompt and no picture.
    // A failed one keeps no url; the block's own Generate button is the manual
    // fallback, so one flaky generation never fails the campaign.
    if (process.env.FAL_KEY) {
      type Job = { prompt: string; aspect: "4:5" | "1:1"; role: "hero" | "secondary"; set: (url: string) => void };
      const jobs: Job[] = [];
      if (heroSlot) jobs.push({ prompt: heroSlot.prompt!, aspect: "4:5", role: "hero", set: (u) => { heroSlot.url = u; } });
      for (const b of blocks) {
        if (b.kind === "product") continue;
        if (b.imagePrompt && !b.imageUrl) {
          jobs.push({ prompt: b.imagePrompt, aspect: b.kind === "headerimage" ? "4:5" : "1:1", role: b.kind === "headerimage" ? "hero" : "secondary", set: (u) => { b.imageUrl = u; } });
        }
        b.gridCells?.forEach((c) => {
          if (c.imagePrompt && !c.imageUrl) jobs.push({ prompt: c.imagePrompt, aspect: "1:1", role: "secondary", set: (u) => { c.imageUrl = u; } });
        });
      }
      await Promise.allSettled(
        jobs.slice(0, 6).map(async (job, i) => {
          try {
            job.set(await generateCampaignSlotImage({
              prompt: job.prompt,
              aspect: job.aspect,
              mood: CAMPAIGN_IMAGE_MOOD_TRIO[i % CAMPAIGN_IMAGE_MOOD_TRIO.length],
              topic,
              role: job.role,
            }));
          } catch (err) {
            console.warn(`[api/campaign/generate] auto-image (${job.role}) failed:`, err);
          }
        }),
      );
    }

    const content: CampaignContent = {
      subjectLines: [...subjectLines, "", "", ""].slice(0, 3).map(stripDashes),
      selectedSubject: 0,
      previewText: stripDashes(parsed.previewText ?? ""),
      logoUrl: logoAsset?.url ?? null,
      showLogo: false,
      promoBand: parsed.promoBand?.trim() ? stripDashes(parsed.promoBand) : undefined,
      blocks,
      cta: { label: stripDashes(pass.meta.ctaLabel ?? parsed.ctaLabel ?? "Shop now"), url: ctaUrl },
      images: heroSlot ? [heroSlot] : [],
    };

    return Response.json({ topic, content, review: pass.review });
  } catch (err) {
    console.error("[api/campaign/generate]", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
