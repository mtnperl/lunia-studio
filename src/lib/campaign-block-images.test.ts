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

describe("the newer image-bearing kinds", () => {
  it("finds a block's own imageUrl", () => {
    const refs = collectBlockImageUrls([
      block({ id: "it", kind: "imagetext", imageUrl: "https://fal.example/x.png" }),
    ]);
    expect(refs).toEqual([{ blockId: "it", path: "imageUrl[0]", url: "https://fal.example/x.png" }]);
  });

  it("finds every grid cell image and writes them back independently", () => {
    const blocks = [
      block({ id: "g", kind: "grid", gridCells: [
        { imageUrl: "https://fal.example/1.png", heading: "one" },
        { heading: "no image" },
        { imageUrl: "https://fal.example/3.png", heading: "three" },
      ] }),
    ];
    const refs = collectBlockImageUrls(blocks);
    expect(refs.map((r) => r.path)).toEqual(["gridCells[0]", "gridCells[2]"]);
    const out = setBlockImageUrls(blocks, new Map([[refKey("g", "gridCells[2]"), "https://blob.example/3.png"]]));
    expect(out[0]!.gridCells!.map((c) => c.imageUrl)).toEqual([
      "https://fal.example/1.png",
      undefined,
      "https://blob.example/3.png",
    ]);
  });

  it("covers every image-bearing kind, so none can be silently missed", () => {
    // A kind that holds an image but is absent from ACCESSORS would rot
    // exactly the way trustgrid did. Assert coverage explicitly.
    const withImages = [
      block({ id: "a", kind: "imagetext", imageUrl: "https://e/1.png" }),
      block({ id: "b", kind: "imagebullets", imageUrl: "https://e/2.png" }),
      block({ id: "c", kind: "headerimage", imageUrl: "https://e/3.png" }),
      block({ id: "d", kind: "grid", gridCells: [{ imageUrl: "https://e/4.png" }] }),
      block({ id: "e", kind: "trustgrid", trustItems: [{ imageUrl: "https://e/5.png", caption: "c" }] }),
    ];
    expect(collectBlockImageUrls(withImages)).toHaveLength(5);
  });
});
