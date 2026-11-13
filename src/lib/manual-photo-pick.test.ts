import { expect, it, vi } from "vitest";
import { prepareManualPhoto } from "./manual-photo-pick";
import type { AssetMetadata } from "./types";
const photo: AssetMetadata = { id: "clean", name: "reader.jpg", url: "https://example.com/reader.jpg", assetType: "gen-z", type: "image/jpeg", uploadedAt: "2026-11-12", description: "Woman reading" };
const passed = { status: "passed" as const, hasText: true, text: "Sleep well", issues: [], checkedAt: "2026-11-12", visualQuality: "strong" as const, qualityReason: "Natural light" };
it("applies a manually chosen clean Gen Z photo without a model round trip", async () => {
  const check = vi.fn(); expect(await prepareManualPhoto(photo, check)).toBe(photo); expect(check).not.toHaveBeenCalled();
});
it("checks an unchecked caption as part of the selection", async () => {
  const check = vi.fn().mockResolvedValue(passed);
  expect((await prepareManualPhoto({ ...photo, description: "Text overlay reads sleep well" }, check)).textReview).toEqual(passed);
  expect(check).toHaveBeenCalledWith("clean");
});
it("blocks confirmed typos even in Gen Z", async () => {
  await expect(prepareManualPhoto({ ...photo, textReview: { ...passed, status: "typo", issues: ["Sleap → Sleep"] } }, vi.fn())).rejects.toThrow("Sleap");
});
it("does not apply a caption when checking fails", async () => {
  await expect(prepareManualPhoto({ ...photo, description: "Text overlay reads sleep well" }, vi.fn().mockRejectedValue(new Error("Check failed")))).rejects.toThrow("Check failed");
});
