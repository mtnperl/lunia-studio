import { describe, it, expect } from "vitest";
import { parseCSV, serializeCSV } from "./csv";

describe("parseCSV", () => {
  it("parses basic rows", () => {
    const r = parseCSV("name,cost\nMichelle,80\nLinda,200\n");
    expect(r.headers).toEqual(["name", "cost"]);
    expect(r.rows).toEqual([
      { name: "Michelle", cost: "80" },
      { name: "Linda", cost: "200" },
    ]);
  });

  it("handles CRLF line endings", () => {
    const r = parseCSV("a,b\r\n1,2\r\n3,4\r\n");
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toEqual({ a: "1", b: "2" });
  });

  it("handles quoted fields with commas", () => {
    const r = parseCSV('name,notes\nMichelle,"hey, watch out"\n');
    expect(r.rows[0].notes).toBe("hey, watch out");
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    const r = parseCSV('name,quote\nLinda,"she said ""yes"""\n');
    expect(r.rows[0].quote).toBe('she said "yes"');
  });

  it("handles multiline quoted fields", () => {
    const r = parseCSV('name,bio\nMichelle,"line 1\nline 2"\n');
    expect(r.rows[0].bio).toBe("line 1\nline 2");
  });

  it("strips UTF-8 BOM", () => {
    const r = parseCSV("\uFEFFname,cost\nMichelle,80\n");
    expect(r.headers).toEqual(["name", "cost"]);
    expect(r.rows[0].name).toBe("Michelle");
  });

  it("skips fully empty rows", () => {
    const r = parseCSV("a,b\n1,2\n\n\n3,4\n");
    expect(r.rows).toHaveLength(2);
  });

  it("parses the UGC sheet headers exactly", () => {
    const sheet = [
      "Name,Content Angle,platform,cost,goods shipped?,script,Status,Ready to be posted?,# of versions",
      "Michelle Micke,perimenopause,BACKSTAGE,80,TRUE,Skeptic angle #1,Delivered,TRUE,2",
    ].join("\n");
    const r = parseCSV(sheet);
    expect(r.headers).toEqual([
      "Name",
      "Content Angle",
      "platform",
      "cost",
      "goods shipped?",
      "script",
      "Status",
      "Ready to be posted?",
      "# of versions",
    ]);
    expect(r.rows[0]["Name"]).toBe("Michelle Micke");
    expect(r.rows[0]["# of versions"]).toBe("2");
  });
});

describe("serializeCSV", () => {
  it("round-trips with parseCSV", () => {
    const headers = ["a", "b"];
    const rows = [
      { a: "1", b: "2" },
      { a: "hi, there", b: 'say "hi"' },
    ];
    const csv = serializeCSV(headers, rows);
    const back = parseCSV(csv);
    expect(back.headers).toEqual(headers);
    expect(back.rows).toEqual(rows);
  });

  it("quotes cells containing comma, quote, or newline", () => {
    const csv = serializeCSV(["x"], [{ x: "a,b" }, { x: 'he said "hi"' }, { x: "line1\nline2" }]);
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"he said ""hi"""');
    expect(csv).toContain('"line1\nline2"');
  });

  it("leaves plain cells unquoted", () => {
    const csv = serializeCSV(["a", "b"], [{ a: "1", b: "2" }]);
    expect(csv).toBe("a,b\r\n1,2");
  });
});
