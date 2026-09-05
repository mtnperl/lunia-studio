// Plain-language gate for carousel copy.
//
// The reader is someone who does not know what cortisol or REM is. A deck may
// teach them ONE such word, glossed in plain words where it first appears, and
// never in the hook. Everything else is said in the words they already have.
// Shared by the generator prompt (so the model knows the list) and the
// checklist (so the writer sees what slipped through).

/** Words a reader without sleep or science background does not own. Matched
 *  as whole words, case-insensitive. Keep this list boring and literal. */
export const TECHNICAL_TERMS: string[] = [
  "cortisol", "melatonin", "adenosine", "serotonin", "dopamine", "gaba", "tryptophan", "glycine",
  "apigenin", "l-theanine", "theanine", "orexin", "histamine", "growth hormone",
  "rem", "nrem", "non-rem", "slow-wave", "slow wave sleep", "sleep architecture", "sleep spindles",
  "circadian", "chronotype", "sleep pressure", "homeostatic", "sleep latency", "sleep efficiency",
  "sleep onset", "wake after sleep onset", "sleep debt",
  "glymphatic", "amygdala", "prefrontal", "hippocampus", "hypothalamus", "suprachiasmatic", "hpa axis",
  "sympathetic", "parasympathetic", "vagal", "vagus", "hrv", "heart rate variability",
  "polysomnography", "actigraphy", "eeg", "meta-analysis", "randomised", "randomized", "placebo-controlled",
  "cohort", "odds ratio", "hazard ratio", "confidence interval", "effect size",
  "skin barrier", "transepidermal", "insulin resistance", "glucose", "ghrelin", "leptin", "inflammation", "cytokine",
  "melanopic", "lux", "blue light", "core body temperature", "thermoregulation",
];

export type PlainLanguageIssue =
  | { kind: "term-in-hook"; term: string }
  | { kind: "too-many-terms"; terms: string[] }
  | { kind: "unglossed"; term: string; where: string }
  | { kind: "long-sentence"; where: string; words: number };

export type PlainLanguageReport = { ok: boolean; issues: PlainLanguageIssue[]; terms: string[] };

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const termRe = (t: string) => new RegExp(`(^|[^a-z0-9-])${escape(t)}(?=$|[^a-z0-9-])`, "i");

/** The technical terms present in a piece of text, in order of appearance. */
export function findTerms(text: string): string[] {
  const found: { term: string; at: number }[] = [];
  for (const t of TECHNICAL_TERMS) {
    const m = termRe(t).exec(text);
    if (m) found.push({ term: t, at: m.index });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.term);
}

/**
 * Whether a term is glossed where it appears: the same sentence carries a
 * plain explanation right after it. Accepts "cortisol, the hormone that wakes
 * you", "cortisol (the wake-up hormone)", "cortisol, which ...", "cortisol is
 * the ...", or the reverse order "the hormone that wakes you, cortisol".
 */
export function isGlossed(sentence: string, term: string): boolean {
  const re = new RegExp(`${escape(term)}\\s*(?:,|\\(|:|\\s+is\\s+the|\\s+means|\\s+which|\\s+the\\s)`, "i");
  if (re.test(sentence)) return true;
  const reverse = new RegExp(`,\\s*(?:or\\s+)?${escape(term)}\\b`, "i");
  return reverse.test(sentence);
}

const sentences = (s: string) => s.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Longest sentence a phone reader gets through without re-reading. */
export const MAX_SENTENCE_WORDS = 16;

/**
 * Run the gate over a deck. `hook` is the hook headline and subline; `slides`
 * are the content slide texts, each labelled for the report.
 */
export function plainLanguageCheck(hook: string, slides: { label: string; text: string }[]): PlainLanguageReport {
  const issues: PlainLanguageIssue[] = [];
  for (const term of findTerms(hook)) issues.push({ kind: "term-in-hook", term });

  const seen = new Map<string, string>();
  for (const s of slides) {
    for (const term of findTerms(s.text)) {
      if (seen.has(term)) continue;
      seen.set(term, s.label);
      const sentence = sentences(s.text).find((x) => termRe(term).test(x)) ?? s.text;
      if (!isGlossed(sentence, term)) issues.push({ kind: "unglossed", term, where: s.label });
    }
    for (const x of sentences(s.text)) {
      const n = wordCount(x);
      if (n > MAX_SENTENCE_WORDS) issues.push({ kind: "long-sentence", where: s.label, words: n });
    }
  }
  const terms = [...seen.keys()];
  if (terms.length > 1) issues.push({ kind: "too-many-terms", terms });
  return { ok: issues.length === 0, issues, terms };
}

/** One line per issue, for the checklist detail. */
export function describeIssues(r: PlainLanguageReport): string {
  return r.issues.map((i) => {
    switch (i.kind) {
      case "term-in-hook": return `"${i.term}" is in the hook`;
      case "too-many-terms": return `${i.terms.length} technical terms (${i.terms.join(", ")}); one per deck`;
      case "unglossed": return `"${i.term}" on ${i.where} is not explained where it first appears`;
      case "long-sentence": return `${i.where}: a ${i.words}-word sentence`;
    }
  }).join(". ");
}
