// Correcting a subject line against the research filed under it.
//
// The library was written as confident assertions: "The brain produces less
// melatonin with age". Research then checked those assertions and, for a few
// hundred of them, found the line as written is not what the studies say.
// That verdict rides on every fact filed for the subject as claimVerdict,
// safeForCopy and claimCorrection, and until now it only reached the writer
// at generation time. The library itself still carried the false premise, so
// every future deck started from it again.
//
// This corrects the line at the source. The old wording is kept on the
// subject, so the change is visible, reversible, and reviewable in a list.
//
// THE LENGTH TRAP. claimCorrection is "how to state the claim honestly", and
// it is written as a frame for the writer, not as a subject line. Some come
// back subject-shaped ("Sleep was most efficient at 20 to 25 C, not 18 to
// 19 C") and some come back as a paragraph of methods and sample sizes.
// Swapping verbatim would leave half the library crisp and half of it an
// essay, so anything too long is condensed before it lands.

import type { Fact, Subject } from "./types";

/** Longest a corrected line may be before it needs condensing. The library's
 *  own lines sit well inside this; a research frame usually does not. */
export const SUBJECT_LINE_MAX = 110;

export type SubjectCorrection = {
  subjectId: string;
  /** The line as the library had it. */
  from: string;
  /** The line it should carry instead. */
  to: string;
  /** Verbatim when the correction was already subject-shaped, condensed when
   *  it had to be shortened to fit. */
  how: "verbatim" | "condensed";
  /** How many facts back the corrected line. */
  sources: number;
};

/** The fact that carries the subject's verdict. The verdict rides on every
 *  fact filed for the subject, so the first one that has it speaks for all. */
export function leadFact(facts: Fact[]): Fact | undefined {
  return facts.find((f) => f.status !== "retracted" && f.claimVerdict);
}

/** Subjects whose line cannot be published as written. A "caveat" subject
 *  (safeForCopy true, with a qualifier) is left alone: the line is fine and
 *  the caveat already reaches the writer. */
export function needsCorrection(facts: Fact[]): boolean {
  const lead = leadFact(facts);
  if (!lead) return false;
  return lead.safeForCopy === false && !!lead.claimCorrection?.trim();
}

/** Group the ledger by the subject each fact was filed under. Falls back to
 *  the wording, since a filed subject id goes stale when the library is
 *  reseeded (see coverageOf for the same problem). */
export function factsBySubject(facts: Fact[], subjects: Subject[]): Map<string, Fact[]> {
  const byId = new Map(subjects.map((s) => [s.id, s.id]));
  const byText = new Map(subjects.map((s) => [s.text.trim().toLowerCase(), s.id]));
  const out = new Map<string, Fact[]>();
  for (const f of facts) {
    const id = (f.subjectId && byId.get(f.subjectId)) ?? byText.get((f.subjectText ?? "").trim().toLowerCase());
    if (!id) continue;
    const list = out.get(id);
    if (list) list.push(f);
    else out.set(id, [f]);
  }
  return out;
}

/** True when the correction can stand as a subject line as it is. */
export function fitsAsSubjectLine(correction: string): boolean {
  const t = correction.trim();
  if (t.length === 0 || t.length > SUBJECT_LINE_MAX) return false;
  // A frame reads as methods when it carries a sample size, an age range in
  // brackets, or a semicolon splicing two findings together. Those are
  // paragraphs wearing one line, whatever their length.
  if (/\bn\s*=\s*\d/i.test(t)) return false;
  if (/\b\d+\s*(?:adults|men|women|participants|subjects|patients|volunteers)\b/i.test(t)) return false;
  if (/\(\s*\d+\s*[-\u2013]\s*\d+\s*\)/.test(t)) return false;
  if (t.includes(";")) return false;
  return true;
}

/** Already corrected once. Re-running the pass must not stack corrections or
 *  lose the original wording. */
export function alreadyCorrected(subject: Subject): boolean {
  return typeof subject.priorText === "string" && subject.priorText.trim().length > 0;
}

/** Plan the corrections for the whole library. Nothing is written here: the
 *  caller condenses the long ones and then applies, so a dry run is free. */
export function planCorrections(
  subjects: Subject[],
  facts: Fact[],
): { ready: SubjectCorrection[]; needsCondensing: { subject: Subject; correction: string; sources: number }[] } {
  const grouped = factsBySubject(facts, subjects);
  const ready: SubjectCorrection[] = [];
  const needsCondensing: { subject: Subject; correction: string; sources: number }[] = [];
  for (const s of subjects) {
    if (alreadyCorrected(s)) continue;
    const mine = grouped.get(s.id) ?? [];
    if (!needsCorrection(mine)) continue;
    const correction = leadFact(mine)!.claimCorrection!.trim();
    const sources = mine.filter((f) => f.status !== "retracted").length;
    if (fitsAsSubjectLine(correction)) {
      // An identical line is not a correction.
      if (correction.trim().toLowerCase() === s.text.trim().toLowerCase()) continue;
      ready.push({ subjectId: s.id, from: s.text, to: correction, how: "verbatim", sources });
    } else {
      needsCondensing.push({ subject: s, correction, sources });
    }
  }
  return { ready, needsCondensing };
}

/** Write the corrections into the library. The old wording moves to
 *  priorText, which is what the corrected list reads and what an undo
 *  restores. Subjects with no correction are returned untouched. */
export function applyCorrections(subjects: Subject[], corrections: SubjectCorrection[], now = new Date().toISOString()): Subject[] {
  const byId = new Map(corrections.map((c) => [c.subjectId, c]));
  return subjects.map((s) => {
    const c = byId.get(s.id);
    if (!c || alreadyCorrected(s)) return s;
    return { ...s, text: c.to, priorText: c.from, correctedAt: now };
  });
}

/** Put a corrected subject back the way it was. */
export function revertCorrection(subject: Subject): Subject {
  if (!alreadyCorrected(subject)) return subject;
  const { priorText, correctedAt: _drop, ...rest } = subject;
  void _drop;
  return { ...rest, text: priorText! };
}

/** The corrected subjects as a list to read, newest first. */
export function correctedSubjects(subjects: Subject[]): Subject[] {
  return subjects
    .filter(alreadyCorrected)
    .sort((a, b) => (b.correctedAt ?? "").localeCompare(a.correctedAt ?? ""));
}

/** The corrected list as plain text, for reading outside the app: a review
 *  pass, or a note to paste somewhere else. */
export function correctionsAsText(subjects: Subject[]): string {
  const rows = correctedSubjects(subjects);
  if (rows.length === 0) return "No subjects have been corrected.";
  return rows
    .map((s) => `${s.category}\n  was: ${s.priorText}\n  now: ${s.text}`)
    .join("\n\n");
}

/** The prompt that turns a research frame into a subject line. Runs on the
 *  draft tier: the answer is already on the page, this only shortens it. */
export function condensePrompt(original: string, correction: string): string {
  return `A subject library for a sleep brand carries one line per subject, the way a reader would say it. One of those lines is wrong, and research has been filed against it.

THE LINE AS WRITTEN (it is wrong or overstated): ${original}

WHAT THE RESEARCH ACTUALLY SHOWS: ${correction}

Rewrite the line so it says what the research shows. Rules:
- Under ${SUBJECT_LINE_MAX} characters, one sentence, sentence case.
- The way a person would say it, not the way a paper reports it. No sample sizes, no methods, no statistics, no citation.
- Keep the subject the reader recognises. The line is still about the same thing; it now says the true version of it.
- Never a question, never a headline, never a promise. It is a subject, not a hook.
- No em dashes.

Return ONLY the line, with no quotes around it and no commentary.`;
}

/** The model's line, cleaned and checked. Returns null when it came back
 *  unusable, which leaves the subject uncorrected rather than mangled. */
export function parseCondensed(raw: string): string | null {
  const trimmed = raw.trim();
  // Check for a second line BEFORE collapsing whitespace. Collapsing first
  // would silently join a commentary line onto the answer and hand back a
  // subject line that the model never meant as one.
  if (/[\r\n]/.test(trimmed)) return null;
  const line = trimmed.replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, " ").trim();
  if (line.length < 8 || line.length > SUBJECT_LINE_MAX + 20) return null;
  return line;
}
