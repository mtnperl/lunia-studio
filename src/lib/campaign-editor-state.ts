import type { CampaignContent, CampaignBlock } from "./types";

/** Pure state transforms for the campaign editor. Extracted from
 *  CampaignEditor.tsx so the load-bearing logic (reorder, undo/redo,
 *  suggestion-apply, completion) is unit-testable in the node vitest env and
 *  survives the component split unchanged — the orchestrator calls these, the
 *  panels never reimplement them. */

/** Move the block `draggedId` to the slot occupied by `overId`. Returns a new
 *  array; returns the input unchanged when either id is missing or they match
 *  (so a no-op drag never mutates or pushes an undo step). */
export function reorderBlocks(
  blocks: CampaignBlock[],
  draggedId: string,
  overId: string,
): CampaignBlock[] {
  if (draggedId === overId) return blocks;
  const from = blocks.findIndex((b) => b.id === draggedId);
  const to = blocks.findIndex((b) => b.id === overId);
  if (from === -1 || to === -1) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export type HistoryStep = {
  content: CampaignContent;
  undoStack: CampaignContent[];
  redoStack: CampaignContent[];
};

/** Undo: restore the top of the undo stack, pushing `current` onto redo.
 *  Returns null when there is nothing to undo (button should be disabled). */
export function applyUndo(
  undoStack: CampaignContent[],
  redoStack: CampaignContent[],
  current: CampaignContent,
): HistoryStep | null {
  if (undoStack.length === 0) return null;
  const content = undoStack[undoStack.length - 1]!;
  return {
    content,
    undoStack: undoStack.slice(0, -1),
    redoStack: [...redoStack, current],
  };
}

/** Redo: symmetric to applyUndo. Returns null when there is nothing to redo. */
export function applyRedo(
  undoStack: CampaignContent[],
  redoStack: CampaignContent[],
  current: CampaignContent,
): HistoryStep | null {
  if (redoStack.length === 0) return null;
  const content = redoStack[redoStack.length - 1]!;
  return {
    content,
    undoStack: [...undoStack, current],
    redoStack: redoStack.slice(0, -1),
  };
}

export type PendingBlock = { block: CampaignBlock; included: boolean };
export type SuggestionMeta = { topBanner?: string; promoBand?: string; ctaLabel?: string };

/** How an accepted suggestion combines with the blocks already on the page.
 *  "append" (the default) is the original behaviour used by Suggest layout and
 *  the layout presets. "replace" swaps the body wholesale and is used by the
 *  restructure flow ("Make it visual"), which re-expresses the SAME copy as a
 *  different set of blocks: appending there would duplicate every paragraph. */
export type SuggestionMode = "append" | "replace";

/** Apply an accepted AI/preset suggestion onto content: take only the
 *  `included` blocks, and merge banner/promo/cta only when the suggestion
 *  provided them (never blow away existing values). One transform = one
 *  undo step.
 *
 *  `mode` defaults to "append" so every existing call site keeps its exact
 *  behaviour. In "replace" mode an all-excluded suggestion is treated as a
 *  no-op rather than emptying the email — rejecting every block means "I don't
 *  want this restructure", not "delete my copy". */
export function applySuggestion(
  content: CampaignContent,
  pending: PendingBlock[],
  meta: SuggestionMeta,
  mode: SuggestionMode = "append",
): CampaignContent {
  const accepted = pending.filter((p) => p.included).map((p) => p.block);
  const blocks =
    mode === "replace"
      ? accepted.length > 0
        ? accepted
        : content.blocks
      : [...content.blocks, ...accepted];
  return {
    ...content,
    blocks,
    topBanner: meta.topBanner ?? content.topBanner,
    promoBand: meta.promoBand ?? content.promoBand,
    cta: meta.ctaLabel ? { ...content.cta, label: meta.ctaLabel } : content.cta,
  };
}

export type CompletionItem = { label: string; done: boolean };

/** The header completion checklist, derived purely from content. Reads a
 *  0-block campaign cleanly (no empty-array crash). */
export function completionItems(content: CampaignContent): CompletionItem[] {
  const subject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "";
  const heroFilled = content.images.some((i) => i.role === "hero" && !!i.url);
  const n = content.blocks.length;
  return [
    { label: "Subject", done: !!subject.trim() },
    { label: "Hero image", done: heroFilled },
    { label: n === 1 ? "1 block" : `${n} blocks`, done: n > 0 },
    { label: "CTA", done: !!content.cta.label.trim() && !!content.cta.url.trim() },
  ];
}

// ─── Hero CTA position ───────────────────────────────────────────────────────

/** Geometry the clamp is derived from, so the numbers are traceable rather
 *  than magic. The hero sits inside the 600px shell's 24px side padding, and
 *  the CTA pill is `width:calc(100% - 48px); max-width:300px`, so at this
 *  width it is exactly 300px and is centred on its own x. */
export const HERO_WIDTH = 552;
export const HERO_CTA_MAX_WIDTH = 300;

/** Percent bounds that keep a centre-anchored pill fully inside the hero.
 *  half = 300 / 2 = 150px; 150 / 552 = 27.17%, so 28..72 with a little slack.
 *  Vertical has no equivalent constraint (the pill is short relative to the
 *  image) so 8..92 is simply a sane margin. */
export const HERO_CTA_MIN_X = Math.ceil((HERO_CTA_MAX_WIDTH / 2 / HERO_WIDTH) * 100);
export const HERO_CTA_MAX_X = 100 - HERO_CTA_MIN_X;
export const HERO_CTA_MIN_Y = 8;
export const HERO_CTA_MAX_Y = 92;

/** Clamp a hero-CTA position into the region where the pill stays inside the
 *  image.
 *
 *  Only NaN falls back to the centre. Infinity is left to clamp naturally to
 *  the nearest bound, which is what someone would expect from a number that is
 *  merely too large — the fallback exists to stop `NaN%` reaching a style
 *  attribute, not to reinterpret every unusual value. */
export function clampHeroCta(x: number, y: number): { x: number; y: number } {
  const cx = Number.isNaN(x) ? 50 : x;
  const cy = Number.isNaN(y) ? 50 : y;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
  return {
    x: clamp(cx, HERO_CTA_MIN_X, HERO_CTA_MAX_X),
    y: clamp(cy, HERO_CTA_MIN_Y, HERO_CTA_MAX_Y),
  };
}
