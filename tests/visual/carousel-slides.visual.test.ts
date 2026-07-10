// Carousel slide visual-regression suite.
//
// For every fixture: navigate the render page, wait for the settle-and-fit
// loop, and assert BOTH:
//   1. Hard layout: window.__SLIDE_FIT.settled === true (no element painted
//      past the 1080×H slide bounds, nothing clipped by overflow:hidden).
//      This is the assertion that catches the overflow class of bug directly.
//   2. Pixel diff: screenshot matches the approved baseline within THRESHOLD.
//
// Requires a server serving the app at VISUAL_BASE_URL (default :3030). Run:
//   npm run test:visual            # compare against baselines
//   npm run test:visual:update     # (re)generate baselines after an approved change
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Browser } from "puppeteer";
import { CAROUSEL_FIXTURES } from "./fixtures/carousel-slides";
import { compareToBaseline, BASE_URL } from "./harness";
import { SLIDE } from "@/lib/brand-tokens";

let browser: Browser;

beforeAll(async () => {
  const puppeteer = await import("puppeteer");
  browser = await puppeteer.launch({ headless: true });
});

afterAll(async () => {
  await browser?.close();
});

describe("carousel slide renders", () => {
  for (const fixture of CAROUSEL_FIXTURES) {
    it(
      fixture.name,
      async () => {
        const height = fixture.props.reels ? SLIDE.height.reels : SLIDE.height.carousel;
        const encoded = Buffer.from(JSON.stringify(fixture.props)).toString("base64url");
        const url = `${BASE_URL}/render/carousel-slide?props=${encoded}`;

        const page = await browser.newPage();
        try {
          await page.setViewport({ width: SLIDE.width, height, deviceScaleFactor: 1 });
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
          await page.waitForFunction("window.__SLIDE_READY === true", { timeout: 60_000 });

          const fit = (await page.evaluate("window.__SLIDE_FIT")) as {
            settled: boolean;
            overflows: { tag: string; text: string; by: number }[];
            clipped: number;
          };

          // Hard layout assertion — the primary guard against overflow.
          expect(
            fit.settled,
            `layout not settled: overflows=${JSON.stringify(fit.overflows)} clipped=${fit.clipped}`,
          ).toBe(true);

          const shot = (await page.screenshot({
            type: "png",
            clip: { x: 0, y: 0, width: SLIDE.width, height },
          })) as Buffer;

          const result = compareToBaseline(`carousel/${fixture.name}`, shot);
          expect(
            result.status === "ok" || result.status === "created" || result.status === "updated",
            `pixel diff failed: ${JSON.stringify(result)}`,
          ).toBe(true);
        } finally {
          await page.close();
        }
      },
      90_000,
    );
  }
});
