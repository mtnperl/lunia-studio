// Campaign-email visual-regression suite.
//
// Renders the real renderCampaignEmail() HTML in headless Chromium at the
// 600px email shell width and asserts BOTH:
//   1. Hard layout: the document never scrolls horizontally (scrollWidth ≤
//      clientWidth) and no element's right edge crosses the shell — the email
//      equivalent of the slide bounds check.
//   2. Pixel diff against the approved baseline.
//
// No network: fixture images are exact-aspect data-URI placeholders, so this
// verifies the LAYOUT geometry the pipeline now guarantees. The crop math that
// produces those exact aspects is covered by email-image-engine.test.ts.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Browser } from "puppeteer";
import { EMAIL_FIXTURES } from "./fixtures/campaign-emails";
import { compareToBaseline } from "./harness";
import { renderCampaignEmail } from "@/lib/campaign-email-html";
import { EMAIL } from "@/lib/brand-tokens";

let browser: Browser;

beforeAll(async () => {
  const puppeteer = await import("puppeteer");
  browser = await puppeteer.launch({ headless: true });
});

afterAll(async () => {
  await browser?.close();
});

describe("campaign email renders", () => {
  for (const fixture of EMAIL_FIXTURES) {
    it(
      fixture.name,
      async () => {
        const html = renderCampaignEmail(fixture.content);
        const page = await browser.newPage();
        try {
          await page.setViewport({ width: EMAIL.shellWidth, height: 900, deviceScaleFactor: 1 });
          // "load" (fires on the load event), NOT "networkidle0": the email links
          // Google Fonts, and on CI the font connections keep the network from
          // going idle within the timeout — a flaky hang unrelated to layout.
          // Wait for the load event, then explicitly for fonts, with a bounded
          // fallback so a slow/blocked font CDN can never stall the run.
          await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
          await page.evaluate(
            () => Promise.race([
              document.fonts.ready.then(() => undefined),
              new Promise<void>((r) => setTimeout(r, 5_000)),
            ]),
          );

          // Hard layout assertion — no horizontal overflow past the shell.
          const overflow = await page.evaluate((shellWidth: number) => {
            const doc = document.documentElement;
            const horizontalScroll = doc.scrollWidth - doc.clientWidth;
            let widest = 0;
            for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
              widest = Math.max(widest, el.getBoundingClientRect().right);
            }
            return { horizontalScroll, widest, shellWidth };
          }, EMAIL.shellWidth);

          expect(
            overflow.horizontalScroll,
            `email scrolls horizontally by ${overflow.horizontalScroll}px`,
          ).toBeLessThanOrEqual(1);
          expect(
            overflow.widest,
            `an element extends to ${overflow.widest}px past the ${EMAIL.shellWidth}px shell`,
          ).toBeLessThanOrEqual(EMAIL.shellWidth + 1);

          const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewport({ width: EMAIL.shellWidth, height: fullHeight, deviceScaleFactor: 1 });
          const shot = (await page.screenshot({ type: "png", fullPage: true })) as Buffer;

          const result = compareToBaseline(`email/${fixture.name}`, shot);
          expect(
            result.status === "ok" || result.status === "created" || result.status === "updated",
            `pixel diff failed: ${JSON.stringify(result)}`,
          ).toBe(true);
        } finally {
          await page.close();
        }
      },
      60_000,
    );
  }
});
