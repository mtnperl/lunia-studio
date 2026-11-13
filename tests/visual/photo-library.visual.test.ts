import { afterAll, beforeAll, describe, expect, it } from "vitest";
import puppeteer, { type Browser } from "puppeteer";
import { build } from "vite";
import path from "node:path";
import type { AssetMetadata } from "../../src/lib/types";

let browser: Browser;
let bundle: string;
const review = { status: "passed" as const, hasText: false, text: "", issues: [], checkedAt: "2026-11-12", visualQuality: "strong" as const, qualityReason: "Natural skin texture" };
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#d6cbb9"/><circle cx="200" cy="185" r="70" fill="#656e59"/><text x="35" y="430" font-size="25">Evening reading</text></svg>')}`;
const fixtures: AssetMetadata[] = [
  { id: "stock", name: "Bedroom.jpg", url: image + "#stock", type: "image/jpeg", assetType: "lifestyle", uploadedAt: "2026-11-12", description: "A calm bedroom" },
  { id: "clean", name: "Reader_clean.jpg", url: image + "#clean", type: "image/jpeg", assetType: "gen-z", uploadedAt: "2026-11-12", description: "Reading in bed", familyId: "reader", width: 1080, height: 1350, textReview: review },
  { id: "caption", name: "Reader_caption.jpg", url: image + "#caption", type: "image/jpeg", assetType: "gen-z", uploadedAt: "2026-11-12", description: "Reading in bed with caption", familyId: "reader", width: 1080, height: 1080, textReview: { ...review, hasText: true, text: "Sleep better" } },
  { id: "typo", name: "Typo.jpg", url: image + "#typo", type: "image/jpeg", assetType: "gen-z", uploadedAt: "2026-11-12", description: "A misspelled sleep headline", textReview: { ...review, hasText: true, status: "typo", text: "Sleap better", issues: ["Sleap → Sleep"] } },
];

beforeAll(async () => {
  const result = await build({ configFile: false, logLevel: "silent", resolve: { alias: { "@": path.resolve("src") } }, oxc: { jsx: { runtime: "automatic" } }, build: { write: false, lib: { entry: path.resolve("tests/visual/fixtures/photo-library.tsx"), formats: ["iife"], name: "PhotoFixture" }, minify: false } });
  const output = Array.isArray(result) ? result[0].output : "output" in result ? result.output : [];
  bundle = output.flatMap((part) => part.type === "chunk" ? [part.code] : []).join("\n");
  browser = await puppeteer.launch({ headless: true });
});
afterAll(async () => { await browser?.close(); });

async function open(width = 360) {
  const page = await browser.newPage();
  let assets = structuredClone(fixtures);
  await page.setViewport({ width, height: 1000 });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    if (request.url().startsWith("data:")) { await request.continue(); return; }
    const url = new URL(request.url());
    if (url.pathname === "/api/assets") {
      await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify(assets) }); return;
    }
    if (url.pathname.startsWith("/api/assets/") && request.method() === "PATCH") {
      const data = JSON.parse(request.postData()!);
      const id = url.pathname.split("/").pop();
      const selected = assets.find((a) => a.id === id)!;
      assets = assets.map((a) => a.id === id || data.applyToFamily && a.familyId === selected.familyId ? { ...a, preference: data.preference } : a);
      await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ...selected, preference: data.preference }) }); return;
    }
    await request.respond({ status: 200, contentType: "text/html", body: `<html><head><style>:root{--border:#d5d3ce;--bg:#faf9f6;--surface:#eeece7;--text:#242b25;--muted:#6f756e;--accent:#587451;--accent-dim:#e0eadb;--error:#a32a28}body{margin:0;padding:8px;font-family:Arial}*{box-sizing:border-box}</style></head><body><div id="root"></div><output id="picked"></output><script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>` });
  });
  await page.goto("http://studio.test/", { waitUntil: "networkidle0" });
  await page.waitForSelector('[aria-label="Photo contact sheet"] button');
  return page;
}

describe("photo contact sheet in a browser", () => {
  it("puts Gen Z first, groups versions, and applies the chosen caption export", async () => {
    const page = await open();
    try {
      const cards = await page.$$('[aria-label="Photo contact sheet"] button');
      expect(cards).toHaveLength(2);
      expect(await cards[0].evaluate((el) => el.textContent)).toContain("Gen Z · Priority");
      await cards[0].click();
      await page.waitForFunction(() => document.getElementById("picked")?.textContent === "clean");
      await page.waitForSelector('[aria-label="Versions of selected photo"] button');
      const versions = await page.$$('[aria-label="Versions of selected photo"] button');
      await versions[1].click();
      await page.waitForFunction(() => document.getElementById("picked")?.textContent === "caption");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await page.close(); }
  });
  it("exposes typo details in All photos and prevents applying that version", async () => {
    const page = await open();
    try {
      await page.locator('button').filter((el) => el.textContent === "All photos").click();
      await page.locator('[aria-label="Photo contact sheet"] button').filter((el) => el.textContent?.includes("Typo found") ?? false).click();
      expect(await page.evaluate(() => document.getElementById("picked")?.textContent)).toBe("");
      expect(await page.evaluate(() => document.body.textContent)).toContain("Sleap → Sleep");
    } finally { await page.close(); }
  });
  it("archives the entire photo family and keeps browsing in place", async () => {
    const page = await open(800);
    try {
      await page.click('[aria-label="Photo contact sheet"] button');
      await page.locator('button').filter((el) => el.textContent === "Don't recommend").click();
      await page.waitForFunction(() => document.querySelectorAll('[aria-label="Photo contact sheet"] button').length === 1);
      expect(await page.evaluate(() => document.querySelector('[aria-label="Photo library"]') !== null)).toBe(true);
    } finally { await page.close(); }
  });
});
