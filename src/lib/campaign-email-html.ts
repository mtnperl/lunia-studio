// Renders a campaign email to standalone, email-client-safe HTML.
// Matches the Lunia template: 600px navy shell, Inter type, rounded text
// blocks, a 2-up secondary image row, a cream CTA button. All copy is real
// HTML text so it stays crisp at any zoom — never baked into images.
// Mobile-responsive: media queries stack the 2-up image rows and tighten
// paddings / font sizes on narrow viewports.
import type { CampaignContent } from "./types";

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

/** A block body → paragraphs (split on blank lines), newlines → <br>. */
function paragraphs(body: string, align: "left" | "center", italic: boolean): string {
  const fontStyle = italic ? "font-style:italic;" : "";
  const size = italic ? "16px" : "18.7px";
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;color:#ffffff;font-size:${size};font-weight:300;${fontStyle}font-family:Inter,Arial,Helvetica,sans-serif;line-height:1.4;text-align:${align};">${esc(
          p,
        ).replace(/\n/g, "<br>")}</p>`,
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
  const NATURAL = 163;
  const CROP_TOP = 10;
  const CROP_BOTTOM = 10;
  const wrapperHeight = NATURAL - CROP_TOP - CROP_BOTTOM;
  return `<tr><td style="background:#ffffff;padding:0.5px 24px;text-align:left;">
    <div class="logo-crop" style="height:${wrapperHeight}px;overflow:hidden;line-height:0;">
      <img src="${esc(url)}" alt="Lunia Life" class="logo-img" style="display:block;height:${NATURAL}px;width:auto;margin-top:-${CROP_TOP}px;border:0 none;outline:none;box-shadow:none;background:transparent;-webkit-appearance:none;">
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
  const heroCtaLabel = content.cta.label?.trim();
  const heroOverlay = hero?.url && heroCtaLabel
    ? `<div class="hero-cta-overlay" style="position:absolute;left:50%;bottom:24px;transform:translateX(-50%);width:calc(100% - 48px);max-width:300px;">
         <span style="display:block;background:${CREAM};color:${NAVY};font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;line-height:44px;height:44px;text-align:center;letter-spacing:0.12em;border-radius:2px;text-transform:uppercase;">${esc(heroCtaLabel)} →</span>
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

  // A padded text block
  const blockRow = (b: { body: string; align: "left" | "center"; italic?: boolean }) =>
    `<tr><td class="h-padding" style="padding:0 24px 16px;">
       <div class="text-block" style="padding:15px;">${paragraphs(b.body, b.align, !!b.italic)}</div>
     </td></tr>`;

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
      <span style="display:block;background:${CREAM};color:${NAVY};font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;line-height:48px;height:48px;text-align:center;letter-spacing:0.12em;border-radius:2px;">${esc(
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
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
    .text-block p{font-size:16px !important;line-height:1.45 !important;}
    /* Stack 2-up image grids on narrow screens. */
    .secondary-cell{display:block !important;width:100% !important;padding-bottom:10px !important;}
    .secondary-spacer{display:none !important;width:0 !important;}
    .cta-link{max-width:100% !important;}
    /* Tighten new top header + hero overlay on narrow viewports. */
    /* Mobile mirrors desktop's small crop — 7px top + 7px bottom. */
    .logo-img{height:116px !important;margin-top:-7px !important;}
    .logo-crop{height:102px !important;}
    .hero-cta-overlay{bottom:14px !important;width:calc(100% - 28px) !important;}
    .hero-cta-overlay span{font-size:15px !important;line-height:38px !important;height:38px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${NAVY};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(content.previewText)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${NAVY};">
  <tr><td align="center" style="padding:0;">
    <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${NAVY};">
      ${renderTopBanner(content.topBanner ?? "")}
      ${renderLogoStrip(content.logoUrl)}
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
