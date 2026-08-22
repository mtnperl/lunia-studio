import { describe, it, expect } from "vitest";
import { collectBlockImageUrls, setBlockImageUrls, refKey } from "./campaign-block-images";
import type { CampaignBlock } from "./types";

const block = (over: Partial<CampaignBlock> = {}): CampaignBlock => ({
  id: "b1", body: "", align: "left", kind: "text", ...over,
});

describe("collectBlockImageUrls", () => {
  it("finds trustgrid image urls", () => {
    const refs = collectBlockImageUrls([
      block({ id: "t", kind: "trustgrid", trustItems: [
        { imageUrl: "https://fal.example/a.png", caption: "a" },
        { imageUrl: "https://fal.example/b.png", caption: "b" },
      ] }),
    ]);
    expect(refs).toEqual([
      { blockId: "t", path: "trustItems[0]", url: "https://fal.example/a.png" },
      { blockId: "t", path: "trustItems[1]", url: "https://fal.example/b.png" },
    ]);
  });

  it("skips cells with no image, preserving the index of those that have one", () => {
    const refs = collectBlockImageUrls([
      block({ id: "t", kind: "trustgrid", trustItems: [
        { caption: "no image" },
        { imageUrl: "https://fal.example/b.png", caption: "b" },
      ] }),
    ]);
    expect(refs).toEqual([{ blockId: "t", path: "trustItems[1]", url: "https://fal.example/b.png" }]);
  });

  it("skips whitespace-only urls", () => {
    const refs = collectBlockImageUrls([
      block({ id: "t", kind: "trustgrid", trustItems: [{ imageUrl: "   ", caption: "a" }] }),
    ]);
    expect(refs).toEqual([]);
  });

  it("returns nothing for blocks with no images", () => {
    expect(collectBlockImageUrls([block({ body: "text" })])).toEqual([]);
    expect(collectBlockImageUrls([])).toEqual([]);
  });
});

describe("setBlockImageUrls", () => {
  it("round-trips collected refs through replacement", () => {
    const blocks = [
      block({ id: "t", kind: "trustgrid", trustItems: [
        { imageUrl: "https://fal.example/a.png", caption: "a" },
        { imageUrl: "https://fal.example/b.png", caption: "b" },
      ] }),
    ];
    const refs = collectBlockImageUrls(blocks);
    const map = new Map(refs.map((r) => [refKey(r.blockId, r.path), r.url.replace("fal.example", "blob.example")]));
    const out = setBlockImageUrls(blocks, map);
    expect(out[0]!.trustItems!.map((t) => t.imageUrl)).toEqual([
      "https://blob.example/a.png",
      "https://blob.example/b.png",
    ]);
  });

  it("keeps the original url when a replacement is missing", () => {
    // Mirroring can fail or be capped. A rotting image beats a blank one.
    const blocks = [
      block({ id: "t", kind: "trustgrid", trustItems: [
        { imageUrl: "https://fal.example/a.png", caption: "a" },
        { imageUrl: "https://fal.example/b.png", caption: "b" },
      ] }),
    ];
    const out = setBlockImageUrls(blocks, new Map([[refKey("t", "trustItems[0]"), "https://blob.example/a.png"]]));
    expect(out[0]!.trustItems!.map((t) => t.imageUrl)).toEqual([
      "https://blob.example/a.png",
      "https://fal.example/b.png",
    ]);
  });

  it("does not mutate the input", () => {
    const blocks = [block({ id: "t", kind: "trustgrid", trustItems: [{ imageUrl: "https://fal.example/a.png", caption: "a" }] })];
    setBlockImageUrls(blocks, new Map([[refKey("t", "trustItems[0]"), "https://blob.example/a.png"]]));
    expect(blocks[0]!.trustItems![0]!.imageUrl).toBe("https://fal.example/a.png");
  });

  it("returns the same array reference when there is nothing to replace", () => {
    const blocks = [block()];
    expect(setBlockImageUrls(blocks, new Map())).toBe(blocks);
  });

  it("only touches the block the ref names", () => {
    const blocks = [
      block({ id: "one", kind: "trustgrid", trustItems: [{ imageUrl: "https://fal.example/a.png", caption: "a" }] }),
      block({ id: "two", kind: "trustgrid", trustItems: [{ imageUrl: "https://fal.example/a.png", caption: "a" }] }),
    ];
    const out = setBlockImageUrls(blocks, new Map([[refKey("one", "trustItems[0]"), "https://blob.example/a.png"]]));
    expect(out[0]!.trustItems![0]!.imageUrl).toBe("https://blob.example/a.png");
    expect(out[1]!.trustItems![0]!.imageUrl).toBe("https://fal.example/a.png");
  });
});
