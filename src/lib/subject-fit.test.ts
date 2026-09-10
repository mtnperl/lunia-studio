import { describe, expect, it } from "vitest";
import { isSubjectUsedAnywhere, subjectFitsFormat, subjectFormats, subjectUsedFor, subjectUsedFormats } from "./subject-fit";
import { DEFAULT_SUBJECTS } from "./default-subjects";
import { reframePrompt } from "./subject-reframe";

describe("subjectFitsFormat", () => {
  it("fits every subject to structured and engagement", () => {
    const s = { category: "Sleep Science" };
    expect(subjectFitsFormat(s, "standard")).toBe(true);
    expect(subjectFitsFormat(s, "engagement")).toBe(true);
    expect(subjectFitsFormat(s, "chartbook")).toBe(false);
  });

  it("reads tags and the category named for a format", () => {
    expect(subjectFormats({ category: "Sleep Science", formats: ["chartbook", "did_you_know"] })).toEqual(["did_you_know", "chartbook"]);
    expect(subjectFormats({ category: "Chartbook" })).toEqual(["chartbook"]);
    expect(subjectFormats({ category: "Did You Know", formats: ["primer"] })).toEqual(["did_you_know", "primer"]);
    expect(subjectFormats({ category: "Sleep Science", formats: ["bogus"] })).toEqual([]);
  });
});

describe("used per format", () => {
  it("records per format and treats a legacy usedAt by category", () => {
    const legacyStandard = { category: "Sleep Science", usedAt: "2026-01-01" };
    expect(subjectUsedFor(legacyStandard, "standard")).toBe("2026-01-01");
    expect(subjectUsedFor(legacyStandard, "did_you_know")).toBeUndefined();
    const legacyDyk = { category: "Did You Know", usedAt: "2026-01-01" };
    expect(subjectUsedFor(legacyDyk, "did_you_know")).toBe("2026-01-01");
    expect(subjectUsedFor(legacyDyk, "standard")).toBeUndefined();
    const explicit = { category: "Sleep Science", usedAt: "2026-02-02", usedFor: { chartbook: "2026-02-02" } };
    expect(subjectUsedFor(explicit, "chartbook")).toBe("2026-02-02");
    expect(subjectUsedFor(explicit, "standard")).toBeUndefined();
    expect(subjectUsedFormats(explicit)).toEqual(["chartbook"]);
    expect(subjectUsedFormats(legacyStandard)).toEqual(["standard", "engagement"]);
    expect(isSubjectUsedAnywhere({})).toBe(false);
    expect(isSubjectUsedAnywhere(explicit)).toBe(true);
  });
});

describe("seed audit", () => {
  const seeds = DEFAULT_SUBJECTS;
  const count = (f: "did_you_know" | "chartbook" | "primer") => seeds.filter((s) => subjectFitsFormat(s, f)).length;

  it("tags only known formats", () => {
    for (const s of seeds) for (const f of s.formats ?? []) expect(["did_you_know", "chartbook", "primer"]).toContain(f);
  });

  it("keeps mechanism topics off the chartbook", () => {
    const caffeine = seeds.find((s) => s.text === "How caffeine blocks adenosine receptors")!;
    expect(subjectFitsFormat(caffeine, "chartbook")).toBe(false);
    expect(subjectFitsFormat(caffeine, "standard")).toBe(true);
  });

  it("has a real pool for each frozen format", () => {
    expect(count("did_you_know")).toBeGreaterThan(150);
    expect(count("chartbook")).toBeGreaterThan(60);
    expect(count("primer")).toBeGreaterThan(60);
  });

  it("has no duplicate texts", () => {
    const texts = seeds.map((s) => s.text.trim().toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("reframePrompt", () => {
  it("names the subject, the format and its needs", () => {
    const p = reframePrompt("How caffeine blocks adenosine receptors", "chartbook", "Sleep Science");
    expect(p).toContain('SUBJECT: "How caffeine blocks adenosine receptors"');
    expect(p).toContain("FORMAT: Chartbook");
    expect(p).toMatch(/ONE figure/);
    expect(p).toMatch(/Never invent a number/);
  });
});
