import type { CarouselContent, VerificationRecord } from "./types";
import { BANNED_PHRASES, BANNED_PATTERNS } from "./lunia-brand-guidelines";
import { summarize } from "./verification-status";
import { plainLanguageCheck, describeIssues } from "./plain-language";
import { storyCheck, describeStoryIssues, hasConcreteDetail, standsAlone, hookNamesAudience } from "./story-spine";
import { structurePlan, STRUCTURES, type CarouselStructure } from "./carousel-structures";

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

export type ChecklistOpts = { structure?: CarouselStructure | null; viralLook?: boolean };

/** The Viral checklist, kept for callers and tests: the deck checklist for the Story structure on the Viral look. */
export function viralChecklist(content: CarouselContent, selectedHook: number, record?: VerificationRecord | null): QcRow[] {
  return deckChecklist(content, selectedHook, record, { structure: "story", viralLook: true });
}

/** The pre-publish checklist for any structure. Rules that depend on the
 *  deck's shape read the structure's slot plan; the rest are invariants. */
export function deckChecklist(content: CarouselContent, selectedHook: number, record?: VerificationRecord | null, opts: ChecklistOpts = {}): QcRow[] {
  const structure = opts.structure ?? "story";
  const plan = structurePlan(structure, (content.slides ?? []).length);
  const spec = STRUCTURES[structure];
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
  const firstPayoff = plan.findIndex((sl) => sl.beat === "payoff");
  rows.push({ id: "tension", label: firstPayoff > 0 ? `No solution before slide ${firstPayoff + 2}` : "The first slide may carry the first step", state: "manual", detail: firstPayoff > 0 ? `Read slides 2 to ${firstPayoff + 1}: they must not tell the reader what to do yet.` : `${spec.label} opens on a step; check the hook still shows the value move.` });

  // 4. One idea per slide: sentence count as a proxy.
  const busy = slides.map((s, i) => ({ i, n: lines(s.body).length })).filter((x) => x.n > 4);
  rows.push({ id: "one-idea", label: "One idea per slide", state: busy.length ? "fail" : "manual", detail: busy.length ? `Slide${busy.length > 1 ? "s" : ""} ${busy.map((x) => x.i + 2).join(", ")}: more than four lines` : "No slide runs past four lines. Count the ideas by eye." });

  // 5. Contrast: the preset only draws approved pairings.
  rows.push({ id: "contrast", label: "Every text pairing passes 4.5:1", state: "pass", detail: opts.viralLook ? "Navy on ivory, ivory on navy, yellow only as the marker and on navy." : "The look draws only approved pairings." });

  // 6. Compliance: banned phrases and patterns across every field.
  const all = [hook?.headline, hook?.subline, ...slides.flatMap((s) => [s.headline, s.body]), content.cta?.headline, content.caption].filter(Boolean).join("\n");
  const lower = all.toLowerCase();
  const hits = BANNED_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
  const patternHits = BANNED_PATTERNS.filter((p) => p.pattern.test(all)).map((p) => p.name);
  const found = [...hits, ...patternHits];
  rows.push({ id: "compliance", label: "Compliance: no banned phrase or pattern", state: found.length ? "fail" : "pass", detail: found.length ? found.slice(0, 4).join(", ") : "Nothing from the banned list" });

  // 7. The deck closes once: a takeaway that carries the follow line, or a
  // CTA slide on older decks, and lunialife.com nowhere else.
  const ctaMentions = slides.filter((s) => /lunialife\.com/i.test(`${s.headline} ${s.body}`)).length;
  const closes = !!(content.takeaway?.points?.length || content.cta?.headline);
  rows.push({ id: "cta", label: "One closing slide: the takeaway with the follow line, lunialife.com nowhere else", state: closes && ctaMentions === 0 ? "pass" : "fail", detail: !closes ? "No takeaway or CTA slide" : ctaMentions ? `lunialife.com also appears on ${ctaMentions} content slide${ctaMentions > 1 ? "s" : ""}` : content.takeaway?.points?.length ? "Takeaway closes the deck" : "CTA slide closes the deck; regenerate for a takeaway" });

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

  // 11. One story: a spine, beats in order, and every handoff carried. The
  // detail, second-hook and audience rules get their own rows below, so they
  // are filtered out of this one.
  const st = storyCheck(content, plan.map((sl) => sl.beat), hook);
  const own = new Set(["no-detail", "weak-second-hook", "no-audience"]);
  const storyIssues = st.issues.filter((i) => !own.has(i.kind));
  rows.push({ id: "story", label: "One story: spine, beats in order, every slide answers the one before", state: storyIssues.length === 0 ? "pass" : "fail", detail: storyIssues.length === 0 ? `${st.carried} of ${st.handoffs} handoffs carry a word forward` : describeStoryIssues({ ...st, issues: storyIssues }) });

  // 11b. A concrete detail on every slide: a number, a time, or the
  // returning image. A slide with none is a summary, not a story.
  const vague = slides.map((s, i) => (hasConcreteDetail(`${s.headline} ${s.body}`, content.spine) ? 0 : i + 2)).filter(Boolean);
  rows.push({ id: "detail", label: "Every slide carries one concrete detail: a time, a count, or the returning image", state: slides.length === 0 ? "fail" : vague.length ? "fail" : "pass", detail: vague.length ? `Slide${vague.length > 1 ? "s" : ""} ${vague.join(", ")}: nothing the reader can picture` : "Each slide has something to picture" });

  // 11c. Slide 2 is the second hook: the deck is shown a second time from it.
  const second = slides[0]?.headline ?? "";
  rows.push({ id: "second-hook", label: "Slide 2 works cold as a second hook", state: !slides[0] ? "fail" : standsAlone(second) ? "pass" : "fail", detail: !slides[0] ? "No slide 2" : standsAlone(second) ? `"${second}"` : `"${second}" leans on slide 1 or runs past 8 words` });

  // 11d. The hook names who it is for.
  const named = hookNamesAudience(content.spine, hook);
  rows.push({ id: "audience", label: "The hook names who the deck is for", state: !content.spine?.who ? "manual" : named ? "pass" : "fail", detail: !content.spine?.who ? "No audience on the spine; read the hook and ask who it speaks to" : named ? `For: ${content.spine.who}` : `The spine says "${content.spine.who}" but no word of it is in the hook` });

  // 12. Proof: enough cited slides, and no single source carrying the deck.
  const cited = slides.filter((s) => (s.citation ?? "").trim().length > 0).length;
  const bySource = new Map<string, number>();
  for (const s of slides) { const c = (s.citation ?? "").trim().toLowerCase(); if (c) bySource.set(c, (bySource.get(c) ?? 0) + 1); }
  const heavy = [...bySource.values()].filter((n) => n > 2).length;
  const need = Math.ceil(spec.minCited * slides.length);
  const missingProof = plan.map((sl, i) => (sl.proof && !(slides[i]?.citation ?? "").trim() ? i + 2 : 0)).filter(Boolean);
  const proofOk = cited >= need && heavy === 0 && missingProof.length === 0;
  rows.push({ id: "proof", label: `Proof: ${Math.round(spec.minCited * 100)}% of slides cited, no source on more than two`, state: proofOk ? "pass" : "fail", detail: proofOk ? `${cited} of ${slides.length} slides cited` : [cited < need ? `${cited} of ${slides.length} cited, needs ${need}` : "", heavy ? `${heavy} source${heavy > 1 ? "s" : ""} on more than two slides` : "", missingProof.length ? `slide${missingProof.length > 1 ? "s" : ""} ${missingProof.join(", ")} must carry a citation` : ""].filter(Boolean).join(". ") });

  // 13. The product only where the structure allows it, and never in the hook.
  const productRe = /\b(lunia|restore)\b/i;
  const early = plan.map((sl, i) => (!sl.product && productRe.test(`${slides[i]?.headline ?? ""} ${slides[i]?.body ?? ""}`) ? i + 2 : 0)).filter(Boolean);
  const inHook = !!hook && productRe.test(`${hook.headline} ${hook.subline ?? ""}`);
  rows.push({ id: "product", label: "Product named only where the structure allows, never in the hook", state: early.length || inHook ? "fail" : "pass", detail: inHook ? "The hook names the product" : early.length ? `Named on slide${early.length > 1 ? "s" : ""} ${early.join(", ")}` : "Mechanism only, on the allowed slot" });

  return rows;
}
