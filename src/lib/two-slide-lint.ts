// Lint for the Chartbook and Primer formats. Structure is checked by the zod
// schemas; this catches what a schema cannot: fabrication tells, banned
// terms, dashes, lines that will not fit, marks that are not in their text.
// Banned terms come from banned-terms.ts so this file cannot drift from
// compliance.ts (three lists already disagreed once).

import type { ChartbookContent, PrimerContent } from "./types";
import { scanBannedTerms } from "./banned-terms";

const BANNED_SCAN_OPTS = { productMentions: true } as const;

/** Words that mean the number was not reported by anyone. */
const FABRICATION = /\b(illustrative|approx\.?|approximately|roughly|estimated|estimate|typical(?:ly)?|hypothetical|for the real|example figures?|placeholder)\b/i;

export type LintResult = { ok: boolean; violations: string[] };

function common(label: string, text: string, v: string[]) {
  if (/[—–]/.test(text)) v.push(`${label}: contains em/en dash`);
  const seen = new Set<string>();
  for (const hit of scanBannedTerms(text, BANNED_SCAN_OPTS)) {
    if (seen.has(hit.term)) continue;
    seen.add(hit.term);
    v.push(`${label}: banned phrase "${hit.term}"`);
  }
}

function underlineInText(label: string, words: string[], text: string, v: string[]) {
  for (const w of words) if (!text.includes(w)) v.push(`${label}: underline word "${w}" is not in the text`);
}

export function lintChartbook(c: ChartbookContent | null | undefined): LintResult {
  const v: string[] = [];
  if (!c || typeof c !== "object") return { ok: false, violations: ["content: missing or malformed"] };
  common("cover.question", c.cover.question, v);
  common("cover.kicker", c.cover.kicker, v);
  if (c.cover.question.length > 60) v.push(`cover.question: too long (${c.cover.question.length} chars, max 60)`);
  underlineInText("cover", c.cover.underline, c.cover.question, v);
  const f = c.figure;
  common("figure.title", f.title, v);
  if (f.title.length > 34) v.push(`figure.title: too long (${f.title.length} chars, max 34)`);
  common("figure.source", f.source.citation, v);
  if (FABRICATION.test(f.source.citation)) v.push("figure.source: hedged source (illustrative / approximate / typical). Cite the real figure or pick another layout");
  const texts: string[] = [];
  if ("unit" in f) texts.push(f.unit);
  if ("kicker" in f) texts.push(f.kicker);
  if (f.layout === "claim-check") texts.push(f.annotation, f.quote);
  if (f.layout === "object-pair") texts.push(f.pair[0].note, f.pair[1].note);
  for (const t of texts) {
    common("figure text", t, v);
    if (FABRICATION.test(t)) v.push(`figure text: hedged number ("${t.slice(0, 40)}")`);
  }
  const labels: string[] =
    f.layout === "pill-bars" ? f.bars.map((b) => b.label)
    : f.layout === "ranked" ? f.items.map((b) => b.label)
    : f.layout === "versus-bars" ? f.groups.map((g) => g.label)
    : f.layout === "object-pair" ? f.pair.map((o) => o.label)
    : [f.small.label, f.large.label];
  for (const l of labels) {
    common("figure label", l, v);
    if (l.length > (f.layout === "ranked" ? 22 : 16)) v.push(`figure label "${l}": too long`);
  }
  const values: number[] =
    f.layout === "pill-bars" ? f.bars.map((b) => b.value)
    : f.layout === "ranked" ? f.items.map((b) => b.value)
    : f.layout === "versus-bars" ? f.groups.flatMap((g) => g.values)
    : f.layout === "claim-check" ? [f.small.value, f.large.value]
    : [];
  if (values.some((n) => !Number.isFinite(n) || n < 0)) v.push("figure: a value is not a finite non-negative number");
  if (f.layout === "claim-check" && f.small.value >= f.large.value) v.push("claim-check: small must be smaller than large");
  if (!c.caption || c.caption.trim().length < 80) v.push("caption: too short or missing");
  common("caption", c.caption ?? "", v);
  return { ok: v.length === 0, violations: v };
}

export function lintPrimer(c: PrimerContent | null | undefined): LintResult {
  const v: string[] = [];
  if (!c || typeof c !== "object") return { ok: false, violations: ["content: missing or malformed"] };
  common("cover.title", c.cover.title, v);
  common("cover.kicker", c.cover.kicker, v);
  if (c.cover.title.length > 40) v.push(`cover.title: too long (${c.cover.title.length} chars, max 40)`);
  underlineInText("cover", c.cover.underline, c.cover.title, v);
  const s = c.slide;
  common("slide.title", s.title, v);
  if (s.title.length > 30) v.push(`slide.title: too long (${s.title.length} chars, max 30)`);
  if (s.layout === "rows") {
    common("slide.kicker", s.kicker, v);
    s.rows.forEach((r, i) => {
      common(`row ${i + 1}`, `${r.term} ${r.definition}`, v);
      if (r.term.split(/\s+/).length > 4) v.push(`row ${i + 1}: term over 4 words`);
      // Definitions set in Inter, which runs wider than the serif: 52 is the
      // most a row holds at eleven rows without an ellipsis.
      if (r.term.length + r.definition.length > 52) v.push(`row ${i + 1}: over 52 characters (${r.term.length + r.definition.length}); it will not set on one line`);
      if (r.key && !r.definition.includes(r.key)) v.push(`row ${i + 1}: key "${r.key}" is not in the definition`);
    });
  } else if (s.layout === "definition") {
    for (const t of [s.term, s.definition, s.formula.left, s.formula.numerator, s.formula.denominator, s.threshold.label, s.threshold.value, s.example.label, s.example.value]) common("definition", t, v);
    if (s.definition.length > 110) v.push("definition: over 110 characters");
  } else if (s.layout === "versus") {
    common("slide.kicker", s.kicker, v);
    s.columns.forEach((col, ci) => {
      common(`column ${ci + 1}`, [col.name, ...col.rows, col.footnote].join(" "), v);
      for (const r of col.rows) if (r.length > 40) v.push(`column ${ci + 1}: row "${r.slice(0, 20)}" over 40 characters`);
      if (col.footnote.length > 48) v.push(`column ${ci + 1}: footnote over 48 characters`);
    });
  } else {
    s.lines.forEach((l, i) => {
      common(`line ${i + 1}`, `${l.condition} ${l.consequence}`, v);
      if (l.condition.length + l.consequence.length > 40) v.push(`line ${i + 1}: over 40 characters`);
    });
    common("closing", s.closing, v);
  }
  if (!c.caption || c.caption.trim().length < 80) v.push("caption: too short or missing");
  common("caption", c.caption ?? "", v);
  return { ok: v.length === 0, violations: v };
}
