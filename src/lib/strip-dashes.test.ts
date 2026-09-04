import { describe, it, expect } from "vitest";
import { stripDashes, hasForbiddenDash } from "./strip-dashes";
import { PRODUCT } from "./lunia-brand-guidelines";

describe("stripDashes", () => {
  it("turns an em dash into a comma", () => {
    expect(stripDashes("Sleep better — starting tonight")).toBe("Sleep better, starting tonight");
  });
  it("turns an en dash into a hyphen", () => {
    expect(stripDashes("30–60 minutes")).toBe("30-60 minutes");
  });
  it("collapses the double space an em-dash replacement can leave", () => {
    // This is the behaviour the Klaviyo importer's copy was missing.
    expect(stripDashes("a —  b")).toBe("a, b");
  });
  it("trims", () => {
    expect(stripDashes("  padded  ")).toBe("padded");
  });
  it("leaves clean copy untouched", () => {
    expect(stripDashes("No melatonin. No proprietary blends.")).toBe("No melatonin. No proprietary blends.");
  });
  it("leaves ordinary hyphens alone", () => {
    expect(stripDashes("third-party tested")).toBe("third-party tested");
  });
  it("handles an empty string", () => {
    expect(stripDashes("")).toBe("");
  });
  it("removes every forbidden dash it is given", () => {
    expect(hasForbiddenDash(stripDashes("a — b – c"))).toBe(false);
  });
});

describe("brand data", () => {
  // PRODUCT.dose ships an en dash. Anything that surfaces brand constants in
  // user-facing copy has to strip them, so pin the fact here: if the handbook
  // is ever cleaned up this test tells you the guard is no longer load-bearing.
  it("PRODUCT.dose reads clean after stripping, whatever the handbook ships", () => {
    // v2.1 of the handbook ships "30 to 60 minutes" with no dash. The guard
    // stays because an older or future version may not.
    expect(hasForbiddenDash(stripDashes(PRODUCT.dose))).toBe(false);
  });
});
