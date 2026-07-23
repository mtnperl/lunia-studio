import { describe, it, expect } from "vitest";
import {
  reorderBlocks,
  applyUndo,
  applyRedo,
  applySuggestion,
  completionItems,
  type PendingBlock,
} from "./campaign-editor-state";
import type { CampaignContent, CampaignBlock } from "./types";

const block = (id: string, body = ""): CampaignBlock => ({ id, body, align: "left", kind: "text" });

const baseContent = (over: Partial<CampaignContent> = {}): CampaignContent => ({
  subjectLines: ["Sleep better tonight", "b", "c"],
  selectedSubject: 0,
  previewText: "",
  blocks: [block("1", "one"), block("2", "two"), block("3", "three")],
  cta: { label: "Shop now", url: "https://lunia.com" },
  images: [],
  ...over,
});

describe("reorderBlocks", () => {
  it("moves a block to the target slot", () => {
    const out = reorderBlocks(baseContent().blocks, "3", "1");
    expect(out.map((b) => b.id)).toEqual(["3", "1", "2"]);
  });
  it("is a no-op when ids match", () => {
    const blocks = baseContent().blocks;
    expect(reorderBlocks(blocks, "2", "2")).toBe(blocks);
  });
  it("returns input unchanged when an id is missing", () => {
    const blocks = baseContent().blocks;
    expect(reorderBlocks(blocks, "9", "1")).toBe(blocks);
  });
});

describe("applyUndo / applyRedo", () => {
  it("undo restores the prior state and round-trips with redo", () => {
    const v1 = baseContent();
    const v2 = baseContent({ previewText: "edited" });
    const undone = applyUndo([v1], [], v2);
    expect(undone).not.toBeNull();
    expect(undone!.content).toBe(v1);
    expect(undone!.undoStack).toEqual([]);
    expect(undone!.redoStack).toEqual([v2]);

    const redone = applyRedo(undone!.undoStack, undone!.redoStack, undone!.content);
    expect(redone!.content).toBe(v2);
    expect(redone!.undoStack).toEqual([v1]);
    expect(redone!.redoStack).toEqual([]);
  });
  it("returns null when stacks are empty", () => {
    expect(applyUndo([], [], baseContent())).toBeNull();
    expect(applyRedo([], [], baseContent())).toBeNull();
  });
});

describe("applySuggestion", () => {
  it("appends only included blocks and merges provided meta", () => {
    const c = baseContent();
    const pending: PendingBlock[] = [
      { block: block("a", "keep"), included: true },
      { block: block("b", "skip"), included: false },
      { block: block("c", "keep2"), included: true },
    ];
    const out = applySuggestion(c, pending, { topBanner: "SALE", ctaLabel: "Buy" });
    expect(out.blocks.map((b) => b.id)).toEqual(["1", "2", "3", "a", "c"]);
    expect(out.topBanner).toBe("SALE");
    expect(out.cta.label).toBe("Buy");
    expect(out.cta.url).toBe("https://lunia.com"); // url preserved
  });
  it("never overwrites existing values when meta omits them", () => {
    const c = baseContent({ topBanner: "EXISTING", promoBand: "PROMO" });
    const out = applySuggestion(c, [], {});
    expect(out.topBanner).toBe("EXISTING");
    expect(out.promoBand).toBe("PROMO");
    expect(out.cta.label).toBe("Shop now");
  });
});

describe("completionItems", () => {
  it("reads a fully-filled campaign", () => {
    const c = baseContent({
      images: [{ id: "h", role: "hero", source: "generated", aspect: "4:5", url: "https://x/y.jpg" }],
    });
    expect(completionItems(c).every((i) => i.done)).toBe(true);
  });
  it("reads a 0-block campaign cleanly", () => {
    const c = baseContent({ blocks: [], subjectLines: [""], cta: { label: "", url: "" }, images: [] });
    const items = completionItems(c);
    expect(items.find((i) => i.label === "0 blocks")?.done).toBe(false);
    expect(items.every((i) => !i.done)).toBe(true);
  });
});
