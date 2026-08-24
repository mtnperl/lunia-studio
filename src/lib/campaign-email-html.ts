// Renders a campaign email to standalone, email-client-safe HTML.
// Matches the Lunia template: a 600px shell, Inter type, rounded text blocks,
// a 2-up secondary image row, and a CTA button. Two themes: navy (the default,
// and what every campaign saved before themes existed renders as) and cream,
// the handbook's Soft Ivory treatment. Colours come from the theme's ROLES,
// never from literals — see campaign-theme.ts for why a hex map is not
// sufficient here. All copy is real
// HTML text so it stays crisp at any zoom — never baked into images.
// Images can also be placed inline as kind:"image" blocks (column / bleed /
// split), which is how an image escapes the half-width 2-up grid.
// Mobile-responsive: media queries stack the 2-up image rows and tighten
// paddings / font sizes on narrow viewports.
import type {
  CampaignBlock, CampaignContent, CampaignImageSlot, InnerBlockKind, CampaignHeadingSize,
} from "./types";
import { resolveTheme, resolveCta, resolveBrandColor, type CampaignTheme } from "./campaign-theme";
import { parseMods, isEmptyMods, modsToCss } from "./campaign-inline-style";
import { clampHeroCta } from "./campaign-editor-state";


function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Multiplier applied to a block header's default px. "m" is exactly 1, and
 *  `headingPx` rounds, so an unset headingSize reproduces the original literal
 *  byte-for-byte — that is what keeps every already-saved campaign unchanged. */
const HEADING_SCALES: Record<CampaignHeadingSize, number> = { s: 0.8, m: 1, l: 1.25, xl: 1.55 };

/** A block header's size in px, after the block's own headingSize. Whole
 *  pixels only, per DESIGN.md's type-scale rule. */
function headingPx(b: CampaignBlock, basePx: number): number {
  return Math.round(basePx * (HEADING_SCALES[b.headingSize ?? "m"] ?? 1));
}

/** Extra class for headers that a mobile media query re-sizes with
 *  `!important`. A stylesheet `!important` beats a plain inline size, so those
 *  headers need a per-size class rather than just a scaled inline value.
 *
 *  Returns "" for the default so a campaign that never touched the control
 *  emits exactly the markup it always did. */
function headingSizeClass(b: CampaignBlock): string {
  const size = b.headingSize;
  return !size || size === "m" ? "" : ` hs-${size}`;
}

/** The same thing as a whole ` class="…"` attribute, for a header cell that
 *  carries no class of its own. Empty at the default size, so the markup is
 *  byte-identical to what it has always been. */
function headingClassAttr(b: CampaignBlock): string {
  const cls = headingSizeClass(b).trim();
  return cls ? ` class="${cls}"` : "";
}

/** The gap below each body block, in px. Unset is the 16px every campaign has
 *  always had; a corrupt or hand-edited value is clamped rather than trusted. */
const DEFAULT_BLOCK_SPACING = 16;
function resolveBlockSpacing(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULT_BLOCK_SPACING;
  return Math.max(0, Math.min(48, Math.round(v)));
}

/** Render `**bold**` and `[text](url)` inline markup within a paragraph.
 *  Same scan-escape-wrap spirit as renderTopBanner's `**...**` handling below,
 *  extended to two match types in one left-to-right pass so a plain-text
 *  segment is never escaped twice or a markup segment left unescaped.
 *  `{{ merge_tag }}` personalization tokens need no special handling here —
 *  esc() doesn't touch `{`/`}`, so they pass through as literal text. */
function renderInline(raw: string, t: CampaignTheme): string {
  // Three alternatives in ONE left-to-right pass, style token first so a
  // [[...]] wins over a bare [link](url) that would otherwise match its
  // brackets. Plain segments are escaped exactly once, match segments emitted
  // exactly once, so no text is ever escaped twice or left unescaped.
  //
  // The token's inner content gets esc() and nothing else: no bold, no links,
  // no recursion. That flatness is what makes the invariant provable.
  const re = /\[\[([a-z0-9,]+)\]\]([\s\S]*?)\[\[\/\]\]|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/gi;
  let result = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    result += esc(raw.slice(lastIndex, m.index));
    if (m[1] !== undefined) {
      const mods = parseMods(m[1]);
      const inner = esc(m[2] ?? "");
      // Nothing recognised in the token: render the text plainly rather than
      // an empty <span>, and never leak the markers to the reader.
      if (isEmptyMods(mods)) {
        result += inner;
      } else {
        const css = modsToCss(mods, mods.color ? resolveBrandColor(mods.color, t) : undefined);
        result += `<span style="${css};">${inner}</span>`;
      }
    } else if (m[3] !== undefined) {
      result += `<strong>${esc(m[3])}</strong>`;
    } else {
      result += `<a href="${esc(m[5])}" style="color:inherit;text-decoration:underline;">${esc(m[4])}</a>`;
    }
    lastIndex = re.lastIndex;
  }
  // Anything after the last match, INCLUDING an unterminated opening token,
  // is escaped literal text. A malformed token can never swallow the rest of
  // the email or emit raw markup.
  result += esc(raw.slice(lastIndex));
  return result;
}

/** A block body → paragraphs (split on blank lines), newlines → <br>. */
function paragraphs(t: CampaignTheme, body: string, align: "left" | "center", italic: boolean, weight: "thin" | "extralight" | "light" | "normal" = "light"): string {
  const fontStyle = italic ? "font-style:italic;" : "";
  const size = italic ? "16px" : "18.7px";
  // Inter 300 (light) is the template default; 100 (thin), 200 (extralight),
  // and 400 (normal) are the opt-ins.
  const fontWeight = weight === "normal" ? 400 : weight === "extralight" ? 200 : weight === "thin" ? 100 : 300;
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:${t.text};font-size:${size};font-weight:${fontWeight};${fontStyle}font-family:Inter,Arial,Helvetica,sans-serif;line-height:1.6;text-align:${align};">${renderInline(p, t).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

/** Big hero number + caption — social-proof / stat callout, centered. */
function statBlock(b: CampaignBlock, t: CampaignTheme): string {
  const value = b.statValue?.trim();
  if (!value) return "";
  return `<div style="text-align:center;padding:4px 0;">
    <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 36)}px;font-weight:300;color:${t.inkAccent};line-height:1.15;">${esc(value)}</div>
    ${b.statLabel?.trim()
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${t.inkAccent};opacity:0.75;margin-top:6px;">${esc(b.statLabel)}</div>`
      : ""}
  </div>`;
}

/** Dashed-border coupon callout — code + what it does, and/or a struck-
 *  through original price next to a new/free price (the "$87.99 value,
 *  FREE" pattern, which has no literal coupon code). Renders if either a
 *  code or an original price is present — a value-stack offer shouldn't
 *  require a code that doesn't exist. */
function discountBlock(b: CampaignBlock, t: CampaignTheme): string {
  const code = b.discountCode?.trim();
  const originalPrice = b.originalPrice?.trim();
  const newPrice = b.newPrice?.trim();
  if (!code && !originalPrice) return "";
  return `<div style="border:1.5px dashed ${t.accentBorder};border-radius:8px;padding:16px;text-align:center;">
    ${code
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 22)}px;font-weight:700;letter-spacing:0.08em;color:${t.inkAccent};">${esc(code)}</div>`
      : ""}
    ${originalPrice
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;${code ? "margin-top:8px;" : ""}">
           <span style="color:${t.text};opacity:0.6;text-decoration:line-through;">${esc(originalPrice)}</span>
           ${newPrice ? `<span style="color:${t.inkAccent};margin-left:8px;">${esc(newPrice)}</span>` : ""}
         </div>`
      : ""}
    ${b.discountDescription?.trim()
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;font-weight:300;color:${t.text};margin-top:4px;">${esc(b.discountDescription)}</div>`
      : ""}
  </div>`;
}

/** Star rating + quote + attribution — social proof, centered. */
function testimonialBlock(b: CampaignBlock, t: CampaignTheme): string {
  const quote = b.testimonialQuote?.trim();
  if (!quote) return "";
  const stars = Math.min(5, Math.max(1, b.testimonialStars ?? 5));
  return `<div style="text-align:center;">
    <div style="color:${t.inkAccent};font-size:16px;letter-spacing:2px;margin-bottom:10px;">${"★".repeat(stars)}</div>
    <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:17px;font-style:italic;font-weight:300;color:${t.text};line-height:1.5;">"${esc(quote)}"</div>
    ${b.testimonialAuthor?.trim()
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${t.inkAccent};margin-top:10px;">— ${esc(b.testimonialAuthor)}</div>`
      : ""}
  </div>`;
}

/** Results-over-time progression — a vertical list of time-labeled rows,
 *  each a bold label + claim, separated by thin dividers. */
function timelineBlock(b: CampaignBlock, t: CampaignTheme): string {
  const rows = (b.timelineRows ?? []).filter((r) => r.label?.trim() || r.text?.trim());
  if (rows.length === 0) return "";
  return rows
    .map(
      (r, i) => `<div style="padding:${i === 0 ? "0" : "12px"} 0 12px;${i > 0 ? `border-top:1px solid ${t.ruleOnShell};` : ""}">
        <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 12)}px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${t.inkAccent};margin-bottom:4px;">${esc(r.label ?? "")}</div>
        <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:300;color:${t.text};line-height:1.5;">${esc(r.text ?? "")}</div>
      </div>`,
    )
    .join("");
}

/** "Why we're different" trust argument — a 2-column grid of small image
 *  + caption pairs. imageUrl is a plain pasted URL (no asset picker); a
 *  row with no caption is dropped, an image with no url shows a solid
 *  placeholder (same pattern as imageCell()). */
function trustgridBlock(b: CampaignBlock, t: CampaignTheme): string {
  const items = (b.trustItems ?? []).filter((i) => i.caption?.trim());
  if (items.length === 0) return "";
  let html = "";
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    const cell = (item?: { imageUrl?: string; caption: string }) => {
      if (!item) return `<td width="48.91%" style="width:48.91%;">&nbsp;</td>`;
      const img = item.imageUrl?.trim()
        ? `<img src="${esc(item.imageUrl)}" width="270" style="display:block;width:100%;height:auto;border-radius:8px;margin-bottom:8px;" alt="">`
        : `<div style="width:100%;aspect-ratio:1/1;background:${t.placeholder};border-radius:8px;margin-bottom:8px;"></div>`;
      return `<td width="48.91%" style="width:48.91%;vertical-align:top;">${img}<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;font-weight:300;color:${t.text};line-height:1.4;">${esc(item.caption)}</div></td>`;
    };
    html += `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;${i > 0 ? "margin-top:16px;" : ""}">
      <tr>${cell(left)}<td width="12" style="width:12px;font-size:0;">&nbsp;</td>${cell(right)}</tr>
    </table>`;
  }
  return html;
}

/** Fixed 2-column "one-time vs subscribe" comparison. Right column (the
 *  recommended option) gets a cream background to visually favor it, same
 *  emphasis pattern competitor subscription emails use. Renders only when
 *  both labels are set — a one-sided comparison isn't a comparison. */
function comparisonBlock(b: CampaignBlock, t: CampaignTheme): string {
  const leftLabel = b.comparisonLeftLabel?.trim();
  const rightLabel = b.comparisonRightLabel?.trim();
  if (!leftLabel || !rightLabel) return "";
  const card = (label: string, price?: string, perk?: string, emphasized = false) => `
    <td width="48.91%" style="width:48.91%;vertical-align:top;background:${emphasized ? t.panelBg : "transparent"};border:1px solid ${emphasized ? t.accentBorder : t.accentBorderSoft};border-radius:8px;padding:14px;">
      <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 11)}px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${emphasized ? t.inkOnPanel : t.inkAccent};margin-bottom:6px;">${esc(label)}</div>
      ${price?.trim() ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:${emphasized ? t.inkOnPanel : t.text};margin-bottom:4px;">${esc(price)}</div>` : ""}
      ${perk?.trim() ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:300;color:${emphasized ? t.inkOnPanel : t.text};line-height:1.4;">${esc(perk)}</div>` : ""}
    </td>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
    <tr>
      ${card(leftLabel, b.comparisonLeftPrice, b.comparisonLeftPerk, false)}
      <td width="12" style="width:12px;font-size:0;">&nbsp;</td>
      ${card(rightLabel, b.comparisonRightPrice, b.comparisonRightPerk, true)}
    </tr>
  </table>`;
}

/** Supplement-facts panel: a cream label pasted onto the navy email, with a
 *  header rule, name + dose rows separated by thin dividers, and an optional
 *  centered trust footnote. Table-based, right-aligned dose column, no
 *  flexbox — Outlook-safe like the rest of the template. Renders only when at
 *  least one item has a name. */
function ingredientsBlock(b: CampaignBlock, t: CampaignTheme): string {
  const items = (b.ingredientItems ?? []).filter((i) => i.name?.trim());
  if (items.length === 0) return "";
  const heading = (b.ingredientHeading?.trim() || "What's inside");
  const footnote = b.ingredientFootnote?.trim();
  const rows = items
    .map((it, idx) => {
      const pad = idx === 0 ? "0 0 10px 0" : "10px 0";
      const border = idx === 0 ? "none" : `1px solid ${t.ruleOnPanel}`;
      return `<tr>
        <td style="padding:${pad};border-top:${border};font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:400;color:${t.inkOnPanel};line-height:1.3;">${esc(it.name)}</td>
        <td align="right" style="padding:${pad};border-top:${border};font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${t.inkOnPanel};white-space:nowrap;">${esc(it.dose || "")}</td>
      </tr>`;
    })
    .join("");
  return `<div style="background:${t.panelBg};border-radius:8px;padding:20px 22px;">
    <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 12)}px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${t.inkOnPanel};padding-bottom:12px;border-bottom:2px solid ${t.inkOnPanel};margin-bottom:12px;">${esc(heading)}</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:auto;">${rows}</table>
    ${footnote ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;color:${t.mutedOnPanel};text-align:center;margin-top:16px;letter-spacing:0.02em;">${esc(footnote)}</div>` : ""}
  </div>`;
}

/** Benefit/ingredient checklist. A 2-cell table row per item — a cream
 *  checkmark that stays top-aligned next to wrapping text (cleaner than the
 *  old em-dash bullet). Table-based, no flexbox — Outlook-safe. */
function checklistBlock(b: CampaignBlock, t: CampaignTheme): string {
  const items = (b.items ?? []).map((i) => i.trim()).filter(Boolean);
  if (items.length === 0) return "";
  const rows = items
    .map(
      (item) => `<tr>
        <td valign="top" style="width:24px;padding:0 8px 12px 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${t.inkAccent};line-height:1.5;">&#10003;</td>
        <td valign="top" style="padding:0 0 12px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:300;color:${t.text};line-height:1.5;">${esc(item)}</td>
      </tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="table-layout:auto;">${rows}</table>`;
}

/** Top banner above the logo. Caps Inter on white. Wrap a fragment with
 *  `**...**` to render that fragment as a highlighter pill. Empty/whitespace
 *  text → returns "" so the row is skipped. */
function renderTopBanner(text: string, t: CampaignTheme): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "";
  // Split by `**...**` markers, preserving the surrounding chunks. Even-indexed
  // chunks are plain text; odd-indexed are the highlighted fragments.
  const parts = trimmed.split(/\*\*([^*]+)\*\*/g);
  const inner = parts
    .map((chunk, i) => {
      if (!chunk) return "";
      const safe = esc(chunk);
      if (i % 2 === 1) {
        return `<span style="background:${t.highlight};color:${t.highlightText};padding:2px 8px;border-radius:3px;">${safe}</span>`;
      }
      return safe;
    })
    .join("");
  return `<tr><td style="background:${t.stripBg};padding:12px 24px;text-align:left;font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;font-weight:400;letter-spacing:0.06em;text-transform:uppercase;color:${t.stripText};line-height:1.4;">
    ${inner}
  </td></tr>`;
}

/** White logo strip below the top banner. Left-aligned, large logo to
 *  match the AG1-style header. Skipped entirely when no logo url.
 *
 *  The img sits inside an overflow:hidden box that's CROP_TOP+CROP_BOTTOM
 *  pixels shorter than the natural image, with a matching negative
 *  margin-top. That trims the asset's own top/bottom whitespace so the
 *  visible glyph sits closer to the strip edges. Earlier values (26/26)
 *  clipped the glyph in Gmail/Outlook — keeping it conservative now.
 *  If the asset is ever replaced with a TRULY zero-padding crop, set
 *  CROP_TOP / CROP_BOTTOM to 0 so the strip doesn't eat any of the mark. */
function renderLogoStrip(url: string | null | undefined, t: CampaignTheme): string {
  if (!url) return "";
  // Wrapper height defines the strip's overall vertical footprint (and
  // therefore the banner-to-hero spacing). Image height defines how big
  // the visible glyph is INSIDE that strip — making image < wrapper
  // produces a vertically-centered smaller logo without shifting any of
  // the surrounding layout. To grow the logo back to flush, set
  // IMAGE_HEIGHT === WRAPPER_HEIGHT.
  const WRAPPER_HEIGHT = 130;
  const IMAGE_HEIGHT = 104; // 20% smaller than wrapper
  const VERTICAL_CENTER = Math.round((WRAPPER_HEIGHT - IMAGE_HEIGHT) / 2);
  // border-top is the divider between the top banner and the logo strip.
  // The preview iframe used to show a hairline naturally from table-cell
  // border collapsing; email clients strip that, so we have to render it
  // explicitly. Subtle near-transparent black reads on white in every
  // major client.
  return `<tr><td style="background:${t.stripBg};padding:0.5px 24px;text-align:left;border-top:1px solid ${t.stripRule};">
    <div class="logo-crop" style="height:${WRAPPER_HEIGHT}px;overflow:hidden;line-height:0;">
      <img src="${esc(url)}" alt="Lunia Life" class="logo-img" style="display:block;height:${IMAGE_HEIGHT}px;width:auto;margin-top:${VERTICAL_CENTER}px;border:0 none;outline:none;box-shadow:none;background:transparent;-webkit-appearance:none;">
    </div>
  </td></tr>`;
}

/** Text laid OVER an image as real HTML — stays crisp at any zoom and stays
 *  editable, unlike words baked into the pixels. A dark scrim keeps it legible
 *  over a bright photo.
 *
 *  Outlook (Word rendering engine) drops `position:absolute`, which would make
 *  an overlay-only headline vanish entirely — unlike the hero CTA pill, whose
 *  words are guaranteed by the bottom CTA button. So the same text is repeated
 *  in an mso-only caption bar beneath the image: modern clients see the
 *  overlay, Outlook sees a caption, nobody loses the copy. */
function overlayHtml(b: CampaignBlock, radius: string, t: CampaignTheme): string {
  const eyebrow = b.imageOverlayEyebrow?.trim();
  const headline = b.imageOverlayHeadline?.trim();
  if (!eyebrow && !headline) return "";
  const eyebrowHtml = eyebrow
    ? `<div style="color:${t.onImageAccent};font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:6px;">${esc(eyebrow)}</div>`
    : "";
  const headlineHtml = headline
    ? `<div class="img-overlay-headline${headingSizeClass(b)}" style="color:${t.onImageText};font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 26)}px;font-weight:300;line-height:1.25;">${esc(headline)}</div>`
    : "";
  return `<div class="img-overlay" style="position:absolute;left:0;right:0;bottom:0;padding:24px;background:linear-gradient(to bottom, ${t.scrimFrom} 0%, ${t.scrimTo} 100%);border-radius:${radius};">
      ${eyebrowHtml}${headlineHtml}
    </div>`;
}

/** Outlook-only fallback for overlayHtml — same words, stacked under the
 *  image, so the copy survives a client that cannot position it. */
function overlayMsoFallback(b: CampaignBlock, t: CampaignTheme): string {
  const eyebrow = b.imageOverlayEyebrow?.trim();
  const headline = b.imageOverlayHeadline?.trim();
  if (!eyebrow && !headline) return "";
  const parts = [
    eyebrow
      ? `<div style="color:${t.onImageAccent};font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:6px;">${esc(eyebrow)}</div>`
      : "",
    headline
      ? `<div style="color:${t.onImageText};font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 24)}px;font-weight:300;line-height:1.25;">${esc(headline)}</div>`
      : "",
  ].join("");
  return `<!--[if mso]><div style="padding:16px 0 0;">${parts}</div><![endif]-->`;
}

/** A solid placeholder shown while a slot has no image yet, sized to the
 *  block's aspect so the layout doesn't jump when the real image lands. */
function imagePlaceholder(aspect: string, radius: string, t: CampaignTheme): string {
  const ratio = aspect === "16:9" ? "16/9" : aspect === "4:5" ? "4/5" : "1/1";
  return `<div style="width:100%;aspect-ratio:${ratio};background:${t.placeholder};border-radius:${radius};"></div>`;
}

/** An image placed in the body flow by a kind:"image" block. Three layouts:
 *
 *   column — inset to the 552px content column, 8px radius (the default, and
 *            the answer to "I want it full width, not a small square")
 *   bleed  — edge-to-edge across the whole 600px shell, no side padding and
 *            no radius; the most editorial of the three
 *   split  — 50/50 image + copy, stacking to full width on mobile via the
 *            existing .secondary-cell rule
 *
 * Returns a complete <tr>, not an inner fragment: bleed has to escape the
 * standard 24px cell padding, so these can't go through the shared padded
 * wrapper the text/callout blocks use. */
function imageBlockRow(b: CampaignBlock, slot: CampaignImageSlot | undefined, t: CampaignTheme, gap: number): string {
  const layout = b.imageLayout ?? "column";
  const url = slot?.url;
  const aspect = slot?.aspect ?? (layout === "split" ? "1:1" : "16:9");

  if (layout === "split") {
    const text = b.imageSplitText?.trim();
    const imageOnRight = b.imageSplitSide === "right";
    const imgCell = `<td class="secondary-cell" width="48.91%" style="width:48.91%;vertical-align:middle;">${
      url
        ? `<img src="${esc(url)}" width="270" style="display:block;width:100%;height:auto;border-radius:8px;" alt="">`
        : imagePlaceholder(aspect, "8px", t)
    }</td>`;
    const textCell = `<td class="secondary-cell" width="48.91%" style="width:48.91%;vertical-align:middle;">${
      text ? paragraphs(t, text, "left", !!b.italic, b.weight ?? "light") : "&nbsp;"
    }</td>`;
    const spacer = '<td class="secondary-spacer" width="12" style="width:12px;font-size:0;">&nbsp;</td>';
    return `<tr><td class="h-padding" style="padding:0 24px ${gap}px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
        <tr>${imageOnRight ? textCell + spacer + imgCell : imgCell + spacer + textCell}</tr>
      </table>
    </td></tr>`;
  }

  const bleed = layout === "bleed";
  const radius = bleed ? "0" : "8px";
  const width = bleed ? "600" : "552";
  const inner = url
    ? `<img src="${esc(url)}" width="${width}" style="display:block;width:100%;height:auto;border-radius:${radius};" alt="">`
    : imagePlaceholder(aspect, radius, t);
  const padding = bleed ? `0 0 ${gap}px` : `0 24px ${gap}px`;
  const cellClass = bleed ? "" : ' class="h-padding"';
  return `<tr><td${cellClass} style="padding:${padding};">
      <div style="position:relative;">
        ${inner}
        ${overlayHtml(b, radius, t)}
      </div>
      ${overlayMsoFallback(b, t)}
    </td></tr>`;
}

function imageCell(url: string | null | undefined, width: string, t: CampaignTheme): string {
  // class="secondary-cell" lets the mobile media query stack these cells.
  if (!url) {
    return `<td class="secondary-cell" width="${width}" style="width:${width};vertical-align:top;"><div style="width:100%;aspect-ratio:1/1;background:${t.placeholder};border-radius:8px;"></div></td>`;
  }
  return `<td class="secondary-cell" width="${width}" style="width:${width};vertical-align:top;"><img src="${esc(
    url,
  )}" width="270" style="display:block;width:100%;height:auto;border-radius:8px;" alt=""></td>`;
}

/** A comparison / pricing table. Fixed layout with hard word-breaking, which
 *  is the whole defence against a long unbroken string pushing the 600px shell
 *  wide — `table-layout:fixed` alone will not do it.
 *
 *  Rows are padded and truncated to the header count so adding a column never
 *  leaves ragged rows. First column left-aligned, the rest right: that is what
 *  makes a column of prices read as a column of prices.
 *
 *  Deliberately does NOT stack on mobile, unlike every other multi-column
 *  block here. A stacked pricing table stops being a comparison, which is the
 *  only reason to use one, so it shrinks its type instead. */
function tableBlock(b: CampaignBlock, t: CampaignTheme): string {
  const headers = (b.tableHeaders ?? []).map((h) => (h ?? "").trim());
  const rows = (b.tableRows ?? []).filter((r) => (r.cells ?? []).some((c) => (c ?? "").trim()));
  if (headers.length === 0 || rows.length === 0) return "";

  const cols = Math.min(Math.max(headers.length, 2), 4);
  const width = `${(100 / cols).toFixed(2)}%`;
  const sizePx = cols <= 2 ? 14 : 13;
  const size = `${sizePx}px`;
  const align = (i: number) => (i === 0 ? "left" : "right");
  const cellBase = `padding:10px 8px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:${size};line-height:1.4;word-break:break-word;`;
  // The header row is the block's header, so it takes headingSize. It also
  // needs the class: the mobile rule that shrinks every table cell to 11px is
  // `!important`, which a plain inline size would lose to.
  const headerBase = `padding:10px 8px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, sizePx)}px;line-height:1.4;word-break:break-word;`;

  const headerCells = Array.from({ length: cols }, (_, i) =>
    `<td width="${width}" align="${align(i)}"${headingClassAttr(b)} style="${headerBase}width:${width};font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${t.inkAccent};border-bottom:2px solid ${t.accentBorder};">${renderInline(headers[i] ?? "", t)}</td>`,
  ).join("");

  const bodyRows = rows
    .map((r, ri) => {
      const emphasized = b.tableEmphasisRow === ri;
      // An emphasised row is a filled panel, so its ink switches surface.
      const ink = emphasized ? t.inkOnPanel : t.text;
      const bg = emphasized ? `background:${t.panelBg};` : "";
      const weight = emphasized ? 700 : 300;
      const cells = Array.from({ length: cols }, (_, ci) =>
        `<td width="${width}" align="${align(ci)}" style="${cellBase}width:${width};${bg}color:${ink};font-weight:${weight};${ri > 0 ? `border-top:1px solid ${t.ruleOnShell};` : ""}">${renderInline((r.cells ?? [])[ci] ?? "", t)}</td>`,
      ).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table class="email-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;width:100%;">
    <tr>${headerCells}</tr>
    ${bodyRows}
  </table>`;
}

/** True when a headerimage block has enough content to render. Used both by
 *  the renderer and by the hero-suppression check, so the two cannot disagree
 *  about whether a header is present. */
function hasHeaderContent(b: CampaignBlock): boolean {
  return !!(b.headerHeadline?.trim() || b.headerPillText?.trim() || b.imageUrl?.trim());
}

/** A header treatment that is genuinely the TOP of the email: when one of
 *  these is present the hero row is suppressed, otherwise the fixed layout
 *  order would put it below a 552px photo and it would read as a mid-email
 *  divider rather than a header.
 *
 *  Returns a complete <tr> and drops the `h-padding` class rather than merely
 *  zeroing the padding — that class carries a `!important` 14px inset below
 *  599px, so keeping it would make the image full-bleed on desktop and inset
 *  on mobile.
 *
 *  "card" overlaps the headline panel onto the image with a negative top
 *  margin. Clients that honour it get the overlap; Outlook desktop ignores
 *  negative margins and simply stacks the card under the image, which still
 *  reads correctly. That is why this is not `position:absolute`, which Outlook
 *  drops entirely and would leave the headline sitting on top of the picture.
 *  NOTE: the degradation is reasoned, not measured — this repo has no
 *  real-client test rig, so verify by sending yourself one before relying on it. */
function headerimageBlockRow(b: CampaignBlock, t: CampaignTheme, gap: number): string {
  if (!hasHeaderContent(b)) return "";
  const url = b.imageUrl?.trim();
  const headline = b.headerHeadline?.trim();
  const style = b.headerStyle ?? "card";

  const image = url
    ? `<img src="${esc(url)}" width="600" style="display:block;width:100%;height:auto;" alt="">`
    : `<div style="width:100%;aspect-ratio:16/9;background:${t.placeholder};"></div>`;

  if (style === "pill") {
    const pill = b.headerPillText?.trim()
      ? `<div style="margin-bottom:6px;"><span style="display:inline-block;background:${t.highlight};color:${t.highlightText};font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.04em;padding:3px 10px;border-radius:3px;">${esc(b.headerPillText)}</span></div>`
      : "";
    const head = headline
      ? `<div class="headerimage-h${headingSizeClass(b)}" style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 30)}px;font-weight:300;color:${t.text};line-height:1.15;">${renderInline(headline, t)}</div>`
      : "";
    return `<tr><td style="padding:0 0 ${gap}px;">
      ${pill || head ? `<div style="padding:0 24px 14px;text-align:center;">${pill}${head}</div>` : ""}
      ${image}
    </td></tr>`;
  }

  // card
  const card = headline
    ? `<div style="margin:-28px 24px 0;position:relative;">
         <div style="background:${t.panelBg};border-radius:10px;padding:18px 20px;">
           <div class="headerimage-h${headingSizeClass(b)}" style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 28)}px;font-weight:300;color:${t.inkOnPanel};line-height:1.15;">${renderInline(headline, t)}</div>
         </div>
       </div>`
    : "";
  // The optional second card is a right-aligned row BELOW, not an absolutely
  // positioned overlay: absolute bottom-right over a variable-aspect image is
  // unreliable in email and untestable here.
  const subcard = b.headerSubcard?.trim()
    ? `<div style="margin:10px 24px 0;text-align:right;">
         <span style="display:inline-block;background:${t.panelBg};border-radius:10px;padding:12px 16px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;font-weight:300;color:${t.inkOnPanel};line-height:1.2;">${renderInline(b.headerSubcard, t)}</span>
       </div>`
    : "";
  return `<tr><td style="padding:0 0 ${gap}px;">${image}${card}${subcard}</td></tr>`;
}

/** Shared skeleton for the two "picture beside content" kinds. Both cells carry
 *  `secondary-cell` and the gap carries `secondary-spacer`, so the existing
 *  mobile rules stack them and collapse the gap with no new CSS. Cells are
 *  emitted in DOM order, so a right-positioned image stacks text-first on
 *  mobile, which reads better than a picture with no context above it. */
function sideBySide(imageCell: string, contentCell: string, imageOnRight: boolean): string {
  const spacer = '<td class="secondary-spacer" width="12" style="width:12px;font-size:0;">&nbsp;</td>';
  const cells = imageOnRight ? [contentCell, spacer, imageCell] : [imageCell, spacer, contentCell];
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;width:100%;">
    <tr>${cells.join("")}</tr>
  </table>`;
}

function blockImageCell(b: CampaignBlock, t: CampaignTheme, width: string): string {
  const url = b.imageUrl?.trim();
  return `<td class="secondary-cell" width="${width}" style="width:${width};vertical-align:middle;">${
    url
      ? `<img src="${esc(url)}" width="270" style="display:block;width:100%;height:auto;border-radius:8px;" alt="">`
      : imagePlaceholder("1/1", "8px", t)
  }</td>`;
}

/** Picture beside copy. The copy reuses `body`, so everything that already
 *  works on a text block works here too. */
function imagetextBlock(b: CampaignBlock, t: CampaignTheme): string {
  const heading = b.imageHeading?.trim();
  const body = b.body?.trim();
  if (!heading && !body && !b.imageUrl?.trim()) return "";
  const headingHtml = heading
    ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 17)}px;font-weight:600;color:${t.inkAccent};line-height:1.3;margin-bottom:8px;">${renderInline(heading, t)}</div>`
    : "";
  const bodyHtml = body ? paragraphs(t, body, "left", !!b.italic, b.weight ?? "light") : "";
  const content = `<td class="secondary-cell" width="58.70%" style="width:58.70%;vertical-align:middle;">${headingHtml}${bodyHtml}</td>`;
  return sideBySide(blockImageCell(b, t, "39.13%"), content, b.imagePosition === "right");
}

/** Picture beside a bulleted list, with a user-chosen marker colour. The marker
 *  is a text glyph in a narrow cell, the same shape checklistBlock uses, so it
 *  renders everywhere without an image request. */
function imagebulletsBlock(b: CampaignBlock, t: CampaignTheme): string {
  const items = (b.bulletItems ?? []).map((i) => (i ?? "").trim()).filter(Boolean);
  if (items.length === 0 && !b.imageUrl?.trim()) return "";
  // A role, resolved per theme, and swapped out if it would be illegible.
  const marker = resolveBrandColor(b.bulletColor, t);
  const rows = items
    .map(
      (item) => `<tr>
        <td valign="top" style="width:18px;padding:0 8px 10px 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${marker};">&#9679;</td>
        <td valign="top" style="padding:0 0 10px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:300;color:${t.text};line-height:1.5;">${renderInline(item, t)}</td>
      </tr>`,
    )
    .join("");
  const content = `<td class="secondary-cell" width="58.70%" style="width:58.70%;vertical-align:middle;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td>`;
  return sideBySide(blockImageCell(b, t, "39.13%"), content, b.imagePosition === "right");
}

/** A 2-column grid of picture + heading + caption. Always two columns: a
 *  three-across grid at 600px gives ~170px cells, which is too small for the
 *  caption to read. Reuses the secondary-cell classes so mobile stacking is
 *  free. */
function gridBlock(b: CampaignBlock, t: CampaignTheme): string {
  const cells = (b.gridCells ?? []).filter(
    (c) => (c.heading ?? "").trim() || (c.caption ?? "").trim() || (c.imageUrl ?? "").trim(),
  );
  if (cells.length === 0) return "";
  const cell = (c?: { imageUrl?: string; heading?: string; caption?: string }) => {
    if (!c) return `<td class="secondary-cell" width="48.91%" style="width:48.91%;">&nbsp;</td>`;
    const url = c.imageUrl?.trim();
    const img = url
      ? `<img src="${esc(url)}" width="270" style="display:block;width:100%;height:auto;border-radius:8px;margin-bottom:8px;" alt="">`
      : `<div style="width:100%;aspect-ratio:1/1;background:${t.placeholder};border-radius:8px;margin-bottom:8px;"></div>`;
    const heading = c.heading?.trim()
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:${headingPx(b, 15)}px;font-weight:600;color:${t.inkAccent};line-height:1.3;margin-bottom:4px;">${renderInline(c.heading, t)}</div>`
      : "";
    const caption = c.caption?.trim()
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;font-weight:300;color:${t.text};line-height:1.45;">${renderInline(c.caption, t)}</div>`
      : "";
    return `<td class="secondary-cell" width="48.91%" style="width:48.91%;vertical-align:top;">${img}${heading}${caption}</td>`;
  };
  let html = "";
  for (let i = 0; i < cells.length; i += 2) {
    html += `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;${i > 0 ? "margin-top:16px;" : ""}">
      <tr>${cell(cells[i])}<td class="secondary-spacer" width="12" style="width:12px;font-size:0;">&nbsp;</td>${cell(cells[i + 1])}</tr>
    </table>`;
  }
  return html;
}

/** Every kind that renders INSIDE the shared padded wrapper, mapped to its
 *  renderer. `image` is absent on purpose: it owns its whole <tr> so its
 *  "bleed" layout can escape the 24px cell padding, and is handled ahead of
 *  this table in blockRow. Because the key type is the kind union minus the
 *  full-row kinds, a new kind cannot be added without a renderer. */
const INNER_BLOCK_RENDERERS: Record<InnerBlockKind, (b: CampaignBlock, t: CampaignTheme) => string> = {
  text: (b, t) => paragraphs(t, b.body, b.align, !!b.italic, b.weight ?? "light"),
  stat: statBlock,
  discount: discountBlock,
  checklist: checklistBlock,
  testimonial: testimonialBlock,
  timeline: timelineBlock,
  trustgrid: trustgridBlock,
  comparison: comparisonBlock,
  ingredients: ingredientsBlock,
  table: tableBlock,
  imagetext: imagetextBlock,
  imagebullets: imagebulletsBlock,
  grid: gridBlock,
};

/** Render the full campaign email as a standalone HTML document. */
/**
 * Options that exist only for the in-app preview.
 *
 * The default is OFF for every field, and the export, the Klaviyo push and
 * the snapshot tests all call this with no options at all — so the HTML that
 * actually reaches an inbox is byte-for-byte what it has always been. Anything
 * added here must keep that property: the preview may carry extra markup, the
 * email may not.
 */
/**
 * Injected into the PREVIEW document only.
 *
 * Clicking a block used to be impossible: the preview is an iframe of the real
 * email, so the only way to reach a block was to find its card in the
 * right-hand rail — a list four levels deep with 22 identically-sized inputs.
 * You typed in one place and watched the result change in another.
 *
 * Handles two gestures: click to select, and drag to reorder. Both talk to the
 * editor by postMessage and touch nothing else about the document. Links are
 * suppressed on click so hitting a CTA selects it instead of navigating the
 * preview away from the email.
 *
 * Reorder deliberately posts the SAME (dragged, over) id pair the rail's
 * drag-and-drop uses and lets the editor run the one `reorderBlocks` it
 * already had. Two ways to reorder, one definition of what reordering means —
 * a second before/after model living in here would be a bug waiting for the
 * day the two disagreed.
 *
 * Drag position is forwarded to the parent on every dragover because the
 * iframe is sized to its content and never scrolls: the page outside it does.
 * Without that, dragging a block from the top of a long email to the bottom
 * would be impossible — the destination is below the fold and nothing would
 * scroll to bring it into view.
 */
const SELECT_SCRIPT = `<script>
(function () {
  var last = null;
  function paint(id) {
    if (last) { last.style.outline = ""; last.style.outlineOffset = ""; }
    var el = id && document.querySelector('[data-lunia-block="' + id + '"]');
    if (el) {
      el.style.outline = "2px solid #1D1D1F";
      el.style.outlineOffset = "-2px";
      last = el;
    } else { last = null; }
  }
  document.addEventListener("click", function (e) {
    var row = e.target && e.target.closest && e.target.closest("[data-lunia-block]");
    if (!row) return;
    e.preventDefault();
    e.stopPropagation();
    var id = row.getAttribute("data-lunia-block");
    paint(id);
    parent.postMessage({ source: "lunia-preview", type: "selectBlock", id: id }, "*");
  }, true);
  document.addEventListener("mouseover", function (e) {
    var row = e.target && e.target.closest && e.target.closest("[data-lunia-block]");
    document.body.style.cursor = row ? "grab" : "";
  });
  window.addEventListener("message", function (e) {
    if (e.data && e.data.source === "lunia-editor" && e.data.type === "highlightBlock") paint(e.data.id);
  });

  // ── Drag to reorder ─────────────────────────────────────────────────────
  // draggable is set here rather than emitted in the markup, so the HTML
  // string this file produces stays exactly what it always was apart from the
  // one data attribute. Every affordance is added at runtime, in the preview.
  var rows = document.querySelectorAll("[data-lunia-block]");
  for (var i = 0; i < rows.length; i++) rows[i].setAttribute("draggable", "true");

  var dragId = null;
  var overRow = null;

  function clearOver() {
    if (overRow) { overRow.style.boxShadow = ""; overRow = null; }
  }
  function markOver(row) {
    if (row === overRow) return;
    clearOver();
    // An inset ring rather than an insertion line: dropping puts the block in
    // THIS block's position, so the honest indicator is the slot itself.
    row.style.boxShadow = "inset 0 0 0 2px #1D1D1F";
    overRow = row;
  }

  document.addEventListener("dragstart", function (e) {
    var row = e.target && e.target.closest && e.target.closest("[data-lunia-block]");
    if (!row) return;
    dragId = row.getAttribute("data-lunia-block");
    row.style.opacity = "0.4";
    document.body.style.cursor = "grabbing";
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      // Firefox refuses to start a drag unless some data is set.
      try { e.dataTransfer.setData("text/plain", dragId); } catch (err) {}
    }
  });

  document.addEventListener("dragover", function (e) {
    if (!dragId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    parent.postMessage({ source: "lunia-preview", type: "dragMove", y: e.clientY }, "*");
    var row = e.target && e.target.closest && e.target.closest("[data-lunia-block]");
    if (!row || row.getAttribute("data-lunia-block") === dragId) { clearOver(); return; }
    markOver(row);
  });

  document.addEventListener("drop", function (e) {
    if (!dragId) return;
    e.preventDefault();
    var row = e.target && e.target.closest && e.target.closest("[data-lunia-block]");
    var overId = row && row.getAttribute("data-lunia-block");
    if (overId && overId !== dragId) {
      parent.postMessage({ source: "lunia-preview", type: "reorderBlock", dragId: dragId, overId: overId }, "*");
    }
  });

  document.addEventListener("dragend", function () {
    var all = document.querySelectorAll("[data-lunia-block]");
    for (var j = 0; j < all.length; j++) all[j].style.opacity = "";
    clearOver();
    dragId = null;
    document.body.style.cursor = "";
    parent.postMessage({ source: "lunia-preview", type: "dragEnd" }, "*");
  });
})();
</script>`;

export type RenderEmailOptions = {
  /** Tag each block's row with its id and post clicks to the parent frame, so
   *  the editor can select a block by clicking it in the preview. */
  selectable?: boolean;
};

export function renderCampaignEmail(content: CampaignContent, opts: RenderEmailOptions = {}): string {
  const selectable = opts.selectable === true;
  // Unset resolves to navy, so a campaign saved before themes existed renders
  // byte-for-byte as it did.
  const t = resolveTheme(content.theme);
  const subject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "";
  // A headerimage block IS the top of the email, so it replaces the hero
  // rather than stacking under it. Without this the fixed layout order (hero →
  // promo → blocks) would put a "header" below a 552px photo.
  const hasHeaderBlock = content.blocks.some((b) => b.kind === "headerimage" && hasHeaderContent(b));
  const hero = hasHeaderBlock ? undefined : content.images.find((i) => i.role === "hero");
  const slotById = new Map(content.images.map((i) => [i.id, i]));

  // A slot claimed by a kind:"image" block renders at that block's position
  // with that block's layout. Everything else keeps the original behaviour —
  // the fixed 2-up grid after the first paragraph — so every campaign saved
  // before image blocks existed renders byte-for-byte as it did.
  const placedSlotIds = new Set(
    content.blocks
      .filter((b) => b.kind === "image" && b.imageSlotId)
      .map((b) => b.imageSlotId!),
  );
  const secondary = content.images.filter(
    (i) => i.role === "secondary" && !placedSlotIds.has(i.id),
  );
  const ctaUrl = content.cta.url || "#";

  // Layout: hero → promo band → blocks[0] → unplaced secondaries → blocks[1..] → CTA.
  const introBlock = content.blocks[0];
  const closingBlocks = content.blocks.slice(1);

  // Hero — wrapped img + an absolutely-positioned cream CTA pill anchored
  // bottom-center. The pill is decorative: many email clients (Outlook,
  // parts of Gmail) drop `position: absolute`, so the underlying <a> wrapper
  // is still the source of truth that makes the whole hero tappable. The
  // bottom cream CTA below the email also remains as a guaranteed-render
  // fallback. Don't try to make this pixel-perfect in Outlook.
  // Bottom button and hero overlay carry independent styles. heroStyle
  // falls back to style for saves made before the two were split.
  const { bg: ctaBg, fg: ctaFg } = resolveCta(content.cta.style, t);
  const { bg: heroBg, fg: heroFg } = resolveCta(content.cta.heroStyle ?? content.cta.style, t);
  const heroCtaLabel = content.cta.label?.trim();
  const showOnHero = content.cta.showOnHero !== false;
  // Byte-identity: with no position set, emit the exact string this always
  // emitted. Only a campaign that has actually been repositioned takes the
  // percent-based branch, so nothing saved before this feature can shift.
  const heroPositioned = content.cta.heroX !== undefined || content.cta.heroY !== undefined;
  const heroPos = heroPositioned
    ? clampHeroCta(content.cta.heroX ?? 50, content.cta.heroY ?? 88)
    : null;
  const heroOverlayStyle = heroPos
    ? `position:absolute;left:${heroPos.x}%;top:${heroPos.y}%;transform:translate(-50%,-50%);width:calc(100% - 48px);max-width:300px;`
    : "position:absolute;left:50%;bottom:24px;transform:translateX(-50%);width:calc(100% - 48px);max-width:300px;";
  const heroOverlayClass = heroPos ? "hero-cta-overlay hero-cta-free" : "hero-cta-overlay";
  const heroOverlay = hero?.url && heroCtaLabel && showOnHero
    ? `<div class="${heroOverlayClass}" style="${heroOverlayStyle}">
         <span style="display:block;background:${heroBg};color:${heroFg};font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;line-height:1.3;padding:11px 14px;text-align:center;letter-spacing:0.12em;border-radius:2px;text-transform:uppercase;">${esc(heroCtaLabel)} →</span>
       </div>`
    : "";
  const heroHtml = hero?.url
    ? `<tr><td class="h-padding" style="padding:0 24px 16px;">
         <a href="${esc(ctaUrl)}" target="_blank" style="text-decoration:none;">
           <div style="position:relative;">
             <img src="${esc(hero.url)}" width="552" style="display:block;width:100%;height:auto;border-radius:8px;" alt="">
             ${heroOverlay}
           </div>
         </a>
       </td></tr>`
    : "";

  // Promo band
  const promoHtml = content.promoBand?.trim()
    ? `<tr><td class="h-padding" style="padding:0 24px 16px;">
         <div style="background:${t.panelBg};color:${t.inkOnPanel};text-align:center;font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:14px 12px;border-radius:6px;">${esc(
           content.promoBand,
         )}</div>
       </td></tr>`
    : "";

  // A padded block — kind "text" (or unset) renders the original paragraph
  // flow; "stat"/"discount"/"checklist" render their own structured markup.
  // An empty/unfilled structured block (e.g. a freshly-added stat with no
  // value yet) renders nothing rather than an empty styled box.
  // Stamps the block's id onto the first <tr> it emits. Preview only — with
  // `selectable` off this returns the string untouched, so no branch below has
  // to know the option exists.
  const tagRow = (rowHtml: string, id: string) =>
    selectable && rowHtml ? rowHtml.replace("<tr", `<tr data-lunia-block="${esc(id)}"`) : rowHtml;

  // One resolved gap for every block row, read once rather than per block:
  // "space between blocks" is a property of the email, not of a block.
  const blockGap = resolveBlockSpacing(content.blockSpacing);

  const blockRow = (b: CampaignBlock) => {
    // Image blocks own their whole row: "bleed" must escape the 24px cell
    // padding, so they can't be nested in the shared padded text wrapper.
    if (b.kind === "image") {
      return tagRow(imageBlockRow(b, b.imageSlotId ? slotById.get(b.imageSlotId) : undefined, t, blockGap), b.id);
    }
    if (b.kind === "headerimage") {
      return tagRow(headerimageBlockRow(b, t, blockGap), b.id);
    }
    // Dispatch through a Record keyed on the kind union rather than a ternary
    // chain: TypeScript then REQUIRES an entry for every kind, so adding one to
    // CAMPAIGN_BLOCK_KINDS without writing its renderer fails the build instead
    // of silently rendering an empty paragraph.
    const render = INNER_BLOCK_RENDERERS[(b.kind ?? "text") as InnerBlockKind]
      // Defensive fallback: a campaign saved by a NEWER build can carry a kind
      // this one has never heard of (a rollback, or two deploys in flight).
      // Render it as text rather than throwing.
      ?? INNER_BLOCK_RENDERERS.text;
    const inner = render(b, t);
    if (!inner) return "";
    return tagRow(`<tr><td class="h-padding" style="padding:0 24px ${blockGap}px;">
       <div class="text-block" style="padding:15px;">${inner}</div>
     </td></tr>`, b.id);
  };

  // Secondary images — rows of 2 (stack on mobile via the secondary-cell class)
  let secondaryHtml = "";
  for (let i = 0; i < secondary.length; i += 2) {
    const left = secondary[i];
    const right = secondary[i + 1];
    secondaryHtml += `<tr><td class="h-padding" style="padding:0 24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
        <tr>
          ${imageCell(left?.url, "48.91%", t)}
          <td class="secondary-spacer" width="12" style="width:12px;font-size:0;">&nbsp;</td>
          ${right ? imageCell(right.url, "48.91%", t) : '<td class="secondary-cell" width="48.91%" style="width:48.91%;">&nbsp;</td>'}
        </tr>
      </table>
    </td></tr>`;
  }

  // CTA button
  const ctaHtml = `<tr><td class="h-padding" style="padding:0 24px 24px;" align="center">
    <a class="cta-link" href="${esc(ctaUrl)}" target="_blank" style="text-decoration:none;display:block;max-width:300px;">
      <span style="display:block;background:${ctaBg};color:${ctaFg};font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;padding:13px 14px;text-align:center;letter-spacing:0.12em;border-radius:2px;">${esc(
        content.cta.label,
      )}</span>
    </a>
  </td></tr>`;

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600&display=swap" rel="stylesheet">
<style>
  /* Edge-to-edge navy on every wrapper: html, body, the outer wrapper
     table, and the inner email container. Stops any default user-agent
     background from showing as a gray band above/below the email. */
  html, body{margin:0;padding:0;background:${t.shell};width:100%;}
  body{font-family:Inter,Arial,Helvetica,sans-serif;}
  img{border:0;outline:none;max-width:100%;display:block;}
  table{border-collapse:collapse;border-spacing:0;}
  .email-container{width:600px;max-width:600px;background:${t.shell};}

  /* Mobile overrides — kick in BELOW 600px viewports. Using 599px (not
     600px) so the desktop preview, which renders the iframe at exactly
     600px, stays in the desktop layout instead of straddling the
     breakpoint. */
  @media only screen and (max-width:599px) {
    .email-container{width:100% !important;max-width:100% !important;}
    .h-padding{padding-left:14px !important;padding-right:14px !important;}
    .text-block{padding:8px !important;}
    .text-block p{font-size:16px !important;line-height:1.6 !important;}
    /* Stack 2-up image grids on narrow screens. */
    .secondary-cell{display:block !important;width:100% !important;padding-bottom:10px !important;}
    .secondary-spacer{display:none !important;width:0 !important;}
    .cta-link{max-width:100% !important;}
    /* Pricing tables shrink instead of stacking: a stacked comparison table
       is no longer a comparison. Four columns at 11px in ~347px is tight,
       and that is the tradeoff the layout is making on purpose. */
    .email-table td{font-size:11px !important;padding:8px 5px !important;}
    .headerimage-h{font-size:22px !important;}
    /* headingSize, mobile. These three headers are re-sized above with
       !important, which an inline font-size loses to, so the block's choice
       has to arrive as a class. HEADING_SCALES applied to the mobile base. */
    .email-table td.hs-s{font-size:9px !important;}
    .email-table td.hs-l{font-size:14px !important;}
    .email-table td.hs-xl{font-size:17px !important;}
    .headerimage-h.hs-s{font-size:18px !important;}
    .headerimage-h.hs-l{font-size:28px !important;}
    .headerimage-h.hs-xl{font-size:34px !important;}
    /* Tighten new top header + hero overlay on narrow viewports. */
    /* Mobile — image 20% smaller than wrapper, vertically centered. */
    .logo-img{height:74px !important;margin-top:9px !important;}
    .logo-crop{height:92px !important;}
    /* The bottom override applies only to the DEFAULT placement. A
       positioned pill uses a percent top, which is already responsive, and
       forcing a bottom onto it would drag it back to the foot of the image. */
    .hero-cta-overlay:not(.hero-cta-free){bottom:14px !important;}
    .hero-cta-overlay{width:calc(100% - 28px) !important;}
    .hero-cta-overlay span{font-size:15px !important;line-height:1.3 !important;padding:9px 12px !important;}
    /* Image-block overlays — smaller type and padding so the scrim never
       swallows the photo on a narrow screen. */
    .img-overlay{padding:14px !important;}
    .img-overlay-headline{font-size:19px !important;}
    .img-overlay-headline.hs-s{font-size:15px !important;}
    .img-overlay-headline.hs-l{font-size:24px !important;}
    .img-overlay-headline.hs-xl{font-size:29px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${t.shell};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(content.previewText)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.shell};">
  <tr><td align="center" style="padding:0;">
    <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${t.shell};">
      ${renderTopBanner(content.topBanner ?? "", t)}
      ${content.showLogo === false ? "" : renderLogoStrip(content.logoUrl, t)}
      <tr><td style="height:16px;font-size:0;line-height:0;background:${t.shell};">&nbsp;</td></tr>
      ${heroHtml}
      ${promoHtml}
      ${introBlock ? blockRow(introBlock) : ""}
      ${secondaryHtml}
      ${closingBlocks.map(blockRow).join("")}
      ${ctaHtml}
    </table>
  </td></tr>
</table>
${selectable ? SELECT_SCRIPT : ""}</body></html>`;
}
