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

/** Apply an accepted AI/preset suggestion onto content: append only the
 *  `included` blocks, and merge banner/promo/cta only when the suggestion
 *  provided them (never blow away existing values). One transform = one
 *  undo step. */
export function applySuggestion(
  content: CampaignContent,
  pending: PendingBlock[],
  meta: SuggestionMeta,
): CampaignContent {
  const accepted = pending.filter((p) => p.included).map((p) => p.block);
  return {
    ...content,
    blocks: [...content.blocks, ...accepted],
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
