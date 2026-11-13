import { afterEach, expect, it, vi } from "vitest";
vi.mock("sharp", () => { throw new Error("libvips shared library unavailable"); });
vi.mock("./anthropic", () => ({
  hasContentModelProvider: () => true, CRAFT_MODEL: "test",
  createContentMessage: vi.fn().mockResolvedValue({}),
  extractText: () => JSON.stringify({ status: "passed", hasText: false, text: "", issues: [], visualQuality: "strong", qualityReason: "Natural light" }),
}));
import { inspectAsset } from "./asset-review";
afterEach(() => vi.unstubAllGlobals());
it("keeps proofreading available when native dimension extraction fails on Vercel", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]))));
  const result = await inspectAsset({ id: "photo", name: "photo.jpg", url: "https://test.public.blob.vercel-storage.com/photo.jpg", type: "image/jpeg", assetType: "gen-z", uploadedAt: "2026-11-12" });
  expect(result.textReview.status).toBe("passed");
});
