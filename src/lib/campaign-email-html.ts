// Renders a campaign email to standalone, email-client-safe HTML.
// Matches the Lunia template: 600px navy shell, Inter type, rounded text
// blocks, a 2-up secondary image row, a cream CTA button. All copy is real
// HTML text so it stays crisp at any zoom — never baked into images.
// Mobile-responsive: media queries stack the 2-up image rows and tighten
// paddings / font sizes on narrow viewports.
import type { CampaignBlock, CampaignContent } from "./types";

const NAVY = "#01253f";
const CREAM = "#f5f5e9";
/** Highlighter-style mark color for top-banner `**...**` fragments. */
const HIGHLIGHT = "#ffd800";

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render `**bold**` and `[text](url)` inline markup within a paragraph.
 *  Same scan-escape-wrap spirit as renderTopBanner's `**...**` handling below,
 *  extended to two match types in one left-to-right pass so a plain-text
 *  segment is never escaped twice or a markup segment left unescaped.
 *  `{{ merge_tag }}` personalization tokens need no special handling here —
 *  esc() doesn't touch `{`/`}`, so they pass through as literal text. */
function renderInline(raw: string): string {
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let result = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    result += esc(raw.slice(lastIndex, m.index));
    if (m[1] !== undefined) {
      result += `<strong>${esc(m[1])}</strong>`;
    } else {
      result += `<a href="${esc(m[3])}" style="color:inherit;text-decoration:underline;">${esc(m[2])}</a>`;
    }
    lastIndex = re.lastIndex;
  }
  result += esc(raw.slice(lastIndex));
  return result;
}

/** A block body → paragraphs (split on blank lines), newlines → <br>. */
function paragraphs(body: string, align: "left" | "center", italic: boolean, weight: "thin" | "extralight" | "light" | "normal" = "light"): string {
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
        `<p style="margin:0 0 16px;color:#ffffff;font-size:${size};font-weight:${fontWeight};${fontStyle}font-family:Inter,Arial,Helvetica,sans-serif;line-height:1.6;text-align:${align};">${renderInline(
          p,
        ).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

/** Big hero number + caption — social-proof / stat callout, centered. */
function statBlock(b: CampaignBlock): string {
  const value = b.statValue?.trim();
  if (!value) return "";
  return `<div style="text-align:center;padding:4px 0;">
    <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:36px;font-weight:300;color:${CREAM};line-height:1.15;">${esc(value)}</div>
    ${b.statLabel?.trim()
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${CREAM};opacity:0.75;margin-top:6px;">${esc(b.statLabel)}</div>`
      : ""}
  </div>`;
}

/** Dashed-border coupon callout — code + what it does, and/or a struck-
 *  through original price next to a new/free price (the "$87.99 value,
 *  FREE" pattern, which has no literal coupon code). Renders if either a
 *  code or an original price is present — a value-stack offer shouldn't
 *  require a code that doesn't exist. */
function discountBlock(b: CampaignBlock): string {
  const code = b.discountCode?.trim();
  const originalPrice = b.originalPrice?.trim();
  const newPrice = b.newPrice?.trim();
  if (!code && !originalPrice) return "";
  return `<div style="border:1.5px dashed ${CREAM};border-radius:8px;padding:16px;text-align:center;">
    ${code
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;letter-spacing:0.08em;color:${CREAM};">${esc(code)}</div>`
      : ""}
    ${originalPrice
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;${code ? "margin-top:8px;" : ""}">
           <span style="color:#ffffff;opacity:0.6;text-decoration:line-through;">${esc(originalPrice)}</span>
           ${newPrice ? `<span style="color:${CREAM};margin-left:8px;">${esc(newPrice)}</span>` : ""}
         </div>`
      : ""}
    ${b.discountDescription?.trim()
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;font-weight:300;color:#ffffff;margin-top:4px;">${esc(b.discountDescription)}</div>`
      : ""}
  </div>`;
}

/** Star rating + quote + attribution — social proof, centered. */
function testimonialBlock(b: CampaignBlock): string {
  const quote = b.testimonialQuote?.trim();
  if (!quote) return "";
  const stars = Math.min(5, Math.max(1, b.testimonialStars ?? 5));
  return `<div style="text-align:center;">
    <div style="color:${CREAM};font-size:16px;letter-spacing:2px;margin-bottom:10px;">${"★".repeat(stars)}</div>
    <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:17px;font-style:italic;font-weight:300;color:#ffffff;line-height:1.5;">"${esc(quote)}"</div>
    ${b.testimonialAuthor?.trim()
      ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${CREAM};margin-top:10px;">— ${esc(b.testimonialAuthor)}</div>`
      : ""}
  </div>`;
}

/** Results-over-time progression — a vertical list of time-labeled rows,
 *  each a bold label + claim, separated by thin dividers. */
function timelineBlock(b: CampaignBlock): string {
  const rows = (b.timelineRows ?? []).filter((r) => r.label?.trim() || r.text?.trim());
  if (rows.length === 0) return "";
  return rows
    .map(
      (r, i) => `<div style="padding:${i === 0 ? "0" : "12px"} 0 12px;${i > 0 ? `border-top:1px solid rgba(245,245,233,0.2);` : ""}">
        <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${CREAM};margin-bottom:4px;">${esc(r.label ?? "")}</div>
        <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:300;color:#ffffff;line-height:1.5;">${esc(r.text ?? "")}</div>
      </div>`,
    )
    .join("");
}

/** "Why we're different" trust argument — a 2-column grid of small image
 *  + caption pairs. imageUrl is a plain pasted URL (no asset picker); a
 *  row with no caption is dropped, an image with no url shows a solid
 *  placeholder (same pattern as imageCell()). */
function trustgridBlock(b: CampaignBlock): string {
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
        : `<div style="width:100%;aspect-ratio:1/1;background:#0c3354;border-radius:8px;margin-bottom:8px;"></div>`;
      return `<td width="48.91%" style="width:48.91%;vertical-align:top;">${img}<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;font-weight:300;color:#ffffff;line-height:1.4;">${esc(item.caption)}</div></td>`;
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
function comparisonBlock(b: CampaignBlock): string {
  const leftLabel = b.comparisonLeftLabel?.trim();
  const rightLabel = b.comparisonRightLabel?.trim();
  if (!leftLabel || !rightLabel) return "";
  const card = (label: string, price?: string, perk?: string, emphasized = false) => `
    <td width="48.91%" style="width:48.91%;vertical-align:top;background:${emphasized ? CREAM : "transparent"};border:1px solid ${emphasized ? CREAM : "rgba(245,245,233,0.3)"};border-radius:8px;padding:14px;">
      <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${emphasized ? NAVY : CREAM};margin-bottom:6px;">${esc(label)}</div>
      ${price?.trim() ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:${emphasized ? NAVY : "#ffffff"};margin-bottom:4px;">${esc(price)}</div>` : ""}
      ${perk?.trim() ? `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;font-weight:300;color:${emphasized ? NAVY : "#ffffff"};line-height:1.4;">${esc(perk)}</div>` : ""}
    </td>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
    <tr>
      ${card(leftLabel, b.comparisonLeftPrice, b.comparisonLeftPerk, false)}
      <td width="12" style="width:12px;font-size:0;">&nbsp;</td>
      ${card(rightLabel, b.comparisonRightPrice, b.comparisonRightPerk, true)}
    </tr>
  </table>`;
}

/** Benefit/ingredient list. One <p> per item (no flexbox/absolute
 *  positioning — table-less bullets via a literal dash keep this safe in
 *  Outlook, same conservative approach as the rest of this template). */
function checklistBlock(b: CampaignBlock): string {
  const items = (b.items ?? []).map((i) => i.trim()).filter(Boolean);
  if (items.length === 0) return "";
  return items
    .map(
      (item) =>
        `<p style="margin:0 0 10px;color:#ffffff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:300;line-height:1.5;"><span style="color:${CREAM};">—</span>&nbsp;&nbsp;${esc(item)}</p>`,
    )
    .join("");
}

/** Top banner above the logo. Caps Inter on white. Wrap a fragment with
 *  `**...**` to render that fragment as a navy pill (background NAVY, color
 *  CREAM). Empty/whitespace text → returns "" so the row is skipped. */
function renderTopBanner(text: string): string {
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
        return `<span style="background:${HIGHLIGHT};color:${NAVY};padding:2px 8px;border-radius:3px;">${safe}</span>`;
      }
      return safe;
    })
    .join("");
  return `<tr><td style="background:#ffffff;padding:12px 24px;text-align:left;font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;font-weight:400;letter-spacing:0.06em;text-transform:uppercase;color:${NAVY};line-height:1.4;">
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
function renderLogoStrip(url: string | null | undefined): string {
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
  return `<tr><td style="background:#ffffff;padding:0.5px 24px;text-align:left;border-top:1px solid rgba(0,0,0,0.08);">
    <div class="logo-crop" style="height:${WRAPPER_HEIGHT}px;overflow:hidden;line-height:0;">
      <img src="${esc(url)}" alt="Lunia Life" class="logo-img" style="display:block;height:${IMAGE_HEIGHT}px;width:auto;margin-top:${VERTICAL_CENTER}px;border:0 none;outline:none;box-shadow:none;background:transparent;-webkit-appearance:none;">
    </div>
  </td></tr>`;
}

function imageCell(url: string | null | undefined, width: string): string {
  // class="secondary-cell" lets the mobile media query stack these cells.
  if (!url) {
    return `<td class="secondary-cell" width="${width}" style="width:${width};vertical-align:top;"><div style="width:100%;aspect-ratio:1/1;background:#0c3354;border-radius:8px;"></div></td>`;
  }
  return `<td class="secondary-cell" width="${width}" style="width:${width};vertical-align:top;"><img src="${esc(
    url,
  )}" width="270" style="display:block;width:100%;height:auto;border-radius:8px;" alt=""></td>`;
}

/** Render the full campaign email as a standalone HTML document. */
export function renderCampaignEmail(content: CampaignContent): string {
  const subject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "";
  const hero = content.images.find((i) => i.role === "hero");
  const secondary = content.images.filter((i) => i.role === "secondary");
  const ctaUrl = content.cta.url || "#";

  // Layout: hero → promo band → blocks[0] → secondary images → blocks[1..] → CTA.
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
  const ctaIsNavy = content.cta.style === "navy";
  const ctaBg = ctaIsNavy ? NAVY : CREAM;
  const ctaFg = ctaIsNavy ? "#ffffff" : NAVY;
  const heroIsNavy = (content.cta.heroStyle ?? content.cta.style) === "navy";
  const heroBg = heroIsNavy ? NAVY : CREAM;
  const heroFg = heroIsNavy ? "#ffffff" : NAVY;
  const heroCtaLabel = content.cta.label?.trim();
  const heroOverlay = hero?.url && heroCtaLabel
    ? `<div class="hero-cta-overlay" style="position:absolute;left:50%;bottom:24px;transform:translateX(-50%);width:calc(100% - 48px);max-width:300px;">
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
         <div style="background:${CREAM};color:${NAVY};text-align:center;font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:14px 12px;border-radius:6px;">${esc(
           content.promoBand,
         )}</div>
       </td></tr>`
    : "";

  // A padded block — kind "text" (or unset) renders the original paragraph
  // flow; "stat"/"discount"/"checklist" render their own structured markup.
  // An empty/unfilled structured block (e.g. a freshly-added stat with no
  // value yet) renders nothing rather than an empty styled box.
  const blockRow = (b: CampaignBlock) => {
    const inner =
      b.kind === "stat" ? statBlock(b)
      : b.kind === "discount" ? discountBlock(b)
      : b.kind === "checklist" ? checklistBlock(b)
      : b.kind === "testimonial" ? testimonialBlock(b)
      : b.kind === "timeline" ? timelineBlock(b)
      : b.kind === "trustgrid" ? trustgridBlock(b)
      : b.kind === "comparison" ? comparisonBlock(b)
      : paragraphs(b.body, b.align, !!b.italic, b.weight ?? "light");
    if (!inner) return "";
    return `<tr><td class="h-padding" style="padding:0 24px 16px;">
       <div class="text-block" style="padding:15px;">${inner}</div>
     </td></tr>`;
  };

  // Secondary images — rows of 2 (stack on mobile via the secondary-cell class)
  let secondaryHtml = "";
  for (let i = 0; i < secondary.length; i += 2) {
    const left = secondary[i];
    const right = secondary[i + 1];
    secondaryHtml += `<tr><td class="h-padding" style="padding:0 24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
        <tr>
          ${imageCell(left?.url, "48.91%")}
          <td class="secondary-spacer" width="12" style="width:12px;font-size:0;">&nbsp;</td>
          ${right ? imageCell(right.url, "48.91%") : '<td class="secondary-cell" width="48.91%" style="width:48.91%;">&nbsp;</td>'}
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
  html, body{margin:0;padding:0;background:${NAVY};width:100%;}
  body{font-family:Inter,Arial,Helvetica,sans-serif;}
  img{border:0;outline:none;max-width:100%;display:block;}
  table{border-collapse:collapse;border-spacing:0;}
  .email-container{width:600px;max-width:600px;background:${NAVY};}

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
    /* Tighten new top header + hero overlay on narrow viewports. */
    /* Mobile — image 20% smaller than wrapper, vertically centered. */
    .logo-img{height:74px !important;margin-top:9px !important;}
    .logo-crop{height:92px !important;}
    .hero-cta-overlay{bottom:14px !important;width:calc(100% - 28px) !important;}
    .hero-cta-overlay span{font-size:15px !important;line-height:1.3 !important;padding:9px 12px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${NAVY};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(content.previewText)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${NAVY};">
  <tr><td align="center" style="padding:0;">
    <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${NAVY};">
      ${renderTopBanner(content.topBanner ?? "")}
      ${content.showLogo === false ? "" : renderLogoStrip(content.logoUrl)}
      <tr><td style="height:16px;font-size:0;line-height:0;background:${NAVY};">&nbsp;</td></tr>
      ${heroHtml}
      ${promoHtml}
      ${introBlock ? blockRow(introBlock) : ""}
      ${secondaryHtml}
      ${closingBlocks.map(blockRow).join("")}
      ${ctaHtml}
    </table>
  </td></tr>
</table>
</body></html>`;
}
