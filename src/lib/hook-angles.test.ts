import { describe, it, expect } from "vitest";
import {
  HOOK_ANGLES,
  DEFAULT_SPREAD,
  HOOK_ANGLE_IDS,
  isHookAngle,
  hookAngleLabel,
  normalizeSpread,
  anglePromptBlock,
} from "./hook-angles";

describe("hook angle library", () => {
  it("has unique ids and a filled brief for every angle", () => {
    expect(new Set(HOOK_ANGLE_IDS).size).toBe(HOOK_ANGLES.length);
    for (const a of HOOK_ANGLES) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.job.length).toBeGreaterThan(10);
      expect(a.formula.length).toBeGreaterThan(10);
      expect(a.guard.length).toBeGreaterThan(10);
      expect(a.examples.length).toBeGreaterThan(1);
    }
  });

  it("never uses an em dash, which the brand voice bans", () => {
    const all = JSON.stringify(HOOK_ANGLES);
    expect(all).not.toContain("—");
  });

  it("preselects angles that all exist", () => {
    for (const id of DEFAULT_SPREAD) expect(isHookAngle(id)).toBe(true);
  });
});

describe("normalizeSpread", () => {
  it("falls back to the default six when nothing usable is asked for", () => {
    expect(normalizeSpread(undefined)).toEqual(HOOK_ANGLE_IDS.filter((id) => DEFAULT_SPREAD.includes(id)));
    expect(normalizeSpread(["not-an-angle"])).toEqual(normalizeSpread(undefined));
  });

  it("drops unknown ids and duplicates, and returns library order", () => {
    const out = normalizeSpread(["stakes", "symptom", "stakes", "bogus"]);
    expect(out).toEqual(["symptom", "stakes"]);
  });

  it("caps the spread so one call stays short", () => {
    expect(normalizeSpread(HOOK_ANGLE_IDS).length).toBe(8);
    expect(normalizeSpread(HOOK_ANGLE_IDS, 3).length).toBe(3);
  });
});

describe("hookAngleLabel", () => {
  it("labels a known angle and stays quiet on anything else", () => {
    expect(hookAngleLabel("paradox")).toBe("Paradox");
    expect(hookAngleLabel("bogus")).toBeNull();
    expect(hookAngleLabel(undefined)).toBeNull();
  });
});

describe("anglePromptBlock", () => {
  it("writes one block per requested angle and skips unknown ids", () => {
    const block = anglePromptBlock(["symptom", "bogus", "stakes"]);
    expect(block).toContain('ANGLE "symptom"');
    expect(block).toContain('ANGLE "stakes"');
    expect(block).not.toContain("bogus");
    expect(block.split("ANGLE \"").length - 1).toBe(2);
  });
});
