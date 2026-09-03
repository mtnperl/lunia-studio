import { describe, expect, it } from "vitest";
import { matchFacts, factsPromptBlock, numericSignatures, findCarriers, mergeFacts } from "./facts";
import type { Fact, SavedCarousel, SavedCampaign } from "./types";

const fact = (over: Partial<Fact>): Fact => ({
  id: "f1", subjectText: "L-theanine: from green tea leaf to sleep supplement",
  statement: "A 200 ml cup of green tea contains about 8 mg of L-theanine.", value: "8 mg per 200 ml cup",
  source: { citation: "Keenan EK et al. Food Chem. 2011", url: "https://doi.org/x", quote: "7.9 ± 3.8 mg" },
  status: "verified", origin: "manual", createdAt: "2026-09-02", updatedAt: "2026-09-02", ...over,
});

describe("matchFacts", () => {
  it("matches by subject id first, then by subject text, then by shared words", () => {
    const facts = [fact({ id: "a", subjectId: "s1" }), fact({ id: "b", subjectText: "Magnesium glycinate for sleep", statement: "Magnesium 400 mg" }), fact({ id: "c", subjectText: "Green tea L-theanine and calm focus" })];
    expect(matchFacts(facts, "anything", "s1").map((f) => f.id)).toEqual(["a"]);
    expect(matchFacts(facts, "l-theanine: from green tea leaf to sleep supplement").map((f) => f.id)[0]).toBe("a");
    expect(matchFacts(facts, "How green tea theanine calms the brain").map((f) => f.id)).toContain("c");
    expect(matchFacts(facts, "Magnesium foods").map((f) => f.id)).not.toContain("a");
  });
  it("never returns retracted facts", () => {
    expect(matchFacts([fact({ status: "retracted", subjectId: "s1" })], "x", "s1")).toEqual([]);
  });
});

describe("factsPromptBlock", () => {
  it("separates verified facts from sourced-but-unreviewed ones", () => {
    const block = factsPromptBlock([fact({}), fact({ id: "p", status: "pending", statement: "Pending thing 3 mg" })]);
    expect(block).toContain("VERIFIED FACTS");
    expect(block).toContain("8 mg of L-theanine");
    expect(block).toContain("Keenan");
    expect(block).toContain("NOT YET REVIEWED");
    expect(block.indexOf("8 mg of L-theanine")).toBeLessThan(block.indexOf("Pending thing"));
  });
  it("is empty with nothing on file, and never quotes retracted facts", () => {
    expect(factsPromptBlock([])).toBe("");
    expect(factsPromptBlock([fact({ status: "retracted" })])).toBe("");
  });
});

describe("numericSignatures", () => {
  it("extracts figures with units and ranges", () => {
    const s = numericSignatures("A brewed cup of green tea delivers roughly 5 to 25 mg of L-theanine. Trials used 200 mg.");
    expect(s).toContain("25 mg");
    expect(s).toContain("25mg");
    expect(s).toContain("200 mg");
    expect(s.some((x) => x.startsWith("5 to 25"))).toBe(true);
  });
  it("ignores bare numbers", () => {
    expect(numericSignatures("Slide 3 of 5")).toEqual([]);
  });
});

describe("findCarriers", () => {
  it("finds documents that still carry an old value, ignoring verification records", () => {
    const carousels = [
      { id: "c1", topic: "Tea", content: { slides: [{ body: "one cup gives 25 mg" }] }, verification: { units: [{ claims: [{ text: "25 mg" }] }] } } as unknown as SavedCarousel,
      { id: "c2", topic: "Other", content: { slides: [{ body: "nothing here" }] } } as unknown as SavedCarousel,
    ];
    const emails = [{ id: "e1", topic: "Tea mail", content: { subjectLines: ["S"], selectedSubject: 0, blocks: [{ body: "about 25mg per cup" }] } } as unknown as SavedCampaign];
    const hits = findCarriers(["25 mg", "25mg"], carousels, emails);
    expect(hits.map((h) => h.id).sort()).toEqual(["c1", "e1"]);
  });
});

describe("mergeFacts", () => {
  it("updates by id or by identical statement, otherwise adds", () => {
    const a = fact({ id: "a" });
    const { facts, added, updated } = mergeFacts([a], [fact({ id: "zzz", statement: a.statement, value: "8 mg" }), fact({ id: "b", statement: "Black tea about 24 mg per cup." })]);
    expect(added).toBe(1); expect(updated).toBe(1);
    expect(facts.find((f) => f.id === "a")?.value).toBe("8 mg");
    expect(facts.some((f) => f.id === "zzz")).toBe(false);
  });
});
