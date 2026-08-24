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
 * ranked by how many meaningful words their description shares with the copy,
 * ties broken by original position (which is newest-first), so a library where
 * nothing matches still returns the most recent images rather than nothing.
 */
export function shortlistByOverlap<T>(
  items: T[],
  describe: (item: T) => string,
  copy: string,
  limit = 250,
): T[] {
  if (items.length <= limit) return items;

  const target = bag(copy);
  const scored = items.map((item, index) => {
    let score = 0;
    for (const w of bag(describe(item))) if (target.has(w)) score += 1;
    return { item, index, score };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index));
  return scored.slice(0, limit).map((s) => s.item);
}
