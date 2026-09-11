import { describe, expect, it } from "vitest";
import { lintChartbook, lintChartbookFigure } from "./two-slide-lint";
import { CHARTBOOK_COMPOSE_PROMPT, CHARTBOOK_FIGURES_PROMPT } from "./carousel-prompts";
import { ChartbookComposeResponseSchema, ChartbookFiguresResponseSchema, type ChartbookFigure } from "./types";

const figure: ChartbookFigure = {
  layout: "pill-bars",
  title: "Deep sleep per night",
  unit: "Minutes of slow-wave sleep, by decade of life",
  bars: [
    { label: "20s", value: 105, display: "1h 45" },
    { label: "40s", value: 78, display: "1h 18" },
    { label: "60s", value: 52, display: "52 min" },
  ],
  source: { citation: "Ohayon et al., Sleep, 2004" },
};

describe("lintChartbookFigure", () => {
  it("passes a sourced figure", () => {
    expect(lintChartbookFigure(figure)).toEqual({ ok: true, violations: [] });
  });

  it("flags a hedged source and a dash, on the figure alone", () => {
    const r = lintChartbookFigure({ ...figure, title: "Deep sleep — per night", source: { citation: "Illustrative figures, 2024" } });
    expect(r.ok).toBe(false);
    expect(r.violations.join("\n")).toMatch(/hedged source/);
    expect(r.violations.join("\n")).toMatch(/em\/en dash/);
  });

  it("is the figure half of lintChartbook", () => {
    const full = lintChartbook({
      topic: "deep sleep",
      cover: { question: "How much deep sleep do you get?", kicker: "One chart. One night.", underline: ["deep sleep"] },
      figure: { ...figure, source: { citation: "approximately from memory" } },
      caption: "a".repeat(100),
    });
    expect(full.violations).toContain("figure.source: hedged source (illustrative / approximate / typical). Cite the real figure or pick another layout");
  });
});

describe("two-stage schemas", () => {
  it("accepts a figures proposal and a compose reply", () => {
    expect(ChartbookFiguresResponseSchema.safeParse({ figures: [{ figure, angle: "Deep sleep halves by sixty." }] }).success).toBe(true);
    expect(ChartbookComposeResponseSchema.safeParse({ variants: [{ cover: { question: "How much deep sleep do you get?", kicker: "One night", underline: ["deep sleep"] }, caption: "x" }] }).success).toBe(true);
  });

  it("rejects a compose reply that tries to send a figure back", () => {
    const r = ChartbookComposeResponseSchema.safeParse({ variants: [{ figure, caption: "x" }] });
    expect(r.success).toBe(false);
  });
});

describe("prompts", () => {
  it("stage one asks for figures only, with the angle", () => {
    const p = CHARTBOOK_FIGURES_PROMPT("deep sleep", 3);
    expect(p).toMatch(/Propose 3 candidate figures/);
    expect(p).toMatch(/"angle"/);
    expect(p).not.toMatch(/caption/i);
  });

  it("stage two carries the confirmed figure verbatim and marks it final", () => {
    const json = JSON.stringify(figure, null, 2);
    const p = CHARTBOOK_COMPOSE_PROMPT("deep sleep", json, 3);
    expect(p).toContain(json);
    expect(p).toMatch(/FINAL/);
    expect(p).toMatch(/Write 3 variants/);
  });

  it("both append the violation block on a reprompt", () => {
    expect(CHARTBOOK_FIGURES_PROMPT("x", 1, ["figure.source: hedged source"])).toMatch(/previous response had these violations[\s\S]*hedged source/);
    expect(CHARTBOOK_COMPOSE_PROMPT("x", "{}", 1, ["caption: too short"])).toMatch(/caption: too short/);
  });
});
