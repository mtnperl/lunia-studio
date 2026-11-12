import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getAssets: vi.fn(), patchAssetDetails: vi.fn(), checkRateLimit: vi.fn(), inspectAsset: vi.fn() }));
vi.mock("@/lib/kv", () => mocks);
vi.mock("@/lib/asset-review", () => ({ inspectAsset: mocks.inspectAsset }));
import { POST } from "./route";
const call = (body: unknown) => POST(new Request("http://localhost/api/assets/review", { method: "POST", body: JSON.stringify(body) }));
beforeEach(() => {
  vi.resetAllMocks(); mocks.checkRateLimit.mockResolvedValue(true);
  mocks.getAssets.mockResolvedValue([{ id: "a", assetType: "gen-z" }, { id: "b", assetType: "gen-z" }]);
});
describe("bounded image audit", () => {
  it("rejects oversized batches and unknown assets", async () => {
    expect((await call({ ids: Array.from({ length: 7 }, (_, i) => String(i)) })).status).toBe(400);
    expect((await call({ ids: ["missing"] })).status).toBe(404);
    expect(mocks.inspectAsset).not.toHaveBeenCalled();
  });
  it("saves successful reviews even if another image fails", async () => {
    mocks.inspectAsset.mockImplementation((asset) => asset.id === "a" ? Promise.resolve({ id: "a", textReview: { status: "typo", issues: ["sleap → sleep"] } }) : Promise.reject(new Error("Provider unavailable")));
    const data = await (await call({ ids: ["a", "b"] })).json();
    expect(data.results).toHaveLength(1); expect(data.failures).toHaveLength(1);
    expect(mocks.patchAssetDetails).toHaveBeenCalledWith(data.results);
    expect(data.results[0].textReview.status).toBe("typo");
  });
  it("does not manufacture passed results when the checker fails", async () => {
    mocks.inspectAsset.mockRejectedValue(new Error("No credentials"));
    const data = await (await call({ ids: ["a"] })).json();
    expect(data.results).toEqual([]); expect(data.failures[0].id).toBe("a");
  });
  it("honors rate limits before calling the model", async () => {
    mocks.checkRateLimit.mockResolvedValue(false);
    expect((await call({ ids: ["a"] })).status).toBe(429);
    expect(mocks.inspectAsset).not.toHaveBeenCalled();
  });
});
