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

import type { CarouselContent, SavedCarousel } from "./types";

// ─── Memory of recent decks ──────────────────────────────────────────────────
//
// Two decks on neighbouring topics converge on the same lead: the ledger's
// strongest figure, the model's default scene, the same hook. A human editor
// remembers what ran last week. This block is that memory, given to the
// brief and to the cut.

/** What the last few decks led with: topic, hook, opening scene, figures. */
export function recentDecksBlock(recent: SavedCarousel[], opts: { excludeId?: string; limit?: number } = {}): string {
  const rows = recent
    .filter((c) => c.id !== opts.excludeId && c.content?.hooks?.length)
    .slice(0, opts.limit ?? 12)
    .map((c) => {
      const hook = c.content.hooks[c.selectedHook] ?? c.content.hooks[0];
      const figures = new Set<string>();
      for (const t of [hook?.headline, hook?.subline, ...(c.content.slides ?? []).map((s) => s.headline)]) {
        for (const m of (t ?? "").match(/\d[\d.,:]*\s?(?:%|percent|minutes?|min|hours?|h|bpm|°[CF]|mg|x)?/gi) ?? []) figures.add(m.trim());
      }
      const moment = c.content.spine?.moment ? ` Scene: ${c.content.spine.moment.slice(0, 120)}` : "";
      const figs = figures.size ? ` Figures: ${[...figures].slice(0, 6).join(", ")}` : "";
      return `- "${c.topic.slice(0, 80)}": hook "${hook?.headline ?? ""}".${moment}${figs}`;
    });
  if (rows.length === 0) return "";
  return `
ALREADY PUBLISHED. These decks ran recently. This deck is a new issue, not a reprint: do not open on a hook, a scene or a lead figure that appears below. If the strongest fact on file was the lead of one of these, build this deck around a different finding, or a different angle on the same one, and say so in the brief. A reader who follows the account sees them in a row.
${rows.join("\n")}
`;
}

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
  /** Findings the deck deliberately does not carry. */
  leftOut?: string;
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

export const BRIEF_PROMPT = (topic: string, ledgerBlock: string, structureHint?: string, recentBlock = ""): string => `You are writing the brief for an Instagram carousel by Lunia Life, a sleep supplement brand. Topic: "${topic}"

Before any slide exists, write the ARGUMENT, in plain English, as if explaining this to a smart friend over coffee. There are no slide rules here: no word counts, no hooks, no loops. Just be right and be clear.

Who reads it: a curious adult who reads well, the reader of a good newspaper's science pages. Use the real terms (REM, cortisol, theta rhythm) and define each in passing the first time; never a nursery substitute like "dreaming sleep". Sentences of the length a science journalist writes, most 12 to 22 words.

What the brief must do:
- Make ONE claim and carry it. A carousel is one argument, not a review. Choose the single finding the deck exists to deliver, then use only the evidence that proves it: at most three comparisons. Everything else the facts show is left out, however true and well sourced. A brief that walks through five studies gives the cut five stories, and the slides stop following one another.
- State the belief before it is overturned. If the reader holds a belief the finding contradicts, the argument says that belief in the reader's words first, then shows the evidence against it. A turn against a belief the reader was never shown holding lands on nothing.
- Tell what happened, not what was measured. For each study the argument uses, say who did what to whom and what they saw, in words a reader can picture: "researchers put electrodes on sleepers' scalps and nudged the brain into deeper slow waves for the first hours of the night; next morning those sleepers remembered more of the word pairs they had learned". Never "stimulation at 0.75 Hz improved declarative memory". A frequency, a dose, a p-value, a sample size or an SEM is not a fact a reader can feel; it belongs in "comparisons" for the fact check, not in the argument.
- Say what was compared. A study compares two things; name both. "8.5 hours in bed versus 5.5" is a comparison; "5.5 hours of sleep" alone is not.
- Put every number next to its baseline. "55% less fat lost on the short-sleep schedule than on the long one." Never a figure floating on its own. The metric is the DIFFERENCE, so say what it is a difference between.
- Explain an idea before you name it. Say "the weight they lost was muscle, not fat" and then, if useful, "researchers call this body composition". Never swap a plain word for a clumsy paraphrase to avoid a term; explain it instead.
- Only claim what the facts below support, or what you are certain of. Where a mechanism is uncertain, say what is known and stop. Nothing here is decoration; a wrong sentence in the brief becomes a wrong slide.
- Earn the action. "Tonight" must follow from the evidence in the argument. If it needs one more fact to follow (for instance, that deep slow-wave sleep is concentrated in the first half of the night, so a late bedtime cuts it), the argument states that fact with its source; an action the evidence does not reach is left out.
- Do not invent a villain. If the reader holds a belief the finding overturns, name it. If they do not, leave "overturns" empty. A study of two sleep schedules does not mean the reader "cut sleep to fit the diet in".
${structureHint ? `\nHow this deck will argue: ${structureHint}\n` : ""}${ledgerBlock ? `\n${ledgerBlock}\n` : ""}${recentBlock}
Return ONLY valid JSON in this exact format, no other text:
{
  "claim": "the one sentence the reader walks away with, plain English, with its comparison in it",
  "argument": "about 120 words of prose a science journalist would file. Who did what to whom and what they saw, the one or two figures a reader can feel with their baselines, why it happens as far as is known, and what the reader does about it. No units a reader cannot picture.",
  "comparisons": [
    { "measure": "what was measured", "a": "condition A", "b": "condition B", "result": "the number, its direction, and which condition it favours" }
  ],
  "leftOut": "one sentence naming the true, sourced findings this deck deliberately does not carry, so the cut does not reach for them",
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
          .slice(0, 3)
      : [];
    const brief: CarouselBrief = { claim: str("claim", 400), argument: str("argument", 2000), comparisons, who: str("who", 160), overturns: str("overturns", 400), tonight: str("tonight", 400), leftOut: str("leftOut", 400) || undefined };
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
THE BRIEF. This is the argument. Every slide is CUT from it: a sentence or two of the brief, given a headline. A slide tells what happened, not what was measured: who did what and what they saw. Figures a reader cannot feel (a frequency, a dose, a p-value, a sample size, an SEM) never appear on a slide; the citation carries them. Keep the brief's sentences as written wherever they fit; shorten only to fit the slide, and never by chopping a sentence into fragments. You may reorder. You may not add a claim, a number, a mechanism or a motive that is not in the brief, and every number keeps the baseline the brief gives it ("55% less than on 8.5 hours", never "55% less" alone). The takeaway restates the claim. If a slide needs something the brief does not say, the slide says less, not more.

  Claim: ${brief.claim}
  Argument: ${brief.argument}
${comps ? `  Comparisons:\n${comps}\n` : ""}  Who it is for: ${brief.who}
  ${brief.overturns ? `Belief this overturns: ${brief.overturns}\n  The slide that overturns this belief states it first, in the reader's words, then shows the evidence against it.` : "There is no villain in this deck. Do not write one."}
  Tonight: ${brief.tonight}${brief.leftOut ? `\n  Left out on purpose, do not reach for it: ${brief.leftOut}` : ""}

THE HOOKS OPEN THIS DECK. All three hooks pose the question the takeaway answers, from three angles. A hook about a fact the deck does not resolve fails, however striking.
`;
}

/** The writing step when a brief exists. Replaces the plain-language rules,
 *  the spine mechanism, the relay and the slot "End on" lines with a short
 *  guide. The writer is trusted to execute; the editor read catches misses. */
export function craftBlock(brief: CarouselBrief): string {
  const comps = brief.comparisons.map((c) => `  - ${c.measure}: ${c.a} vs ${c.b}. ${c.result}`).join("\n");
  return `
WHO IS READING. A curious adult who reads the science pages of a good newspaper on their phone. They have not studied sleep; nothing is assumed and nothing is dumbed down. Write the way a good science journalist writes for them: real terms, each explained in passing the first time (what it is for the reader, not an acronym expansion), sentences of the length prose has, and a story of what people did and what they saw rather than what was measured.

THE BRIEF. Everything the deck says is here. Cut it into slides; do not add a claim, a number, a mechanism or a motive that is not in it. Figures a reader cannot feel (a frequency, a dose, a p-value, a sample size) stay in the citation, not on the slide.
  Claim: ${brief.claim}
  Argument: ${brief.argument}
${comps ? `  Comparisons, for your own accuracy:\n${comps}\n` : ""}  Who it is for: ${brief.who}
  ${brief.overturns ? `Belief this overturns: ${brief.overturns}` : "There is no villain in this deck; do not write one."}
  Tonight: ${brief.tonight}${brief.leftOut ? `\n  Left out on purpose: ${brief.leftOut}` : ""}

HOW A GOOD CAROUSEL READS. Write the whole thing as one short piece first, then cut it into slides, so a reader who reads the slides in a row reads an article, not a list. One thought per slide, said fully. Each slide makes the reader want the next one because of what it says, not because a line tells them to keep going. The hook is the promise, in the reader's language. The first slide opens the scene or the problem. The middle tells what was found as what happened: who did what, what they saw. If the reader holds a belief the finding overturns, say the belief in their words before you overturn it. The last slide says what to do tonight and what to remember. Headlines are complete sentences a stranger understands with nothing under them. Numbers only where the reader can feel them, always against their baseline. All three hooks open this same argument from different angles.

Also return the "spine" (moment, villain or "", turn, payoff, who) as a summary of the deck you wrote, and on each slide a "beat" naming the part it serves: moment, villain, turn or payoff.
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

Read it the way a good editor reads a draft, and fix what an editor would fix. You are looking for: a slide that does not follow from the one before it, or that overturns a belief the reader was never shown holding; a number with no baseline on the slide; a sentence no native writer would produce, or a nursery substitute for a real term ("dreaming sleep" for REM); a slide that recites a measurement (a frequency, a dose, a p-value) instead of telling who did what and what they saw; a headline that means nothing on its own; a takeaway that says something other than the brief's claim; a hook that promises what the slides never deliver; anything pitched at a child rather than the adult this is for. When a slide reads as machinery, rewrite the whole slide in the register of a science journalist; do not patch a word.

A fix is a replacement for that unit only, and it never removes what the slide was for: if the last slide's action is not earned by what came before, add the bridge from the brief rather than deleting the action, and never turn the last slide into a repeat of the one before it. Shapes: a hook headline is UPPERCASE, 8 words or fewer, with a subline of 10 words or fewer that completes the headline's comparison or says who it is for; a slide headline is 8 words or fewer${opts.viral ? ", sentence case, and is the first line of the slide's thought" : ""}; ${bodyShape}; a takeaway point is 12 words or fewer with no full stop. Keep every fact inside the brief. Keep citations as they are.

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
