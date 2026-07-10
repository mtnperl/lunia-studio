// Render a single carousel content slide to a PNG by screenshotting the
// app's own /render/carousel-slide page (the REAL <ContentSlide> /
// <EditorialContentSlide> components) in headless Chromium.
//
// This replaced the Remotion renderStill path, which screenshotted a
// pre-built bundle and raced FitBox's second-pass layout scaling — the source
// of the intermittent out-of-bounds renders. Here the page itself signals
// readiness (fonts decoded, images decoded, fit loop settled) via
// window.__SLIDE_READY before we capture, and reports any residual overflow
// via window.__SLIDE_FIT (surfaced in the x-slide-fit response header, which
// the visual-regression harness asserts on).
import { launchBrowser } from "@/lib/headless-browser";
import { SLIDE } from "@/lib/brand-tokens";

export const maxDuration = 120;

function originFromRequest(req: Request): string {
  // Same convention as email-review/generate-images-batch: Vercel sets
  // x-forwarded-*; local dev falls back to the request URL's host.
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

export async function POST(req: Request): Promise<Response> {
  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    // Body is the slide's props: { headline, body, citation, graphic, brandStyle, … }.
    const inputProps = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const height = inputProps.reels ? SLIDE.height.reels : SLIDE.height.carousel;

    const encoded = Buffer.from(JSON.stringify(inputProps)).toString("base64url");
    const url = `${originFromRequest(req)}/render/carousel-slide?props=${encoded}`;

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: SLIDE.width, height, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction("window.__SLIDE_READY === true", { timeout: 60_000 });

    const fit = (await page.evaluate("window.__SLIDE_FIT")) as {
      settled: boolean;
      fitScale: number;
      overflows: unknown[];
    } | null;
    if (fit && !fit.settled) {
      // Fail-open (still return the PNG — it's clipped, not spilling), but
      // make the condition observable to callers and the regression harness.
      console.warn("[api/carousel-v2/render-slide] fit did not settle:", JSON.stringify(fit));
    }

    const buffer = (await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: SLIDE.width, height },
    })) as Uint8Array;

    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "x-slide-fit": JSON.stringify(fit ?? { settled: false, reason: "no report" }),
      },
    });
  } catch (err) {
    console.error("[api/carousel-v2/render-slide]", err);
    const message = err instanceof Error ? err.message : "Render failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await browser?.close().catch(() => {});
  }
}
