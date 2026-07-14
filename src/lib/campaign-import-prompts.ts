// Klaviyo-flow → CampaignContent import helpers.
//
// The importer is deliberately split in two:
//   1. DETERMINISTIC extraction (this file's regex helpers) pulls the exact
//      image URLs and link hrefs out of the flow message's HTML. URLs are
//      never round-tripped through the LLM — a hallucinated image/link URL
//      would silently break the email, so the model only ever references
//      these by *index*.
//   2. A CONSTRAINED LLM pass (buildKlaviyoImportPrompt) segments the visible
//      text VERBATIM into blocks, drops footer/legal boilerplate, and assigns
//      which extracted image is the hero and which link is the CTA.
//
// Nothing here rewrites copy — the "Improve with Claude" action in the editor
// is the only place that touches wording, and only on explicit user request.

/** A content image extracted from flow HTML, in document order. */
export type ExtractedImage = { url: string; width?: number; height?: number; alt?: string };

const IMG_TAG_RE = /<img\b[^>]*>/gi;
const ANCHOR_RE = /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
const ATTR_RE = (name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(ATTR_RE(name));
  if (!m) return undefined;
  return m[2] ?? m[3] ?? m[4];
}

function toInt(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v.replace(/px$/i, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

// Substrings that mark an image as chrome rather than content: tracking
// pixels, spacers, social icons, and brand logos (we render our own logo strip).
const IMAGE_NOISE = /spacer|pixel|\/open\b|\/o\.gif|1x1|blank\.gif|transparent|logo|facebook|instagram|twitter|tiktok|youtube|pinterest|linkedin|social|app-?store|google-?play|badge|icon/i;

/**
 * Pull real content images from flow HTML, in document order, filtering out
 * tracking pixels, spacers, social icons, data-URIs, and logos.
 */
export function extractImages(html: string): ExtractedImage[] {
  const out: ExtractedImage[] = [];
  const seen = new Set<string>();
  const tags = html.match(IMG_TAG_RE) ?? [];
  for (const tag of tags) {
    const src = attr(tag, "src");
    if (!src || /^data:/i.test(src) || !/^https?:\/\//i.test(src)) continue;
    const width = toInt(attr(tag, "width"));
    const height = toInt(attr(tag, "height"));
    const alt = attr(tag, "alt");
    // Drop obvious spacers / tracking pixels by declared size.
    if ((width !== undefined && width <= 4) || (height !== undefined && height <= 4)) continue;
    if (IMAGE_NOISE.test(src) || (alt && IMAGE_NOISE.test(alt))) continue;
    if (seen.has(src)) continue;
    seen.add(src);
    out.push({ url: src, width, height, alt });
  }
  return out;
}

// Link destinations that are boilerplate rather than a real CTA.
const HREF_NOISE = /unsubscribe|manage.?preferences|email.?preferences|view.?in.?browser|update.?profile|privacy|terms|facebook\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|pinterest\.|linkedin\.com/i;

/**
 * Pull candidate CTA link destinations from flow HTML, in document order.
 * Klaviyo wraps real links in tracking redirects — those are kept (they resolve
 * to the destination); only mailto/tel/anchors and footer boilerplate are dropped.
 */
export function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  ANCHOR_RE.lastIndex = 0;
  while ((m = ANCHOR_RE.exec(html)) !== null) {
    const href = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (!href || !/^https?:\/\//i.test(href)) continue; // skip mailto:/tel:/#/relative
    if (HREF_NOISE.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push(href);
  }
  return out;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "-", ndash: "-", hellip: "...", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", copy: "©", reg: "®", trade: "™",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? whole;
  });
}

/**
 * Convert flow HTML to plain, VERBATIM visible text. Drops head/style/script,
 * turns block boundaries + <br> into newlines, strips remaining tags, decodes
 * entities, and collapses runaway whitespace. Copy is never reworded.
 */
export function htmlToText(html: string): string {
  let s = html;
  // Remove non-visible regions entirely.
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(head|style|script|title|noscript)\b[\s\S]*?<\/\1>/gi, "");
  // Block-level boundaries → newline.
  s = s.replace(/<\/(p|div|tr|table|h[1-6]|li|ul|ol|section|header|footer|td)\s*>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // Drop all remaining tags.
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  // Normalize whitespace: trim each line, drop empties, cap blank runs.
  s = s
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s;
}

/**
 * Build the constrained extraction prompt. The model may ONLY group verbatim
 * text and assign slots by index — it must not reword, and it must not emit any
 * URL (the server maps the indexes back to the real extracted URLs).
 */
export function buildKlaviyoImportPrompt(input: {
  flowName: string;
  subject: string;
  previewText: string;
  text: string;
  images: ExtractedImage[];
  hrefs: string[];
}): string {
  const { flowName, subject, previewText, text, images, hrefs } = input;

  const imageList = images.length
    ? images.map((im, i) => `  [${i}] ${im.alt ? `alt="${im.alt}" ` : ""}${im.width ?? "?"}x${im.height ?? "?"}`).join("\n")
    : "  (none)";
  const hrefList = hrefs.length
    ? hrefs.map((h, i) => `  [${i}] ${h.length > 100 ? h.slice(0, 100) + "…" : h}`).join("\n")
    : "  (none)";

  return `You are restructuring an existing marketing email so it can drop into a fixed Lunia Life template. You are NOT a copywriter here: you must reuse the sender's words EXACTLY.

Flow: "${flowName}"
Subject (already captured, do not repeat in blocks): "${subject}"
Preview text (already captured): "${previewText}"

EXTRACTED IMAGES (referenced by index only — you never write URLs):
${imageList}

EXTRACTED LINKS (referenced by index only):
${hrefList}

VISIBLE EMAIL TEXT (verbatim — this is the ONLY source of body copy):
"""
${text.slice(0, 6000)}
"""

Your job:
1. Split the visible text into 1–4 ordered body blocks. Copy each block's text CHARACTER-FOR-CHARACTER from the source above. Do NOT paraphrase, shorten, expand, fix grammar, or add words.
2. DROP boilerplate that does not belong in the body: unsubscribe/manage-preferences lines, physical mailing address, legal/copyright footer, "view in browser", social handles, and any text that merely repeats the subject line.
3. If a short all-caps promotional banner (e.g. "20% OFF THIS WEEKEND") is literally present, put that exact text in "promoBand"; otherwise "".
4. Choose which extracted image is the hero (largest / most prominent lifestyle image, usually first). Put its index in "heroImageIndex" (-1 if there are no images). Put the remaining content image indexes, in order, in "secondaryImageIndexes" (max 4).
5. Choose the primary call-to-action link. Put its index in "ctaHrefIndex" (-1 if none). Set "ctaLabel" to the exact anchor text of that button if it appears in the visible text (e.g. "Shop now"), else "".

HARD RULES:
- Never invent or alter any URL. Reference images and links only by their index.
- Never reword body copy. If you are unsure whether something is boilerplate, keep it verbatim in a block.
- Do not use em dashes or en dashes only if you must insert connective text (you should not need to).

Return ONLY minified JSON, no markdown, of exactly this shape:
{"blocks":[{"body":"...","align":"left","italic":false}],"heroImageIndex":0,"secondaryImageIndexes":[1],"ctaLabel":"","ctaHrefIndex":0,"promoBand":"","topBanner":""}`;
}
