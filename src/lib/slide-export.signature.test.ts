// The export signature is what decides whether a cached PNG is still the
// slide on screen. It exists because the dependency array it replaced was
// written out by hand and left `paper.pen` off: a new pen colour redrew the
// preview, never invalidated the files, and Download handed back the navy
// version of a slide the user had just made red.
//
// These cases are that bug, one per control, plus the two properties the
// signature has to have to be usable as a dependency: equal inputs give an
// equal string (or the effect would re-run on every render) and the order of
// the inputs is part of it.

import { describe, expect, it } from "vitest";
import { slideExportSignature } from "./slide-export";

type Paper = { grain: number; vignette: number; pen?: string };

const variant = {
  topic: "Deep sleep",
  slide1: { header: "Did you know?", body1: [{ text: "Adults lose ", highlight: false }, { text: "2%", highlight: true, mark: true }], body2: [{ text: "…", highlight: false }] },
  slide2: { header: "By", body1: [{ text: "…", highlight: false }], body2: [{ text: "…", highlight: false }] },
  caption: "…",
};
const paper: Paper = { grain: 0.45, vignette: 0 };

/** The Did you know editor's call, so a change here is a change to the real
 *  dependency and not to a shape invented by the test. */
const dyk = (over: { selected?: number; variant?: unknown; treatment?: string; paper?: Paper; fontScale?: number } = {}) =>
  slideExportSignature(
    over.selected ?? 0,
    "variant" in over ? over.variant : variant,
    over.treatment ?? "navy-box",
    over.paper ?? paper,
    over.fontScale ?? 1,
  );

describe("slideExportSignature", () => {
  it("is stable across renders with unchanged inputs", () => {
    expect(dyk()).toBe(dyk());
    // A fresh object with the same fields is the same slide, and an effect
    // keyed on identity would rebuild on every parent render.
    expect(dyk({ paper: { grain: 0.45, vignette: 0 } })).toBe(dyk());
  });

  it("changes when the pen colour changes", () => {
    expect(dyk({ paper: { ...paper, pen: "#d8321e" } })).not.toBe(dyk());
  });

  it("tells one pen colour from another", () => {
    expect(dyk({ paper: { ...paper, pen: "#d8321e" } }))
      .not.toBe(dyk({ paper: { ...paper, pen: "#b8930a" } }));
  });

  it("treats clearing the pen as a change", () => {
    const red = dyk({ paper: { ...paper, pen: "#d8321e" } });
    expect(dyk({ paper: { grain: 0.45, vignette: 0, pen: undefined } })).not.toBe(red);
  });

  it("changes when the font size changes", () => {
    expect(dyk({ fontScale: 1.15 })).not.toBe(dyk());
  });

  it("changes when the treatment changes", () => {
    expect(dyk({ treatment: "yellow-box" })).not.toBe(dyk());
  });

  it("changes when the paper grain or vignette changes", () => {
    expect(dyk({ paper: { ...paper, grain: 0.9 } })).not.toBe(dyk());
    expect(dyk({ paper: { ...paper, vignette: 0.1 } })).not.toBe(dyk());
  });

  it("changes when the selected variant changes", () => {
    expect(dyk({ selected: 1 })).not.toBe(dyk());
  });

  it("changes when the words on the slide change", () => {
    const edited = { ...variant, slide1: { ...variant.slide1, header: "Did you know??" } };
    expect(dyk({ variant: edited })).not.toBe(dyk());
  });

  it("changes when a token's highlight is toggled", () => {
    const edited = {
      ...variant,
      slide1: { ...variant.slide1, body1: [{ text: "Adults lose ", highlight: true }, { text: "2%", highlight: true, mark: true }] },
    };
    expect(dyk({ variant: edited })).not.toBe(dyk());
  });

  it("keeps the inputs distinguishable by position", () => {
    expect(slideExportSignature("a", "b")).not.toBe(slideExportSignature("b", "a"));
  });
});
