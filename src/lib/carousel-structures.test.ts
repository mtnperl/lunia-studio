import { describe, it, expect } from "vitest";
import { STRUCTURES, STRUCTURE_IDS, structurePlan, structureFromLegacy, structurePromptBlock, slotFor } from "./carousel-structures";
import { STORY_BEATS } from "./story-spine";

describe("carousel structures", () => {
  it("has 3 and 8 slot plans for every structure, each with valid beats and a payoff", () => {
    for (const id of STRUCTURE_IDS) {
      const spec = STRUCTURES[id];
      expect(spec.slots[3]).toHaveLength(3);
      expect(spec.slots[8]).toHaveLength(8);
      for (const plan of [spec.slots[3], spec.slots[8]]) {
        for (const sl of plan) expect(STORY_BEATS).toContain(sl.beat);
        expect(plan.some((sl) => sl.beat === "payoff")).toBe(true);
        expect(plan.some((sl) => sl.proof)).toBe(true);
        expect(plan.some((sl) => sl.product)).toBe(true);
        expect(plan.some((sl) => sl.tone === "navy")).toBe(true);
      }
      expect(spec.info.example.split(/\s+/).length).toBeLessThanOrEqual(8);
    }
  });

  it("maps legacy tones and formats", () => {
    expect(structureFromLegacy("myth-bust", "standard")).toBe("myth-fact");
    expect(structureFromLegacy("symptom", "standard")).toBe("mistakes");
    expect(structureFromLegacy("educational", "standard", "viral")).toBe("story");
    expect(structureFromLegacy(undefined, "engagement")).toBe("list");
  });

  it("builds a prompt block that names the value move, the slot count and the beats", () => {
    const b = structurePromptBlock("myth-fact", 10);
    expect(b).toContain("EXACTLY 8 objects");
    expect(b).toContain('beat "villain"');
    expect(b).toContain("everyone believes");
    expect(structurePromptBlock("story", 5)).toContain("EXACTLY 3 objects");
  });

  it("clamps slot lookups", () => {
    expect(slotFor("list", 99, 8).name).toBe("Start here");
    expect(structurePlan("how-to", 4)).toHaveLength(3);
  });
});
