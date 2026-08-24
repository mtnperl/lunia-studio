import { describe, it, expect } from "vitest";
import { MAX_UPLOAD_BYTES, fmtSize, needsShrinking } from "./image-shrink";

function file(bytes: number, type: string): File {
  return { size: bytes, type, name: "x" } as File;
}

describe("needsShrinking", () => {
  it("leaves anything already under the ceiling alone", () => {
    expect(needsShrinking(file(MAX_UPLOAD_BYTES, "image/jpeg"))).toBe(false);
    expect(needsShrinking(file(200_000, "image/png"))).toBe(false);
  });

  it("shrinks oversized photos", () => {
    expect(needsShrinking(file(MAX_UPLOAD_BYTES + 1, "image/jpeg"))).toBe(true);
    expect(needsShrinking(file(12_000_000, "image/png"))).toBe(true);
    expect(needsShrinking(file(9_000_000, "image/webp"))).toBe(true);
  });

  it("never touches a GIF — a canvas would drop the animation", () => {
    expect(needsShrinking(file(9_000_000, "image/gif"))).toBe(false);
  });

  it("never touches an SVG", () => {
    expect(needsShrinking(file(9_000_000, "image/svg+xml"))).toBe(false);
  });
});

describe("fmtSize", () => {
  it("reads in MB above a megabyte and KB below", () => {
    expect(fmtSize(8_400_000)).toBe("8.0 MB");
    expect(fmtSize(240_000)).toBe("234 KB");
  });
});
