// The chartbook in two calls, shared by the builder (which stops between
// them so the editor can confirm the numbers) and the batch and generate
// routes (which chain them).
//
// Why two: one call that researched real numbers for three variants across
// five layouts AND wrote the slides used its whole thinking budget on the
// research and returned no text. Now the research call's visible output is
// a few hundred tokens of figure, and the writing call starts from a figure
// that is already fixed.

import { createContentMessage, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_MAX, CONTENT_MAX_TOKENS_SHORT, EFFORT_MEDIUM } from "@/lib/anthropic";
import { CHARTBOOK_COMPOSE_PROMPT, CHARTBOOK_FIGURES_PROMPT } from "@/lib/carousel-prompts";
import { parseModelJson } from "@/lib/model-json";
import { lintChartbook, lintChartbookFigure } from "@/lib/two-slide-lint";
import { ChartbookComposeResponseSchema, ChartbookFigureSchema, ChartbookFiguresResponseSchema, type ChartbookContent, type ChartbookFigure, type ChartbookFigureProposal } from "@/lib/types";

function shapeError(issues: { path: PropertyKey[]; message: string }[]): Error {
  return new Error(`Invalid response shape: ${issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
}

async function callFigures(topic: string, count: number, violations?: string[]): Promise<ChartbookFigureProposal[]> {
  const msg = await createContentMessage({
    model: CONTENT_MODEL,
    max_tokens: CONTENT_MAX_TOKENS_MAX,
    thinking: CONTENT_THINKING,
    messages: [{ role: "user", content: [{ type: "text", text: CHARTBOOK_FIGURES_PROMPT(topic, count, violations) }] }],
  });
  console.log(`[chartbook/figures] stop=${msg.stop_reason} out=${msg.usage?.output_tokens ?? "?"}`);
  const result = ChartbookFiguresResponseSchema.safeParse(parseModelJson(msg, "chartbook figures"));
  if (!result.success) throw shapeError(result.error.issues);
  return result.data.figures;
}

/** Stage one: N candidate figures, each linted, the failures reprompted
 *  once and shown with their surviving violations. */
export async function proposeChartbookFigures(topic: string, count: number): Promise<ChartbookFigureProposal[]> {
  const n = Math.max(1, Math.min(3, count || 3));
  const proposals = await callFigures(topic, n);
  return Promise.all(proposals.map(async (p): Promise<ChartbookFigureProposal> => {
    const lint = lintChartbookFigure(p.figure);
    if (lint.ok) return p;
    console.warn("[chartbook/figures] lint violations:", lint.violations);
    try {
      const [fixed] = await callFigures(topic, 1, lint.violations);
      if (!fixed) return { ...p, violations: lint.violations };
      const recheck = lintChartbookFigure(fixed.figure);
      return recheck.ok ? fixed : { ...fixed, violations: recheck.violations };
    } catch (err) {
      console.error("[chartbook/figures] reprompt failed:", err instanceof Error ? err.message : err);
      return { ...p, violations: lint.violations };
    }
  }));
}

async function callCompose(topic: string, figure: ChartbookFigure, count: number, violations?: string[]): Promise<ChartbookContent[]> {
  const msg = await createContentMessage({
    model: CONTENT_MODEL,
    max_tokens: CONTENT_MAX_TOKENS_SHORT,
    thinking: CONTENT_THINKING,
    output_config: { effort: EFFORT_MEDIUM },
    messages: [{ role: "user", content: [{ type: "text", text: CHARTBOOK_COMPOSE_PROMPT(topic, JSON.stringify(figure, null, 2), count, violations) }] }],
  });
  console.log(`[chartbook/compose] stop=${msg.stop_reason} out=${msg.usage?.output_tokens ?? "?"}`);
  const result = ChartbookComposeResponseSchema.safeParse(parseModelJson(msg, "chartbook compose"));
  if (!result.success) throw shapeError(result.error.issues);
  return result.data.variants.map((v) => ({ topic, cover: v.cover, figure, caption: v.caption }));
}

/** Stage two: the confirmed figure, N covers and captions around it. The
 *  figure is validated here too, because the editor may have changed it. */
export async function composeChartbook(topic: string, figureInput: unknown, count: number): Promise<ChartbookContent[]> {
  const parsed = ChartbookFigureSchema.safeParse(figureInput);
  if (!parsed.success) throw new Error(`Invalid figure: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const figure = parsed.data;
  const n = Math.max(1, Math.min(3, count || 3));
  const variants = await callCompose(topic, figure, n);
  return Promise.all(variants.map(async (v): Promise<ChartbookContent> => {
    const lint = lintChartbook(v);
    if (lint.ok) return v;
    console.warn("[chartbook/compose] lint violations:", lint.violations);
    try {
      const [fixed] = await callCompose(topic, figure, 1, lint.violations);
      if (!fixed) return { ...v, violations: lint.violations };
      const recheck = lintChartbook(fixed);
      return recheck.ok ? fixed : { ...fixed, violations: recheck.violations };
    } catch (err) {
      console.error("[chartbook/compose] reprompt failed:", err instanceof Error ? err.message : err);
      return { ...v, violations: lint.violations };
    }
  }));
}

/** Both stages chained, for callers with nobody to confirm in between:
 *  one cover per proposed figure, so the picker still shows three angles. */
export async function generateChartbook(topic: string, count: number): Promise<ChartbookContent[]> {
  const figures = await proposeChartbookFigures(topic, count);
  const perFigure = await Promise.all(figures.map(async (p) => {
    try {
      const [v] = await composeChartbook(topic, p.figure, 1);
      if (!v) return null;
      const violations = [...(p.violations ?? []), ...(v.violations ?? [])];
      return violations.length ? { ...v, violations } : v;
    } catch (err) {
      console.error("[chartbook] compose failed for a figure:", err instanceof Error ? err.message : err);
      return null;
    }
  }));
  return perFigure.filter((v): v is ChartbookContent => v !== null);
}
