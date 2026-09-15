import { describe, it, expect } from "vitest";
import { readKeptCover, keptCoverBlock, applyKeptCover, isEmptyRecast } from "./carousel-recast";
import type { CarouselContent } from "./types";

const content = {
  hooks: [
    { headline: "FIRST HOOK", subline: "the one not chosen", sourceNote: "" },
    { headline: "AFTER ONE SLEEPLESS NIGHT YOU STAND FARTHER AWAY", subline: "volunteers stopped a stranger earlier", sourceNote: "" },
  ],
  slides: [{ headline: "A", body: "b", citation: "" }],
  imagePrompt: "a bright hospital corridor",
  hookImagePromptOverride: "corridor, warmer",
  cta: { headline: "", followLine: "" },
  caption: "",
} as unknown as CarouselContent;

describe("readKeptCover", () => {
  it("keeps the hook that is on screen, not the first one", () => {
    const kept = readKeptCover(content, 1, { keepHook: true, keepImage: false });
    expect(kept.hook?.headline).toBe("AFTER ONE SLEEPLESS NIGHT YOU STAND FARTHER AWAY");
    expect(kept.imagePrompt).toBeUndefined();
  });

  it("keeps the artwork prompts only when asked", () => {
    const kept = readKeptCover(content, 0, { keepHook: false, keepImage: true });
    expect(kept.hook).toBeUndefined();
    expect(kept.imagePrompt).toBe("a bright hospital corridor");
    expect(kept.hookImagePromptOverride).toBe("corridor, warmer");
  });

  it("keeps nothing when both toggles are off, and survives an empty deck", () => {
    expect(readKeptCover(content, 0, { keepHook: false, keepImage: false })).toEqual({});
    expect(readKeptCover(null, 0, { keepHook: true, keepImage: true })).toEqual({});
  });

  it("falls back to the first hook when the selected index is gone", () => {
    expect(readKeptCover(content, 9, { keepHook: true, keepImage: false }).hook?.headline).toBe("FIRST HOOK");
  });
});

describe("keptCoverBlock", () => {
  it("hands the writer the exact cover to write behind", () => {
    const block = keptCoverBlock(readKeptCover(content, 1, { keepHook: true, keepImage: true }));
    expect(block).toContain("THE COVER IS FIXED");
    expect(block).toContain("AFTER ONE SLEEPLESS NIGHT YOU STAND FARTHER AWAY");
    expect(block).toContain("volunteers stopped a stranger earlier");
  });

  it("says nothing when the hook is being rewritten too", () => {
    expect(keptCoverBlock(readKeptCover(content, 0, { keepHook: false, keepImage: true }))).toBe("");
    expect(keptCoverBlock({})).toBe("");
  });
});

describe("applyKeptCover", () => {
  const fresh = {
    hooks: [{ headline: "A NEW HOOK THE MODEL WROTE", subline: "ignore me", sourceNote: "" }],
    slides: [{ headline: "NEW", body: "new body", citation: "" }],
    imagePrompt: "something else entirely",
    cta: { headline: "", followLine: "" },
    caption: "new caption",
  } as unknown as CarouselContent;

  it("puts the kept cover back and drops the alternatives", () => {
    const out = applyKeptCover(fresh, readKeptCover(content, 1, { keepHook: true, keepImage: true }));
    expect(out.hooks).toHaveLength(1);
    expect(out.hooks[0].headline).toBe("AFTER ONE SLEEPLESS NIGHT YOU STAND FARTHER AWAY");
    expect(out.imagePrompt).toBe("a bright hospital corridor");
    // Everything behind the cover is the new deck.
    expect(out.slides[0].headline).toBe("NEW");
    expect(out.caption).toBe("new caption");
  });

  it("leaves the fresh deck alone when nothing was kept", () => {
    const out = applyKeptCover(fresh, {});
    expect(out.hooks[0].headline).toBe("A NEW HOOK THE MODEL WROTE");
    expect(out.imagePrompt).toBe("something else entirely");
  });

  it("does not mutate the deck it was given", () => {
    const out = applyKeptCover(fresh, readKeptCover(content, 1, { keepHook: true, keepImage: false }));
    expect(fresh.hooks[0].headline).toBe("A NEW HOOK THE MODEL WROTE");
    expect(out).not.toBe(fresh);
  });
});

describe("isEmptyRecast", () => {
  it("is an ordinary generation when nothing is carried over", () => {
    expect(isEmptyRecast({ keepHook: false, keepImage: false })).toBe(true);
    expect(isEmptyRecast({ keepHook: true, keepImage: false })).toBe(false);
  });
});
