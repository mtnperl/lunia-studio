import { describe, expect, it } from "vitest";
import { clampLineSpacing, clearFormatting, hasBodyFormatting, insertParagraphBreak, parseBody, toggleList } from "./body-format";

describe("parseBody", () => {
  it("reads bullets, numbers, text and collapses blank runs", () => {
    expect(parseBody("Lead line.\n\n\n• one\n- two\n2) three\n\n")).toEqual([
      { kind: "text", text: "Lead line." },
      { kind: "gap" },
      { kind: "bullet", text: "one" },
      { kind: "bullet", text: "two" },
      { kind: "number", text: "three", marker: "2." },
    ]);
  });

  it("does not treat a hyphenated word or a decimal as a marker", () => {
    expect(parseBody("-5 degrees\n7.5 hours")).toEqual([
      { kind: "text", text: "-5 degrees" },
      { kind: "text", text: "7.5 hours" },
    ]);
  });
});

describe("hasBodyFormatting", () => {
  it("is false for one plain paragraph", () => {
    expect(hasBodyFormatting("Magnesium helps. It really does.")).toBe(false);
    expect(hasBodyFormatting("  trailing newline\n")).toBe(false);
  });
  it("is true for typed line breaks and lists", () => {
    expect(hasBodyFormatting("a\nb")).toBe(true);
    expect(hasBodyFormatting("• a")).toBe(true);
  });
});

describe("toggleList", () => {
  it("bullets every non-empty line the selection touches", () => {
    const text = "Intro\nalpha\n\nbeta";
    const r = toggleList(text, 7, text.length, "bullet");
    expect(r.text).toBe("Intro\n• alpha\n\n• beta");
  });

  it("numbers lines and replaces existing bullets", () => {
    const r = toggleList("• a\n• b", 0, 7, "number");
    expect(r.text).toBe("1. a\n2. b");
  });

  it("removes the marker when every line already has it", () => {
    const r = toggleList("1. a\n2. b", 0, 9, "number");
    expect(r.text).toBe("a\nb");
  });

  it("works on the caret line with no selection", () => {
    const r = toggleList("one\ntwo\nthree", 5, 5, "bullet");
    expect(r.text).toBe("one\n• two\nthree");
  });
});

describe("insertParagraphBreak", () => {
  it("adds a blank line after the caret's line", () => {
    const r = insertParagraphBreak("one\ntwo", 1);
    expect(r.text).toBe("one\n\ntwo");
    expect(r.selStart).toBe(5);
  });
  it("appends at the end", () => {
    expect(insertParagraphBreak("one", 3).text).toBe("one\n\n");
  });
});

describe("clearFormatting", () => {
  it("flattens the whole body into one paragraph with no selection", () => {
    expect(clearFormatting("Lead.\n\n• a\n2. b", 0, 0).text).toBe("Lead. a b");
  });
});

describe("clampLineSpacing", () => {
  it("defaults and clamps", () => {
    expect(clampLineSpacing(undefined)).toBe(1);
    expect(clampLineSpacing(5)).toBe(2);
    expect(clampLineSpacing(0.1)).toBe(0.8);
  });
});

describe("splitEssayBody numbered items", () => {
  it("treats 1. / 2) lines as list items like dashes", async () => {
    const { splitEssayBody } = await import("./essay-body");
    expect(splitEssayBody("Lead.\n1. one\n2) two")).toEqual({ lead: "Lead.", items: ["one", "two"] });
  });
});
