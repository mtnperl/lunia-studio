import { describe, expect, it } from "vitest";
import { validateOrFallbackGraphic } from "@/lib/carousel-utils";

describe("validateOrFallbackGraphic", () => {
  it("passes through a valid donut shape unchanged", () => {
    const raw = JSON.stringify({ component: "donut", data: { value: "85%", label: "EFFECTIVENESS" } });
    expect(validateOrFallbackGraphic(raw, "fallback text")).toBe(raw);
  });

  it("falls back to callout for the old (broken) donut shape", () => {
    const raw = JSON.stringify({ component: "donut", data: { segments: [{ label: "A", value: 1 }], centerLabel: "x" } });
    const result = validateOrFallbackGraphic(raw, "This is the slide body text.");
    const parsed = JSON.parse(result!);
    expect(parsed.component).toBe("callout");
    expect(parsed.data.text).toContain("This is the slide body text.");
  });

  it("falls back for the old (broken) versus shape", () => {
    const raw = JSON.stringify({ component: "versus", data: { left: { label: "A", items: ["x"] }, right: { label: "B", items: ["y"] } } });
    const result = validateOrFallbackGraphic(raw, "fallback");
    expect(JSON.parse(result!).component).toBe("callout");
  });

  it("falls back for the old (broken) dotchain shape", () => {
    const raw = JSON.stringify({ component: "dotchain", data: { steps: ["Step 1", "Step 2", "Step 3"] } });
    const result = validateOrFallbackGraphic(raw, "fallback");
    expect(JSON.parse(result!).component).toBe("callout");
  });

  it("falls back for a RETIRED component even when the shape is valid", () => {
    // dotchain parses cleanly against the schema but was retired in the roster
    // cut, so it must degrade to a callout rather than ship as-is.
    const raw = JSON.stringify({ component: "dotchain", data: { labels: ["Before", "After"] } });
    const result = validateOrFallbackGraphic(raw, "fallback");
    expect(JSON.parse(result!).component).toBe("callout");
  });

  it("accepts wave with labels and preserves them", () => {
    const raw = JSON.stringify({ component: "wave", data: { labels: ["LIGHT", "DEEP", "REM"] } });
    expect(validateOrFallbackGraphic(raw, "fallback")).toBe(raw);
  });

  it("accepts wave with no data (legacy saved graphics)", () => {
    const raw = JSON.stringify({ component: "wave", data: {} });
    expect(validateOrFallbackGraphic(raw, "fallback")).toBe(raw);
  });

  it("falls back for the old (broken) iconGrid shape (icon/columns fields, 9 items)", () => {
    const raw = JSON.stringify({ component: "iconGrid", data: { items: Array.from({ length: 9 }, (_, i) => ({ icon: "🧠", label: `L${i}` })), columns: 3 } });
    const result = validateOrFallbackGraphic(raw, "fallback");
    expect(JSON.parse(result!).component).toBe("callout");
  });

  it("accepts the new iconGrid shape (label-only, max 4)", () => {
    const raw = JSON.stringify({ component: "iconGrid", data: { items: [{ label: "Sleep" }, { label: "Rest" }] } });
    expect(validateOrFallbackGraphic(raw, "fallback")).toBe(raw);
  });

  it("drops (returns undefined) with no fallbackText, e.g. CTA icon row", () => {
    const raw = JSON.stringify({ component: "donut", data: { segments: [] } });
    expect(validateOrFallbackGraphic(raw)).toBeUndefined();
  });

  it("leaves raw SVG strings untouched (Path 2, not JSON)", () => {
    const raw = "<svg><circle /></svg>";
    expect(validateOrFallbackGraphic(raw, "fallback")).toBe(raw);
  });

  it("leaves empty/undefined untouched", () => {
    expect(validateOrFallbackGraphic(undefined, "fallback")).toBeUndefined();
    expect(validateOrFallbackGraphic("", "fallback")).toBe("");
  });
});
