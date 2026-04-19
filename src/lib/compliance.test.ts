import { describe, it, expect } from "vitest";
import { scanCompliance, stripEmDashes, postProcess } from "./compliance";

describe("scanCompliance", () => {
  it("returns green on clean copy", () => {
    const r = scanCompliance("Supports sleep quality and may help you wind down at night.");
    expect(r.level).toBe("green");
    expect(r.violations).toHaveLength(0);
  });

  it("flags em dash as amber", () => {
    const r = scanCompliance("Clean mornings — start here.");
    expect(r.level).toBe("amber");
    expect(r.violations.map((v) => v.rule)).toContain("em dash");
  });

  it("flags medical claim words as red", () => {
    const cure = scanCompliance("This product cures insomnia.");
    expect(cure.level).toBe("red");
    expect(cure.violations.some((v) => v.rule.startsWith("drug claim: cure"))).toBe(true);
  });

  it("treats, prevents, diagnoses all trigger red", () => {
    expect(scanCompliance("It treats sleep issues.").level).toBe("red");
    expect(scanCompliance("Prevents waking at 3am.").level).toBe("red");
    expect(scanCompliance("Diagnoses your sleep problem.").level).toBe("red");
  });

  it("softened claim language passes", () => {
    const r = scanCompliance("May support calm, restful sleep.");
    expect(r.level).toBe("green");
  });

  it("red dominates amber when both present", () => {
    const r = scanCompliance("This cures insomnia — guaranteed.");
    expect(r.level).toBe("red");
    const rules = r.violations.map((v) => v.rule);
    expect(rules).toContain("em dash");
    expect(rules.some((r) => r.startsWith("drug claim: cure"))).toBe(true);
  });

  it("multiple exclamations are amber", () => {
    const r = scanCompliance("Sleep better! Feel great!");
    expect(r.level).toBe("amber");
    expect(r.violations.some((v) => v.rule.includes("exclamation"))).toBe(true);
  });

  it("single exclamation is fine", () => {
    const r = scanCompliance("Sleep better tonight!");
    expect(r.level).toBe("green");
  });

  it("word boundaries prevent false positives", () => {
    // "pretreated" should not trigger "treat"; "cured meat" triggers "cured" (intentional)
    const r = scanCompliance("Our standards are untreated by comparison.");
    expect(r.level).toBe("green");
  });

  it("flags influencer phrases as amber", () => {
    expect(scanCompliance("This is a game changer.").level).toBe("amber");
    expect(scanCompliance("Life-changing stuff.").level).toBe("amber");
    expect(scanCompliance("Obsessed with this.").level).toBe("amber");
    expect(scanCompliance("My holy grail product.").level).toBe("amber");
    expect(scanCompliance("Click the link in bio.").level).toBe("amber");
    expect(scanCompliance("Use my code LUNIA.").level).toBe("amber");
  });

  it("flags 'not X, it's Y' construction", () => {
    const r = scanCompliance("It is not a supplement, it's a lifestyle.");
    expect(r.level).toBe("amber");
    expect(r.violations.some((v) => v.rule.includes("not X"))).toBe(true);
  });
});

describe("stripEmDashes", () => {
  it("replaces spaced em dashes with comma", () => {
    expect(stripEmDashes("Clean mornings — start here.")).toBe("Clean mornings, start here.");
  });

  it("replaces unspaced em dashes", () => {
    expect(stripEmDashes("A—B")).toBe("A, B");
  });

  it("collapses double commas from adjacent replacement", () => {
    expect(stripEmDashes("one, — two")).toBe("one, two");
  });

  it("is idempotent on clean text", () => {
    expect(stripEmDashes("no dashes here.")).toBe("no dashes here.");
  });
});

describe("postProcess", () => {
  it("strips em dashes and returns green", () => {
    const r = postProcess("Supports sleep — may help you wind down.");
    expect(r.cleaned).toBe("Supports sleep, may help you wind down.");
    expect(r.result.level).toBe("green");
  });

  it("strips em dashes but keeps red-level violations", () => {
    const r = postProcess("This cures insomnia — guaranteed.");
    expect(r.cleaned).toContain(",");
    expect(r.cleaned).not.toContain("—");
    expect(r.result.level).toBe("red");
  });
});
