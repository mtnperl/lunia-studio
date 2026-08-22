import { describe, it, expect } from "vitest";
import {
  reorderBlocks,
  applyUndo,
  applyRedo,
  applySuggestion,
  clampHeroCta,
  HERO_CTA_MIN_X,
  HERO_CTA_MAX_X,
  HERO_WIDTH,
  HERO_CTA_MAX_WIDTH,
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
  it("defaults to append mode when no mode is passed", () => {
    const c = baseContent();
    const pending: PendingBlock[] = [{ block: block("a", "new"), included: true }];
    const explicit = applySuggestion(c, pending, {}, "append");
    const implicit = applySuggestion(c, pending, {});
    expect(implicit.blocks.map((b) => b.id)).toEqual(explicit.blocks.map((b) => b.id));
  });

  describe("replace mode", () => {
    it("swaps the body for the included blocks instead of appending", () => {
      const c = baseContent();
      const pending: PendingBlock[] = [
        { block: block("a", "restructured one"), included: true },
        { block: block("b", "rejected"), included: false },
        { block: block("c", "restructured two"), included: true },
      ];
      const out = applySuggestion(c, pending, {}, "replace");
      expect(out.blocks.map((b) => b.id)).toEqual(["a", "c"]);
    });
    it("keeps the original body when every block is rejected", () => {
      // Rejecting the whole restructure means "I don't want this", not
      // "delete my copy" — the email must not end up with zero blocks.
      const c = baseContent();
      const pending: PendingBlock[] = [
        { block: block("a"), included: false },
        { block: block("b"), included: false },
      ];
      const out = applySuggestion(c, pending, {}, "replace");
      expect(out.blocks.map((b) => b.id)).toEqual(["1", "2", "3"]);
    });
    it("keeps the original body when the suggestion is empty", () => {
      const c = baseContent();
      const out = applySuggestion(c, [], {}, "replace");
      expect(out.blocks.map((b) => b.id)).toEqual(["1", "2", "3"]);
    });
    it("still merges meta and preserves the cta url", () => {
      const c = baseContent({ promoBand: "PROMO" });
      const pending: PendingBlock[] = [{ block: block("a"), included: true }];
      const out = applySuggestion(c, pending, { topBanner: "NEW", ctaLabel: "Go" }, "replace");
      expect(out.topBanner).toBe("NEW");
      expect(out.promoBand).toBe("PROMO");
      expect(out.cta.label).toBe("Go");
      expect(out.cta.url).toBe("https://lunia.com");
    });
    it("does not mutate the input content", () => {
      const c = baseContent();
      const before = c.blocks.map((b) => b.id);
      applySuggestion(c, [{ block: block("a"), included: true }], {}, "replace");
      expect(c.blocks.map((b) => b.id)).toEqual(before);
    });
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

describe("clampHeroCta", () => {
  it("leaves a position inside the bounds alone", () => {
    expect(clampHeroCta(50, 50)).toEqual({ x: 50, y: 50 });
  });

  it("keeps the pill inside the hero horizontally", () => {
    expect(clampHeroCta(0, 50).x).toBe(HERO_CTA_MIN_X);
    expect(clampHeroCta(100, 50).x).toBe(HERO_CTA_MAX_X);
  });

  it("derives its bounds from the real geometry", () => {
    // 300px pill centred on its own x inside a 552px hero: half the pill has
    // to fit, so the minimum is ceil(150/552 * 100) = 28.
    expect(HERO_CTA_MIN_X).toBe(Math.ceil((HERO_CTA_MAX_WIDTH / 2 / HERO_WIDTH) * 100));
    expect(HERO_CTA_MIN_X).toBe(28);
    expect(HERO_CTA_MAX_X).toBe(72);
  });

  it("at either horizontal extreme the pill still fits", () => {
    const half = HERO_CTA_MAX_WIDTH / 2;
    const leftEdge = (HERO_CTA_MIN_X / 100) * HERO_WIDTH - half;
    const rightEdge = (HERO_CTA_MAX_X / 100) * HERO_WIDTH + half;
    expect(leftEdge).toBeGreaterThanOrEqual(0);
    expect(rightEdge).toBeLessThanOrEqual(HERO_WIDTH);
  });

  it("clamps vertically", () => {
    expect(clampHeroCta(50, -20).y).toBe(8);
    expect(clampHeroCta(50, 500).y).toBe(92);
  });

  it("rounds to whole percents, so the style attribute stays tidy", () => {
    expect(clampHeroCta(50.4, 49.6)).toEqual({ x: 50, y: 50 });
  });

  it("falls back to centre for non-finite input rather than emitting NaN", () => {
    expect(clampHeroCta(Number.NaN, Number.NaN)).toEqual({ x: 50, y: 50 });
    expect(clampHeroCta(Infinity, -Infinity)).toEqual({ x: HERO_CTA_MAX_X, y: 8 });
  });
});
