// Carousel structures: how a deck argues.
//
// One axis, one table. A structure owns everything about the argument: its
// value move, the hook's job, the slots in order with the beat each serves,
// what each slide must end on, where proof is required, and where the product
// may appear. The generator prompt is built from this table and the checklist
// reads the same table, so there is exactly one place a deck's shape lives.
// Look (Editorial, Free Press, Viral rhythm) is a separate axis and any
// structure can wear any look.

import type { HookTone, CarouselFormat } from "./types";
import type { StoryBeat } from "./story-spine";
import type { ViralTone } from "./carousel-style-presets";

export const STRUCTURE_IDS = [
  "educational", "list", "mistakes", "how-to", "before-after",
  "myth-fact", "study-story", "unpopular-opinion", "story",
] as const;
export type CarouselStructure = (typeof STRUCTURE_IDS)[number];

/** Why the reader gains from the deck. Every structure declares one and the
 *  hook has to show it, which is what stops a deck from agreeing with the
 *  reader for ten slides. */
export type ValueMove = "simplify" | "add-research" | "flip";

export const VALUE_MOVE_TEXT: Record<ValueMove, string> = {
  simplify: "take something hard and make a beginner understand it on first read",
  "add-research": "take something everyone already knows and add the research that makes it precise, surprising or usable",
  flip: "take something everyone believes and does, and show it is wrong or backwards",
};

export type Slot = {
  name: string;
  /** What this slide does, in the writer's language. */
  job: string;
  /** What the last line must do: the open loop, as a job, never a line to copy. */
  endOn: string;
  /** The beat of the story spine this slot serves. */
  beat: StoryBeat;
  /** Ivory or navy on the Viral look. */
  tone: ViralTone;
  /** This slot may carry an infographic. */
  graphic?: boolean;
  /** This slot must carry a real citation. */
  proof?: boolean;
  /** The product may be named on this slot, as mechanism only. */
  product?: boolean;
};

export type StructureSpec = {
  id: CarouselStructure;
  label: string;
  /** The three lines the "i" shows: what it is, when to use it, an example hook. */
  info: { what: string; when: string; example: string };
  valueMove: ValueMove;
  /** The hook's job in this structure, one sentence. */
  hookJob: string;
  /** Slots for a 5-slide deck (3 content) and a 10-slide deck (8 content). */
  slots: { 3: Slot[]; 8: Slot[] };
  /** Minimum share of content slides that must carry a citation. */
  minCited: number;
  /** The legacy hook tone this structure inherits downstream (image prompts, recommender). */
  legacyTone: HookTone;
};

const s = (name: string, job: string, endOn: string, beat: StoryBeat, tone: ViralTone = "ivory", extra: Partial<Slot> = {}): Slot => ({ name, job, endOn, beat, tone, ...extra });

export const STRUCTURES: Record<CarouselStructure, StructureSpec> = {
  educational: {
    id: "educational", label: "Educational",
    info: { what: "Teach one thing the reader did not know, so simply a beginner gets it on the first read.", when: "The topic is a mechanism or a hard idea the reader has heard of but never understood.", example: "Your body starts the morning at 3am" },
    valueMove: "simplify",
    hookJob: "State the one thing they will understand by the end, in their words, as a scene or a plain promise.",
    minCited: 0.5, legacyTone: "educational",
    slots: {
      3: [
        s("Stakes", "Why this matters to them tonight. The lived version of the problem.", "Promise the reason is not what they think.", "moment"),
        s("Mechanism", "The one idea, explained so a beginner follows it on first read. One term at most, glossed.", "Say what this changes about what they should do.", "turn", "navy", { graphic: true, proof: true }),
        s("Do", "The one thing to do tonight because of the mechanism, with its proof.", "Point at what to watch for next.", "payoff", "ivory", { proof: true, product: true }),
      ],
      8: [
        s("Stakes", "The lived problem, second person, present tense.", "Promise the reason is not what they think.", "moment"),
        s("What you feel", "The second consequence they have felt but not connected.", "Say what they usually blame.", "moment"),
        s("The usual explanation", "What they were told, and why it is incomplete.", "Promise the real reason next.", "villain"),
        s("The mechanism", "The one idea, plain. This is the slide the deck exists for.", "Say there is a second part.", "turn", "navy", { graphic: true, proof: true }),
        s("Mechanism, part two", "The consequence of the mechanism that makes the fix obvious.", "Say what this changes about what to do.", "turn", "navy"),
        s("Do this first", "The first thing to change, tonight.", "Say what it does not cover yet.", "payoff", "ivory", { proof: true }),
        s("Do this second", "The second change, and the product only as the mechanism if it belongs.", "Point at the proof.", "payoff", "ivory", { product: true }),
        s("Proof and limits", "One sourced figure, and one honest limit of what it shows.", "Leave them with the single thing to remember.", "payoff", "navy", { proof: true, graphic: true }),
      ],
    },
  },
  list: {
    id: "list", label: "List",
    info: { what: "A numbered set of things, each with the research that ranks it. Easy to save, easy to share.", when: "The topic is naturally a set: foods, habits, mistakes, tools, signs.", example: "6 sleep habits, ranked by evidence" },
    valueMove: "add-research",
    hookJob: "Name the number and the set, and say what the ranking is based on, in eight words or fewer.",
    minCited: 0.6, legacyTone: "science-backed",
    slots: {
      3: [
        s("Setup", "What they have tried, and the promise that the order will surprise them.", "Promise the first one is not what they expect.", "moment"),
        s("Top item", "The single best-supported item, with the study that puts it first.", "Say the runner-up is the one everyone does wrong.", "turn", "navy", { proof: true, graphic: true }),
        s("Runner-up", "The second item, and the popular one that did not make the list, with why.", "Say which one to start with tonight.", "payoff", "ivory", { proof: true, product: true }),
      ],
      8: [
        s("Setup", "What they have tried, and what the ranking is based on.", "Promise the popular one is low on the list.", "moment"),
        s("The popular one", "The item everyone does, and where the evidence actually puts it.", "Promise something better.", "villain", "navy", { proof: true }),
        s("Item 1", "One item, one sourced line, one plain instruction.", "Point at the next.", "payoff", "ivory", { proof: true }),
        s("Item 2", "One item, one sourced line, one plain instruction.", "Point at the next.", "payoff", "ivory", { proof: true }),
        s("Item 3", "One item, one sourced line, one plain instruction.", "Point at the next.", "payoff", "ivory", { proof: true, graphic: true }),
        s("Item 4", "One item, one sourced line, one plain instruction.", "Point at the next.", "payoff", "ivory", { proof: true }),
        s("Item 5", "One item, one sourced line. The product only as mechanism, if it belongs.", "Say which one to start with.", "payoff", "ivory", { proof: true, product: true }),
        s("Start here", "The one to do tonight and why it comes first.", "Leave them with the single thing to remember.", "payoff", "navy"),
      ],
    },
  },
  mistakes: {
    id: "mistakes", label: "Mistakes",
    info: { what: "What the reader is doing wrong, then exactly what to do instead. Each mistake gets its own pair of slides.", when: "The reader already tries. The problem is that the popular fix backfires.", example: "3 bedtime habits that wake you at 3am" },
    valueMove: "flip",
    hookJob: "Name the mistake as something they did tonight, in their words. It must feel like being seen, not told off.",
    minCited: 0.4, legacyTone: "symptom",
    slots: {
      3: [
        s("The mistake", "The thing they do that feels responsible, and why it backfires.", "Promise what to do instead.", "villain", "navy", { proof: true }),
        s("Why it backfires", "The mechanism, plain, in one idea.", "Say the fix is smaller than the mistake.", "turn", "ivory", { graphic: true, proof: true }),
        s("Instead", "The replacement habit, specific enough to do tonight.", "Point at what to watch for.", "payoff", "ivory", { product: true }),
      ],
      8: [
        s("Setup", "The reader trying hard and getting nowhere, in a scene.", "Promise the effort is aimed at the wrong thing.", "moment"),
        s("Mistake 1", "The first thing they do wrong and why it backfires.", "Promise the fix.", "villain", "navy", { proof: true }),
        s("Instead 1", "The replacement, specific enough to do tonight.", "Say there is a second mistake hiding behind it.", "payoff", "ivory"),
        s("Mistake 2", "The second mistake, the one that felt like the solution to the first.", "Promise the fix.", "villain", "navy", { proof: true }),
        s("Instead 2", "The replacement.", "Say the third is the one nobody suspects.", "payoff", "ivory", { graphic: true }),
        s("Mistake 3", "The third mistake, the least obvious.", "Promise the fix.", "villain", "navy", { proof: true }),
        s("Instead 3", "The replacement. The product only as mechanism, if it belongs.", "Point at the proof.", "payoff", "ivory", { product: true }),
        s("Proof", "One sourced figure that shows the replacements work.", "Leave them with the first one to change.", "payoff", "navy", { proof: true }),
      ],
    },
  },
  "how-to": {
    id: "how-to", label: "How-to",
    info: { what: "A hard thing broken into steps so simple the reader can follow along tonight.", when: "The topic is a routine, a protocol or a sequence where the order matters.", example: "The 60-minute wind-down, step by step" },
    valueMove: "simplify",
    hookJob: "Name the outcome and the time it takes, and promise it is simpler than they think.",
    minCited: 0.3, legacyTone: "educational",
    slots: {
      3: [
        s("Why the order matters", "What goes wrong when the steps are done in the usual order.", "Promise the steps.", "villain", "navy", { proof: true }),
        s("The steps", "Every step, numbered, each under nine words. The graphic is the steps.", "Say which step people skip.", "payoff", "ivory", { graphic: true }),
        s("The step people skip", "The one step that makes it hold, with its proof.", "Point at what to notice by morning.", "payoff", "ivory", { proof: true, product: true }),
      ],
      8: [
        s("Setup", "The reader mid-evening, doing it the hard way.", "Promise it is simpler than that.", "moment"),
        s("What goes wrong without it", "The failure the steps prevent, and why the usual order fails.", "Promise step one.", "villain", "navy", { proof: true }),
        s("Step 1", "One step, one line of why, under nine words each.", "Point at step two.", "payoff", "ivory"),
        s("Step 2", "One step, one line of why.", "Point at step three.", "payoff", "ivory"),
        s("Step 3", "One step, one line of why. The graphic may draw all the steps here.", "Point at step four.", "payoff", "ivory", { graphic: true }),
        s("Step 4", "One step, one line of why.", "Point at the last step.", "payoff", "ivory"),
        s("Step 5", "The last step, the one people skip. The product only as mechanism, if it belongs.", "Point at the proof.", "payoff", "ivory", { product: true }),
        s("Proof", "One sourced figure that the routine changes something measurable.", "Leave them with tonight's first step.", "payoff", "navy", { proof: true }),
      ],
    },
  },
  "before-after": {
    id: "before-after", label: "Before and After",
    info: { what: "Show the transformation, then explain what caused it. For sleep: the night and morning with and without the change.", when: "The change is felt, not abstract: a night, a morning, a week.", example: "Same Tuesday, phone off at 10pm" },
    valueMove: "add-research",
    hookJob: "Name the before and the after in one line, as two moments the reader recognises.",
    minCited: 0.4, legacyTone: "personal-story",
    slots: {
      3: [
        s("Before", "The night and the morning as they are now, in a scene.", "Promise the same night can go differently.", "moment"),
        s("After", "The same night with the change, in the same scene, same details.", "Promise the cause.", "payoff", "navy"),
        s("What caused it", "The mechanism behind the difference, with its proof. The product only as mechanism, if it belongs.", "Leave them with the one change to make.", "turn", "ivory", { proof: true, graphic: true, product: true }),
      ],
      8: [
        s("Before, night", "The evening and the night as they are now.", "Say what the morning looks like.", "moment"),
        s("Before, morning", "The morning that follows, in the same details.", "Promise the same day can go differently.", "moment"),
        s("After, night", "The same evening with the change.", "Say what the morning looks like now.", "payoff", "navy"),
        s("After, morning", "The morning that follows the changed night.", "Promise the cause.", "payoff", "navy"),
        s("The cause", "The mechanism that explains the difference, plain.", "Say there is a second part to it.", "turn", "ivory", { proof: true, graphic: true }),
        s("The cause, part two", "The second mechanism or the timing that makes it work.", "Say how to get there.", "turn", "ivory"),
        s("How to get there", "The change itself, specific enough for tonight. The product only as mechanism, if it belongs.", "Point at the proof.", "payoff", "ivory", { product: true }),
        s("Proof", "One sourced figure for the size of the difference.", "Leave them with the one change to make.", "payoff", "navy", { proof: true }),
      ],
    },
  },
  "myth-fact": {
    id: "myth-fact", label: "Myth vs Fact",
    info: { what: "Take a thing people believe and put the evidence next to it. Myth on one slide, the fact on the next.", when: "The topic is a widespread belief the research contradicts or narrows.", example: "Eight hours is not the number that matters" },
    valueMove: "flip",
    hookJob: "State the myth as the reader would say it, then the turn, in eight words or fewer.",
    minCited: 0.6, legacyTone: "myth-bust",
    slots: {
      3: [
        s("The myth", "The belief, stated fairly, and why it is reasonable to hold.", "Promise the evidence says otherwise.", "villain", "navy"),
        s("The fact", "What the research actually shows, with the study, plain.", "Say what this changes about what to do.", "turn", "ivory", { proof: true, graphic: true }),
        s("Instead", "What to do now that the myth is gone. The product only as mechanism, if it belongs.", "Leave them with the one thing to remember.", "payoff", "ivory", { product: true }),
      ],
      8: [
        s("Setup", "Why these beliefs feel true, in a scene the reader has lived.", "Promise the first one.", "moment"),
        s("Myth 1", "The belief, stated fairly.", "Promise the evidence.", "villain", "navy"),
        s("Fact 1", "What the research shows, with the study.", "Say the next belief follows from this one.", "turn", "ivory", { proof: true }),
        s("Myth 2", "The second belief.", "Promise the evidence.", "villain", "navy"),
        s("Fact 2", "What the research shows, with the study.", "Say the third is the one they act on most.", "turn", "ivory", { proof: true, graphic: true }),
        s("Myth 3", "The third belief, the one they act on.", "Promise the evidence.", "villain", "navy"),
        s("Fact 3", "What the research shows, with the study.", "Say what to do with all three.", "turn", "ivory", { proof: true }),
        s("Instead", "What to do now. The product only as mechanism, if it belongs.", "Leave them with the one thing to remember.", "payoff", "ivory", { product: true }),
      ],
    },
  },
  "study-story": {
    id: "study-story", label: "Study story",
    info: { what: "Walk through one real study: the problem the researchers had, what they did, what they found, what it means for the reader.", when: "One study carries the whole point and the method is the interesting part.", example: "48 people, 6 hours a night, 14 days" },
    valueMove: "add-research",
    hookJob: "State the study's result or setup as a plain surprise in eight words or fewer, never the journal name.",
    minCited: 0.7, legacyTone: "science-backed",
    slots: {
      3: [
        s("The problem", "The question the researchers had, in the reader's words.", "Promise what they did about it.", "moment"),
        s("What they did", "The method, plain: who, how many, what changed, for how long.", "Promise the result.", "turn", "navy", { graphic: true, proof: true }),
        s("What they found", "The result with the figure, and what it means for the reader tonight. The product only as mechanism, if it belongs.", "Leave them with the one thing to do.", "payoff", "ivory", { proof: true, product: true }),
      ],
      8: [
        s("The problem", "The question the researchers had, in the reader's words.", "Say who they studied.", "moment"),
        s("Who they studied", "The people, the number, the condition.", "Promise what they did.", "moment", "ivory", { proof: true }),
        s("What they did", "The method, plain.", "Say what they compared it to.", "turn", "navy"),
        s("The comparison", "The control or the other group, and why that matters.", "Promise the result.", "turn", "navy", { graphic: true }),
        s("Result 1", "The main figure, with its handle.", "Say there was a second finding.", "payoff", "ivory", { proof: true }),
        s("Result 2", "The second finding.", "Say what it does not prove.", "payoff", "ivory", { proof: true }),
        s("What it does not prove", "The honest limit: sample, duration, population.", "Say what it still means for tonight.", "villain", "navy"),
        s("What it means tonight", "The one thing the reader does because of this. The product only as mechanism, if it belongs.", "Leave them with the one thing to remember.", "payoff", "ivory", { product: true }),
      ],
    },
  },
  "unpopular-opinion": {
    id: "unpopular-opinion", label: "Unpopular opinion",
    info: { what: "Say something the reader will disagree with, then earn it with a strong argument and the evidence.", when: "You hold a defensible position against the common advice and can back it.", example: "Stop trying to fall asleep faster" },
    valueMove: "flip",
    hookJob: "State the opinion bluntly in eight words or fewer, as a position, not a question.",
    minCited: 0.5, legacyTone: "clickbait",
    slots: {
      3: [
        s("The claim", "The opinion and what everyone says instead, side by side.", "Promise the argument.", "villain", "navy"),
        s("The argument", "Why the common view fails, in one idea, plain.", "Promise the evidence.", "turn", "ivory", { graphic: true }),
        s("The evidence", "The study that supports the claim, and what to do with it. The product only as mechanism, if it belongs.", "Leave them with the one thing to do.", "payoff", "ivory", { proof: true, product: true }),
      ],
      8: [
        s("The claim", "The opinion, bluntly.", "Say what everyone says instead.", "moment"),
        s("What everyone says", "The common advice, stated fairly, and why it is popular.", "Promise why it fails.", "villain", "navy"),
        s("Why it fails, one", "The first reason, plain.", "Say there is a second.", "turn", "ivory"),
        s("Why it fails, two", "The second reason.", "Promise the evidence.", "turn", "ivory", { graphic: true }),
        s("Evidence 1", "A study that supports the claim, with the figure.", "Say there is more.", "payoff", "ivory", { proof: true }),
        s("Evidence 2", "A second study or the mechanism, sourced.", "Concede one thing.", "payoff", "ivory", { proof: true }),
        s("Where they have a point", "The honest concession, and why it does not change the claim.", "Promise what to do.", "villain", "navy"),
        s("What to do", "The action that follows from the claim. The product only as mechanism, if it belongs.", "Leave them with the one thing to remember.", "payoff", "ivory", { product: true }),
      ],
    },
  },
  story: {
    id: "story", label: "Story",
    info: { what: "Start with a moment, name the habit that is quietly causing it, show why it fails, then what changes tonight. People swipe to find out what happened next.", when: "The reader has lived the scene and does not know the cause.", example: "You wake at 3:11 and start doing math" },
    valueMove: "flip",
    hookJob: "The moment, in eight words or fewer: the scene, not the lesson.",
    minCited: 0.4, legacyTone: "personal-story",
    slots: {
      3: [
        s("Stakes", "Confirm the hook. The scene, and what it costs. The reader must think this is worth their time in one second.", "Promise the usual fix fails.", "moment"),
        s("Turn", "State the belief they hold, in their words, on this slide. Then why it fails, and the pivot. Do not deliver the solution.", "Promise the fix is smaller than they think.", "turn", "navy"),
        s("Solution", "One idea, one easy step toward a result, with its proof. A beginner could do it tonight.", "Say one more thing decides whether it holds.", "payoff", "ivory", { graphic: true, proof: true, product: true }),
      ],
      8: [
        s("Stakes", "Confirm the hook. The scene and what it costs.", "Promise the reason is not what they were told.", "moment"),
        s("Pain", "The problem compounding, a second consequence they have felt.", "Say most people fix the wrong thing.", "moment", "ivory", { graphic: true }),
        s("The habit they trust", "Name the current fix, say why it fails, pivot. Solution still withheld.", "Promise the real lever.", "villain", "navy"),
        s("Idea 1", "One idea, one step a beginner does tonight.", "Say what it handles and what it does not.", "payoff"),
        s("Idea 2", "One idea, one step a beginner does tonight.", "Say what is still missing.", "payoff"),
        s("Idea 3", "One idea, one step a beginner does tonight.", "Promise the part that makes it stick.", "payoff"),
        s("Proof", "Social proof or mechanism proof that the solution works. One sourced figure.", "Leave one question open.", "payoff", "navy", { graphic: true, proof: true }),
        s("Objection", "The reason they still will not do it, in their words, answered. The product only as mechanism, if it belongs.", "Leave them with the only thing to do.", "payoff", "ivory", { product: true }),
      ],
    },
  },
};

export function isCarouselStructure(v: unknown): v is CarouselStructure {
  return typeof v === "string" && (STRUCTURE_IDS as readonly string[]).includes(v);
}

/** Slots for a deck of `contentSlides` content slides. Anything other than 3
 *  or 8 (a hand-edited deck) borrows the nearest table by length. */
export function structurePlan(id: CarouselStructure, contentSlides: number): Slot[] {
  const spec = STRUCTURES[id];
  return contentSlides >= 6 ? spec.slots[8] : spec.slots[3];
}

/** The slot for content slide `index` in a deck of `count`, clamped. */
export function slotFor(id: CarouselStructure, index: number, count: number): Slot {
  const plan = structurePlan(id, count);
  return plan[Math.min(Math.max(index, 0), plan.length - 1)];
}

/** Old decks carry a hook tone and a format; this is the structure they meant. */
export function structureFromLegacy(hookTone?: HookTone | null, format?: CarouselFormat | null, stylePreset?: string | null): CarouselStructure {
  if (stylePreset === "viral") return "story";
  if (format === "engagement") return "list";
  switch (hookTone) {
    case "myth-bust": case "paradox": return "myth-fact";
    case "symptom": case "tell": return "mistakes";
    case "clickbait": return "unpopular-opinion";
    case "personal-story": return "story";
    case "science-backed": return "study-story";
    default: return "educational";
  }
}

/** The prompt block for a structure: the value move, the hook's job, the
 *  slots, and the retention rules that apply to every structure. */
export function structurePromptBlock(id: CarouselStructure, total: 5 | 10, opts: { light?: boolean } = {}): string {
  const spec = STRUCTURES[id];
  const plan = spec.slots[total === 10 ? 8 : 3];
  if (opts.light) {
    // The brief carries the argument; this is only the running order.
    const outline = plan.map((sl, i) => `  Slide ${i + 2}, ${sl.name} (beat "${sl.beat}"): ${sl.job}`).join("\n");
    return `
RUNNING ORDER: ${spec.label.toUpperCase()}. This deck exists to ${VALUE_MOVE_TEXT[spec.valueMove]}. Return EXACTLY ${plan.length} objects in "slides", in this order; the hook is slide 1 and the takeaway is slide ${total}.
${outline}
`;
  }
  const rows = plan.map((sl, i) =>
    `  Slide ${i + 2} (${sl.name}, beat "${sl.beat}"): ${sl.job}\n    End on: ${sl.endOn} One full sentence, never a fragment.` +
    `${sl.proof ? "\n    Must carry a real citation." : ""}${sl.graphic ? "\n    May carry one infographic." : ""}${sl.product ? "\n    The product may be named here, as the mechanism, never the promise." : ""}`,
  ).join("\n");
  const firstPayoff = plan.findIndex((sl) => sl.beat === "payoff");
  return `
STRUCTURE: ${spec.label.toUpperCase()}. THIS SETS THE SLIDE COUNT AND THE ORDER OF THE DECK. It overrides any generic arc or tier rules below.

THE VALUE MOVE. This deck exists to ${VALUE_MOVE_TEXT[spec.valueMove]}. If a reader would nod along to the hook, the deck has failed: the hook must show the move. ${spec.hookJob}

Return EXACTLY ${plan.length} objects in "slides", in this order. Each slide has ONE job, and its "beat" field is the beat named for it here.
${rows}
The hook is slide 1 and the takeaway is slide ${total}: it pays the deck's open loops in three lines and carries the follow line. There is no separate "read more" slide.

Retention rules, all mandatory:
- Every content slide ends owing the reader something: its final line does the "End on" job above, in words that fit THIS topic. Never reuse a stock line; never use the words "half", "lever" or "upstream" unless they name a concrete thing on the slide.
- ${firstPayoff > 0 ? `Nothing on slides 2 to ${firstPayoff + 1} tells the reader what to do. The first slide that may carry a solution is slide ${firstPayoff + 2}.` : "The first slide may carry the first step."}
- No wordplay, no doubled verbs ("runs late, runs flat"), no word whose referent is not on the same slide ("twice", "the other half").
- One idea per slide. A slide that does another slot's job fails.
- Every figure needs a real source in "citation" or must be hedged in words. Never invent a study. At least ${Math.round(spec.minCited * 100)}% of the content slides carry a citation, and no single source carries more than two slides.
- The last slide answers the hook's question outright, in the reader's words. "cta.headline" is one calm line for older layouts, max 6 words.
`;
}
