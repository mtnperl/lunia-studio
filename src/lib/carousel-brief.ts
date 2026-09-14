// The assignment, the piece, the cut, and the editor read.
//
// A deck used to be written straight from a topic under thirty slide rules,
// and the model satisfied the rules one slide at a time while the argument
// fell apart. Then the deck was written from a "brief" that had one shape,
// a study report: pick the strongest finding on file, name its comparison,
// find a belief to overturn. That shape answered "does short sleep cost fat
// loss" well and "what is sleep architecture" not at all: the deck never
// said what sleep architecture was, because no finding on file said so.
//
// So writing now starts from the question, not from the facts:
//
//   1. THE ASSIGNMENT AND THE PIECE (one call). The writer first reads the
//      topic as the question a reader typed, names who is asking, and lists
//      what a satisfying answer owes them. Then they write the piece: a
//      short essay that answers that question, told as a story where it can
//      be. Research backs sentences; it never chooses them.
//   2. THE CUT. Slides are lifted from the piece. Slide 2 is a second hook.
//      Every slide leaves the reader wanting the next one because of what it
//      says, and coherence wins over suspense. (carousel-prompts.ts)
//   3. THE EDITOR READ. A second call reads the finished deck cold and asks,
//      first, whether a stranger could answer the title from the slides;
//      then whether each slide earns the swipe; then the line-level things
//      an editor fixes. It returns rewrites, which are applied here.

import type { CarouselContent, SavedCarousel } from "./types";
import { mandateMenuBlock, mandateBlock, recentMandatesBlock, isDeckMandate, getMandate } from "./deck-mandates";

// ─── Memory of recent decks ──────────────────────────────────────────────────
//
// Two decks on neighbouring topics converge on the same lead. A human editor
// remembers what ran last week. This block is that memory. It governs how a
// deck OPENS, never what it is allowed to explain: a deck about sleep
// architecture defines sleep architecture even if last week's did too.

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
ALREADY PUBLISHED. These decks ran recently, and a reader who follows the account sees them in a row. Do not OPEN this deck on a hook, a scene or a lead figure that appears below; find a different way in. This is about the opening only. Whatever the question needs said gets said, even if an earlier deck said it too.
${rows.join("\n")}
`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type BriefKind = "explainer" | "finding" | "myth" | "how-to" | "story" | "list";

export const BRIEF_KINDS: readonly BriefKind[] = ["explainer", "finding", "myth", "how-to", "story", "list"];

/** A fact that backs a sentence of the piece. For the fact check and the
 *  citation on the slide that carries the sentence. */
export type BriefBacking = {
  /** The fact as the piece uses it, with its baseline. */
  statement: string;
  /** Where it comes from. "" when it is textbook and the writer is certain. */
  source: string;
  /** The sentence or claim of the piece it backs, in a few words. */
  backs: string;
};

/** Kept for decks saved before the piece existed. */
export type BriefComparison = { measure: string; a: string; b: string; result: string };

export type CarouselBrief = {
  // The mandate: why this deck exists at all, decided before the piece.
  /** Which mandate was chosen (see deck-mandates.ts). "" on decks written
   *  before the mandate gate existed. */
  mandate?: string;
  /** The promise the mandate makes, in one line. */
  mandateLine?: string;
  /** The one sentence the reader will believe afterwards and does not now.
   *  Everything before it sets it up, everything after pays it off. */
  turn?: string;
  /** The specific thing the turn rests on: a study, a measurement, a
   *  threshold, a scene. Without one the turn is an opinion. */
  material?: string;
  // The assignment.
  /** The question the reader typed, in their words. */
  question: string;
  /** One group of people, in their words. Never everyone. */
  who: string;
  /** What kind of piece answers this question. */
  kind: BriefKind;
  /** What a satisfying answer owes the reader. The deck fails if one is missing. */
  owes: string[];
  // The piece.
  /** The one sentence the reader can say afterwards that answers the question. */
  claim: string;
  /** The piece itself, in prose. */
  argument: string;
  /** The loop: what the opening promises, the question the reader carries, and where it lands. */
  loop: { promise: string; carried: string; lands: string };
  /** Facts that back sentences of the piece. */
  backing: BriefBacking[];
  /** The belief the piece overturns, or "". Never invented. */
  overturns: string;
  /** What the reader does with this, one sentence, or "" when the piece is not a how-to. */
  tonight: string;
  /** Findings the piece deliberately does not carry. */
  leftOut?: string;
  /** Decks saved before the piece existed carry these instead of backing. */
  comparisons?: BriefComparison[];
};

export type EditorNote = {
  /** "deck", "hook 1", "slide 2", "takeaway". Slides are numbered as the reader sees them: slide 2 is the first content slide. */
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

/** The brief declining the subject. No mandate passed its own test, so there
 *  is no deck here; the writer says why and offers subjects that would work.
 *  The pipeline could not do this before: every stage improved the deck it
 *  was handed, so a weak subject always became a well-made forgettable deck. */
export type BriefReject = {
  /** Why nothing passed, in one sentence a person can act on. */
  reason: string;
  /** Subjects on the same ground that would pass, as topic lines. */
  instead: string[];
};

// ─── Stage 1: the assignment and the piece ───────────────────────────────────

export const BRIEF_PROMPT = (
  topic: string,
  ledgerBlock: string,
  structureHint?: string,
  recentBlock = "",
  opts: { valueMove?: string; hookJob?: string; recentMandates?: (string | undefined)[] } = {},
): string => `You are the editor of Lunia Life, a sleep supplement brand, commissioning a short piece for an Instagram carousel. Subject as it arrived from the library: "${topic}"

Work in three parts. There are no slide rules here: no word counts, no hooks, no loops between slides. That comes later, from what you write now.

PART ZERO, THE MANDATE. Before anything else, decide whether there is a deck here at all, and if so what it is for.

A subject is not a reason to publish. "The relationship between meal timing and sleep quality" is a line from a syllabus: read as a question it asks "does when I eat affect my sleep", the honest answer is "yes, eat earlier", and every reader already believes that. A deck whose conclusion the reader already holds has nowhere to travel, however well it is written. Your first job is to find the thing on this ground that a reader does NOT already hold.

Work it in this order.
  1. Consider the subject against the mandates below and pick the two or three that could plausibly apply.
  2. For each, write the line it would carry, and apply that mandate's own test honestly. A mandate you cannot pass is not available to you.
  3. Choose the one that passes most convincingly. That is the mandate, and the piece is written to deliver it.
  4. Name THE TURN: the one sentence the reader will believe afterwards that they do not believe now. If a reader would nod along to that sentence, it is not a turn, and you go back to step one.
  5. Name THE MATERIAL: the specific thing the turn rests on. A study, a measured threshold, a named mechanism, a scene. Without one, the turn is your opinion and the deck cannot be published. Where the research notes below carry it, say which note. Where you are certain of it as textbook science, say so plainly. Never invent a figure, a study or a source to satisfy this.

THE MANDATES:

${mandateMenuBlock()}

IF NOTHING PASSES. When no mandate passes its own test on this subject, say so instead of writing a piece anyway. Return ONLY this, and nothing else:
{"reject": {"reason": "one sentence on why there is no deck here", "instead": ["a topic line on the same ground that would pass", "another", "a third"]}}
Each line names something specific on the SAME subject the reader picked, not a neighbouring topic, and names a measure or a mechanism rather than inventing a value. This is a correct and useful answer; a well-written deck nobody needed is worse than an honest no.

PART ONE, THE ASSIGNMENT. What an editor writes on the top of the page before a writer starts. It serves the mandate you just chose.
- The question. Read the topic as a question a reader typed into a search box. "What is sleep architecture and why it matters" is two questions: what is it, and why should I care. "Does magnesium help sleep" is one. Write the question in the reader's words.
- Who is asking. One group of people, in their own words: "people who sleep eight hours and still wake tired", not "anyone interested in sleep". A piece for everyone reaches no one.
- What the answer owes. A satisfying answer to that question has to contain certain things, and you list them before you write so none goes missing. "What is X and why it matters" owes a plain definition, a picture of X the reader can hold, and the consequence that makes it matter. "Does X help Y" owes what happened when someone tested it and what that means for the reader. "How do I X" owes the steps and why each one. Three to five items. The deck fails if one is missing, whatever else it says well.
- The kind of piece: explainer, finding, myth, how-to, story or list.

PART TWO, THE PIECE. About 150 to 220 words of prose a good science journalist would file, answering the question in the order the assignment sets and delivering the mandate. It is told, not reported: where research appears, it is what someone did and what they saw, in words the reader can picture. Never a frequency, a dose, a p-value or a sample size in the prose; those go in "backing" for the fact check.

The story leads and the research backs it. Build the piece around the question, then reach for a fact where a sentence would otherwise ask the reader to take your word for it. A sentence that explains, defines or tells a story needs no citation, and the piece is not made of citations. The research notes below are notes, not an outline: use what backs something you are saying, and ignore the rest however striking it is. A note is never the reason a paragraph exists.

The loop. A carousel is read one slide at a time, and at each slide the reader decides whether to swipe. The piece gives them a reason, and it comes from what the piece says, never from a line telling them to keep reading:
- Open on something specific and concrete that raises a question in the reader's head. "I spent six weeks preparing for my first launch. When it went live, three sales came in" makes the reader ask what went wrong; "my first launch didn't go well" makes them ask nothing. A number, a moment, a contradiction, a specific detail.
- The second paragraph is a second opening. Instagram shows a carousel twice, once on slide one and once on slide two, so the second paragraph has to work for a stranger who sees nothing before it.
- The answer to the question lands late, and the last paragraph says what the reader now knows and what to do with it.
- Suspense never costs coherence. Every paragraph says its whole thought. A reader who reads the piece in a row reads an article, not a trail of teasers.

Who reads it: a curious adult who reads well, the reader of a good newspaper's science pages. Use the real terms (REM, cortisol, slow-wave sleep) and define each in passing the first time; never a nursery substitute like "dreaming sleep". Sentences of the length a science journalist writes, most 12 to 22 words, with a short one where a point lands. Literal verbs and named things: "adenosine builds up between brain cells while you are awake and clears away during sleep", never "the brain's running costs" or "the molecule"; where a plain word exists, it wins over a metaphor, and the noun is repeated rather than replaced by a stand-in.

Be right. Only say what the notes support or what you are certain of; where a mechanism is uncertain, say what is known and stop. Every number sits next to its baseline. If the reader holds a belief the piece overturns, say that belief in their words before you overturn it, and if they hold none, do not invent one.
${structureHint ? `\nHow this deck will argue: ${structureHint}\n` : ""}${opts.valueMove ? `\nWHAT THE READER GAINS. This deck exists to ${opts.valueMove}. The mandate you choose has to serve that, and so does the turn.\n` : ""}${opts.hookJob ? `The hook will have to: ${opts.hookJob}\n` : ""}${ledgerBlock ? `\nRESEARCH NOTES, for backing, not for outline. One of these may well be your material; a note that carries the turn is the reason this deck can be published:\n${ledgerBlock}\n` : ""}${recentMandatesBlock(opts.recentMandates ?? [])}${recentBlock}
Return ONLY valid JSON in this exact format, no other text:
{
  "mandate": "correction | unknown-claim | connection | naming | finding | rule | question",
  "mandateLine": "the promise this mandate makes, one line, carrying what that mandate's line must carry",
  "turn": "the one sentence the reader will believe afterwards and does not believe now",
  "material": "the specific thing the turn rests on: the study, the threshold, the mechanism or the scene",
  "question": "the question the reader typed, in their words",
  "who": "one group, in their own words, ten words or fewer",
  "kind": "explainer | finding | myth | how-to | story | list",
  "owes": ["what the answer must contain, one item per line, three to five items"],
  "claim": "the one sentence the reader can say afterwards that answers the question",
  "argument": "the piece, 150 to 220 words of prose, paragraphs separated by a blank line",
  "loop": {
    "promise": "what the opening makes the reader want to know, one sentence",
    "carried": "the question the reader carries from slide to slide, in their words",
    "lands": "where and how the piece answers it, one sentence"
  },
  "backing": [
    { "statement": "the fact with its baseline, as the piece uses it", "source": "authors, journal, year, or a textbook, or empty when it is common knowledge you are certain of", "backs": "the sentence of the piece it backs, in a few words" }
  ],
  "overturns": "the belief this overturns, in the reader's words, or an empty string",
  "tonight": "what the reader does with this, one sentence, or an empty string when the piece is not a how-to",
  "leftOut": "one sentence naming the true findings from the notes this piece deliberately does not carry"
}`;

export function parseBrief(raw: string): CarouselBrief | null {
  try {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const o = JSON.parse(text) as Record<string, unknown>;
    const str = (k: string, max = 1200) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, max) : "");
    const strs = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, max)).slice(0, n) : []);
    const backing: BriefBacking[] = Array.isArray(o.backing)
      ? (o.backing as Record<string, unknown>[])
          .filter((b) => b && typeof b === "object")
          .map((b) => ({ statement: String(b.statement ?? "").trim().slice(0, 400), source: String(b.source ?? "").trim().slice(0, 300), backs: String(b.backs ?? "").trim().slice(0, 200) }))
          .filter((b) => b.statement)
          .slice(0, 8)
      : [];
    const loopRaw = o.loop && typeof o.loop === "object" ? (o.loop as Record<string, unknown>) : {};
    const loop = { promise: String(loopRaw.promise ?? "").trim().slice(0, 300), carried: String(loopRaw.carried ?? "").trim().slice(0, 300), lands: String(loopRaw.lands ?? "").trim().slice(0, 300) };
    const kindRaw = str("kind", 20).toLowerCase() as BriefKind;
    const kind: BriefKind = BRIEF_KINDS.includes(kindRaw) ? kindRaw : "explainer";
    const mandateRaw = str("mandate", 40).toLowerCase();
    const brief: CarouselBrief = {
      mandate: isDeckMandate(mandateRaw) ? mandateRaw : undefined,
      mandateLine: str("mandateLine", 400) || undefined,
      turn: str("turn", 400) || undefined,
      material: str("material", 400) || undefined,
      question: str("question", 300),
      who: str("who", 160),
      kind,
      owes: strs(o.owes, 200, 6),
      claim: str("claim", 400),
      argument: str("argument", 2400),
      loop,
      backing,
      overturns: str("overturns", 400),
      tonight: str("tonight", 400),
      leftOut: str("leftOut", 400) || undefined,
    };
    if (!brief.claim || !brief.argument) return null;
    return brief;
  } catch {
    return null;
  }
}

/** The brief call's answer: a piece, or an honest refusal to write one.
 *  Returns null when the reply is neither, so the caller can carry on
 *  without a brief rather than fail the whole generation. */
export function parseBriefResult(raw: string): { kind: "brief"; brief: CarouselBrief } | { kind: "reject"; reject: BriefReject } | null {
  let reject: BriefReject | null = null;
  try {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const o = JSON.parse(text) as { reject?: unknown };
    const r = o?.reject && typeof o.reject === "object" ? (o.reject as Record<string, unknown>) : null;
    if (r) {
      const reason = String(r.reason ?? "").trim().slice(0, 400);
      const instead = Array.isArray(r.instead)
        ? r.instead.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 200)).slice(0, 4)
        : [];
      // A refusal with no reason is not a refusal, it is a malformed reply.
      if (reason) reject = { reason, instead };
    }
  } catch {
    /* not JSON at the top level; parseBrief does its own tolerant read */
  }
  if (reject) return { kind: "reject", reject };
  const brief = parseBrief(raw);
  return brief ? { kind: "brief", brief } : null;
}

/** The refusal as one line for a log or an error message. */
export function describeReject(reject: BriefReject): string {
  return reject.instead.length > 0
    ? `${reject.reason} Try instead: ${reject.instead.map((t) => `"${t}"`).join(", ")}.`
    : reject.reason;
}

/** The backing facts as one indented list, for any prompt that carries the piece. */
function backingLines(brief: CarouselBrief): string {
  const rows = (brief.backing ?? []).map((b) => `  - ${b.statement}${b.source ? ` [${b.source}]` : ""}${b.backs ? ` (backs: ${b.backs})` : ""}`);
  for (const c of brief.comparisons ?? []) rows.push(`  - ${c.measure}: ${c.a} vs ${c.b}. ${c.result}`);
  return rows.join("\n");
}

/** The assignment as one block: question, who, what the answer owes. */
function assignmentLines(brief: CarouselBrief): string {
  const owes = (brief.owes ?? []).map((o) => `    - ${o}`).join("\n");
  return `  The question: ${brief.question || "(as the topic asks)"}
  Who is asking: ${brief.who}
  Kind of piece: ${brief.kind ?? "explainer"}${owes ? `\n  What the answer owes the reader:\n${owes}` : ""}`;
}

/** The piece as a regeneration prompt sees it (one slide rewritten in the
 *  context of the whole). The cut uses craftBlock below. */
export function briefPromptBlock(brief: CarouselBrief | null | undefined): string {
  if (!brief) return "";
  const backs = backingLines(brief);
  return `${mandateBlock(brief.mandate, brief.mandateLine)}${brief.turn ? `  THE TURN, the one sentence the reader will believe afterwards: ${brief.turn}\n` : ""}
THE PIECE. This is what the deck says. Every slide is CUT from it: a sentence or two, given a headline. Keep the piece's sentences where they fit; shorten only to fit the slide, and never by chopping a sentence into fragments. You may not add a claim, a number, a mechanism or a motive that is not in the piece, and every number keeps the baseline the piece gives it. A slide that carries a sentence the piece backs with a fact carries that source as its citation; a slide of story or explanation carries none, and an empty citation is correct.

THE ASSIGNMENT:
${assignmentLines(brief)}

  What the reader can say afterwards: ${brief.claim}
  The piece:
${brief.argument.split(/\n+/).map((p) => `    ${p.trim()}`).filter((p) => p.trim()).join("\n\n")}
${backs ? `  Backing, for citations and accuracy:\n${backs}\n` : ""}  ${brief.overturns ? `Belief this overturns: ${brief.overturns}` : "There is no villain in this deck. Do not write one."}${brief.tonight ? `\n  What the reader does with it: ${brief.tonight}` : ""}${brief.leftOut ? `\n  Left out on purpose, do not reach for it: ${brief.leftOut}` : ""}
`;
}

/** The writing step when a piece exists. Replaces the plain-language rules,
 *  the spine mechanism, the relay and the slot "End on" lines with a short
 *  guide. The writer is trusted to execute; the editor read catches misses. */
export function craftBlock(brief: CarouselBrief): string {
  const backs = backingLines(brief);
  const loop = brief.loop ?? { promise: "", carried: "", lands: "" };
  return `${mandateBlock(brief.mandate, brief.mandateLine)}
WHO IS READING. ${brief.who || "A curious adult who reads well"}. They read the science pages of a good newspaper on their phone; nothing is assumed and nothing is dumbed down. Write the way a good science journalist writes for them: real terms, each explained in passing the first time, sentences of the length prose has, and a story of what people did and what they saw rather than what was measured.

THE ASSIGNMENT. The deck exists to answer this question, and the slides together must deliver everything the answer owes. A deck that says true things and leaves one of these out has failed.
${assignmentLines(brief)}

THE PIECE. Everything the deck says is here. Cut it into slides; do not add a claim, a number, a mechanism or a motive that is not in it. Figures a reader cannot feel (a frequency, a dose, a p-value, a sample size) stay in the citation, not on the slide.
  What the reader can say afterwards: ${brief.claim}

${brief.argument.split(/\n+/).map((p) => `    ${p.trim()}`).filter((p) => p.trim()).join("\n\n")}

${backs ? `  Backing. Where a slide carries one of these sentences, that slide's citation is its source. A slide of story or explanation carries no citation, and an empty citation is correct; the research is there to make a claim trustworthy, not to lead the deck.\n${backs}\n` : ""}  ${brief.overturns ? `Belief this overturns: ${brief.overturns}. The slide that overturns it says the belief first, in the reader's words.` : "There is no villain in this deck; do not write one."}${brief.tonight ? `\n  What the reader does with it: ${brief.tonight}` : ""}${brief.leftOut ? `\n  Left out on purpose: ${brief.leftOut}` : ""}

HOW A GOOD CAROUSEL READS. The reader sees one slide at a time and decides at each one whether to swipe, so the deck is an essay with a pull at every cut.
  The hook is the opening of the piece: specific, concrete, a moment or a claim that raises a question. ${loop.promise ? `Here it promises: ${loop.promise}` : ""} All three hooks open the same piece from three angles.
  Slide 2 is a second hook. Instagram shows a carousel twice to a follower, once on slide 1 and once on slide 2, so slide 2 must work for a stranger who saw nothing before it: a complete claim in its headline and a reason to want slide 3 in its body.
  ${loop.carried ? `The question the reader carries from slide to slide: ${loop.carried}. ${loop.lands ? `It lands: ${loop.lands}` : ""}` : ""}
  Every slide says one thought, fully, and leaves the reader wanting the next one because of what it says, never because a line tells them to keep going. No "but there's more", no "here's the twist". If a slide only makes sense once you have read the next, it is a fragment, and it fails; coherence wins over suspense every time.
  Headlines are complete sentences a stranger understands with nothing under them. The slide that defines the deck's subject may carry the question itself as its headline ("What is sleep pressure?") and answer it in the first sentence.
  Numbers only where the reader can feel them, always against their baseline.
  The last slide answers the question in the reader's words and says what to do with the answer.

THE SHAPE OF THE ARGUMENT. ${brief.turn ? `The deck turns on one sentence: ${brief.turn} Everything before it sets that up, everything after pays it off.${brief.material ? ` It rests on: ${brief.material}` : ""} One slide carries the turn and it is the slide the deck exists for; if that slide could be deleted without killing the deck, the turn is on the wrong slide.` : "One slide carries the sentence the deck exists for. Everything before it sets that up, everything after pays it off."}

  Where a running order is set for you below, follow it. Where none is, these are the jobs, in order, and each one passes or fails its own test:
    1. THE MOMENT. One scene or claim that raises a question. Passes if a stranger can say what question it opened.
    2. THE RECOGNITION. The situation the reader lives, and what they currently blame it on. Passes if it works cold as a first slide, because Instagram shows the deck from here too, and if it names their belief in their words.
    3. THE CRACK. Why that explanation is incomplete. Passes if it breaks a belief the previous slide showed them holding, rather than one they were never shown.
    4. THE TURN. The one sentence the deck exists for. Passes if deleting this slide kills the deck.
    5. THE COST. What the turn means for tonight. Passes if it reuses a concrete detail from the recognition slide rather than making a general claim.
    6. THE MOVE. The one thing to do, and why it follows. Passes if it follows from the turn, not from common sense.

THREE RULES ACROSS EVERY SLIDE. These are what separate a deck from a list of true sentences.
  SPECIFICITY INCREASES. Each slide is more concrete than the one before it. The failure to watch for is the opposite: a deck that opens on a specific scene and drifts upward into "prioritise consistency" and "listen to your body". If a later slide is vaguer than an earlier one, the argument has collapsed and the slide is rewritten, not softened.
  ONE NEW THING PER SLIDE. A slide that only moves the reader toward the next one is a transition, and a transition is not a slide. If you cannot name what this slide taught that the last one did not, merge it or cut it.
  THE SWAP TEST. Take any sentence and swap the subject for a neighbouring one. If the sentence still reads fine, it belongs to no deck in particular and it goes. Every line should be impossible to lift into a different deck unchanged.

HOW A SLIDE IS WRITTEN. These are the edits the editor makes by hand to every deck; make them before they have to.
  Literal verbs, no metaphors. "Adenosine is a by-product of the brain's everyday activity", never "the brain's running costs". "Caffeine blocks the receptors", never "parks itself in them". "The pressure keeps building", never "rising behind the block". Where a plain word exists, it wins.
  Name the thing every time. "The adenosine", never "the molecule"; "clears away during sleep", never "that clearing". A pronoun or a stand-in the reader has to resolve costs them the sentence. Repeating the noun costs nothing.
  One idea per sentence. Three short sentences beat one long one on a phone. When a slide holds two thoughts (what people believe, then what is true; the finding, then what it means), separate them with a blank line so the slide reads as two short paragraphs.
  Signpost the evidence. "In one study, researchers kept a cat awake for six hours and found..." rather than the finding stated cold. "In reality," before the correction of a belief. The reader should know a sentence is evidence before it arrives.
  One study per slide at most, and none if the slide does not need one. The piece may carry two findings for one point; the slide carries the one that makes the point and drops the other. A slide that defines or explains needs no study and no citation.

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
    : opts.essay
      ? "a body is 2 or 3 sentences under 60 words, or a lead sentence followed by 2 to 4 list lines each starting with \"- \" (shown here after \" / \"); a list is a correct shape for a set, return it with real newlines (\\n) and keep the \"- \" markers"
      : "a body is 2 or 3 sentences, under 60 words";
  const question = brief?.question || "the question the topic asks";
  const owes = brief?.owes?.length ? brief.owes.map((o) => `    - ${o}`).join("\n") : "";
  return `You are a careful native English reader. You have not seen any writing rules and you must not invent any. Read this Instagram carousel cold, the way a stranger would on a phone.
${brief ? `${brief.mandate && brief.mandateLine ? `
WHY THIS DECK EXISTS. It was commissioned to do one thing: ${brief.mandateLine}${getMandate(brief.mandate) ? ` It fails if it reads as ${getMandate(brief.mandate)!.failsAs.toLowerCase()}` : ""}${brief.turn ? `\n  The sentence the reader is meant to believe afterwards: ${brief.turn}` : ""}
` : ""}
THE ASSIGNMENT this deck was made for:
  The question the reader is asking: ${question}
  Who is asking: ${brief.who}${owes ? `\n  What the answer owes them:\n${owes}` : ""}
  What they should be able to say afterwards: ${brief.claim}

THE PIECE the deck was cut from:
${brief.argument.split(/\n+/).map((p) => `  ${p.trim()}`).filter((p) => p.trim()).join("\n\n")}
${brief.backing?.length ? `\n  Backing:\n${brief.backing.map((b) => `  - ${b.statement}${b.source ? ` [${b.source}]` : ""}`).join("\n")}\n` : ""}` : ""}
THE DECK:
${hooks}
${slides}
${tk}

Read it in three passes.

FIRST, THE TITLE TEST. A reader tapped this deck because they wanted to know: "${question}". Using only what the slides say, answer that question in one sentence. If you cannot, or the slides answer a different question, or one of the things the answer owes is missing, that is the first and most important note: say what is missing, and put the fix on the slide that should carry it, rewriting that slide whole so it says the missing thing in the register of the rest. A deck that says true things and does not answer its title has failed.
${brief?.mandateLine ? `  Then the same test for what the deck was FOR. Name the slide that delivers "${brief.mandateLine}". If no slide does, or the deck only circles it, that is a note of the same weight: put the fix on the slide that should carry it.${brief.turn ? ` Say which slide carries the sentence the reader is meant to believe, and if none does, rewrite the slide nearest to it so that it does.` : ""}\n` : ""}

SECOND, THE SWIPE. Does slide 2 stand alone for a stranger who sees it first, and does it make them want slide 3? At each slide, is there a reason to see the next one that comes from what the slide says? A deck that reads as a list of true facts in any order has no pull; a slide that is a fragment to create suspense, or that only makes sense once you have read the next, is worse. Fix by rewriting the slide so it says its whole thought and the thought itself leads on.

THIRD, THREE RULES. Read the slides in order against these before anything else in this pass. A later slide vaguer or more general than an earlier one, so the deck drifts from a scene up into advice anyone could give. A slide that teaches nothing the previous slide did not, and only moves the reader along. A sentence that would read just as well in a deck on a different subject, which means it belongs to no deck at all. Each of these is fixed by rewriting the slide to be more specific, never by softening it or cutting it short.

FOURTH, WHAT AN EDITOR FIXES. A slide that does not follow from the one before it, or that overturns a belief the reader was never shown holding; a number with no baseline on the slide; a sentence no native writer would produce, or a nursery substitute for a real term ("dreaming sleep" for REM); a metaphor where a plain verb exists ("parks itself in the receptors" for "blocks the receptors", "running costs" for "everyday activity"); a stand-in the reader has to resolve ("the molecule", "that clearing") where the noun should be repeated (repeating the noun is never a fault here, a stand-in is); a long sentence carrying two ideas that should be two short ones, or two thoughts on one slide with no blank line between them; a finding stated cold where "In one study, researchers..." would tell the reader evidence is coming; a second study on a slide that only needed one, or a citation on a slide that only defines or explains; a slide that recites a measurement instead of telling who did what and what they saw; a headline that means nothing on its own; a takeaway that answers something other than the question; a hook that promises what the slides never deliver; anything pitched at a child rather than the adult this is for. When a slide reads as machinery, rewrite the whole slide in the register of a science journalist; do not patch a word.

A fix is a replacement for that unit only, and it never removes what the slide was for: if the last slide's action is not earned by what came before, add the bridge from the piece rather than deleting the action, and never turn the last slide into a repeat of the one before it. Shapes: a hook headline is UPPERCASE, 8 words or fewer, with a subline of 10 words or fewer; a slide headline is ${opts.essay ? "UPPERCASE, 4 to 9 words, a complete claim" : "8 words or fewer"}${opts.viral ? ", sentence case, and is the first line of the slide's thought" : ""}; ${bodyShape}; a takeaway point is 12 words or fewer with no full stop. Paragraphs inside a body are separated by a real newline character, never by the " / " this listing uses to show them. No em dashes anywhere; use a comma, a colon or a full stop. Keep every fact inside the piece. Keep citations as they are; a slide with no citation is not a fault.

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
            // The listing shows line breaks as " / ", and the model sometimes
            // hands them back that way. Real newlines on the slide, always.
            if (fix?.body && !fix.body.includes("\n") && / \/ /.test(fix.body)) {
              fix.body = fix.body.replace(/\s*\/\s*\/\s*/g, "\n\n").replace(/\s+\/\s+/g, "\n").trim();
            }
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

// ─── The takeaway, repaired rather than dropped ──────────────────────────────
//
// The takeaway is the last slide of every deck. The model sometimes returns
// it with a missing interaction or an empty label, and the route used to
// drop the whole object, which put the old "read more" card on the end of
// the deck. Now what is missing is filled from what the deck already says,
// and only a takeaway with no points at all is dropped.

type TakeawayLike = { headline?: unknown; points?: unknown; interaction?: unknown };
type Repaired = { headline: string; points: string[]; interaction: { type: "save" | "send" | "comment"; label: string } };

export function repairTakeaway(raw: TakeawayLike | null | undefined, ctx: { brief?: CarouselBrief | null; hookHeadline?: string; ctaHeadline?: string }): { takeaway: Repaired | null; repaired: string[] } {
  const repaired: string[] = [];
  const tk = raw && typeof raw === "object" ? raw : {};
  let points = Array.isArray(tk.points) ? (tk.points as unknown[]).filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim()) : [];
  if (points.length === 0) {
    const fromBrief = [ctx.brief?.claim, ctx.brief?.tonight].filter((p): p is string => !!p && p.trim().length > 0);
    if (fromBrief.length === 0) return { takeaway: null, repaired: ["no points and nothing to build them from"] };
    points = fromBrief;
    repaired.push("points from the piece");
  }
  let headline = typeof tk.headline === "string" ? tk.headline.trim() : "";
  if (!headline) {
    headline = (ctx.ctaHeadline || ctx.hookHeadline || points[0]).toUpperCase();
    repaired.push("headline from the deck");
  }
  const ir = tk.interaction && typeof tk.interaction === "object" ? (tk.interaction as { type?: unknown; label?: unknown }) : null;
  const type: Repaired["interaction"]["type"] = ir && ["save", "send", "comment"].includes(ir.type as string) ? (ir.type as Repaired["interaction"]["type"]) : "save";
  let label = ir && typeof ir.label === "string" ? ir.label.trim() : "";
  if (!ir || !["save", "send", "comment"].includes(ir.type as string)) repaired.push("interaction type");
  if (!label) {
    label = ctx.brief?.tonight ? "Save this for tonight" : "Save this for the next bad night";
    repaired.push("interaction label");
  }
  return { takeaway: { headline, points: points.slice(0, 3), interaction: { type, label } }, repaired };
}
