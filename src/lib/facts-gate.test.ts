import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Fact } from "./types";

// The ledger the gate reads, swapped per test.
const ledger: { current: Fact[] } = { current: [] };
const researchSubject = vi.fn();

vi.mock("./kv", () => ({
  getFacts: async () => ledger.current,
  // Present so an accidental re-introduction of subject lookup is visible
  // here rather than in production.
  getSubjects: async () => [{ id: "s1", text: "Melatonin and age", category: "Sleep" }],
}));
vi.mock("./facts-research", () => ({
  researchSubject,
  getResearchAttempts: async () => ({}),
}));

const { ledgerBlockFor } = await import("./facts-gate");

const fact = (over: Partial<Fact>) => ({
  id: `f-${Math.random()}`,
  statement: "Magnesium bisglycinate at 500 mg raised sleep efficiency in one trial",
  subjectId: "s1",
  subjectText: "Melatonin and age",
  status: "verified",
  source: { citation: "Someone 2020" },
  ...over,
}) as Fact;

describe("the ledger gate", () => {
  beforeEach(() => {
    researchSubject.mockClear();
    ledger.current = [];
  });

  it("quotes the facts on file for the subject", async () => {
    ledger.current = [fact({})];
    const block = await ledgerBlockFor("Melatonin and age", "s1");
    expect(block).toContain("VERIFIED FACTS FOR THIS TOPIC");
    expect(block).toContain("Someone 2020");
  });

  it("never researches, even when the subject has nothing on file", async () => {
    // This is the whole point of the gate now. A write is not the moment to
    // spend a minute and a web search, and the cost must not arrive without
    // anyone choosing it.
    const block = await ledgerBlockFor("Melatonin and age", "s1");
    expect(block).toBe("");
    expect(researchSubject).not.toHaveBeenCalled();
  });

  it("never researches for a free-typed topic either", async () => {
    const block = await ledgerBlockFor("something nobody has filed anything about");
    expect(block).toBe("");
    expect(researchSubject).not.toHaveBeenCalled();
  });

  it("writes without a ledger rather than failing when storage is down", async () => {
    ledger.current = null as unknown as Fact[];
    await expect(ledgerBlockFor("Melatonin and age", "s1")).resolves.toBe("");
    expect(researchSubject).not.toHaveBeenCalled();
  });
});
