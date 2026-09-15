import { describe, it, expect } from "vitest";
import {
  SUBJECT_LINE_MAX,
  leadFact,
  needsCorrection,
  factsBySubject,
  fitsAsSubjectLine,
  alreadyCorrected,
  planCorrections,
  applyCorrections,
  revertCorrection,
  correctedSubjects,
  correctionsAsText,
  condensePrompt,
  parseCondensed,
} from "./subject-corrections";
import type { Fact, Subject } from "./types";

const subject = (id: string, text: string, over: Partial<Subject> = {}) => ({ id, text, category: "Sleep", ...over }) as Subject;
const fact = (over: Partial<Fact>) => ({
  id: `f-${Math.random()}`,
  statement: "a statement",
  subjectText: "",
  status: "pending",
  source: { citation: "Someone 2020" },
  ...over,
}) as Fact;

// The real one from the library, with the real frame filed against it.
const MELATONIN = "The brain produces less melatonin with age";
const LONG_FRAME =
  "A constant-routine comparison of 34 healthy older adults (65-81) with 98 young men found no age difference in melatonin rhythm amplitude, and the authors concluded lower melatonin is not a general feature of healthy aging; only cross-sectional data (334 adults) show lower levels at 65.";
const SHORT_FRAME = "Sleep was most efficient at 20 to 25 C, not 18 to 19 C.";

describe("fitsAsSubjectLine", () => {
  it("takes a correction that already reads as a subject", () => {
    expect(fitsAsSubjectLine(SHORT_FRAME)).toBe(true);
  });

  it("refuses a research frame, which is a paragraph wearing one line", () => {
    expect(fitsAsSubjectLine(LONG_FRAME)).toBe(false);
  });

  it("refuses methods dressed as a short line", () => {
    expect(fitsAsSubjectLine("No age difference in 34 adults (65-81) versus young men")).toBe(false);
    expect(fitsAsSubjectLine("Melatonin holds with age; only cross-sectional data differ")).toBe(false);
    expect(fitsAsSubjectLine("n=34 showed no difference")).toBe(false);
  });

  it("refuses an empty correction", () => {
    expect(fitsAsSubjectLine("   ")).toBe(false);
  });
});

describe("needsCorrection", () => {
  it("fires only on a claim that cannot be published as written", () => {
    expect(needsCorrection([fact({ claimVerdict: "contradicted", safeForCopy: false, claimCorrection: SHORT_FRAME })])).toBe(true);
  });

  it("leaves a caveat subject alone, because the line itself is fine", () => {
    expect(needsCorrection([fact({ claimVerdict: "partly", safeForCopy: true, claimCorrection: "The causal evidence is in mice." })])).toBe(false);
  });

  it("does nothing without a verdict, or without a correction to apply", () => {
    expect(needsCorrection([fact({})])).toBe(false);
    expect(needsCorrection([fact({ claimVerdict: "contradicted", safeForCopy: false })])).toBe(false);
  });

  it("ignores a retracted fact when reading the verdict", () => {
    expect(leadFact([fact({ status: "retracted", claimVerdict: "contradicted" })])).toBeUndefined();
  });
});

describe("factsBySubject", () => {
  const subjects = [subject("s1", MELATONIN)];

  it("groups by id, and by wording when the filed id has gone stale", () => {
    const grouped = factsBySubject(
      [fact({ subjectId: "s1" }), fact({ subjectId: "stale-id", subjectText: MELATONIN }), fact({ subjectText: "unrelated" })],
      subjects,
    );
    expect(grouped.get("s1")).toHaveLength(2);
    expect(grouped.size).toBe(1);
  });
});

describe("planCorrections", () => {
  const subjects = [subject("s1", MELATONIN), subject("s2", "Room temperature and sleep"), subject("s3", "Untouched subject")];
  const facts = [
    fact({ subjectId: "s1", claimVerdict: "contradicted", safeForCopy: false, claimCorrection: LONG_FRAME }),
    fact({ subjectId: "s2", claimVerdict: "contradicted", safeForCopy: false, claimCorrection: SHORT_FRAME }),
  ];

  it("splits the ones that can go in as written from the ones that need shortening", () => {
    const plan = planCorrections(subjects, facts);
    expect(plan.ready).toHaveLength(1);
    expect(plan.ready[0].subjectId).toBe("s2");
    expect(plan.ready[0].how).toBe("verbatim");
    expect(plan.needsCondensing).toHaveLength(1);
    expect(plan.needsCondensing[0].subject.id).toBe("s1");
  });

  it("skips a subject that has already been corrected, so a re-run does not stack", () => {
    const done = applyCorrections(subjects, planCorrections(subjects, facts).ready);
    expect(planCorrections(done, facts).ready).toHaveLength(0);
  });

  it("does not correct a line to itself", () => {
    const same = [subject("s4", SHORT_FRAME)];
    const plan = planCorrections(same, [fact({ subjectId: "s4", claimVerdict: "contradicted", safeForCopy: false, claimCorrection: SHORT_FRAME })]);
    expect(plan.ready).toHaveLength(0);
  });
});

describe("applyCorrections and revert", () => {
  const subjects = [subject("s1", "Room temperature and sleep")];
  const corrections = [{ subjectId: "s1", from: "Room temperature and sleep", to: SHORT_FRAME, how: "verbatim" as const, sources: 3 }];

  it("swaps the line and keeps the old one so the change is visible", () => {
    const [s] = applyCorrections(subjects, corrections, "2026-09-15T00:00:00.000Z");
    expect(s.text).toBe(SHORT_FRAME);
    expect(s.priorText).toBe("Room temperature and sleep");
    expect(s.correctedAt).toBe("2026-09-15T00:00:00.000Z");
    expect(alreadyCorrected(s)).toBe(true);
  });

  it("puts a subject back exactly as it was", () => {
    const [s] = applyCorrections(subjects, corrections);
    const back = revertCorrection(s);
    expect(back.text).toBe("Room temperature and sleep");
    expect(back.priorText).toBeUndefined();
    expect(back.correctedAt).toBeUndefined();
  });

  it("leaves an uncorrected subject alone on revert, and does not mutate the input", () => {
    expect(revertCorrection(subjects[0]).text).toBe("Room temperature and sleep");
    applyCorrections(subjects, corrections);
    expect(subjects[0].text).toBe("Room temperature and sleep");
  });
});

describe("the corrected list", () => {
  it("reads newest first and prints what changed", () => {
    const list = [
      subject("a", "new A", { priorText: "old A", correctedAt: "2026-09-01T00:00:00.000Z" }),
      subject("b", "new B", { priorText: "old B", correctedAt: "2026-09-10T00:00:00.000Z" }),
      subject("c", "untouched"),
    ];
    expect(correctedSubjects(list).map((s) => s.id)).toEqual(["b", "a"]);
    const text = correctionsAsText(list);
    expect(text).toContain("was: old B");
    expect(text).toContain("now: new B");
    expect(text).not.toContain("untouched");
  });

  it("says so plainly when nothing has been corrected", () => {
    expect(correctionsAsText([subject("a", "untouched")])).toBe("No subjects have been corrected.");
  });
});

describe("condensing", () => {
  it("asks for a line a person would say, not a paper's report", () => {
    const p = condensePrompt(MELATONIN, LONG_FRAME);
    expect(p).toContain(MELATONIN);
    expect(p).toContain(LONG_FRAME);
    expect(p).toContain(`Under ${SUBJECT_LINE_MAX} characters`);
    expect(p).toContain("No sample sizes");
  });

  it("cleans quotes and stray space off the answer", () => {
    expect(parseCondensed('  "Melatonin holds steady in healthy aging"  ')).toBe("Melatonin holds steady in healthy aging");
  });

  it("refuses an answer that is unusable, leaving the subject uncorrected", () => {
    expect(parseCondensed("   ")).toBeNull();
    expect(parseCondensed("short")).toBeNull();
    expect(parseCondensed("a line\nand another")).toBeNull();
    expect(parseCondensed("x".repeat(SUBJECT_LINE_MAX + 50))).toBeNull();
  });
});
