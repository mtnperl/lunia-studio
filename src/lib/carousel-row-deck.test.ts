import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseXLSX } from "./xlsx";
import { parseRows, type CarouselRow } from "./carousel-rows";
import {
  ROW_FINISH_PROMPT,
  parseRowFinish,
  rowBuildBlocker,
  rowContentSlides,
  rowDeckSkeleton,
  rowHooks,
  rowToCarousel,
  selectedHookIndex,
} from "./carousel-row-deck";

let n = 0;
const fixture = () => {
  const buf = readFileSync(join(__dirname, "__fixtures__", "carousel-rows.csv"));
  return parseRows(parseXLSX(new Uint8Array(buf)), () => `row-${++n}`, "2026-09-22T00:00:00.000Z").rows;
};

const rows = fixture();
const yes = rows[0];
const no = rows[3];

const finish = {
  caption: "A caption.",
  takeaway: { headline: "DOSE AND TIMING", points: ["one", "two", "three"], interaction: { type: "save" as const, label: "Save this for tonight" } },
};

describe("rowHooks", () => {
  it("offers all three sheet hooks, in order, sharing slide 1's body", () => {
    const hooks = rowHooks(yes);
    expect(hooks.map((h) => h.headline)).toEqual([yes.hooks.a, yes.hooks.b, yes.hooks.c]);
    expect(hooks.every((h) => h.subline === yes.slides[0].body)).toBe(true);
    expect(hooks.map((h) => h.angle)).toEqual(["Sheet hook A", "Sheet hook B", "Sheet hook C"]);
  });

  it("indexes the row's choice into the same array", () => {
    expect(selectedHookIndex(yes)).toBe(0);
    expect(selectedHookIndex({ ...yes, selectedHook: "c" })).toBe(2);
  });

  it("skips a hook the sheet left blank rather than offering an empty cover", () => {
    const row: CarouselRow = { ...yes, hooks: { a: yes.hooks.a, b: "", c: yes.hooks.c } };
    expect(rowHooks(row).map((h) => h.headline)).toEqual([yes.hooks.a, yes.hooks.c]);
    expect(selectedHookIndex({ ...row, selectedHook: "c" })).toBe(1);
  });
});

describe("rowContentSlides", () => {
  const slides = rowContentSlides(yes);

  it("takes the four between the cover and the close, copied not rewritten", () => {
    expect(slides).toHaveLength(4);
    expect(slides.map((s) => s.headline)).toEqual(yes.slides.slice(1, 5).map((s) => s.headline));
    expect(slides.map((s) => s.body)).toEqual(yes.slides.slice(1, 5).map((s) => s.body));
  });

  it("cites only where the sheet cited, and never invents one", () => {
    expect(slides[1].citation).toBe("Gardiner et al., 2023");
    expect(slides[3].citation).toBe("");
  });
});

describe("rowDeckSkeleton", () => {
  it("is six slides: a cover, four content slides and a takeaway", () => {
    const deck = rowToCarousel(yes, finish);
    // hook + content + takeaway. The CTA is carried for old layouts and is
    // not drawn when a takeaway exists.
    expect(deck.slides).toHaveLength(4);
    expect(deck.takeaway?.points).toHaveLength(3);
    expect(deck.hooks).toHaveLength(3);
    expect(deck.caption).toBe("A caption.");
  });

  it("keeps a follow line on the cta for layouts that predate the takeaway", () => {
    const skel = rowDeckSkeleton(yes);
    expect(skel.cta.followLine).toContain("@lunia_life");
    expect(skel.cta.headline).toBe(yes.slides[5].headline);
  });
});

describe("ROW_FINISH_PROMPT", () => {
  const prompt = ROW_FINISH_PROMPT(yes, true);

  it("hands over the whole deck and forbids rewriting it", () => {
    for (const slide of yes.slides) expect(prompt).toContain(slide.headline);
    expect(prompt).toContain("You are NOT writing or rewriting the slides");
  });

  it("passes the sheet's close as guidance, not as copy", () => {
    expect(prompt).toContain("treat that as guidance on WHERE the deck lands");
  });

  it("keeps the internal columns internal", () => {
    expect(prompt).toContain("never quote it");
    expect(prompt).toContain("Do not name a study, a journal, an author or a year");
  });
});

describe("parseRowFinish", () => {
  it("reads a well formed reply", () => {
    expect(parseRowFinish(finish)).toEqual(finish);
  });

  it("defaults an unknown interaction type to save", () => {
    const out = parseRowFinish({ ...finish, takeaway: { ...finish.takeaway, interaction: { type: "dance", label: "Save it" } } });
    expect(out.takeaway.interaction.type).toBe("save");
  });

  it("throws rather than shipping half a close", () => {
    expect(() => parseRowFinish({ caption: "", takeaway: finish.takeaway })).toThrow(/caption/);
    expect(() => parseRowFinish({ caption: "x", takeaway: { headline: "", points: [], interaction: {} } })).toThrow(/takeaway/);
  });
});

describe("rowBuildBlocker", () => {
  it("lets a reviewed row through", () => {
    expect(rowBuildBlocker(yes)).toBeNull();
  });

  it("stops a NO row and says why it was rejected", () => {
    expect(rowBuildBlocker(no)).toContain("Too vague to verify");
  });

  it("stops a YES row that lost its slides", () => {
    expect(rowBuildBlocker({ ...yes, slides: yes.slides.slice(0, 3) })).toContain("Re-import");
  });
});
