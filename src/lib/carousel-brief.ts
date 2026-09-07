// The brief, the cut, and the editor read.
//
// A deck used to be written straight from a topic under thirty slide rules,
// and the model satisfied the rules one slide at a time while the argument
// fell apart: a number without its baseline, a villain the study never had,
// a paraphrase where a plain explanation belonged. So writing is now three
// stages with one job each:
//
//   1. THE BRIEF. The argument in plain prose, as if explaining the study to
//      a smart friend. No slide rules. Every number next to what it is
//      compared against. Verified facts come in from the ledger.
//   2. THE CUT. Slides are lifted from the brief, not written fresh. The
//      generator may shape, never add. (carousel-prompts.ts, briefPromptBlock)
//   3. THE EDITOR READ. A second call reads the finished deck cold, as a
//      native English reader with no access to the rules, and answers four
//      questions. It returns rewrites, which are applied here.

import type { CarouselContent } from "./types";

export type BriefComparison = {
  /** What was measured. "fat lost over 14 days" */
  measure: string;
  /** The two conditions. "8.5 hours in bed" / "5.5 hours in bed" */
  a: string;
  b: string;
  /** The result, with the number and its direction. "55% less fat lost on 5.5 hours" */
  result: string;
};

export type CarouselBrief = {
  /** The one sentence the reader walks away with. */
  claim: string;
  /** The argument in plain prose, about 120 words. */
  argument: string;
  /** Every figure in the deck, with what it is compared against. */
  comparisons: BriefComparison[];
  /** Who this is for, in their words. */
  who: string;
  /** The belief the finding overturns, or "" when there is none. Never invented. */
  overturns: string;
  /** What the reader does tonight, one sentence. */
  tonight: string;
};

export type EditorNote = {
  /** "hook 1", "slide 2", "takeaway". Slides are numbered as the reader sees them: slide 2 is the first content slide. */
  where: string;
  problem: string;
  fix?: { headline?: string; subline?: string; body?: string; points?: string[] };
  /** Set when the fix was written into the deck. */
  applied?: boolean;
};

export type EditorRead = {
  verdict: "clean" | "revised";
  notes: EditorNote[];
  readAt: string;
};

// ─── Stage 1: the brief ──────────────────────────────────────────────────────

export const BRIEF_PROMPT = (topic: string, ledgerBlock: string, structureHint?: string): string => `You are writing the brief for an Instagram carousel by Lunia Life, a sleep supplement brand. Topic: "${topic}"

Before any slide exists, write the ARGUMENT, in plain English, as if explaining this to a smart friend over coffee. There are no slide rules here: no word counts, no hooks, no loops. Just be right and be clear.

What the brief must do:
- Say what was compared. A study compares two things; name both. "8.5 hours in bed versus 5.5" is a comparison; "5.5 hours of sleep" alone is not.
- Put every number next to its baseline. "55% less fat lost on the short-sleep schedule than on the long one." Never a figure floating on its own. The metric is the DIFFERENCE, so say what it is a difference between.
- Explain an idea before you name it. Say "the weight they lost was muscle, not fat" and then, if useful, "researchers call this body composition". Never swap a plain word for a clumsy paraphrase to avoid a term; explain it instead.
- Only claim what the facts below support, or what you are certain of. Where a mechanism is uncertain, say what is known and stop. Nothing here is decoration; a wrong sentence in the brief becomes a wrong slide.
- Do not invent a villain. If the reader holds a belief the finding overturns, name it. If they do not, leave "overturns" empty. A study of two sleep schedules does not mean the reader "cut sleep to fit the diet in".
${structureHint ? `\nHow this deck will argue: ${structureHint}\n` : ""}${ledgerBlock ? `\n${ledgerBlock}\n` : ""}
Return ONLY valid JSON in this exact format, no other text:
{
  "claim": "the one sentence the reader walks away with, plain English, with its comparison in it",
  "argument": "about 120 words of prose. What was studied, what was compared, what was found with the numbers against their baselines, why it happens as far as is known, and what the reader does about it. Complete sentences a native reader would write.",
  "comparisons": [
    { "measure": "what was measured", "a": "condition A", "b": "condition B", "result": "the number, its direction, and which condition it favours" }
  ],
  "who": "who this is for, in their own words, eight words or fewer",
  "overturns": "the belief this overturns, or an empty string",
  "tonight": "what the reader does tonight, one sentence, concrete"
}`;

export function parseBrief(raw: string): CarouselBrief | null {
  try {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const o = JSON.parse(text) as Record<string, unknown>;
    const str = (k: string, max = 1200) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, max) : "");
    const comparisons = Array.isArray(o.comparisons)
      ? (o.comparisons as Record<string, unknown>[])
          .filter((c) => c && typeof c === "object")
          .map((c) => ({
            measure: String(c.measure ?? "").trim().slice(0, 200),
            a: String(c.a ?? "").trim().slice(0, 200),
            b: String(c.b ?? "").trim().slice(0, 200),
            result: String(c.result ?? "").trim().slice(0, 300),
          }))
          .filter((c) => c.measure && c.result)
          .slice(0, 8)
      : [];
    const brief: CarouselBrief = { claim: str("claim", 400), argument: str("argument", 2000), comparisons, who: str("who", 160), overturns: str("overturns", 400), tonight: str("tonight", 400) };
    if (!brief.claim || !brief.argument) return null;
    return brief;
  } catch {
    return null;
  }
}

/** The brief as the generator sees it. This block replaces most of the old
 *  slide rules: the slides are cut from this text. */
export function briefPromptBlock(brief: CarouselBrief | null | undefined): string {
  if (!brief) return "";
  const comps = brief.comparisons.map((c) => `  - ${c.measure}: ${c.a} vs ${c.b}. ${c.result}`).join("\n");
  return `
THE BRIEF. This is the argument. Every slide is CUT from it: a sentence or two of the brief, given a headline. You may shorten, split and reorder sentences. You may not add a claim, a number, a mechanism or a motive that is not in the brief, and every number keeps the baseline the brief gives it ("55% less than on 8.5 hours", never "55% less" alone). The takeaway restates the claim. If a slide needs something the brief does not say, the slide says less, not more.

  Claim: ${brief.claim}
  Argument: ${brief.argument}
${comps ? `  Comparisons:\n${comps}\n` : ""}  Who it is for: ${brief.who}
  ${brief.overturns ? `Belief this overturns: ${brief.overturns}` : "There is no villain in this deck. Do not write one."}
  Tonight: ${brief.tonight}
`;
}

// ─── Stage 3: the editor read ────────────────────────────────────────────────

export const EDITOR_READ_PROMPT = (brief: CarouselBrief | null, content: CarouselContent, opts: { viral?: boolean; essay?: boolean } = {}): string => {
  const hooks = (content.hooks ?? []).map((h, i) => `hook ${i + 1}:\n  headline: ${h.headline}\n  subline: ${h.subline}`).join("\n");
  const slides = (content.slides ?? []).map((s, i) => `slide ${i + 2}:\n  headline: ${s.headline}\n  body: ${s.body.replace(/\n/g, " / ")}`).join("\n");
  const tk = content.takeaway ? `takeaway:\n  headline: ${content.takeaway.headline}\n  points: ${content.takeaway.points.map((p) => `"${p}"`).join(", ")}` : "";
  const bodyShape = opts.viral
    ? "a body is 2 to 4 short lines separated by \" / \" in this listing; return it with real newlines (\\n) between lines, each line 9 words or fewer"
    : "a body is 2 or 3 sentences, under 60 words";
  return `You are a careful native English reader. You have not seen any writing rules and you must not invent any. Read this Instagram carousel cold, the way a stranger would on a phone, and judge it against the brief it was cut from.
${brief ? `
THE BRIEF (the argument the deck must carry):
  Claim: ${brief.claim}
  Argument: ${brief.argument}
${brief.comparisons.length ? `  Comparisons:\n${brief.comparisons.map((c) => `  - ${c.measure}: ${c.a} vs ${c.b}. ${c.result}`).join("\n")}\n` : ""}` : ""}
THE DECK:
${hooks}
${slides}
${tk}

Answer four questions about the deck, and fix what fails:
1. Does each slide follow from the one before it? A slide that arrives from nowhere, repeats the previous one, or adds nothing to the argument fails.
2. Is every number stated against its baseline? "55% less fat" fails; "55% less fat than on 8.5 hours" passes. A figure whose source condition is never named on that slide fails.
3. Does every sentence read as English a native writer would produce? "What that lost weight was made of", "food was matched", "different body" are the kind of thing that fails: a paraphrase where a plain explanation belongs. Fix by saying the thing plainly.
4. Does the takeaway say what the brief's claim says, and is each point true to the brief? A point that asserts a motive or a cause the brief does not contain fails.

When something fails, write the fix. A fix is a replacement for that unit only, in the same shape: a hook headline is UPPERCASE, 8 words or fewer, with a subline of 10 words or fewer that completes the headline's comparison or says who it is for; a slide headline is 8 words or fewer${opts.viral ? ", sentence case, and is the first line of the slide's thought" : ""}; ${bodyShape}; a takeaway point is 12 words or fewer with no full stop. Keep every fact inside the brief. Keep citations as they are. Prefer the smallest change that makes the unit right.

Return ONLY valid JSON in this exact format, no other text:
{
  "verdict": "clean | revised",
  "notes": [
    { "where": "hook 1 | slide 2 | slide 3 | takeaway", "problem": "one sentence, in the reader's words", "fix": { "headline": "optional", "subline": "optional", "body": "optional", "points": ["optional", "three", "lines"] } }
  ]
}
"clean" with an empty notes array is a correct answer when nothing fails. Do not manufacture notes.`;
};

export function parseEditorRead(raw: string): Omit<EditorRead, "readAt"> | null {
  try {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const o = JSON.parse(text) as { verdict?: unknown; notes?: unknown };
    const notes: EditorNote[] = Array.isArray(o.notes)
      ? (o.notes as Record<string, unknown>[])
          .filter((n) => n && typeof n === "object" && typeof n.where === "string")
          .map((n) => {
            const fixRaw = n.fix && typeof n.fix === "object" ? (n.fix as Record<string, unknown>) : null;
            const fix = fixRaw
              ? {
                  headline: typeof fixRaw.headline === "string" ? fixRaw.headline.trim() : undefined,
                  subline: typeof fixRaw.subline === "string" ? fixRaw.subline.trim() : undefined,
                  body: typeof fixRaw.body === "string" ? fixRaw.body.trim() : undefined,
                  points: Array.isArray(fixRaw.points) ? fixRaw.points.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim()).slice(0, 3) : undefined,
                }
              : undefined;
            const hasFix = !!fix && (fix.headline || fix.subline || fix.body || (fix.points && fix.points.length));
            return { where: (n.where as string).trim().toLowerCase(), problem: String(n.problem ?? "").trim().slice(0, 400), fix: hasFix ? fix : undefined };
          })
          .slice(0, 12)
      : [];
    const verdict = o.verdict === "clean" && notes.every((n) => !n.fix) ? "clean" : "revised";
    return { verdict, notes };
  } catch {
    return null;
  }
}

/** Write the editor's fixes into the deck. Returns a new content object with
 *  `editorRead` recording what was said and what was applied. A fix that
 *  points at a unit the deck does not have is kept as a note, not applied. */
export function applyEditorRead(content: CarouselContent, read: Omit<EditorRead, "readAt">): CarouselContent {
  const hooks = (content.hooks ?? []).map((h) => ({ ...h }));
  const slides = (content.slides ?? []).map((s) => ({ ...s }));
  let takeaway = content.takeaway ? { ...content.takeaway, points: [...content.takeaway.points] } : undefined;
  const notes = read.notes.map((n) => ({ ...n }));

  for (const n of notes) {
    if (!n.fix) continue;
    const hook = /^hook\s*(\d+)$/.exec(n.where);
    const slide = /^slide\s*(\d+)$/.exec(n.where);
    if (hook) {
      const h = hooks[Number(hook[1]) - 1];
      if (!h) continue;
      if (n.fix.headline) h.headline = n.fix.headline;
      if (n.fix.subline !== undefined) h.subline = n.fix.subline;
      if (h.emphasis && !h.headline.toLowerCase().includes(h.emphasis.toLowerCase())) delete h.emphasis;
      n.applied = true;
    } else if (slide) {
      const s = slides[Number(slide[1]) - 2];
      if (!s) continue;
      if (n.fix.headline) s.headline = n.fix.headline;
      if (n.fix.body) s.body = n.fix.body;
      if (s.emphasis && !s.body.includes(s.emphasis)) delete s.emphasis;
      n.applied = true;
    } else if (n.where === "takeaway" && takeaway) {
      if (n.fix.headline) takeaway = { ...takeaway, headline: n.fix.headline };
      if (n.fix.points && n.fix.points.length) takeaway = { ...takeaway, points: n.fix.points };
      n.applied = true;
    }
  }
  return {
    ...content,
    hooks,
    slides,
    ...(takeaway ? { takeaway } : {}),
    editorRead: { verdict: notes.some((n) => n.applied) ? "revised" : "clean", notes, readAt: new Date().toISOString() },
  };
}

/** The editor read as one checklist line. */
export function describeEditorRead(read: EditorRead | undefined): string {
  if (!read) return "Not read yet";
  const applied = read.notes.filter((n) => n.applied);
  if (applied.length === 0) return "Read cold: nothing failed";
  return `${applied.length} fix${applied.length > 1 ? "es" : ""} applied: ${applied.map((n) => `${n.where}, ${n.problem}`).join("; ")}`;
}
