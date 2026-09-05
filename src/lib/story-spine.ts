// The story spine and the relay.
//
// A deck is one story or it is ten cards. The spine is written before any
// slide: the Moment the reader has lived, the Villain they trust, the Turn
// that shows the villain failing, the Payoff that changes tonight. Every slide
// serves one beat, in that order. The relay is the seam between slides: the
// first line of a slide picks up a word from the last line of the one before,
// so the open loop is answered instead of dropped.

export const STORY_BEATS = ["moment", "villain", "turn", "payoff"] as const;
export type StoryBeat = (typeof STORY_BEATS)[number];

export type StorySpine = {
  /** The scene, second person, present tense. "You wake at 3:11 and start doing math." */
  moment: string;
  /** The habit or belief the reader trusts. "Trying harder to fall back asleep." */
  villain: string;
  /** Why the villain fails. "Effort is arousal; it wakes the body further." */
  turn: string;
  /** What changes tonight. "Protect the first half of the night; if awake, get up." */
  payoff: string;
  /** One concrete image from the moment that returns on the turn and the payoff. */
  image?: string;
};

export type StoryIssue =
  | { kind: "no-spine" }
  | { kind: "no-beat"; where: string }
  | { kind: "out-of-order"; where: string; beat: StoryBeat; after: StoryBeat }
  | { kind: "missing-beat"; beat: StoryBeat }
  | { kind: "dropped-handoff"; from: string; to: string };

export type StoryReport = { ok: boolean; issues: StoryIssue[]; handoffs: number; carried: number };

export function isStoryBeat(v: unknown): v is StoryBeat {
  return typeof v === "string" && (STORY_BEATS as readonly string[]).includes(v);
}

const STOP = new Set(["all", "any", "can", "did", "get", "got", "her", "him", "his", "how", "its", "let", "may", "now", "off", "our", "out", "own", "put", "say", "she", "the", "too", "use", "was", "who", "why", "yes", "yet", "you", "the", "this", "that", "with", "from", "your", "you", "they", "them", "there", "here", "then", "than", "what", "when", "where", "which", "were", "been", "have", "has", "had", "will", "would", "could", "should", "into", "onto", "over", "under", "about", "after", "before", "most", "more", "some", "only", "just", "very", "still", "also", "not", "and", "but", "for", "are", "was", "does", "did", "one", "thing", "things", "people", "reason", "half", "wrong", "part", "way", "real", "next"]);

/** Content words a reader would notice repeating: 3+ letters, not a stopword, crudely stemmed. */
export function contentWords(s: string): Set<string> {
  const out = new Set<string>();
  for (const raw of s.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    out.add(raw.replace(/(ing|ed|es|s)$/, ""));
  }
  return out;
}

const lines = (s: string) => (s.includes("\n") ? s.split(/\n+/) : s.split(/(?<=[.!?])\s+/)).map((l) => l.trim()).filter(Boolean);

/** Whether the first line of `next` picks up a word from the last line of `prev`. */
export function handoffCarries(prevBody: string, nextHeadline: string, nextBody: string): boolean {
  const last = lines(prevBody).slice(-1)[0] ?? "";
  const first = `${nextHeadline} ${lines(nextBody)[0] ?? ""}`;
  const a = contentWords(last);
  for (const w of contentWords(first)) if (a.has(w)) return true;
  return false;
}

export function storyCheck(content: { spine?: StorySpine | null; slides: { headline: string; body: string; beat?: string }[] }): StoryReport {
  const issues: StoryIssue[] = [];
  const slides = content.slides ?? [];
  if (!content.spine) issues.push({ kind: "no-spine" });

  let prevIdx = -1;
  const seen = new Set<StoryBeat>();
  slides.forEach((s, i) => {
    const label = `slide ${i + 2}`;
    if (!isStoryBeat(s.beat)) { issues.push({ kind: "no-beat", where: label }); return; }
    const idx = STORY_BEATS.indexOf(s.beat);
    if (idx < prevIdx) issues.push({ kind: "out-of-order", where: label, beat: s.beat, after: STORY_BEATS[prevIdx] });
    prevIdx = Math.max(prevIdx, idx);
    seen.add(s.beat);
  });
  for (const b of ["moment", "turn", "payoff"] as const) if (slides.length && !seen.has(b) && slides.every((s) => isStoryBeat(s.beat))) issues.push({ kind: "missing-beat", beat: b });

  let handoffs = 0, carried = 0;
  for (let i = 0; i + 1 < slides.length; i++) {
    handoffs++;
    if (handoffCarries(slides[i].body, slides[i + 1].headline, slides[i + 1].body)) carried++;
    else issues.push({ kind: "dropped-handoff", from: `slide ${i + 2}`, to: `slide ${i + 3}` });
  }
  return { ok: issues.length === 0, issues, handoffs, carried };
}

export function describeStoryIssues(r: StoryReport): string {
  const drops = r.issues.filter((i): i is Extract<StoryIssue, { kind: "dropped-handoff" }> => i.kind === "dropped-handoff");
  const rest = r.issues.filter((i) => i.kind !== "dropped-handoff").map((i) => {
    switch (i.kind) {
      case "no-spine": return "no story spine saved";
      case "no-beat": return `${i.where} has no beat`;
      case "out-of-order": return `${i.where} is a ${i.beat} beat after a ${i.after} beat`;
      case "missing-beat": return `no ${i.beat} beat`;
      default: return "";
    }
  }).filter(Boolean);
  if (drops.length) rest.push(`handoff dropped ${drops.map((d) => `${d.from} to ${d.to}`).join(", ")}`);
  return rest.join(". ");
}

/** The spine as prompt text, for rewrites and new hooks. */
export function spinePromptBlock(spine?: StorySpine | null): string {
  if (!spine) return "";
  return `
THE STORY THIS DECK TELLS. Every slide serves one of these beats, in this order. Write inside it:
  Moment: ${spine.moment}
  Villain: ${spine.villain}
  Turn: ${spine.turn}
  Payoff: ${spine.payoff}${spine.image ? `\n  Returning image: ${spine.image}` : ""}
`;
}
