import { describe, it, expect } from "vitest";
import { coverageOf } from "./facts-research";
import type { Fact, Subject } from "./types";

const subject = (id: string, text: string) => ({ id, text, category: "Sleep" }) as Subject;
const fact = (over: Partial<Fact>) => ({
  id: `f-${Math.random()}`,
  statement: "a statement",
  status: "pending",
  source: { citation: "Someone 2020" },
  ...over,
}) as Fact;

const subjects = [subject("s1", "The brain produces less melatonin with age"), subject("s2", "Caffeine and adenosine")];

describe("coverageOf", () => {
  it("counts a fact filed under a subject id that still exists", () => {
    const cov = coverageOf([fact({ subjectId: "s1", status: "verified" })], subjects);
    expect(cov.bySubject.s1.verified).toBe(1);
    expect(cov.covered).toBe(1);
    expect(cov.total).toBe(2);
  });

  it("counts a fact that carries only the wording", () => {
    const cov = coverageOf([fact({ subjectText: "The brain produces less melatonin with age" })], subjects);
    expect(cov.bySubject.s1.pending).toBe(1);
    expect(cov.covered).toBe(1);
  });

  it("falls back to the wording when the filed subject id has gone stale", () => {
    // The library was reseeded: ids changed, wording did not. This read as
    // zero coverage, which sent the nightly research job over the whole
    // library again every night.
    const cov = coverageOf(
      [fact({ subjectId: "old-id-from-a-previous-seed", subjectText: "The brain produces less melatonin with age", status: "verified" })],
      subjects,
    );
    expect(cov.bySubject.s1.verified).toBe(1);
    expect(cov.covered).toBe(1);
  });

  it("matches the wording case-insensitively and ignoring outer space", () => {
    const cov = coverageOf([fact({ subjectText: "  the BRAIN produces less melatonin with age " })], subjects);
    expect(cov.covered).toBe(1);
  });

  it("still ignores a fact that belongs to no subject in the library", () => {
    const cov = coverageOf([fact({ subjectId: "gone", subjectText: "something else entirely" })], subjects);
    expect(cov.covered).toBe(0);
  });

  it("does not count a retracted-only subject as covered", () => {
    const cov = coverageOf([fact({ subjectId: "s1", status: "retracted" })], subjects);
    expect(cov.covered).toBe(0);
  });
});
