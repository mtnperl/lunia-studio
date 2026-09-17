import { describe, it, expect } from "vitest";
import { normalizeGraphic, validateOrFallbackGraphic } from "./carousel-utils";
import { keepOneEssayGraphic } from "./essay-body";
import { structureOf } from "./carousel-looks";
import type { SavedCarousel } from "./types";

// The field is typed as a string and the prompt asks for one, but the model
// sometimes sends the GraphicSpec object itself. Every reader then called
// .trim() on an object and the whole generation died with
// "e.graphic.trim is not a function".
const SPEC = { component: "stat", data: { stat: "40%", label: "less deep sleep" } };

describe("normalizeGraphic", () => {
  it("passes a string through, trimmed", () => {
    expect(normalizeGraphic('  {"component":"stat"}  ')).toBe('{"component":"stat"}');
  });

  it("stringifies the object the model sometimes sends instead", () => {
    expect(normalizeGraphic(SPEC)).toBe(JSON.stringify(SPEC));
  });

  it("drops what carries nothing", () => {
    for (const v of ["", "   ", '""', undefined, null, 42, true, [], {}]) {
      expect(normalizeGraphic(v)).toBeUndefined();
    }
  });

  it("survives a value that cannot be serialised", () => {
    const circular: Record<string, unknown> = { component: "stat" };
    circular.self = circular;
    expect(normalizeGraphic(circular)).toBeUndefined();
  });
});

describe("the readers that used to crash", () => {
  it("validateOrFallbackGraphic takes an object without throwing", () => {
    expect(() => validateOrFallbackGraphic(SPEC, "some body text")).not.toThrow();
    expect(validateOrFallbackGraphic(SPEC, "some body text")).toBe(JSON.stringify(SPEC));
  });

  it("validateOrFallbackGraphic still leaves a raw SVG alone and drops an empty", () => {
    expect(validateOrFallbackGraphic("<svg><rect/></svg>")).toBe("<svg><rect/></svg>");
    // An empty string comes back as it went in: keepOneEssayGraphic clears a
    // graphic with "" and the caller assigns the result straight back.
    expect(validateOrFallbackGraphic("")).toBe("");
    expect(validateOrFallbackGraphic(undefined)).toBeUndefined();
    expect(validateOrFallbackGraphic(null)).toBeUndefined();
  });

  it("keepOneEssayGraphic takes an object without throwing", () => {
    const slides = [{ graphic: SPEC as unknown as string }, { graphic: SPEC as unknown as string }];
    expect(() => keepOneEssayGraphic(slides)).not.toThrow();
    const { slides: out, cleared } = keepOneEssayGraphic(slides);
    // One kept, the rest cleared, exactly as with the string form.
    expect(cleared).toBe(1);
    expect(out[1].graphic).toBe("");
  });

  it("structureOf takes an object without throwing", () => {
    const deck = { content: { slides: [{ graphic: SPEC as unknown as string }, { graphic: undefined }] } } as unknown as SavedCarousel;
    expect(() => structureOf(deck)).not.toThrow();
    expect(structureOf(deck)).toEqual(["stat", "none"]);
  });
});
