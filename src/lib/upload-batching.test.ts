import { describe, it, expect } from "vitest";
import { chunkForUpload, CHUNK_FILES, type PreparedFile } from "./upload-batching";

const f = (name: string, size: number): PreparedFile => ({ name, blob: { size } as Blob });

describe("chunkForUpload", () => {
  it("keeps a small drop in one request", () => {
    const files = [f("a", 100), f("b", 200), f("c", 300)];
    expect(chunkForUpload(files)).toEqual([files]);
  });

  it("splits on the byte budget", () => {
    const out = chunkForUpload([f("a", 900), f("b", 900), f("c", 900)], 2000, CHUNK_FILES);
    expect(out.map((g) => g.map((x) => x.name))).toEqual([["a", "b"], ["c"]]);
  });

  it("splits on the file count even when tiny", () => {
    const files = Array.from({ length: 19 }, (_, i) => f(`f${i}`, 10));
    const out = chunkForUpload(files, 1_000_000, 8);
    expect(out.map((g) => g.length)).toEqual([8, 8, 3]);
  });

  it("gives an over-budget file its own request rather than dropping it", () => {
    const out = chunkForUpload([f("small", 100), f("huge", 9_000), f("after", 100)], 1000, 8);
    expect(out.map((g) => g.map((x) => x.name))).toEqual([["small"], ["huge"], ["after"]]);
  });

  it("preserves the chosen order", () => {
    const files = [f("1", 800), f("2", 100), f("3", 800), f("4", 100)];
    expect(chunkForUpload(files, 1000, 8).flat().map((x) => x.name)).toEqual(["1", "2", "3", "4"]);
  });

  it("handles an empty selection", () => {
    expect(chunkForUpload([])).toEqual([]);
  });
});
