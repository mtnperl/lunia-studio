import { describe, it, expect } from "vitest";
import { autoScrollDelta, iframePointToPageY } from "./drag-autoscroll";

const VH = 900;

describe("autoScrollDelta", () => {
  it("does nothing while the pointer is in the middle of the window", () => {
    expect(autoScrollDelta({ pageY: 450, viewportHeight: VH })).toBe(0);
    expect(autoScrollDelta({ pageY: 90, viewportHeight: VH })).toBe(0);
    expect(autoScrollDelta({ pageY: 810, viewportHeight: VH })).toBe(0);
  });

  it("scrolls up near the top and down near the bottom", () => {
    expect(autoScrollDelta({ pageY: 40, viewportHeight: VH })).toBeLessThan(0);
    expect(autoScrollDelta({ pageY: 870, viewportHeight: VH })).toBeGreaterThan(0);
  });

  it("ramps with depth rather than switching on", () => {
    // The whole point: resting just inside the zone should creep, so a drop
    // near the fold is still placeable.
    const shallow = autoScrollDelta({ pageY: 880, viewportHeight: VH });
    const deep = autoScrollDelta({ pageY: 899, viewportHeight: VH });
    expect(shallow).toBeGreaterThan(0);
    expect(deep).toBeGreaterThan(shallow);
  });

  it("reaches full speed at the edge and no further", () => {
    expect(autoScrollDelta({ pageY: 0, viewportHeight: VH })).toBeCloseTo(-18);
    expect(autoScrollDelta({ pageY: VH, viewportHeight: VH })).toBeCloseTo(18);
  });

  it("clamps a pointer dragged beyond the window rather than accelerating", () => {
    // A pointer can leave the window during a drag; without the clamp the
    // ramp keeps growing and the page rockets away.
    expect(autoScrollDelta({ pageY: -500, viewportHeight: VH })).toBeCloseTo(-18);
    expect(autoScrollDelta({ pageY: 5000, viewportHeight: VH })).toBeCloseTo(18);
  });

  it("holds still when the window is too short to hold two edge zones", () => {
    // Otherwise every position is in both zones at once.
    expect(autoScrollDelta({ pageY: 50, viewportHeight: 120 })).toBe(0);
    expect(autoScrollDelta({ pageY: 100, viewportHeight: 120 })).toBe(0);
  });

  it("respects a custom edge and speed", () => {
    expect(autoScrollDelta({ pageY: 10, viewportHeight: VH, edge: 200, max: 4 })).toBeLessThan(-3);
    expect(autoScrollDelta({ pageY: 150, viewportHeight: VH, edge: 100, max: 4 })).toBe(0);
  });
});

describe("iframePointToPageY", () => {
  it("maps an unscaled pointer through the preview's transform", () => {
    // 600px-wide email scaled to half, iframe starting 100px down the page.
    expect(iframePointToPageY(100, 300, 600, 200)).toBe(200);
  });

  it("is the identity offset when the preview is not scaled", () => {
    expect(iframePointToPageY(252, 600, 600, 628)).toBe(880);
  });

  it("falls back to 1:1 rather than dividing by zero before layout", () => {
    // nativeHeight is 0 on the first frame after mount; a NaN here would
    // silently disable auto-scroll for the rest of the drag.
    expect(iframePointToPageY(50, 0, 0, 100)).toBe(150);
  });
});
