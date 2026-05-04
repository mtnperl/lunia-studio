import { NextRequest } from "next/server";
import { CONTENT_MODEL, CONTENT_THINKING_BUDGET, CONTENT_MAX_TOKENS_SHORT } from "@/lib/anthropic";

// ─── Request shape ────────────────────────────────────────────────────────────

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
  hookHeadline?: string;
  hookSubline?: string;
  slides: SlideData[];
}

// ─── Claude-generated guide shape ─────────────────────────────────────────────

interface GuideSection {
  heading: string;
  body: string;
  callout?: string; // highlighted stat or tip
}

interface GeneratedGuide {
  title: string;
  subtitle: string;
  intro: string;
  sections: GuideSection[];
  protocol: {
    heading: string;
    steps: string[];
  };
}

// ─── Claude prompt ─────────────────────────────────────────────────────────────

function buildPrompt(data: PDFRequest): string {
  const slideLines = data.slides
    .map((s, i) => `Slide ${i + 1} — ${s.headline}: ${s.body}${s.citation ? ` (Source: ${s.citation})` : ""}`)
    .join("\n");

  return `You are a content strategist and wellness writer for Lunia Life, a premium sleep supplement brand. A follower commented on an Instagram engagement post and is receiving this PDF guide as a direct message.

CAROUSEL CONTEXT
Topic: ${data.topic}
Hook: ${data.hookHeadline ?? ""} — ${data.hookSubline ?? ""}
CTA promise to followers: "${data.ctaHeadline}"
${data.slides.length} carousel slides teased:
${slideLines}

YOUR TASK
Write a comprehensive PDF guide that DELIVERS on the CTA promise. This is the full breakdown the follower was promised. It should feel like a premium, science-backed resource — not a sales pitch.

STRUCTURE RULES
- Title: Short, punchy, ALL CAPS. What they're receiving (e.g. "THE COMPLETE TESTOSTERONE & SLEEP PROTOCOL")
- Subtitle: One sentence — the core promise of the guide
- Intro: 2–3 sentences. Acknowledge what the carousel teased, then go deeper. No fluff.
- Sections: 4–5 sections. Each expands significantly beyond the carousel slide. Include mechanisms, research, and nuance. Body = 3–5 sentences. Add a callout (bold stat, key insight, or science note) where it adds punch.
- Protocol: The actionable payoff. 5–7 specific, numbered steps they can implement tonight or this week. Be concrete — times, durations, numbers.
- Lunia Life mention: ONE natural mention in the protocol section only (e.g. "Lunia Life's sleep formula supports..."). Never in sections. Never salesy.

TONE
- Science-backed but accessible. Smart, not clinical.
- Use "may support", "research suggests", "associated with" — no medical claims.
- No em dashes. No filler phrases like "In conclusion" or "It's important to note".
- Direct and confident. The follower chose to engage — respect that.

Return ONLY valid JSON, no other text:
{
  "title": "string",
  "subtitle": "string",
  "intro": "string",
  "sections": [
    { "heading": "string", "body": "string", "callout": "string or null" },
    { "heading": "string", "body": "string", "callout": "string or null" },
    { "heading": "string", "body": "string", "callout": "string or null" },
    { "heading": "string", "body": "string", "callout": "string or null" }
  ],
  "protocol": {
    "heading": "string",
    "steps": ["string", "string", "string", "string", "string"]
  }
}`;
}

// ─── Call Claude ───────────────────────────────────────────────────────────────

async function generateGuide(data: PDFRequest): Promise<GeneratedGuide> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: { type: "enabled", budget_tokens: CONTENT_THINKING_BUDGET },
      messages: [{ role: "user", content: buildPrompt(data) }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  interface AnthropicResponse {
    content: Array<{ type: string; text?: string }>;
  }
  const json = await res.json() as AnthropicResponse;
  const textBlock = json.content.find((b) => b.type === "text");
  const raw = textBlock?.text ?? "";
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned) as GeneratedGuide;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

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

// ─── HTML template ────────────────────────────────────────────────────────────

const bg   = "#E8E3D8";
const teal = "#1e7a8a";
const navy = "#1a2535";

const pageFooter = (starSize: number) => `
  <div class="foot">
    <div class="stars">${starsMarkup(starSize, 0.5)}</div>
    <div class="wm">LUNIA LIFE</div>
  </div>`;

function buildHtml(guide: GeneratedGuide): string {
  // Cover page
  const coverPage = `
<div class="page cover">
  <div class="content-wrap cover-content">
    <div class="cover-eyebrow">LUNIA LIFE PRESENTS</div>
    <h1 class="cover-title">${esc(guide.title)}</h1>
    <p class="cover-subtitle">${esc(guide.subtitle)}</p>
    <p class="cover-intro">${esc(guide.intro)}</p>
  </div>
  ${pageFooter(80)}
</div>`;

  // Section pages
  const sectionPages = guide.sections.map((sec, i) => `
<div class="page section-page">
  <div class="arrows">${arrowsMarkup()}</div>
  <div class="content-wrap">
    <div class="section-num">0${i + 1}</div>
    <h2 class="section-heading">${esc(sec.heading)}</h2>
    <div class="section-body">${esc(sec.body)}</div>
    ${sec.callout ? `<div class="callout">${esc(sec.callout)}</div>` : ""}
  </div>
  ${pageFooter(52)}
</div>`).join("");

  // Protocol page
  const protocolSteps = guide.protocol.steps.map((step, i) => `
    <div class="step">
      <div class="step-num">${String(i + 1).padStart(2, "0")}</div>
      <div class="step-text">${esc(step)}</div>
    </div>`).join("");

  const protocolPage = `
<div class="page protocol-page">
  <div class="content-wrap">
    <div class="section-num protocol-label">PROTOCOL</div>
    <h2 class="section-heading">${esc(guide.protocol.heading)}</h2>
    <div class="steps">${protocolSteps}</div>
  </div>
  ${pageFooter(52)}
</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;1,400;1,600&display=swap" rel="stylesheet">
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

    .content-wrap {
      flex: 1;
      padding: 60px 64px 24px 64px;
      display: flex;
      flex-direction: column;
    }

    /* ── Cover ─────────────────── */
    .cover-content { justify-content: flex-start; }

    .cover-eyebrow {
      font-family: 'Jost', sans-serif;
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 0.38em;
      text-transform: uppercase;
      color: ${teal};
      opacity: 0.7;
      margin-bottom: 20px;
    }
    .cover-title {
      font-family: 'Jost', sans-serif;
      font-size: 44pt;
      font-weight: 700;
      color: ${teal};
      text-transform: uppercase;
      letter-spacing: 0.03em;
      line-height: 1.06;
      margin-bottom: 20px;
    }
    .cover-subtitle {
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 15pt;
      color: ${navy};
      opacity: 0.75;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .cover-intro {
      font-family: 'Jost', sans-serif;
      font-size: 12pt;
      color: ${navy};
      line-height: 1.75;
      opacity: 0.85;
      max-width: 460px;
    }

    /* ── Section pages ─────────── */
    .arrows {
      position: absolute;
      top: 44px;
      right: 58px;
    }
    .section-num {
      font-family: 'Jost', sans-serif;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.22em;
      color: ${teal};
      opacity: 0.55;
      margin-bottom: 10px;
    }
    .section-heading {
      font-family: 'Jost', sans-serif;
      font-size: 25pt;
      font-weight: 700;
      color: ${teal};
      text-transform: uppercase;
      letter-spacing: 0.055em;
      line-height: 1.18;
      margin-bottom: 28px;
      padding-right: 52px;
    }
    .section-body {
      font-family: 'Jost', sans-serif;
      font-size: 13pt;
      color: ${navy};
      line-height: 1.78;
      flex: 1;
    }
    .callout {
      margin-top: 28px;
      padding: 16px 20px;
      border-left: 3px solid ${teal};
      background: rgba(30,122,138,0.06);
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 13pt;
      color: ${navy};
      line-height: 1.55;
    }

    /* ── Protocol page ─────────── */
    .protocol-label { margin-bottom: 10px; }
    .steps { margin-top: 8px; }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 20px;
    }
    .step-num {
      font-family: 'Jost', sans-serif;
      font-size: 9pt;
      font-weight: 700;
      color: ${teal};
      letter-spacing: 0.12em;
      min-width: 28px;
      padding-top: 3px;
      flex-shrink: 0;
    }
    .step-text {
      font-family: 'Jost', sans-serif;
      font-size: 12.5pt;
      color: ${navy};
      line-height: 1.65;
    }

    /* ── Footer ────────────────── */
    .foot {
      height: 96px;
      position: relative;
      padding: 0 64px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .wm {
      position: absolute;
      left: 50%;
      bottom: 28px;
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
  ${sectionPages}
  ${protocolPage}
</body>
</html>`;
}

// ─── Puppeteer ────────────────────────────────────────────────────────────────

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

    // Step 1: generate the guide content with Claude
    const guide = await generateGuide(data);

    // Step 2: render to PDF with Puppeteer
    const html = buildHtml(guide);
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    await page.close();
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

export const maxDuration = 300;
