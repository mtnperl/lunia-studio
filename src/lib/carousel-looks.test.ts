import { describe, expect, it } from "vitest";
import { lookFromCarousel, structureOf, structurePromptBlock } from "./carousel-looks";
import type { SavedCarousel } from "./types";

const saved = {
  id: "c1", topic: "Tea", logoScale: 1.8, darkBackground: true, slideBgColor: undefined, stylePreset: "editorial-scientific",
  content: { slides: [
    { headline: "a", body: "b", citation: "", graphic: JSON.stringify({ component: "stat", data: { stat: "8 mg", label: "x" } }) },
    { headline: "a", body: "b", citation: "" },
    { headline: "a", body: "b", citation: "", graphic: "<svg></svg>" },
  ] },
} as unknown as SavedCarousel;

describe("lookFromCarousel", () => {
  it("keeps only the style fields that are set", () => {
    const look = lookFromCarousel(saved);
    expect(look).toEqual({ logoScale: 1.8, darkBackground: true, stylePreset: "editorial-scientific" });
    expect("topic" in look).toBe(false);
  });
});

describe("structureOf", () => {
  it("names the graphic component per slide, none when absent, svg for legacy", () => {
    expect(structureOf(saved)).toEqual(["stat", "none", "svg"]);
  });
  it("writes a prompt block that mirrors shape and forbids copying content", () => {
    const block = structurePromptBlock(saved);
    expect(block).toContain('Content slide 1: a "stat" graphic');
    expect(block).toContain("Content slide 2: no graphic");
    expect(block).toContain("Do not reuse any wording");
    expect(structurePromptBlock({ ...saved, content: { ...saved.content, slides: [] } } as SavedCarousel)).toBe("");
  });
});
