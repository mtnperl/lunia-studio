import { NextRequest } from "next/server";

let browserPromise: Promise<import("puppeteer").Browser> | null = null;

async function getBrowser() {
  if (process.env.VERCEL) {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1080, height: 1350 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    if (!browserPromise) {
      const puppeteer = await import("puppeteer");
      browserPromise = puppeteer.default.launch({ headless: true });
    }
    return browserPromise;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { slideIndex, html } = await req.json();

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1080px; height: 1350px; overflow: hidden; }
  </style>
</head>
<body>${html}</body>
</html>`;

    const browser = await getBrowser();
    const page = await (await browser).newPage();
    await page.setViewport({ width: 1080, height: 1350 });
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));
    const screenshot = await page.screenshot({ type: "png" });
    await page.close();

    return new Response(Buffer.from(screenshot), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="lunia-carousel-slide-${slideIndex + 1}.png"`,
      },
    });
  } catch (err) {
    console.error("[api/carousel/export]", err);
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}

export const maxDuration = 30;
