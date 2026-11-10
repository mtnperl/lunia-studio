import { describe, it, expect } from "vitest";
import { reviewLayout, hasBlockingIssues, layoutScore } from "./campaign-layout-review";
import type { CampaignBlock } from "./types";

const block = (kind: CampaignBlock["kind"], over: Partial<CampaignBlock> = {}): CampaignBlock => ({
  id: Math.random().toString(36).slice(2), body: "", align: "left", kind, ...over,
});
const para = (n: number) => block("text", { body: Array.from({ length: n }, (_, i) => `word${i}`).join(" ") });
const codes = (b: CampaignBlock[]) => reviewLayout(b).map((i) => i.code);

describe("reviewLayout", () => {
  it("flags two plain paragraphs in a row", () => {
    expect(codes([para(20), para(20)])).toContain("prose-run");
  });

  it("flags the generate route's old shape: three text blocks", () => {
    const issues = reviewLayout([para(50), para(30), para(10)]);
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["prose-run", "text-stack"]));
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("flags a stack of different word-only kinds", () => {
    expect(codes([block("heading", { headline: "Why" }), block("lead", { body: "A line." }), para(20)])).toContain("text-stack");
  });

  it("flags a paragraph over 60 words", () => {
    expect(codes([para(61)])).toContain("wall");
    expect(codes([para(60)])).not.toContain("wall");
  });

  it("flags a long email with no picture", () => {
    expect(codes([para(55), block("checklist", { items: Array(10).fill("a b c d e f g") }), para(50)])).toContain("no-picture");
  });

  it("flags a long email with one type size", () => {
    const flat = [para(55), block("checklist", { items: Array(10).fill("a b c d e f g") }), block("imagetext", { body: para(40).body })];
    expect(codes(flat)).toContain("flat-type");
    expect(codes([block("lead", { body: "Open big." }), ...flat])).not.toContain("flat-type");
  });

  it("passes a varied layout", () => {
    const good = [
      block("lead", { body: "Better sleep is about every night." }),
      block("imagetext", { imageHeading: "Three jobs", body: para(40).body }),
      block("checklist", { items: ["Melatonin-free", "Every dose on the label"] }),
      para(30),
      block("badges", { badges: ["Melatonin-free", "Vegan"] }),
    ];
    expect(hasBlockingIssues(reviewLayout(good))).toBe(false);
  });

  it("lets alternating picture rows sit together, the editorial look", () => {
    const rows = [block("imagetext", { body: "a", imagePosition: "left" }), block("imagetext", { body: "b", imagePosition: "right" })];
    expect(codes(rows)).not.toContain("repeat-kind");
    expect(codes([rows[0]!, block("imagetext", { body: "c", imagePosition: "left" })])).toContain("repeat-kind");
  });

  it("scores errors above warnings", () => {
    const warnOnly = reviewLayout([block("checklist", { items: ["a", "b"] }), block("checklist", { items: ["c", "d"] })]);
    expect(hasBlockingIssues(warnOnly)).toBe(false);
    expect(layoutScore(warnOnly)).toBeLessThan(layoutScore(reviewLayout([para(20), para(20)])));
  });
});
