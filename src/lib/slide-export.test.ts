import { describe, it, expect } from "vitest";
import { MissingSlideImagesError, usableLiveImage, isTaintError } from "./slide-export";

// The compositor itself draws on a canvas and cannot run in this Node suite.
// What is covered here are the two decisions that made a cover export as a
// plain coloured square: whether the picture already on the page can be used
// as the draw source, and whether a failed read-back is a taint (worth a
// retry from data URLs) or a real error.

const img = (over: Partial<HTMLImageElement>) => ({ complete: true, naturalWidth: 1080, naturalHeight: 1350, ...over }) as HTMLImageElement;

describe("usableLiveImage", () => {
  it("takes a decoded image that is already on the page", () => {
    expect(usableLiveImage(img({}))).toBe(true);
  });

  it("refuses one that has not finished loading", () => {
    expect(usableLiveImage(img({ complete: false }))).toBe(false);
  });

  it("refuses a broken image, which reports complete with no pixels", () => {
    expect(usableLiveImage(img({ naturalWidth: 0 }))).toBe(false);
    expect(usableLiveImage(img({ naturalHeight: 0 }))).toBe(false);
  });
});

describe("isTaintError", () => {
  it("recognises the read-back a tainted canvas refuses", () => {
    expect(isTaintError(new DOMException("tainted", "SecurityError"))).toBe(true);
  });

  it("leaves every other failure alone, so it is not retried into a loop", () => {
    expect(isTaintError(new DOMException("nope", "InvalidStateError"))).toBe(false);
    expect(isTaintError(new Error("toBlob failed"))).toBe(false);
    expect(isTaintError(undefined)).toBe(false);
  });
});

describe("MissingSlideImagesError", () => {
  it("speaks to the person holding the phone, not to a log", () => {
    const one = new MissingSlideImagesError(["https://example.com/cover.jpg"]);
    expect(one.message).toMatch(/could not be loaded/);
    expect(one.message).toMatch(/download again/);
    expect(one.name).toBe("MissingSlideImagesError");
    expect(one.sources).toHaveLength(1);
    expect(new MissingSlideImagesError(["a", "b"]).message).toMatch(/^Some slide images/);
  });

  it("is an Error, so the existing catch blocks still see it", () => {
    expect(new MissingSlideImagesError(["a"])).toBeInstanceOf(Error);
  });
});
