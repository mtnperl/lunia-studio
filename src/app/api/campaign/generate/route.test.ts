import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getAssets: vi.fn(), patchAssetDetails: vi.fn(), checkRateLimit: vi.fn(), inspectAsset: vi.fn(), createContentMessage: vi.fn(), generateCampaignSlotImage: vi.fn() }));
vi.mock("@/lib/kv", () => mocks);
vi.mock("@/lib/asset-review", () => ({ inspectAsset: mocks.inspectAsset }));
vi.mock("@/lib/campaign-image", () => ({ generateCampaignSlotImage: mocks.generateCampaignSlotImage }));
vi.mock("@/lib/anthropic", async (original) => ({ ...await original<typeof import("@/lib/anthropic")>(), createContentMessage: mocks.createContentMessage }));
import { POST } from "./route";
const checked = { status: "passed", text: "", hasText: false, issues: [], visualQuality: "strong", qualityReason: "Natural photo", checkedAt: "2026-11-12" };
const photos = Array.from({ length: 3 }, (_, i) => ({ id: `genz-${i}`, name: `real-life-${i}.jpg`, url: `https://example.com/${i}.jpg`, type: "image/jpeg", assetType: "gen-z", uploadedAt: "2026-11-12", description: "A believable evening reading ritual", textReview: checked }));
function respond(images: object[]) {
  mocks.createContentMessage.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify({ subjectLines: ["Reading before bed", "Evening", "Night"], previewText: "A ritual", blocks: [{ body: "Read before bed" }, { body: "Take time to unwind" }], cta: "Explore", images }) }] });
}
const call = () => POST(new Request("http://localhost/api/campaign/generate", { method: "POST", body: JSON.stringify({ topic: "A reading ritual before bed" }) }));
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("FAL_KEY", "test");
  mocks.checkRateLimit.mockResolvedValue(true); mocks.getAssets.mockResolvedValue(photos.map((a) => ({ ...a })));
  mocks.generateCampaignSlotImage.mockResolvedValue("https://example.com/generated.jpg");
});
afterEach(() => vi.unstubAllEnvs());
describe("library-first campaign creation", () => {
  it("uses checked Gen Z choices without paying for replacement generations", async () => {
    respond(photos.map((a, i) => ({ role: i ? "secondary" : "hero", source: "asset", assetId: a.id, blockIndex: i ? 1 : 0 })));
    const response = await call();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.content.images.map((i: { source: string }) => i.source)).toEqual(["asset", "asset", "asset"]);
    expect(mocks.generateCampaignSlotImage).not.toHaveBeenCalled();
    const prompt = mocks.createContentMessage.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("choose Gen Z first");
  });
  it("does not offer confirmed typo assets to the campaign writer", async () => {
    mocks.getAssets.mockResolvedValue([{ ...photos[0], textReview: { ...checked, status: "typo", issues: ["sleap → sleep"] } }]);
    respond([0, 1, 2].map((i) => ({ role: i ? "secondary" : "hero", source: "generated", prompt: "A real evening scene", blockIndex: 0 })));
    expect((await call()).status).toBe(200);
    const prompt = mocks.createContentMessage.mock.calls[0][0].messages[0].content;
    expect(prompt).not.toContain('"id":"genz-0"');
  });
  it("rejects invented asset IDs and does not repeat one photo family", async () => {
    respond([{ role: "hero", source: "asset", assetId: "genz-0" }, { role: "secondary", source: "asset", assetId: "genz-0" }, { role: "secondary", source: "asset", assetId: "invented" }]);
    const data = await (await call()).json();
    expect(data.content.images.filter((i: { source: string }) => i.source === "asset")).toHaveLength(1);
    expect(mocks.generateCampaignSlotImage).toHaveBeenCalledTimes(2);
  });
});
