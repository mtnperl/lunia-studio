// Shared headless-Chromium launcher for server-side rendering (slide PNGs,
// email screenshots). @sparticuz/chromium on Vercel (Linux serverless);
// the full puppeteer package's bundled Chrome locally.
import "server-only";
import type { Browser } from "puppeteer-core";

export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const puppeteer = await import("puppeteer");
  // Full puppeteer's Browser type is structurally identical to puppeteer-core's.
  return (await puppeteer.launch({ headless: true })) as unknown as Browser;
}
