// Renders a campaign email to standalone, email-client-safe HTML.
// Matches the Lunia template: 600px navy shell, Inter type, rounded text
// blocks, a 2-up secondary image row, a cream CTA button. All copy is real
// HTML text so it stays crisp at any zoom — never baked into images.
import type { CampaignContent } from "./types";

const NAVY = "#01253f";
const CREAM = "#f5f5e9";
const PAGE_BG = "#f0f1f5";

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

function imageCell(url: string | null | undefined, width: string): string {
  if (!url) {
    return `<td width="${width}" style="width:${width};vertical-align:top;"><div style="width:100%;aspect-ratio:1/1;background:#0c3354;border-radius:8px;"></div></td>`;
  }
  return `<td width="${width}" style="width:${width};vertical-align:top;"><img src="${esc(
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

  // Hero
  const heroHtml = hero?.url
    ? `<tr><td style="padding:0 24px 16px;">
         <a href="${esc(ctaUrl)}" target="_blank" style="text-decoration:none;">
           <img src="${esc(hero.url)}" width="552" style="display:block;width:100%;height:auto;border-radius:8px;" alt="">
         </a>
       </td></tr>`
    : "";

  // Promo band
  const promoHtml = content.promoBand?.trim()
    ? `<tr><td style="padding:0 24px 16px;">
         <div style="background:${CREAM};color:${NAVY};text-align:center;font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:14px 12px;border-radius:6px;">${esc(
           content.promoBand,
         )}</div>
       </td></tr>`
    : "";

  // A padded text block
  const blockRow = (b: { body: string; align: "left" | "center"; italic?: boolean }) =>
    `<tr><td style="padding:0 24px 16px;">
       <div style="padding:15px;">${paragraphs(b.body, b.align, !!b.italic)}</div>
     </td></tr>`;

  // Secondary images — rows of 2
  let secondaryHtml = "";
  for (let i = 0; i < secondary.length; i += 2) {
    const left = secondary[i];
    const right = secondary[i + 1];
    secondaryHtml += `<tr><td style="padding:0 24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
        <tr>
          ${imageCell(left?.url, "48.91%")}
          <td width="12" style="width:12px;font-size:0;">&nbsp;</td>
          ${right ? imageCell(right.url, "48.91%") : '<td width="48.91%" style="width:48.91%;">&nbsp;</td>'}
        </tr>
      </table>
    </td></tr>`;
  }

  // CTA button
  const ctaHtml = `<tr><td style="padding:0 24px 24px;" align="center">
    <a href="${esc(ctaUrl)}" target="_blank" style="text-decoration:none;display:block;max-width:300px;">
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
<style>body{margin:0;padding:0;}img{border:0;outline:none;}</style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(content.previewText)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG};">
  <tr><td align="center" style="padding:24px 0;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${NAVY};">
      <tr><td style="height:24px;font-size:0;">&nbsp;</td></tr>
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
