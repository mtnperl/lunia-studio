import { describe, expect, it } from "vitest";
import { getMoodById, hookStyleBlock } from "./carousel-visual-moods";

describe("hookStyleBlock", () => {
  it("drops the amber-bottle product clause from the Editorial Scientific mood for hooks", () => {
    const mood = getMoodById("editorial-scientific")!;
    // The shared mood still asks for the bottle: the email image controls rely on it.
    expect(mood.styleBlock).toContain("amber bottle as the focal product");
    const hook = hookStyleBlock(mood);
    expect(hook).not.toMatch(/bottle|focal product/i);
    expect(hook).toContain("no product, no packaging");
    // The rest of the look is untouched.
    expect(hook).toContain("soft ivory and warm cream palette");
    expect(hook).toContain("no text");
    expect(hook).not.toContain(",,");
  });

  it("leaves every other mood exactly as it is", () => {
    for (const id of ["cinematic-dark", "minimalist-light", "lifestyle-health", "organic-natural"]) {
      const mood = getMoodById(id)!;
      expect(hookStyleBlock(mood)).toBe(mood.styleBlock);
    }
  });
});
