// The arithmetic behind cropping a picked image to its block's shape. Pure, so
// the awkward cases are pinned without a canvas or a browser.
import { describe, it, expect } from "vitest";
import {
  ASPECTS, aspectRatioFor, centreCrop, clampCrop, zoomCrop, cropToPixels, outputSize,
} from "@/lib/image-crop";

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("aspectRatioFor", () => {
  it("keeps the 2-up grid and image+text square, which is why cells line up", () => {
    // The reported bug: a square cell beside a tall portrait one. Both asking
    // for the same aspect is the fix.
    expect(aspectRatioFor("1:1")).toBe(ASPECTS.square);
  });

  it("maps the other names the image controls already use", () => {
    expect(aspectRatioFor("4:5")).toBe(ASPECTS.portrait);
    expect(aspectRatioFor("16:9")).toBe(ASPECTS.landscape);
  });

  it("falls back rather than returning undefined", () => {
    expect(aspectRatioFor(undefined)).toBe(ASPECTS.square);
    expect(aspectRatioFor("bogus")).toBe(ASPECTS.square);
  });
});

describe("centreCrop", () => {
  it("trims the sides of a wide source", () => {
    // 2000x1000 into a square: keep the middle 1000 wide.
    const c = centreCrop(2000, 1000, ASPECTS.square);
    near(c.w, 0.5); near(c.h, 1); near(c.x, 0.25); near(c.y, 0);
  });

  it("trims top and bottom of a tall source", () => {
    // The screenshot's case: a portrait photo into a square cell.
    const c = centreCrop(1000, 2000, ASPECTS.square);
    near(c.w, 1); near(c.h, 0.5); near(c.x, 0); near(c.y, 0.25);
  });

  it("keeps everything when the source already matches", () => {
    const c = centreCrop(800, 800, ASPECTS.square);
    expect(c).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("survives a zero or unknown source size instead of dividing by it", () => {
    // Natural dimensions are 0 until an image has decoded.
    expect(centreCrop(0, 0, ASPECTS.square)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(centreCrop(100, 0, ASPECTS.portrait)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("produces a region whose aspect really is the target", () => {
    for (const [sw, sh] of [[1600, 900], [900, 1600], [1000, 1000], [3000, 400]]) {
      for (const aspect of [ASPECTS.square, ASPECTS.portrait, ASPECTS.landscape]) {
        const c = centreCrop(sw!, sh!, aspect);
        near((c.w * sw!) / (c.h * sh!), aspect);
      }
    }
  });
});

describe("clampCrop", () => {
  it("stops a pan at the edge rather than exposing blank space", () => {
    expect(clampCrop({ x: -0.3, y: 0.5, w: 0.5, h: 0.5 }).x).toBe(0);
    expect(clampCrop({ x: 0.9, y: 0, w: 0.5, h: 0.5 }).x).toBeCloseTo(0.5, 6);
    expect(clampCrop({ x: 0, y: 1.2, w: 0.5, h: 0.5 }).y).toBeCloseTo(0.5, 6);
  });

  it("never lets a region exceed the image or collapse to nothing", () => {
    expect(clampCrop({ x: 0, y: 0, w: 5, h: 5 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    const tiny = clampCrop({ x: 0, y: 0, w: 0, h: 0 });
    expect(tiny.w).toBeGreaterThan(0);
    expect(tiny.h).toBeGreaterThan(0);
  });
});

describe("zoomCrop", () => {
  const base = centreCrop(1000, 2000, ASPECTS.square); // w:1 h:0.5 y:0.25

  it("zooming in keeps less of the source, around the same centre", () => {
    const z = zoomCrop(base, 0.5);
    expect(z.w).toBeLessThan(base.w);
    near(z.x + z.w / 2, base.x + base.w / 2);
    near(z.y + z.h / 2, base.y + base.h / 2);
  });

  it("preserves the aspect it was given", () => {
    const before = base.w / base.h;
    for (const f of [0.3, 0.75, 1.5, 4]) {
      const z = zoomCrop(base, f);
      near(z.w / z.h, before);
    }
  });

  it("cannot zoom out past the image", () => {
    const z = zoomCrop(base, 10);
    expect(z.w).toBeLessThanOrEqual(1);
    expect(z.h).toBeLessThanOrEqual(1);
    expect(z.x).toBeGreaterThanOrEqual(0);
    expect(z.y).toBeGreaterThanOrEqual(0);
  });
});

describe("cropToPixels / outputSize", () => {
  it("maps fractions onto real source pixels", () => {
    expect(cropToPixels({ x: 0.25, y: 0, w: 0.5, h: 1 }, 2000, 1000))
      .toEqual({ sx: 500, sy: 0, sWidth: 1000, sHeight: 1000 });
  });

  it("never asks a canvas for a zero-sized region", () => {
    const p = cropToPixels({ x: 0, y: 0, w: 0.0001, h: 0.0001 }, 10, 10);
    expect(p.sWidth).toBeGreaterThan(0);
    expect(p.sHeight).toBeGreaterThan(0);
  });

  it("sizes the output to the aspect", () => {
    expect(outputSize(ASPECTS.square).height).toBe(outputSize(ASPECTS.square).width);
    expect(outputSize(ASPECTS.portrait).height).toBeGreaterThan(outputSize(ASPECTS.portrait).width);
    expect(outputSize(ASPECTS.landscape).height).toBeLessThan(outputSize(ASPECTS.landscape).width);
  });
});
