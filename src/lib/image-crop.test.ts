// The arithmetic behind cropping a picked image to its block's shape. Pure, so
// the awkward cases are pinned without a canvas or a browser.
import { describe, it, expect } from "vitest";
import {
  ASPECTS, aspectRatioFor, centreCrop, clampCrop, zoomCrop, cropToPixels, outputSize,
  zoomTo, zoomLevelOf, clampZoom, MIN_ZOOM, MAX_ZOOM,
  anchorCrop, activeAnchor, ANCHORS,
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

// ─── Zoom level ─────────────────────────────────────────────────────────────
// The reported bug: "every time I try to zoom in it moves". The control read
// min(crop.w, crop.h) as its position, which is not a zoom measure — for a
// 1024x1536 source cropped square the base region is already {w:1, h:0.667},
// so the slider opened at 33/100 and the bottom third snapped the thumb back
// out from under the cursor on every drag.
describe("zoom level", () => {
  const bases = {
    portrait: centreCrop(1024, 1536, ASPECTS.square),
    landscape: centreCrop(1536, 1024, ASPECTS.square),
    square: centreCrop(1000, 1000, ASPECTS.square),
  };

  it("opens at level 1 whatever shape the source is", () => {
    // This is the regression. Every one of these used to read 33/100 except
    // the square, and a third of the track was unreachable.
    for (const base of Object.values(bases)) {
      expect(zoomLevelOf(base, base)).toBe(MIN_ZOOM);
    }
  });

  it("has no dead zone: every level on the track is reachable and sticks", () => {
    for (const base of Object.values(bases)) {
      for (const z of [1, 1.25, 2, 3.5, 5]) {
        const c = zoomTo(base, base, z);
        near(zoomLevelOf(base, c), z);
      }
    }
  });

  it("does not drift when the same level is set twice", () => {
    const base = bases.portrait;
    const once = zoomTo(base, base, 2);
    const twice = zoomTo(base, once, 2);
    expect(twice).toEqual(once);
  });

  it("keeps the centre when zooming from the middle", () => {
    const base = bases.portrait;
    const z = zoomTo(base, base, 3);
    near(z.x + z.w / 2, base.x + base.w / 2);
    near(z.y + z.h / 2, base.y + base.h / 2);
  });

  it("preserves the target aspect at every level", () => {
    const [sw, sh] = [1024, 1536];
    const base = centreCrop(sw, sh, ASPECTS.square);
    for (const z of [1, 2, 5]) {
      const c = zoomTo(base, base, z);
      near((c.w * sw) / (c.h * sh), ASPECTS.square);
    }
  });

  it("clamps out-of-range levels instead of producing a broken region", () => {
    const base = bases.landscape;
    expect(zoomLevelOf(base, zoomTo(base, base, 0))).toBe(MIN_ZOOM);
    expect(zoomLevelOf(base, zoomTo(base, base, 99))).toBe(MAX_ZOOM);
    expect(clampZoom(NaN)).toBe(MIN_ZOOM);
  });

  it("stays inside the image when zooming out after panning to a corner", () => {
    const base = bases.portrait;
    const zoomed = zoomTo(base, base, 4);
    const panned = clampCrop({ ...zoomed, x: 1, y: 1 }); // shoved into a corner
    const out = zoomTo(base, panned, 1);
    expect(out.x).toBeGreaterThanOrEqual(0);
    expect(out.y).toBeGreaterThanOrEqual(0);
    expect(out.x + out.w).toBeLessThanOrEqual(1 + 1e-9);
    expect(out.y + out.h).toBeLessThanOrEqual(1 + 1e-9);
  });
});

// ─── Focal point ────────────────────────────────────────────────────────────
// "I want to decide which part of the image will be centred." Dragging does
// that, but on an axis with no slack it silently does nothing — a portrait
// cropped square at zoom 1 has no horizontal play at all — so asking directly
// has to land somewhere rather than refuse.
describe("anchorCrop", () => {
  const portrait = centreCrop(1024, 1536, ASPECTS.square); // w:1 h:0.667, no x play
  const landscape = centreCrop(1536, 1024, ASPECTS.square); // w:0.667 h:1, no y play

  it("centres on the top of a portrait", () => {
    const top = anchorCrop(portrait, 0.5, 0);
    expect(top.y).toBe(0);
    expect(top.h).toBeCloseTo(portrait.h, 6);
  });

  it("centres on the bottom of a portrait", () => {
    const bottom = anchorCrop(portrait, 0.5, 1);
    expect(bottom.y + bottom.h).toBeCloseTo(1, 6);
  });

  it("lands on the nearest reachable point on an axis with no slack", () => {
    // A portrait cropped square has no horizontal play. Asking for the left
    // must still work rather than doing nothing.
    const left = anchorCrop(portrait, 0, 0.5);
    expect(left.x).toBe(0);
    expect(left.w).toBeCloseTo(portrait.w, 6);
    // And the axis that DOES have slack still honours the request.
    expect(anchorCrop(portrait, 0, 0).y).toBe(0);
  });

  it("moves a landscape horizontally, where its slack is", () => {
    expect(anchorCrop(landscape, 0, 0.5).x).toBe(0);
    expect(anchorCrop(landscape, 1, 0.5).x + landscape.w).toBeCloseTo(1, 6);
  });

  it("never leaves the image, whichever corner is asked for", () => {
    for (const a of ANCHORS) {
      for (const base of [portrait, landscape]) {
        const c = anchorCrop(base, a.x, a.y);
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w).toBeLessThanOrEqual(1 + 1e-9);
        expect(c.y + c.h).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("keeps the region's size, so choosing a focus is not a zoom", () => {
    for (const a of ANCHORS) {
      const c = anchorCrop(portrait, a.x, a.y);
      near(c.w, portrait.w);
      near(c.h, portrait.h);
    }
  });

  it("offers nine anchors and reports which one is active", () => {
    expect(ANCHORS).toHaveLength(9);
    expect(activeAnchor(anchorCrop(portrait, 0.5, 0))).toEqual({ x: 0.5, y: 0 });
    expect(activeAnchor(anchorCrop(portrait, 0.5, 1))).toEqual({ x: 0.5, y: 1 });
    expect(activeAnchor(anchorCrop(landscape, 1, 0.5))).toEqual({ x: 1, y: 0.5 });
  });

  it("reports centre for an axis that has no choice in it", () => {
    // A portrait cropped square is pinned horizontally: left, centre and right
    // are the same position. Reporting "left" would light up a button the user
    // never pressed, so the pinned axis reads as centre.
    expect(activeAnchor(anchorCrop(portrait, 0, 0))).toEqual({ x: 0.5, y: 0 });
    expect(activeAnchor(anchorCrop(portrait, 1, 0))).toEqual({ x: 0.5, y: 0 });
  });

  it("reports nothing once the frame is dragged off an anchor", () => {
    // So no button looks selected when the crop has moved off it.
    expect(activeAnchor(clampCrop({ ...portrait, y: 0.1 }))).toBeNull();
  });
});
