import { describe, it, expect } from "vitest";
import { parseBrief, parseEditorRead, applyEditorRead, briefPromptBlock, describeEditorRead } from "./carousel-brief";
import type { CarouselContent } from "./types";

const brief = {
  claim: "Cutting sleep from 8.5 to 5.5 hours cut fat loss by more than half on the same diet.",
  argument: "Ten overweight adults dieted twice for two weeks. Once they slept 8.5 hours a night, once 5.5. They ate the same food both times. They lost about the same weight, but on 5.5 hours only a quarter of it was fat; on 8.5 hours, more than half was.",
  comparisons: [{ measure: "fat lost in 14 days", a: "8.5 hours in bed", b: "5.5 hours in bed", result: "55% less fat lost on 5.5 hours" }],
  who: "dieters who sleep short",
  overturns: "",
  tonight: "Move bedtime earlier before cutting calories further.",
};

const deck = {
  hooks: [{ headline: "SLEEP 5.5 HOURS, LOSE 55% LESS FAT", subline: "same diet, same calories, different body", sourceNote: "", emphasis: "NOBODY" }],
  slides: [
    { headline: "THE SCALE MOVES, NOTHING CHANGES", body: "By day 14 the scale drops. Researchers asked what that lost weight was made of.", citation: "", emphasis: "what that lost weight" },
    { headline: "TEN DIETERS, TWO SLEEP SCHEDULES", body: "Food was matched.", citation: "Nedeltcheva 2010" },
  ],
  takeaway: { headline: "THE SCALE HIDES WHAT YOU LOSE", points: ["You cut sleep to fit the diet in", "On 5.5 hours, fat loss fell by more than half", "Move bedtime earlier"], interaction: { type: "save", label: "Save this" } },
  cta: { headline: "", followLine: "" },
  caption: "",
} as unknown as CarouselContent;

describe("brief", () => {
  it("parses a brief and rejects one without a claim", () => {
    expect(parseBrief(JSON.stringify(brief))?.comparisons).toHaveLength(1);
    expect(parseBrief("```json\n" + JSON.stringify(brief) + "\n```")?.claim).toBe(brief.claim);
    expect(parseBrief(JSON.stringify({ argument: "x" }))).toBeNull();
    expect(parseBrief("not json")).toBeNull();
  });
  it("tells the cut there is no villain when the brief has none", () => {
    expect(briefPromptBlock(brief)).toContain("There is no villain in this deck");
    expect(briefPromptBlock({ ...brief, overturns: "more sleep means more weight" })).toContain("Belief this overturns");
    expect(briefPromptBlock(null)).toBe("");
  });
});

describe("editor read", () => {
  it("applies fixes to hooks, slides and the takeaway and drops a stale emphasis", () => {
    const read = parseEditorRead(JSON.stringify({
      verdict: "revised",
      notes: [
        { where: "hook 1", problem: "the number has no baseline", fix: { headline: "SLEEP 3 HOURS LESS, LOSE 55% LESS FAT", subline: "8.5 versus 5.5 hours, same food both times" } },
        { where: "slide 2", problem: "not English", fix: { body: "By day 14 the scale drops on both schedules. The question was whether the weight lost was fat or muscle." } },
        { where: "takeaway", problem: "point 1 invents a motive", fix: { headline: "LESS SLEEP, LESS FAT LOST", points: ["Same food, 5.5 hours: 55% less fat lost than on 8.5", "Short sleep pushes the body to burn muscle instead", "Move bedtime earlier before cutting calories further"] } },
        { where: "slide 9", problem: "does not exist", fix: { body: "ignored" } },
      ],
    }));
    expect(read?.verdict).toBe("revised");
    const out = applyEditorRead(deck, read!);
    expect(out.hooks[0].headline).toBe("SLEEP 3 HOURS LESS, LOSE 55% LESS FAT");
    expect(out.hooks[0].emphasis).toBeUndefined();
    expect(out.slides[0].body).toContain("fat or muscle");
    expect(out.slides[0].emphasis).toBeUndefined();
    expect(out.slides[1].body).toBe("Food was matched.");
    expect(out.takeaway?.headline).toBe("LESS SLEEP, LESS FAT LOST");
    expect(out.takeaway?.points).toHaveLength(3);
    expect(out.editorRead?.verdict).toBe("revised");
    expect(out.editorRead?.notes.filter((n) => n.applied)).toHaveLength(3);
    expect(describeEditorRead(out.editorRead)).toContain("3 fixes applied");
    expect(deck.hooks[0].headline).toBe("SLEEP 5.5 HOURS, LOSE 55% LESS FAT");
  });
  it("records a clean read without touching the deck", () => {
    const read = parseEditorRead(JSON.stringify({ verdict: "clean", notes: [] }));
    const out = applyEditorRead(deck, read!);
    expect(out.editorRead?.verdict).toBe("clean");
    expect(out.slides[0].body).toBe(deck.slides[0].body);
    expect(describeEditorRead(out.editorRead)).toBe("Read cold: nothing failed");
  });
  it("treats a clean verdict with fixes as revised", () => {
    const read = parseEditorRead(JSON.stringify({ verdict: "clean", notes: [{ where: "slide 3", problem: "x", fix: { headline: "SAME FOOD, DIFFERENT SLEEP" } }] }));
    expect(read?.verdict).toBe("revised");
  });
});
