import { describe, it, expect } from "vitest";
import { suggestImagePrompt, withImagePrompt, blockOwnText } from "./campaign-image-prompt";
import { hasForbiddenDash } from "./strip-dashes";
import type { CampaignBlock } from "./types";

const block = (over: Partial<CampaignBlock> = {}): CampaignBlock => ({
  id: "b", body: "", align: "left", kind: "imagetext", ...over,
});

const ctx = {
  subject: "The reason most sleep supplements fail",
  topic: "melatonin versus magnesium",
  copy: ["Melatonin shifts your timing. It does not deepen your sleep."],
};

describe("suggestImagePrompt", () => {
  it("leads with the block's own copy", () => {
    const p = suggestImagePrompt(block({ imageHeading: "Energy you can count on" }), ctx);
    expect(p).toContain("Energy you can count on");
  });

  it("is tied to this email, not to wellness in general", () => {
    const p = suggestImagePrompt(block({ imageHeading: "Energy you can count on" }), ctx);
    expect(p).toContain("The reason most sleep supplements fail");
  });

  it("falls back to the email context when the block has no copy yet", () => {
    const p = suggestImagePrompt(block(), ctx);
    expect(p).toContain("The reason most sleep supplements fail");
  });

  it("still produces something usable with no context at all", () => {
    const p = suggestImagePrompt(block());
    expect(p.length).toBeGreaterThan(20);
    expect(p).toMatch(/wind-down/);
  });

  it("varies the framing by kind", () => {
    const header = suggestImagePrompt(block({ kind: "headerimage" }), ctx);
    const grid = suggestImagePrompt(block({ kind: "grid" }), ctx);
    expect(header).not.toBe(grid);
    expect(header).toMatch(/headline/);
    expect(grid).toMatch(/still life/);
  });

  it("describes a scene, not the house style or the safety rules", () => {
    // generateCampaignSlotImage appends those server-side; repeating them here
    // would only crowd the prompt the user is reading and editing.
    const p = suggestImagePrompt(block({ imageHeading: "x" }), ctx);
    expect(p).not.toMatch(/photorealistic/i);
    expect(p).not.toMatch(/no supplement bottles/i);
  });

  it("carries no forbidden dashes even when the copy does", () => {
    const p = suggestImagePrompt(block({ imageHeading: "Sleep better — tonight" }), ctx);
    expect(hasForbiddenDash(p)).toBe(false);
  });

  it("strips inline styling tokens out of the copy it quotes", () => {
    const p = suggestImagePrompt(block({ imageHeading: "[[lg,yellow]]groggy[[/]] mornings" }), ctx);
    expect(p).toContain("groggy mornings");
    expect(p).not.toContain("[[");
  });
});

describe("blockOwnText", () => {
  it("reads bullets and grid cells, not just body", () => {
    expect(blockOwnText(block({ kind: "imagebullets", bulletItems: ["Melatonin-free", "Vegan"] }))).toContain("Melatonin-free");
    expect(blockOwnText(block({ kind: "grid", gridCells: [{ heading: "Transparent dosing" }] }))).toContain("Transparent dosing");
  });
});

describe("withImagePrompt", () => {
  it("fills an empty prompt on an image block", () => {
    const out = withImagePrompt(block({ imageHeading: "Energy" }), ctx);
    expect(out.imagePrompt).toBeTruthy();
  });

  it("never overwrites a prompt that already exists", () => {
    // The model's prompt, or one the user edited, wins.
    const out = withImagePrompt(block({ imagePrompt: "mine, keep it" }), ctx);
    expect(out.imagePrompt).toBe("mine, keep it");
  });

  it("fills each grid cell independently and leaves filled ones alone", () => {
    const out = withImagePrompt(
      block({ kind: "grid", gridCells: [{ heading: "One" }, { heading: "Two", imagePrompt: "kept" }] }),
      ctx,
    );
    expect(out.gridCells![0]!.imagePrompt).toBeTruthy();
    expect(out.gridCells![1]!.imagePrompt).toBe("kept");
  });

  it("gives each grid cell a prompt about ITS own cell", () => {
    const out = withImagePrompt(
      block({ kind: "grid", gridCells: [{ heading: "Melatonin-free" }, { heading: "Transparent dosing" }] }),
      ctx,
    );
    expect(out.gridCells![0]!.imagePrompt).toContain("Melatonin-free");
    expect(out.gridCells![1]!.imagePrompt).toContain("Transparent dosing");
  });

  it("leaves kinds that hold no image untouched", () => {
    const stat = block({ kind: "stat", statValue: "558 reviews" });
    expect(withImagePrompt(stat, ctx)).toEqual(stat);
  });

  it("does not generate anything — it only writes text", () => {
    // The whole point: the prompt is ready, Generate stays a deliberate press.
    const out = withImagePrompt(block({ imageHeading: "Energy" }), ctx);
    expect(out.imageUrl).toBeUndefined();
  });
});
