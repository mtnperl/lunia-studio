// Keep the chooser's prompt from growing with the library.
//
// /api/campaign/choose-asset lists every candidate description in the prompt.
// At today's 128 assets that is a few thousand tokens and nobody notices; at
// the few thousand images a curated library is meant to hold it would be six
// figures of tokens on every click, paid per block, to read past four thousand
// captions and pick one. So above a threshold the list is shortlisted first by
// plain word overlap — free, deterministic, and no second model call.
//
// The scoring is deliberately dumb. It is not trying to choose the image; it
// is trying not to hide the right one from the model that will.

/** Words that appear in half the captions and carry no signal. */
const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with", "from", "by",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these", "those",
  "as", "into", "over", "under", "near", "up", "down", "out", "off", "then", "than", "so",
  "you", "your", "we", "our", "us", "they", "their", "he", "she", "his", "her", "him",
  "image", "photo", "photograph", "picture", "shot", "shows", "showing", "visible",
  "mood", "light", "lighting", "soft", "warm", "dark", "interior", "background",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Crude singular form, so "bottles" matches "bottle" without a stemmer. */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

function bag(text: string): Set<string> {
  return new Set(words(text).map(stem));
}

/**
 * Narrow a large candidate list to the ones worth putting in the prompt.
 *
 * Below `limit` nothing is dropped and the original order is preserved — the
 * common case must not be reordered for no reason. Above it, candidates are
 * taken round-robin across `groupOf`, each group internally best-match-first.
 *
 * Two earlier versions of this got it wrong in the same direction.
 *
 * The first ranked purely by score and broke ties by recency, reasoning that a
 * library where nothing matches should still return its newest images. That
 * holds until one bulk upload owns the recent window: a library of 726 whose
 * newest 250 were all product shots shortlisted to 250 product shots for a
 * block about cortisol and REM sleep, cutting all 251 of its lifestyle
 * photographs before the model saw the list. The model answered honestly —
 * "All options are product bottle shots" — about what it had been shown.
 *
 * The second kept merit first and only diversified the leftover slots. That
 * never ran: on this library 314 candidates scored above zero, and 312 of them
 * scored exactly ONE, on the single word "sleep" — which is in nearly every
 * caption a sleep brand owns. A score of 1 on a word the whole library shares
 * is noise, so "merit" collapsed back to recency and the bulk upload won again.
 *
 * Hence round-robin unconditionally. Scores still order each group internally,
 * where they mean something relative to their peers; they are not trusted to
 * rank across groups, where one ubiquitous word can outvote everything. This
 * cannot fix a library that genuinely has no suitable picture, but it stops the
 * shortlist from manufacturing one.
 */
export function shortlistByOverlap<T>(
  items: T[],
  describe: (item: T) => string,
  copy: string,
  limit = 250,
  groupOf?: (item: T) => string,
): T[] {
  if (items.length <= limit) return items;

  const target = bag(copy);
  const scored = items.map((item, index) => {
    let score = 0;
    for (const w of bag(describe(item))) if (target.has(w)) score += 1;
    return { item, index, score };
  });

  // One queue per group, best match first, recency breaking ties. With no
  // grouping accessor this is a single queue and the behaviour is the original
  // score-then-recency ranking.
  const buckets = new Map<string, typeof scored>();
  for (const s of scored) {
    const key = groupOf ? groupOf(s.item) : "";
    const b = buckets.get(key);
    if (b) b.push(s); else buckets.set(key, [s]);
  }
  for (const b of buckets.values()) {
    b.sort((a, c) => (c.score - a.score) || (a.index - c.index));
  }

  // One from each queue per pass. A queue that runs dry drops out and its
  // remaining share goes to the groups that still have images.
  const queues = [...buckets.values()];
  const out: T[] = [];
  let cursor = 0;
  while (out.length < limit && queues.some((q) => q.length > 0)) {
    const q = queues[cursor % queues.length]!;
    const next = q.shift();
    if (next) out.push(next.item);
    cursor += 1;
  }
  return out;
}
