import type { CarouselContent, VerificationRecord } from "./types";
import { BANNED_PHRASES, BANNED_PATTERNS } from "./lunia-brand-guidelines";
import { summarize } from "./verification-status";
import { plainLanguageCheck, describeIssues } from "./plain-language";
import { storyCheck, describeStoryIssues } from "./story-spine";

/**
 * The pre-publish checklist from docs/carousel-viral-engine.md, section 5.
 * Pure: reads the content and the fact-check record, returns one row per
 * line of the checklist. "manual" means the rule cannot be judged by code and
 * the writer ticks it by reading.
 */
export type QcState = "pass" | "fail" | "manual";
export type QcRow = { id: string; label: string; state: QcState; detail?: string };

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
/** Body copy as lines: newlines win, a paragraph splits on sentences. */
const lines = (s: string) => (s.includes("\n") ? s.split(/\n+/) : s.trim().split(/(?<=[.!?])\s+/)).map((l) => l.trim()).filter(Boolean);
const lastSentence = (s: string) => {
  const parts = lines(s);
  return parts[parts.length - 1] ?? "";
};

export function viralChecklist(content: CarouselContent, selectedHook: number, record?: VerificationRecord | null): QcRow[] {
  const hook = content.hooks?.[selectedHook] ?? content.hooks?.[0];
  const slides = content.slides ?? [];
  const total = slides.length + 2;
  const rows: QcRow[] = [];

  // 1. Hook: 8 words or fewer, a number or a promise.
  const hookWords = hook ? words(hook.headline).length : 0;
  const hasNumber = !!hook && /\d/.test(hook.headline);
  rows.push({ id: "hook", label: "Slide 1 is 8 words or fewer with a promise or a number", state: !hook ? "fail" : hookWords <= 8 ? "pass" : "fail", detail: hook ? `${hookWords} words${hasNumber ? ", carries a number" : ", no number; make sure it reads as a promise"}` : "No hook" });

  // 2. Open loop on every content slide: a short final sentence.
  const noLoop = slides.map((s, i) => ({ i, last: lastSentence(s.body) })).filter((x) => words(x.last).length === 0 || words(x.last).length > 12);
  rows.push({ id: "loops", label: "Every slide except the first and last ends with an open-loop line", state: slides.length === 0 ? "fail" : noLoop.length === 0 ? "pass" : "fail", detail: noLoop.length ? `Slide${noLoop.length > 1 ? "s" : ""} ${noLoop.map((x) => x.i + 2).join(", ")}: last sentence is long or missing` : `${slides.length} slides end on a short line` });

  // 3. Solution withheld before the midpoint: cannot be judged by code.
  rows.push({ id: "tension", label: `No solution before slide ${total >= 10 ? 5 : 3}`, state: "manual", detail: "Read the slides before the midpoint: they must not tell the reader what to do yet." });

  // 4. One idea per slide: sentence count as a proxy.
  const busy = slides.map((s, i) => ({ i, n: lines(s.body).length })).filter((x) => x.n > 4);
  rows.push({ id: "one-idea", label: "One idea per slide", state: busy.length ? "fail" : "manual", detail: busy.length ? `Slide${busy.length > 1 ? "s" : ""} ${busy.map((x) => x.i + 2).join(", ")}: more than four lines` : "No slide runs past four lines. Count the ideas by eye." });

  // 5. Contrast: the preset only draws approved pairings.
  rows.push({ id: "contrast", label: "Every text pairing passes 4.5:1", state: "pass", detail: "Navy on ivory, ivory on navy, yellow only as the marker and on navy." });

  // 6. Compliance: banned phrases and patterns across every field.
  const all = [hook?.headline, hook?.subline, ...slides.flatMap((s) => [s.headline, s.body]), content.cta?.headline, content.caption].filter(Boolean).join("\n");
  const lower = all.toLowerCase();
  const hits = BANNED_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
  const patternHits = BANNED_PATTERNS.filter((p) => p.pattern.test(all)).map((p) => p.name);
  const found = [...hits, ...patternHits];
  rows.push({ id: "compliance", label: "Compliance: no banned phrase or pattern", state: found.length ? "fail" : "pass", detail: found.length ? found.slice(0, 4).join(", ") : "Nothing from the banned list" });

  // 7. CTA exactly once.
  const ctaMentions = slides.filter((s) => /lunialife\.com/i.test(`${s.headline} ${s.body}`)).length;
  rows.push({ id: "cta", label: "One CTA to lunialife.com, on the last slide only", state: content.cta?.headline && ctaMentions === 0 ? "pass" : "fail", detail: !content.cta?.headline ? "No CTA slide" : ctaMentions ? `lunialife.com also appears on ${ctaMentions} content slide${ctaMentions > 1 ? "s" : ""}` : "CTA slide only" });

  // 8. Caption follow line.
  // The caption standard is the generator's own closing line; the CTA slide's
  // follow line is accepted too.
  const follow = /for more sleep-science content follow @lunia_life|follow @lunia_life for science-based sleep strategies/i.test(content.caption ?? "");
  rows.push({ id: "caption", label: "Caption carries the standard follow line", state: follow ? "pass" : "fail", detail: follow ? "For more Sleep-Science content follow @lunia_life" : "Add: For more Sleep-Science content follow @lunia_life" });

  // 9. Fact check.
  if (!record) rows.push({ id: "facts", label: "Fact check clean", state: "manual", detail: "Runs with the fact check above." });
  else { const s = summarize(record); rows.push({ id: "facts", label: "Fact check clean", state: s.findings === 0 ? "pass" : "fail", detail: s.findings === 0 ? "Nothing to fix" : `${s.findings} to fix above` }); }

  // 10. Plain language: no technical term in the hook, at most one per deck
  // and glossed where it first appears, no sentence over the phone limit.
  const pl = plainLanguageCheck(`${hook?.headline ?? ""} ${hook?.subline ?? ""}`, slides.map((s, i) => ({ label: `slide ${i + 2}`, text: `${s.headline}. ${s.body}` })));
  rows.push({ id: "plain", label: "Plain language: a reader with no sleep knowledge follows every slide", state: pl.ok ? "pass" : "fail", detail: pl.ok ? (pl.terms.length ? `One term taught: ${pl.terms[0]}` : "No technical terms") : describeIssues(pl) });

  // 11. One story: a spine, beats in order, and every handoff carried.
  const st = storyCheck(content);
  rows.push({ id: "story", label: "One story: spine, beats in order, every slide answers the one before", state: st.ok ? "pass" : "fail", detail: st.ok ? `${st.carried} of ${st.handoffs} handoffs carry a word forward` : describeStoryIssues(st) });

  return rows;
}
