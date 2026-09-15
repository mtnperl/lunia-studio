// Recast: the same subject argued a different way, with the cover kept.
//
// A deck's structure is chosen before a word exists, from a topic line, which
// is the worst moment to judge what shape the argument wants. You see the
// mistake on the finished deck: this should have been a myth bust, not an
// explainer. Until now the only remedy was to start over, which threw away
// the cover image you had already paid for and liked.
//
// A recast keeps the cover and rewrites everything behind it. The piece is
// written again under the new structure's value move, so it is a real rewrite
// rather than the old slides reshuffled, but it is written to open into the
// hook that is already on screen.

import type { CarouselContent, Hook } from "./types";

export type RecastOptions = {
  /** Keep the chosen hook's words. The new piece must open into them. */
  keepHook: boolean;
  /** Keep the cover artwork and the prompt that made it. */
  keepImage: boolean;
};

/** What a recast carries over from the deck being replaced. */
export type KeptCover = {
  hook?: Hook;
  imagePrompt?: string;
  hookImagePromptOverride?: string;
  hookImageSpec?: CarouselContent["hookImageSpec"];
};

/** Read the cover off the deck being recast. `selectedHook` is the one on
 *  screen, which is the one the user means by "keep the hook". */
export function readKeptCover(
  content: CarouselContent | null | undefined,
  selectedHook: number,
  opts: RecastOptions,
): KeptCover {
  if (!content) return {};
  const kept: KeptCover = {};
  if (opts.keepHook) {
    const hook = content.hooks?.[selectedHook] ?? content.hooks?.[0];
    if (hook?.headline) kept.hook = { ...hook };
  }
  if (opts.keepImage) {
    if (content.imagePrompt) kept.imagePrompt = content.imagePrompt;
    if (content.hookImagePromptOverride) kept.hookImagePromptOverride = content.hookImagePromptOverride;
    if (content.hookImageSpec) kept.hookImageSpec = content.hookImageSpec;
  }
  return kept;
}

/** The instruction that goes to the writer when the cover is fixed. Given to
 *  the brief, so the piece is built to arrive at this hook, and to the cut,
 *  so the slides do not write a different opening. */
export function keptCoverBlock(kept: KeptCover): string {
  if (!kept.hook) return "";
  const { headline, subline } = kept.hook;
  return `
THE COVER IS FIXED. This deck is being rewritten behind a cover that already exists and is not yours to change:

  ${headline}${subline ? `\n  ${subline}` : ""}

Everything you write opens out of that cover. The reader has read it and is waiting for what it promised, so the piece answers the question those words raise, and the first slide after the cover picks up exactly where they stop. Do not restate the cover, do not contradict it, and do not write a deck that would have wanted a different opening. If the new shape genuinely cannot be argued from this cover, write the closest honest version and say nothing about the tension: the editor sees the result and decides.
`;
}

/** Put the kept cover back on a freshly written deck. The new deck's own
 *  hooks are replaced rather than appended: the user asked to keep this one,
 *  and a pool of alternatives for a cover that is already drawn is noise. */
export function applyKeptCover(content: CarouselContent, kept: KeptCover): CarouselContent {
  const out: CarouselContent = { ...content };
  if (kept.hook) out.hooks = [{ ...kept.hook }];
  if (kept.imagePrompt) out.imagePrompt = kept.imagePrompt;
  if (kept.hookImagePromptOverride) out.hookImagePromptOverride = kept.hookImagePromptOverride;
  if (kept.hookImageSpec) out.hookImageSpec = kept.hookImageSpec;
  return out;
}

/** True when the recast asks for nothing to be carried over, in which case it
 *  is an ordinary generation and the caller can skip the extra read. */
export function isEmptyRecast(opts: RecastOptions): boolean {
  return !opts.keepHook && !opts.keepImage;
}
