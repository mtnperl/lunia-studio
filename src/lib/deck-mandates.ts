// Deck mandates — the reason a deck exists, decided before a word is written.
//
// Every stage of the pipeline used to improve the deck it was handed. The
// brief wrote the best piece for the topic, the cut made the best slides from
// the piece, the editor read checked the deck answered its own title. Not one
// stage asked whether the deck was worth publishing, so a weak subject came
// out as a competent, forgettable deck every time.
//
// A mandate is the claim that a stranger should stop scrolling: not the topic
// and not the question, but what the reader will hold afterwards that they do
// not hold now. Each one carries a test it must pass and the way it goes
// wrong, so "this is interesting" becomes something a writer can fail.
//
// This is the same axis as a structure's valueMove (simplify, add research,
// flip) at a resolution a writer can steer by, moved to the front of the
// pipeline where it can still change what the deck says.

export type DeckMandate = {
  id: string;
  /** Chip and tag text. Two words at most. */
  label: string;
  /** What this mandate is, in the writer's language. */
  what: string;
  /** The test it must pass to be chosen. Falsifiable, not a vibe. */
  test: string;
  /** The way this mandate goes wrong. */
  failsAs: string;
  /** What the mandate line has to contain when this one is chosen. */
  line: string;
};

export const DECK_MANDATES: DeckMandate[] = [
  {
    id: "correction",
    label: "Correction",
    what: "The reader believes something that is wrong, and the deck overturns it.",
    test: "You can write the belief in the reader's own words, and they would defend it out loud.",
    failsAs: "A strawman. Nobody actually holds the belief being knocked down, so the deck argues with no one.",
    line: "The belief, in their words, then what is true instead.",
  },
  {
    id: "unknown-claim",
    label: "Unknown claim",
    what: "One true statement that stops the reader cold, needing no setup to land.",
    test: "Read the sentence to someone with no context and they say some version of \"wait, really\".",
    failsAs: "Trivia. Surprising for a second, and it changes nothing the reader thinks or does.",
    line: "The claim itself, in one sentence, as the reader would repeat it.",
  },
  {
    id: "connection",
    label: "Connection",
    what: "Two things the reader already accepts, never joined until now.",
    test: "You can name both halves, and the reader nods at each one on its own before the join.",
    failsAs: "A stretch. The link is rhetorical rather than mechanical, and a careful reader feels the seam.",
    line: "Both halves, then the mechanism that joins them.",
  },
  {
    id: "naming",
    label: "Naming",
    what: "An experience the reader has lived with no word for, named and then explained.",
    test: "Describe the experience with the name withheld and the reader recognises themselves first.",
    failsAs: "Jargon. The term is real, the experience was never theirs, and the deck teaches vocabulary nobody asked for.",
    line: "The experience in plain words, then the name it has.",
  },
  {
    id: "finding",
    label: "Finding",
    what: "Someone did something and saw something, and the reader has not heard about it.",
    test: "You can say who did what and what they saw, as an event, without reaching for a p-value.",
    failsAs: "A recited number. A citation standing in for a story, which reads as a journal club rather than a deck.",
    line: "Who did what, what they saw, and what it means for the reader.",
  },
  {
    id: "rule",
    label: "Rule",
    what: "The reader is at a fork and does not know how to choose.",
    test: "You can name both options and the reader would genuinely weigh them tonight.",
    failsAs: "Generic advice. The fork was never real, so the rule is something they would have guessed.",
    line: "The fork, then the rule that decides it.",
  },
  {
    id: "question",
    label: "Question",
    what: "Something the reader typed into a search box, answered properly.",
    test: "The answer is NOT what they would have guessed before reading.",
    failsAs: "Consensus. The deck spends six slides confirming what the reader already believed.",
    line: "The question in their words, then the part of the answer they did not expect.",
  },
];

export const MANDATE_IDS: string[] = DECK_MANDATES.map((m) => m.id);

export function isDeckMandate(id: unknown): id is string {
  return typeof id === "string" && MANDATE_IDS.includes(id);
}

export function getMandate(id: string | undefined | null): DeckMandate | null {
  return DECK_MANDATES.find((m) => m.id === id) ?? null;
}

/** The label shown on a deck that carries a mandate. */
export function mandateLabel(id: string | undefined | null): string | null {
  return getMandate(id)?.label ?? null;
}

/** The mandate menu handed to the brief, one block each. */
export function mandateMenuBlock(): string {
  return DECK_MANDATES.map(
    (m) => `MANDATE "${m.id}" (${m.label})
  What it is: ${m.what}
  Passes only if: ${m.test}
  Fails as: ${m.failsAs}
  Its line carries: ${m.line}`,
  ).join("\n\n");
}

/** The chosen mandate as every later stage sees it: the cut and the editor
 *  read both get the promise the deck has to keep. */
export function mandateBlock(id: string | undefined | null, line: string | undefined | null): string {
  const m = getMandate(id);
  if (!m || !line) return "";
  return `
THE MANDATE. This is why the deck exists, and it was decided before the piece was written. ${m.what}
  The promise: ${line}
  This deck has failed if: ${m.failsAs}
`;
}

/** What the last few decks were FOR, so six corrections do not run in a row.
 *  Governs the mix only; it never bars a mandate the subject genuinely needs. */
export function recentMandatesBlock(ids: (string | undefined)[]): string {
  const rows = ids.filter(isDeckMandate).slice(0, 8);
  if (rows.length === 0) return "";
  const counts = new Map<string, number>();
  for (const id of rows) counts.set(id, (counts.get(id) ?? 0) + 1);
  const listed = [...counts.entries()]
    .map(([id, n]) => `${getMandate(id)?.label ?? id}${n > 1 ? ` x${n}` : ""}`)
    .join(", ");
  const run = rows.length >= 3 && rows.slice(0, 3).every((id) => id === rows[0]) ? getMandate(rows[0])?.label : null;
  return `
THE RECENT MIX. The last decks were for: ${listed} (most recent first). An account that runs the same mandate over and over starts to sound like one note: six corrections in a row is an account arguing with its audience, six findings in a row is a journal club.${run ? ` The last three were all ${run}; prefer a different mandate unless this subject genuinely needs that one.` : ""} This governs the mix only. Where the subject truly calls for a repeated mandate, take it and say so.
`;
}
