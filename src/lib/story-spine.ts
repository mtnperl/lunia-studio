// The story spine and the relay.
//
// A deck is one story or it is ten cards. The spine is written before any
// slide: the Moment the reader has lived, the Villain they trust, the Turn
// that shows the villain failing, the Payoff that changes tonight. Every slide
// serves one beat, in that order. The relay is the seam between slides: the
// first line of a slide picks up a word from the last line of the one before,
// so the open loop is answered instead of dropped.
//
// Three more rules make a deck read as written by one person about one
// night: every slide carries a concrete detail, slide 2 stands on its own as a
// second hook (Instagram shows a carousel twice, the second time from slide
// 2), and the hook names who the deck is for.

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
  /** Who this deck is for, in the reader's words. "People who wake at 3am." */
  who?: string;
};

export type StoryIssue =
  | { kind: "no-spine" }
  | { kind: "no-beat"; where: string }
  | { kind: "out-of-order"; where: string; beat: StoryBeat; after: StoryBeat }
  | { kind: "missing-beat"; beat: StoryBeat }
  | { kind: "dropped-handoff"; from: string; to: string }
  /** A slide with no concrete detail: no number, no time, no object from the moment. */
  | { kind: "no-detail"; where: string }
  /** Slide 2's headline leans on the hook instead of standing alone. */
  | { kind: "weak-second-hook"; headline: string }
  /** The hook names nobody, or not the person the spine says it is for. */
  | { kind: "no-audience" };

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


const NUMBER_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|half|twice|double|dozen|hundred|thousand)\b/i;
const TIME_WORDS = /\b(\d{1,2}(:\d{2})?\s?(am|pm)|minutes?|mins?|hours?|hrs?|nights?|days?|weeks?|months?|years?|seconds?|midnight|noon|dawn|morning|evening|tonight)\b/i;

/** Whether the text carries something a reader can picture: a figure, a
 *  clock time or unit of time, or the returning image from the spine. */
export function hasConcreteDetail(text: string, spine?: StorySpine | null): boolean {
  if (/\d/.test(text) || NUMBER_WORDS.test(text) || TIME_WORDS.test(text)) return true;
  if (spine?.image) {
    const img = contentWords(spine.image);
    for (const w of contentWords(text)) if (img.has(w)) return true;
  }
  return false;
}

/** Openers that make a headline a continuation of the slide before it. A
 *  second hook is read cold, so it cannot start on one of these. */
const LEANING_OPENERS = new Set(["and", "but", "so", "because", "which", "that", "this", "these", "those", "it", "its", "they", "then", "also", "or", "nor", "yet", "instead", "still", "here", "there", "meanwhile", "however", "plus", "same"]);

/** Whether a headline works as a hook on its own: one to eight words, and
 *  not leaning on a slide the reader has not seen. */
export function standsAlone(headline: string): boolean {
  const w = headline.trim().split(/\s+/).filter(Boolean);
  if (w.length === 0 || w.length > 8) return false;
  const first = w[0].toLowerCase().replace(/[^a-z]/g, "");
  return !LEANING_OPENERS.has(first);
}

/** Whether the hook carries a word from the spine's "who". */
export function hookNamesAudience(spine: StorySpine | null | undefined, hook: { headline: string; subline?: string } | null | undefined): boolean {
  if (!spine?.who || !hook) return false;
  const who = contentWords(spine.who);
  for (const w of contentWords(`${hook.headline} ${hook.subline ?? ""}`)) if (who.has(w)) return true;
  return false;
}

/**
 * `expected` is the structure's beat sequence. With it, each slide must serve
 * the beat its slot names (so Myth, Fact, Myth, Fact is valid). Without it,
 * beats may only move forward.
 */
export function storyCheck(
  content: { spine?: StorySpine | null; slides: { headline: string; body: string; beat?: string }[] },
  expected?: StoryBeat[],
  /** The selected hook. With it, the audience rule is judged. */
  hook?: { headline: string; subline?: string } | null,
): StoryReport {
  const issues: StoryIssue[] = [];
  const slides = content.slides ?? [];
  if (!content.spine) issues.push({ kind: "no-spine" });
  else if (hook && !hookNamesAudience(content.spine, hook)) issues.push({ kind: "no-audience" });
  slides.forEach((s, i) => { if (!hasConcreteDetail(`${s.headline} ${s.body}`, content.spine)) issues.push({ kind: "no-detail", where: `slide ${i + 2}` }); });
  if (slides[0] && !standsAlone(slides[0].headline)) issues.push({ kind: "weak-second-hook", headline: slides[0].headline });

  let prevIdx = -1;
  const seen = new Set<StoryBeat>();
  slides.forEach((s, i) => {
    const label = `slide ${i + 2}`;
    if (!isStoryBeat(s.beat)) { issues.push({ kind: "no-beat", where: label }); return; }
    const idx = STORY_BEATS.indexOf(s.beat);
    if (expected) {
      const want = expected[Math.min(i, expected.length - 1)];
      if (want && s.beat !== want) issues.push({ kind: "out-of-order", where: label, beat: s.beat, after: want });
    } else if (idx < prevIdx) issues.push({ kind: "out-of-order", where: label, beat: s.beat, after: STORY_BEATS[prevIdx] });
    prevIdx = Math.max(prevIdx, idx);
    seen.add(s.beat);
  });
  if (!expected) for (const b of ["moment", "turn", "payoff"] as const) if (slides.length && !seen.has(b) && slides.every((s) => isStoryBeat(s.beat))) issues.push({ kind: "missing-beat", beat: b });

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
      case "out-of-order": return `${i.where} is a ${i.beat} beat where the structure wants ${i.after}`;
      case "missing-beat": return `no ${i.beat} beat`;
      case "no-detail": return `${i.where} has no concrete detail (a number, a time, or the returning image)`;
      case "weak-second-hook": return `slide 2 does not stand alone as a second hook: "${i.headline}"`;
      case "no-audience": return "the hook names nobody: put a word from the spine's who in the headline or subline";
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
  Payoff: ${spine.payoff}${spine.image ? `\n  Returning image: ${spine.image}` : ""}${spine.who ? `\n  Who it is for: ${spine.who}` : ""}
`;
}
