import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseXLSX } from "./xlsx";
import {
  citationUrl,
  contentSlides,
  coverHeadline,
  isBuildable,
  mergeRows,
  missingColumns,
  parseRows,
  parseSlideCell,
  REQUIRED_COLUMNS,
  SLIDES_PER_ROW,
  summaryGuidance,
  type CarouselRow,
} from "./carousel-rows";

/** The importer reads the sheet through the same parser the route uses, so a
 *  quoting bug shows up here and not in production. */
function readFixture() {
  const buf = readFileSync(join(__dirname, "__fixtures__", "carousel-rows.csv"));
  return parseXLSX(new Uint8Array(buf));
}

let n = 0;
const mintId = () => `row-${++n}`;

describe("parseSlideCell", () => {
  it("reads the four labels and drops the label text itself", () => {
    const slide = parseSlideCell(
      "Headline: More caffeine needs more runway\nBody: For a 107 mg coffee, the modeled window was 8.8 hours.\nOn-slide source: Gardiner et al., 2023",
    );
    expect(slide).toEqual({
      headline: "More caffeine needs more runway",
      body: "For a 107 mg coffee, the modeled window was 8.8 hours.",
      onSlideSource: "Gardiner et al., 2023",
    });
  });

  it("keeps the brand mark separate from body copy", () => {
    const slide = parseSlideCell("Headline: Close it\nBody: One line.\nBrand mark: small Lunia Life wordmark only");
    expect(slide?.body).toBe("One line.");
    expect(slide?.brandMark).toBe("small Lunia Life wordmark only");
  });

  it("does not mistake a colon inside body copy for a label", () => {
    const slide = parseSlideCell("Headline: The rule\nBody: One question: how much and how late.");
    expect(slide?.body).toBe("One question: how much and how late.");
  });

  it("joins a wrapped continuation line onto the label above it", () => {
    const slide = parseSlideCell("Headline: A long one\nBody: The first half\nand the second half.");
    expect(slide?.body).toBe("The first half and the second half.");
  });

  it("returns null for a blank cell, which is what a NO row looks like", () => {
    expect(parseSlideCell("")).toBeNull();
    expect(parseSlideCell("   \n  ")).toBeNull();
  });

  it("discards text that arrives before any label rather than guessing a slot", () => {
    expect(parseSlideCell("some stray note")).toBeNull();
  });
});

describe("missingColumns", () => {
  it("passes the real export", () => {
    expect(missingColumns(readFixture().headers)).toEqual([]);
  });

  it("names every column a short file is missing", () => {
    expect(missingColumns(["Subject", "Build"])).toEqual(
      REQUIRED_COLUMNS.filter((c) => c !== "Subject" && c !== "Build"),
    );
  });
});

describe("citationUrl", () => {
  it("lifts the url out and trims trailing punctuation", () => {
    expect(citationUrl("Gardiner C et al. (2023). Title. https://pubmed.ncbi.nlm.nih.gov/36870101/")).toBe(
      "https://pubmed.ncbi.nlm.nih.gov/36870101/",
    );
    expect(citationUrl("See https://example.com/paper.")).toBe("https://example.com/paper");
  });

  it("is undefined when the citation carries no url", () => {
    expect(citationUrl("Gardiner et al., 2023")).toBeUndefined();
    expect(citationUrl("")).toBeUndefined();
  });
});

describe("parseRows", () => {
  const result = parseRows(readFixture(), mintId, "2026-09-22T00:00:00.000Z");

  it("keeps the YES rows and the NO row, and rejects the half-built one", () => {
    expect(result.rows.map((r) => r.build)).toEqual(["YES", "YES", "YES", "NO"]);
    expect(result.errors).toEqual([
      { sourceRow: 5, subject: "A YES row missing its last two slides", problem: "marked YES but has 4 of 6 slides" },
    ]);
  });

  it("reads the first row whole", () => {
    const row = result.rows[0];
    expect(row.carouselType).toBe("Latest Research");
    expect(row.evidence).toBe(5);
    expect(row.story).toBe(5);
    expect(row.slides).toHaveLength(SLIDES_PER_ROW);
    expect(row.hooks.a).toBe("Your coffee has a bedtime");
    expect(row.selectedHook).toBe("a");
    expect(row.status).toBe("draft");
    expect(row.citationUrl).toBe("https://pubmed.ncbi.nlm.nih.gov/36870101/");
    expect(row.visualSystem).toContain("bedtime timeline");
  });

  it("takes the cover headline from the hook, not from slide 1", () => {
    const row = { ...result.rows[0], selectedHook: "b" as const };
    expect(coverHeadline(row)).toBe(row.hooks.b);
    expect(coverHeadline(result.rows[0])).toBe("Your coffee has a bedtime");
  });

  it("carries an on-slide source only where the sheet has one", () => {
    const slides = result.rows[0].slides;
    expect(slides[2].onSlideSource).toBe("Gardiner et al., 2023");
    expect(slides[4].onSlideSource).toBeUndefined();
  });

  it("stores a NO row with its reason and no slides", () => {
    const no = result.rows[3];
    expect(no.slides).toEqual([]);
    expect(no.why).toBe("Too vague to verify and shoot safely.");
    expect(isBuildable(no)).toBe(false);
  });

  it("splits the six into a cover, four content slides and a summary", () => {
    const row = result.rows[0];
    expect(isBuildable(row)).toBe(true);
    expect(contentSlides(row)).toHaveLength(4);
    expect(contentSlides(row)[0]).toBe(row.slides[1]);
    expect(summaryGuidance(row)).toBe(row.slides[5]);
    expect(summaryGuidance(row)?.brandMark).toBe("small Lunia Life wordmark only");
  });
});

describe("mergeRows", () => {
  const base = parseRows(readFixture(), mintId, "2026-09-22T00:00:00.000Z").rows;

  it("updates a row in place and keeps what the editor chose", () => {
    const existing: CarouselRow[] = [
      { ...base[0], id: "keep-me", selectedHook: "c", status: "published", usedAt: "2026-09-01", lastCarouselId: "deck-1" },
    ];
    const incoming = [{ ...base[0], id: "fresh", slides: base[0].slides.map((s) => ({ ...s, body: "rewritten" })) }];
    const { merged, added, updated } = mergeRows(existing, incoming);
    expect(added).toBe(0);
    expect(updated).toBe(1);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("keep-me");
    expect(merged[0].selectedHook).toBe("c");
    expect(merged[0].status).toBe("published");
    expect(merged[0].lastCarouselId).toBe("deck-1");
    expect(merged[0].slides[0].body).toBe("rewritten");
  });

  it("appends rows the library has never seen", () => {
    const { merged, added, updated } = mergeRows([base[0]], [base[1], base[2]]);
    expect(added).toBe(2);
    expect(updated).toBe(0);
    expect(merged).toHaveLength(3);
  });
});
