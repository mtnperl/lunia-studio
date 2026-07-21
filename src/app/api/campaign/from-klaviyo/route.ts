// Import a Klaviyo flow into the Campaign builder: each flow email's HTML is
// converted VERBATIM into a branded CampaignContent (the same shape the
// campaign builder renders + saves). Nothing here rewrites copy — image URLs
// and links are extracted deterministically; an LLM only segments the visible
// text and assigns hero/CTA slots by index. See src/lib/campaign-import-prompts.ts.
import { randomUUID } from "crypto";
import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_MAX_TOKENS_LONG,
  CONTENT_THINKING,
} from "@/lib/anthropic";
import { checkRateLimit, getAssets } from "@/lib/kv";
import { mirrorImageToBlob, isSafeToFetch } from "@/lib/blob-mirror";
import {
  buildKlaviyoImportPrompt,
  extractImages,
  extractHrefs,
  htmlToText,
  type ExtractedImage,
} from "@/lib/campaign-import-prompts";
import type {
  CampaignBlock,
  CampaignContent,
  CampaignImageSlot,
  EmailFlow,
  EmailFlowAsset,
} from "@/lib/types";

export const maxDuration = 300;

type LlmStructure = {
  blocks?: { body?: string; align?: "left" | "center"; italic?: boolean }[];
  heroImageIndex?: number;
  secondaryImageIndexes?: number[];
  ctaLabel?: string;
  ctaHrefIndex?: number;
  promoBand?: string;
  topBanner?: string;
};

/** Replace em/en dashes with plain punctuation so imported copy stays on-brand. */
function stripDashes(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, "-");
}

function safeParseJson(raw: string): LlmStructure | null {
  const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(s) as LlmStructure; } catch { /* try harder */ }
  const start = s.indexOf("{");
  if (start !== -1) {
    let depth = 0, inString = false, escape = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { try { return JSON.parse(s.slice(start, i + 1)) as LlmStructure; } catch { break; } } }
    }
  }
  return null;
}

/** Klaviyo wraps real CTA links in its own click-tracking redirect. That
 *  redirect belongs to the ORIGINAL flow/message, not the new campaign being
 *  built here — reusing it verbatim misattributes clicks and can break if
 *  the original flow is later archived. Resolve it to the real destination
 *  once at import time. Best-effort: any failure (timeout, non-redirecting
 *  host, blocked target) just keeps the original tracking URL — this must
 *  never fail the import. */
async function resolveRedirectUrl(url: string): Promise<string> {
  if (!isSafeToFetch(url)) return url;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    clearTimeout(t);
    return res.url || url;
  } catch {
    return url;
  }
}

const newId = () => randomUUID();

function imageSlot(role: "hero" | "secondary", url: string): CampaignImageSlot {
  return {
    id: newId(),
    role,
    source: "asset",
    aspect: role === "hero" ? "4:5" : "1:1",
    url,
  };
}

/** Deterministic fallback assembly when the LLM is unavailable or unparseable. */
function fallbackStructure(text: string, images: ExtractedImage[], hrefs: string[]): LlmStructure {
  return {
    blocks: text ? [{ body: text, align: "left", italic: false }] : [],
    heroImageIndex: images.length ? 0 : -1,
    secondaryImageIndexes: images.slice(1, 5).map((_, i) => i + 1),
    ctaLabel: "",
    ctaHrefIndex: hrefs.length ? 0 : -1,
    promoBand: "",
    topBanner: "",
  };
}

/** Convert one flow email → CampaignContent. Never throws — degrades to a shell. */
async function convertEmail(
  email: EmailFlowAsset,
  flowName: string,
  logoUrl: string | null,
): Promise<{ content: CampaignContent; flagged: boolean; usedFallback: boolean }> {
  const rawHtml = email.html ?? "";
  const images = rawHtml ? extractImages(rawHtml) : [];
  const hrefs = rawHtml ? extractHrefs(rawHtml) : [];
  // Prefer the template's code-HTML text; fall back to bodyText (drag-drop
  // templates sometimes omit code HTML). Flag when we have neither.
  const text = rawHtml ? htmlToText(rawHtml) : (email.bodyText?.trim() ?? "");
  const flagged = !text && images.length === 0;

  let structure: LlmStructure | null = null;
  if (text) {
    try {
      const msg = await createContentMessage({
        model: CONTENT_MODEL,
        max_tokens: CONTENT_MAX_TOKENS_LONG,
        thinking: CONTENT_THINKING,
        messages: [{
          role: "user",
          content: buildKlaviyoImportPrompt({
            flowName,
            subject: email.subject,
            previewText: email.previewText,
            text,
            images,
            hrefs,
          }),
        }],
      });
      structure = safeParseJson(extractText(msg));
    } catch (err) {
      console.warn(`[campaign/from-klaviyo] LLM structuring failed for email ${email.id}:`, err instanceof Error ? err.message : err);
    }
  }
  // True whenever the deterministic fallback was used instead of a successful
  // LLM structuring pass (no text, LLM error, or unparseable response) — the
  // caller surfaces this so a degraded import isn't mistaken for a clean one.
  const usedFallback = !structure;
  if (!structure) structure = fallbackStructure(text, images, hrefs);

  // ── Map indexes → real extracted URLs (URLs never come from the LLM) ──
  const heroIdx = structure.heroImageIndex ?? (images.length ? 0 : -1);
  const secondaryIdxs = Array.isArray(structure.secondaryImageIndexes) ? structure.secondaryImageIndexes : [];
  const usedIdxs = new Set<number>();
  const slots: CampaignImageSlot[] = [];
  if (heroIdx >= 0 && heroIdx < images.length) {
    slots.push(imageSlot("hero", images[heroIdx].url));
    usedIdxs.add(heroIdx);
  }
  for (const idx of secondaryIdxs) {
    if (idx >= 0 && idx < images.length && !usedIdxs.has(idx) && slots.length < 5) {
      slots.push(imageSlot("secondary", images[idx].url));
      usedIdxs.add(idx);
    }
  }
  // Include any content images the model didn't place, so nothing is silently lost.
  // heroIdx === -1 with images present means the model explicitly chose "no
  // hero" — respect that instead of promoting the first leftover image to hero.
  const heroDeclined = heroIdx === -1 && images.length > 0;
  images.forEach((im, idx) => {
    if (!usedIdxs.has(idx) && slots.length < 5) {
      const role = !heroDeclined && !slots.some((s) => s.role === "hero") ? "hero" : "secondary";
      slots.push(imageSlot(role, im.url));
      usedIdxs.add(idx);
    }
  });

  const ctaHrefIdx = structure.ctaHrefIndex ?? (hrefs.length ? 0 : -1);
  const rawCtaUrl = ctaHrefIdx >= 0 && ctaHrefIdx < hrefs.length ? hrefs[ctaHrefIdx] : "#";
  const ctaLabel = stripDashes((structure.ctaLabel ?? "").trim());

  // Best-effort mirror to Blob (image CDN churn) + resolve the CTA's Klaviyo
  // tracking redirect to its real destination — independent network calls,
  // run together so the per-email latency doesn't stack.
  const [mirroredSlots, ctaUrl] = await Promise.all([
    Promise.all(
      slots.map(async (slot) => {
        const mirrored = await mirrorImageToBlob(slot.url, `import-${email.id}-${slot.id}`, "campaign-images");
        return { ...slot, url: mirrored ?? slot.url };
      }),
    ),
    rawCtaUrl === "#" ? Promise.resolve(rawCtaUrl) : resolveRedirectUrl(rawCtaUrl),
  ]);

  const blocks: CampaignBlock[] = (structure.blocks ?? [])
    .map((b) => (b.body ?? "").trim())
    .filter(Boolean)
    .map((body) => ({ id: newId(), body: stripDashes(body), align: "left" as const }));

  const content: CampaignContent = {
    subjectLines: [email.subject || "(no subject)"],
    selectedSubject: 0,
    previewText: email.previewText ?? "",
    topBanner: structure.topBanner?.trim() || undefined,
    logoUrl,
    showLogo: true,
    promoBand: structure.promoBand?.trim() || undefined,
    blocks,
    cta: { label: ctaLabel, url: ctaUrl },
    images: mirroredSlots,
  };
  return { content, flagged, usedFallback };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "klaviyo");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const flow = body.flow as EmailFlow | undefined;
    if (!flow || !Array.isArray(flow.emails) || flow.emails.length === 0) {
      return Response.json({ error: "missing or empty flow" }, { status: 400 });
    }

    const assets = await getAssets();
    const logoUrl = assets.find((a) => a.assetType === "logo")?.url ?? null;

    const t0 = Date.now();
    const results = await Promise.all(
      [...flow.emails]
        .sort((a, b) => a.position - b.position)
        .map(async (email) => {
          const { content, flagged, usedFallback } = await convertEmail(email, flow.flowName, logoUrl);
          return {
            emailId: email.id,
            position: email.position,
            subject: email.subject,
            content,
            flagged,
            usedFallback,
          };
        }),
    );

    console.log(`[campaign/from-klaviyo] flow="${flow.flowName}" emails=${results.length} elapsed=${Date.now() - t0}ms`);
    return Response.json({ flowName: flow.flowName, emails: results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[campaign/from-klaviyo]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
