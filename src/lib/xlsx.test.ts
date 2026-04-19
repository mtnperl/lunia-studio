import { describe, it, expect } from "vitest";
import { parseXLSX, serializeXLSX } from "./xlsx";

describe("serializeXLSX + parseXLSX round trip", () => {
  it("round-trips basic rows", () => {
    const headers = ["name", "cost"];
    const rows = [
      { name: "Michelle", cost: "80" },
      { name: "Linda", cost: "200" },
    ];
    const buf = serializeXLSX(headers, rows);
    const parsed = parseXLSX(buf);
    expect(parsed.headers).toEqual(headers);
    expect(parsed.rows).toEqual(rows);
  });

  it("preserves cells with commas and quotes", () => {
    const headers = ["name", "notes"];
    const rows = [
      { name: "Michelle", notes: "hey, watch out" },
      { name: "Linda", notes: 'she said "yes"' },
    ];
    const buf = serializeXLSX(headers, rows);
    const parsed = parseXLSX(buf);
    expect(parsed.rows).toEqual(rows);
  });

  it("preserves multiline cells", () => {
    const headers = ["name", "bio"];
    const rows = [{ name: "Michelle", bio: "line 1\nline 2" }];
    const buf = serializeXLSX(headers, rows);
    const parsed = parseXLSX(buf);
    expect(parsed.rows[0].bio).toBe("line 1\nline 2");
  });

  it("coerces numeric cells to string", () => {
    const headers = ["name", "cost"];
    const rows = [{ name: "M", cost: "80" }];
    const buf = serializeXLSX(headers, rows);
    const parsed = parseXLSX(buf);
    expect(typeof parsed.rows[0].cost).toBe("string");
    expect(parsed.rows[0].cost).toBe("80");
  });

  it("handles the UGC sheet headers exactly", () => {
    const headers = [
      "Name",
      "Content Angle",
      "platform",
      "cost",
      "goods shipped?",
      "script",
      "Status",
      "Ready to be posted?",
      "# of versions",
    ];
    const rows = [
      {
        Name: "Michelle Micke",
        "Content Angle": "perimenopause",
        platform: "BACKSTAGE",
        cost: "80",
        "goods shipped?": "TRUE",
        script: "Skeptic angle #1",
        Status: "Delivered",
        "Ready to be posted?": "TRUE",
        "# of versions": "2",
      },
    ];
    const buf = serializeXLSX(headers, rows);
    const parsed = parseXLSX(buf);
    expect(parsed.headers).toEqual(headers);
    expect(parsed.rows[0]["Name"]).toBe("Michelle Micke");
    expect(parsed.rows[0]["# of versions"]).toBe("2");
  });

  it("skips fully empty rows", () => {
    const headers = ["a", "b"];
    const rows = [
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ];
    const buf = serializeXLSX(headers, rows);
    const parsed = parseXLSX(buf);
    expect(parsed.rows).toHaveLength(2);
  });
});
