import { NextRequest } from "next/server";

interface SlideData {
  headline: string;
  body: string;
  citation?: string;
}

interface PDFRequest {
  topic: string;
  ctaHeadline: string;
  followLine?: string;
  commentKeyword?: string;
  slides: SlideData[];
}

// ─── Lunia Life star pyramid SVG (same geometry as LuniaLogo.tsx) ─────────────

function sparkleD(cx: number, cy: number, r: number): string {
  return [
    `M${cx},${cy - r}`,
    `Q${cx},${cy} ${cx + r},${cy}`,
    `Q${cx},${cy} ${cx},${cy + r}`,
    `Q${cx},${cy} ${cx - r},${cy}`,
    `Q${cx},${cy} ${cx},${cy - r}Z`,
  ].join(" ");
}

function starsMarkup(size: number, opacity: number): string {
  const r = 44;
  const stars = [
    { cx: 132, cy: 44 },  { cx: 220, cy: 44 },
    { cx: 132, cy: 132 }, { cx: 220, cy: 132 },
    { cx: 44,  cy: 220 }, { cx: 132, cy: 220 }, { cx: 220, cy: 220 }, { cx: 308, cy: 220 },
  ];
  const h = Math.round(size * 264 / 352);
  const paths = stars.map(s => `<path d="${sparkleD(s.cx, s.cy, r)}"/>`).join("");
  return `<svg width="${size}" height="${h}" viewBox="0 0 352 264" fill="#4a6870" fill-opacity="${opacity}" style="display:block;">${paths}</svg>`;
}

// Three right-pointing triangles (top-right corner of content pages)
function arrowsMarkup(): string {
  return `<svg width="38" height="12" viewBox="0 0 38 12" fill="#1e7a8a" fill-opacity="0.6" style="display:block;">
    <polygon points="0,0 10,6 0,12"/>
    <polygon points="14,0 24,6 14,12"/>
    <polygon points="28,0 38,6 28,12"/>
  </svg>`;
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Bold the first sentence of carousel body copy
function formatBody(body: string): string {
  const stop = body.search(/[.!?]\s/);
  if (stop > 0) {
    return `<strong>${esc(body.slice(0, stop + 1))}</strong>${esc(body.slice(stop + 1))}`;
  }
  return `<strong>${esc(body)}</strong>`;
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(data: PDFRequest): string {
  const bg   = "#E8E3D8";
  const teal = "#1e7a8a";
  const navy = "#1a2535";

  const coverPage = `
<div class="page cover">
  <div class="content-wrap">
    <h1 class="cover-title">${esc(data.ctaHeadline)}</h1>
    <p class="cover-sub">
      <em>Comment the keyword below and we will send it to you.</em><br>
      <strong>@lunia_life</strong>
    </p>
  </div>
  <div class="foot">
    <div class="stars">${starsMarkup(72, 0.55)}</div>
    <div class="wm">LUNIA LIFE</div>
  </div>
</div>`;

  const contentPages = data.slides.map((slide, i) => `
<div class="page content">
  <div class="arrows">${arrowsMarkup()}</div>
  <div class="content-wrap">
    <h2 class="slide-title">#${i + 1}: ${esc(slide.headline)}</h2>
    <div class="slide-body">
      <p>${formatBody(slide.body)}</p>
      ${slide.citation ? `<p class="citation">${esc(slide.citation)}</p>` : ""}
    </div>
  </div>
  <div class="foot">
    <div class="stars">${starsMarkup(52, 0.5)}</div>
    <div class="wm">LUNIA LIFE</div>
  </div>
</div>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,400;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;1,400;1,600&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 210mm; background: ${bg}; }

    .page {
      width: 210mm;
      height: 297mm;
      background: ${bg};
      position: relative;
      overflow: hidden;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .page:last-child { page-break-after: auto; }

    /* Flexible content area */
    .content-wrap {
      flex: 1;
      padding: 64px 62px 24px 62px;
      display: flex;
      flex-direction: column;
    }

    /* ── Cover ─────────────────── */
    .cover .cover-title {
      font-family: 'Jost', sans-serif;
      font-size: 52pt;
      font-weight: 700;
      color: ${teal};
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.08;
      margin-bottom: 36px;
    }
    .cover .cover-sub {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16pt;
      line-height: 1.65;
      color: ${teal};
    }
    .cover .cover-sub strong {
      font-weight: 600;
      font-style: normal;
    }

    /* ── Content pages ─────────── */
    .content .arrows {
      position: absolute;
      top: 44px;
      right: 56px;
    }
    .slide-title {
      font-family: 'Jost', sans-serif;
      font-size: 27pt;
      font-weight: 700;
      color: ${teal};
      text-transform: uppercase;
      letter-spacing: 0.055em;
      line-height: 1.18;
      margin-bottom: 36px;
      padding-right: 56px; /* clear the arrows */
    }
    .slide-body {
      font-family: 'Jost', sans-serif;
      font-size: 14pt;
      color: ${navy};
      line-height: 1.75;
      flex: 1;
    }
    .slide-body strong { font-weight: 700; }
    .citation {
      margin-top: 36px;
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 10.5pt;
      color: ${navy};
      opacity: 0.6;
      line-height: 1.55;
    }

    /* ── Footer (logo + watermark) */
    .foot {
      height: 100px;
      position: relative;
      padding: 0 62px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .wm {
      position: absolute;
      left: 50%;
      bottom: 30px;
      transform: translateX(-50%);
      font-family: 'Jost', sans-serif;
      font-size: 8pt;
      font-weight: 400;
      letter-spacing: 0.38em;
      text-transform: uppercase;
      color: ${navy};
      opacity: 0.18;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  ${coverPage}
  ${contentPages}
</body>
</html>`;
}

// ─── Puppeteer (local dev + Vercel) ──────────────────────────────────────────

async function getBrowser() {
  if (process.env.VERCEL) {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 794, height: 1123 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({ headless: true });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as PDFRequest;
    const html = buildHtml(data);

    const browser = await getBrowser();
    const page = await browser.newPage();
    // "load" instead of "networkidle0" — avoids hanging on slow Google Fonts CDN.
    // The font link has display=swap so missing fonts fall back gracefully.
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    await page.close();
    // On Vercel each request gets a fresh browser; close it to free memory
    if (process.env.VERCEL) await browser.close();

    const slug = (data.topic ?? "guide")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lunia-guide-${slug}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-pdf]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export const maxDuration = 30;
