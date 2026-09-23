import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseXLSX } from "./xlsx";
import { contentSlides, parseRows, type CarouselRow } from "./carousel-rows";
import {
  MAX_BODY_WORDS,
  MIN_BODY_WORDS,
  needsExpansion,
  ROW_FINISH_PROMPT,
  usableBody,
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

  it("hands over the whole deck and keeps the headlines out of reach", () => {
    for (const slide of yes.slides) expect(prompt).toContain(slide.headline);
    expect(prompt).toContain("The headlines are final and are not yours to touch");
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

describe("the cover's picture", () => {
  it("briefs the image engine from the sheet's visual system", () => {
    // Without a spec the Editorial Scientific preset renders a bare
    // photograph AND HookSlide suppresses the HTML headline, so the cover
    // ships wordless. That is what happened on 2026-09-22.
    expect(rowDeckSkeleton(yes).hookImageSpec?.concept).toBe(yes.visualSystem);
  });

  it("sends no spec when the sheet left the column blank", () => {
    expect(rowDeckSkeleton({ ...yes, visualSystem: "   " }).hookImageSpec).toBeUndefined();
  });
});

describe("needsExpansion", () => {
  it("calls every body in the real export too thin", () => {
    // The first 144-row sheet tops out at 12 words per content body.
    for (const s of contentSlides(yes)) expect(needsExpansion(s.body)).toBe(true);
  });

  it("leaves a body that already stands on its own", () => {
    const full = Array.from({ length: MIN_BODY_WORDS }, () => "word").join(" ");
    expect(needsExpansion(full)).toBe(false);
    expect(needsExpansion(Array.from({ length: MIN_BODY_WORDS - 1 }, () => "word").join(" "))).toBe(true);
  });
});

describe("usableBody", () => {
  const sheet = "Twenty-two of 25 differed by more than ten percent.";

  it("takes the expansion when it is longer and within the cap", () => {
    const longer = `${sheet} The gap ran in both directions, so a label was not a reliable guide to the dose.`;
    expect(usableBody(longer, sheet)).toBe(longer);
  });

  it("keeps the sheet's line when the expansion is missing or empty", () => {
    expect(usableBody(undefined, sheet)).toBe(sheet);
    expect(usableBody("   ", sheet)).toBe(sheet);
  });

  it("keeps the sheet's line rather than shipping something over the cap", () => {
    const bloated = Array.from({ length: MAX_BODY_WORDS + 5 }, () => "word").join(" ");
    expect(usableBody(bloated, sheet)).toBe(sheet);
  });

  it("keeps the sheet's line when the expansion is no longer than it", () => {
    expect(usableBody("Most missed.", sheet)).toBe(sheet);
  });

  it("refuses to touch a body that was already long enough", () => {
    const full = `Twenty-two of the 25 gummies differed from their label by more than ten percent, and the gap ran both ways.`;
    expect(needsExpansion(full)).toBe(false);
    expect(usableBody(`${full} An extra sentence the model wanted to add.`, full)).toBe(full);
  });
});

describe("expanded bodies on the deck", () => {
  it("lands them in slide order and falls back per slide", () => {
    const long = (n: number) => `${yes.slides[n].body} It held across the sample, and the direction of the gap varied.`;
    const deck = rowToCarousel(yes, { ...finish, bodies: [long(1), undefined, "", long(4)] });
    expect(deck.slides[0].body).toBe(long(1));
    expect(deck.slides[1].body).toBe(yes.slides[2].body);
    expect(deck.slides[2].body).toBe(yes.slides[3].body);
    expect(deck.slides[3].body).toBe(long(4));
  });

  it("never touches a headline or a citation", () => {
    const deck = rowToCarousel(yes, { ...finish, bodies: ["rewritten and much longer than the original line was", "x", "y", "z"] });
    expect(deck.slides.map((s) => s.headline)).toEqual(yes.slides.slice(1, 5).map((s) => s.headline));
    expect(deck.slides[1].citation).toBe("Gardiner et al., 2023");
  });

  it("is absent from the finish when the model sent none", () => {
    expect(parseRowFinish(finish).bodies).toBeUndefined();
    expect(parseRowFinish({ ...finish, bodies: ["a", 3, "", "b"] }).bodies).toEqual(["a", undefined, undefined, "b"]);
  });
});

describe("the expansion brief", () => {
  const prompt = ROW_FINISH_PROMPT(yes, true);

  it("asks for an expansion, not a rewrite, and forbids new facts", () => {
    expect(prompt).toContain("This is an EXPANSION, not a rewrite");
    expect(prompt).toContain("may NOT introduce a number");
    expect(prompt).toContain(`at most ${MAX_BODY_WORDS} words`);
  });

  it("names one body slot per content slide", () => {
    expect(prompt).toContain('"expanded body for slide 2"');
    expect(prompt).toContain('"expanded body for slide 5"');
    expect(prompt).not.toContain('"expanded body for slide 6"');
  });

  it("names only the thin slides when some are already long enough", () => {
    const full = Array.from({ length: MIN_BODY_WORDS + 2 }, () => "word").join(" ");
    const mixed: CarouselRow = { ...yes, slides: yes.slides.map((s, i) => (i === 2 ? { ...s, body: full } : s)) };
    const p = ROW_FINISH_PROMPT(mixed, true);
    expect(p).toContain("Only these need expanding: slide 2, slide 4, slide 5");
    expect(p).toContain('rewriting one is an error');
  });

  it("asks for nothing when every body already stands on its own", () => {
    const full = Array.from({ length: MIN_BODY_WORDS + 2 }, () => "word").join(" ");
    const fat: CarouselRow = { ...yes, slides: yes.slides.map((s) => ({ ...s, body: full })) };
    const p = ROW_FINISH_PROMPT(fat, true);
    expect(p).toContain("already long enough to stand on its own");
    expect(p).toContain("are not yours to touch either");
    expect(p).not.toContain("This is an EXPANSION");
  });

  it("still says the headlines are not the model's", () => {
    expect(prompt).toContain("The headlines are final and are not yours to touch");
  });
});
