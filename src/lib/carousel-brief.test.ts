import { describe, it, expect } from "vitest";
import { parseBrief, parseEditorRead, applyEditorRead, briefPromptBlock, craftBlock, describeEditorRead, recentDecksBlock, repairTakeaway, EDITOR_READ_PROMPT } from "./carousel-brief";
import { splitEssayBody, keepOneEssayGraphic, isEssayGraphic } from "./essay-body";
import type { CarouselContent, SavedCarousel } from "./types";

const brief = {
  question: "Does sleeping less hurt my diet?",
  who: "dieters who sleep short",
  kind: "finding" as const,
  owes: ["what happened when someone tested it", "what it means for the reader"],
  claim: "Cutting sleep from 8.5 to 5.5 hours cut fat loss by more than half on the same diet.",
  argument: "Ten overweight adults dieted twice for two weeks. Once they slept 8.5 hours a night, once 5.5. They ate the same food both times.\n\nThey lost about the same weight, but on 5.5 hours only a quarter of it was fat; on 8.5 hours, more than half was.",
  loop: { promise: "the scale moved the same both times", carried: "so what was the weight made of?", lands: "the second paragraph says it was muscle" },
  backing: [{ statement: "55% less fat lost on 5.5 hours than on 8.5", source: "Nedeltcheva 2010", backs: "only a quarter of it was fat" }],
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
  it("parses a piece with its assignment and rejects one without a claim", () => {
    const parsed = parseBrief(JSON.stringify(brief));
    expect(parsed?.backing).toHaveLength(1);
    expect(parsed?.owes).toHaveLength(2);
    expect(parsed?.kind).toBe("finding");
    expect(parsed?.loop.carried).toBe(brief.loop.carried);
    expect(parseBrief("```json\n" + JSON.stringify(brief) + "\n```")?.claim).toBe(brief.claim);
    expect(parseBrief(JSON.stringify({ ...brief, kind: "sonnet" }))?.kind).toBe("explainer");
    expect(parseBrief(JSON.stringify({ argument: "x" }))).toBeNull();
    expect(parseBrief("not json")).toBeNull();
  });
  it("carries the assignment and the backing into the cut, and tolerates an old brief", () => {
    const block = briefPromptBlock(brief);
    expect(block).toContain("The question: Does sleeping less hurt my diet?");
    expect(block).toContain("what happened when someone tested it");
    expect(block).toContain("[Nedeltcheva 2010]");
    expect(block).toContain("There is no villain in this deck");
    expect(briefPromptBlock({ ...brief, overturns: "more sleep means more weight" })).toContain("Belief this overturns");
    expect(briefPromptBlock(null)).toBe("");
    const old = { claim: "c", argument: "a", who: "w", overturns: "", tonight: "", comparisons: [{ measure: "fat lost", a: "8.5 h", b: "5.5 h", result: "55% less" }] } as unknown as Parameters<typeof briefPromptBlock>[0];
    expect(briefPromptBlock(old)).toContain("fat lost: 8.5 h vs 5.5 h. 55% less");
    expect(craftBlock(old!)).toContain("The question: (as the topic asks)");
    expect(craftBlock(brief)).toContain("Literal verbs, no metaphors");
    expect(craftBlock(brief)).toContain("One study per slide at most");
  });
  it("puts the title test first in the editor read", () => {
    const prompt = EDITOR_READ_PROMPT(brief, deck, { essay: true });
    expect(prompt.indexOf("THE TITLE TEST")).toBeLessThan(prompt.indexOf("THE SWIPE"));
    expect(prompt).toContain('wanted to know: "Does sleeping less hurt my diet?"');
    expect(prompt).toContain("a slide with no citation is not a fault");
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
  it("turns the listing's slash separators back into line breaks", () => {
    const read = parseEditorRead(JSON.stringify({ verdict: "revised", notes: [{ where: "slide 2", problem: "p", fix: { body: "First thought. /  / Second thought. / Third line." } }] }));
    expect(read?.notes[0].fix?.body).toBe("First thought.\n\nSecond thought.\nThird line.");
    const kept = parseEditorRead(JSON.stringify({ verdict: "revised", notes: [{ where: "slide 2", problem: "p", fix: { body: "Already\n\nfine / not a separator" } }] }));
    expect(kept?.notes[0].fix?.body).toBe("Already\n\nfine / not a separator");
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
  it("remembers what recent decks led with", () => {
    const recent = [
      { id: "a", topic: "Slow-wave sleep: the stage that repairs your body", selectedHook: 0, content: { ...deck, hooks: [{ headline: "DEEP SLEEP FALLS FROM 18.9% TO 3.4%", subline: "men 16-25 vs 36-50" }], spine: { moment: "It is 6:40am and you slept seven hours", villain: "", turn: "t", payoff: "p" } } },
      { id: "b", topic: "Same request", selectedHook: 0, content: { ...deck, hooks: [{ headline: "IGNORED", subline: "" }] } },
    ] as unknown as SavedCarousel[];
    const block = recentDecksBlock(recent, { excludeId: "b" });
    expect(block).toContain("ALREADY PUBLISHED");
    expect(block).toContain("DEEP SLEEP FALLS FROM 18.9% TO 3.4%");
    expect(block).toContain("6:40am");
    expect(block).toContain("18.9%");
    expect(block).not.toContain("IGNORED");
    expect(recentDecksBlock([])).toBe("");
  });
});

describe("takeaway repair", () => {
  it("keeps a good takeaway as it is", () => {
    const { takeaway, repaired } = repairTakeaway({ headline: "H", points: ["a", "b"], interaction: { type: "send", label: "Send it" } }, {});
    expect(repaired).toEqual([]);
    expect(takeaway?.interaction.type).toBe("send");
  });
  it("fills a missing interaction and headline instead of dropping the slide", () => {
    const { takeaway, repaired } = repairTakeaway({ points: ["a"] }, { hookHeadline: "the hook" });
    expect(takeaway?.headline).toBe("THE HOOK");
    expect(takeaway?.interaction).toEqual({ type: "save", label: "Save this for the next bad night" });
    expect(repaired).toContain("interaction type");
  });
  it("builds points from the piece when the model sent none, and drops only when there is nothing", () => {
    expect(repairTakeaway({}, { brief: { ...brief, kind: "finding", loop: brief.loop, backing: [] } }).takeaway?.points).toEqual([brief.claim, brief.tonight]);
    expect(repairTakeaway(null, {}).takeaway).toBeNull();
  });
});

describe("essay body shapes", () => {
  it("reads a lead sentence over list lines, and leaves prose alone", () => {
    expect(splitEssayBody("The night has three parts.\n- Light sleep, the doorway\n- Deep sleep, early\n- REM, toward morning")).toEqual({ lead: "The night has three parts.", items: ["Light sleep, the doorway", "Deep sleep, early", "REM, toward morning"] });
    expect(splitEssayBody("One dash - inside a sentence.\n- only one item")).toEqual({ lead: "One dash - inside a sentence.\n- only one item", items: [] });
    expect(splitEssayBody("- a\n- b").lead).toBe("");
  });
});

describe("essay figure", () => {
  const bars = JSON.stringify({ component: "bars", data: { items: [{ label: "8.5 H", value: "1.4 kg" }, { label: "5.5 H", value: "0.6 kg" }] } });
  const wordBars = JSON.stringify({ component: "bars", data: { items: [{ label: "SLOW", value: "MORE RECALLED" }, { label: "REM", value: "NO CHANGE" }] } });
  const split = JSON.stringify({ component: "split", data: { parts: [{ label: "NON-REM", percent: 78 }, { label: "REM", percent: 22 }] } });
  it("accepts numbers and refuses words, waves and grids", () => {
    expect(isEssayGraphic(bars)).toBe(true);
    expect(isEssayGraphic(split)).toBe(true);
    expect(isEssayGraphic(wordBars)).toBe(false);
    expect(isEssayGraphic(JSON.stringify({ component: "wave", data: { labels: ["A", "B"] } }))).toBe(false);
    expect(isEssayGraphic(JSON.stringify({ component: "iconGrid", data: { items: [{ label: "A" }] } }))).toBe(false);
    expect(isEssayGraphic("")).toBe(false);
  });
  it("keeps the first real figure and clears the rest", () => {
    const { slides, cleared } = keepOneEssayGraphic([{ graphic: JSON.stringify({ component: "wave", data: { labels: ["A"] } }) }, { graphic: split }, { graphic: bars }]);
    expect(slides.map((s) => !!s.graphic)).toEqual([false, true, false]);
    expect(cleared).toBe(2);
  });
});
