// Which subjects fit which carousel format, and which format a subject has
// already been used for.
//
// Every subject can be a Structured or Engagement deck: those formats explain
// a topic and any topic can be explained. The three frozen two-slide formats
// are pickier, and the library used to offer every subject for all of them.
// "How caffeine blocks adenosine receptors" was on the Chartbook list with
// nothing in it to chart.
//
// The fit criteria the tags follow:
//   did_you_know  one surprising, citable claim, ideally with a number.
//                 A "how X works" explainer fails unless it reduces to one fact.
//   chartbook     a comparison or a distribution with published numbers across
//                 groups: by age, per drink, X against Y, ranked. Mechanism and
//                 "why" topics fail.
//   primer        a reference: a glossary, a formula, an either-or decision, a
//                 checklist of conditions. Narrative study findings fail.

import type { CarouselFormat, Subject } from "./types";

/** The formats a subject has to be tagged for. Structured and Engagement fit
 *  everything and are not tagged. */
export type SubjectFormat = "did_you_know" | "chartbook" | "primer";
export const SUBJECT_FORMATS: SubjectFormat[] = ["did_you_know", "chartbook", "primer"];

export const SUBJECT_FORMAT_LABEL: Record<SubjectFormat, string> = {
  did_you_know: "Did you know",
  chartbook: "Chartbook",
  primer: "Primer",
};

/** Short chip text for a subject row. */
export const SUBJECT_FORMAT_CHIP: Record<SubjectFormat, string> = {
  did_you_know: "DYK",
  chartbook: "Chart",
  primer: "Primer",
};

/** The seed categories that exist for one frozen format. A subject in one of
 *  them fits that format even when it carries no tags, so subjects added
 *  before tagging existed keep working. */
const CATEGORY_FORMAT: Record<string, SubjectFormat> = {
  "Did You Know": "did_you_know",
  "Chartbook": "chartbook",
  "Primer": "primer",
};

export function isSubjectFormat(f: unknown): f is SubjectFormat {
  return f === "did_you_know" || f === "chartbook" || f === "primer";
}

/** The frozen formats a subject fits: its tags, plus the one its category
 *  is named for. */
export function subjectFormats(s: Pick<Subject, "category" | "formats">): SubjectFormat[] {
  const out = new Set<SubjectFormat>((s.formats ?? []).filter(isSubjectFormat));
  const byCategory = CATEGORY_FORMAT[s.category];
  if (byCategory) out.add(byCategory);
  return SUBJECT_FORMATS.filter((f) => out.has(f));
}

export function subjectFitsFormat(s: Pick<Subject, "category" | "formats">, format: CarouselFormat | string | undefined | null): boolean {
  if (!isSubjectFormat(format)) return true;
  return subjectFormats(s).includes(format);
}

/** What a legacy `usedAt` (set before uses were recorded per format) most
 *  likely meant: the format the subject's category is named for, otherwise
 *  a Structured or Engagement deck. */
function legacyUsedFormats(s: Pick<Subject, "category">): string[] {
  const byCategory = CATEGORY_FORMAT[s.category];
  return byCategory ? [byCategory] : ["standard", "engagement"];
}

/** ISO date the subject was used for this format, if it was. */
export function subjectUsedFor(s: Pick<Subject, "category" | "usedAt" | "usedFor">, format: CarouselFormat | "video" | string): string | undefined {
  const explicit = s.usedFor?.[format];
  if (explicit) return explicit;
  if (s.usedAt && !s.usedFor && legacyUsedFormats(s).includes(format)) return s.usedAt;
  return undefined;
}

export function isSubjectUsedAnywhere(s: Pick<Subject, "usedAt" | "usedFor">): boolean {
  return !!s.usedAt || Object.keys(s.usedFor ?? {}).length > 0;
}

/** The formats a subject has been used for, for display. */
export function subjectUsedFormats(s: Pick<Subject, "category" | "usedAt" | "usedFor">): string[] {
  if (s.usedFor && Object.keys(s.usedFor).length > 0) return Object.keys(s.usedFor);
  return s.usedAt ? legacyUsedFormats(s) : [];
}
