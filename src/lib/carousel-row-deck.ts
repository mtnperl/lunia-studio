/**
 * Turning a reviewed row into a deck.
 *
 * Almost all of this is a mapping, not a generation. The headlines, bodies,
 * on-slide sources and hooks were written and checked in the sheet, so they
 * are copied across untouched. Two things are still written here, because the
 * sheet does not carry them: the Instagram caption, and the summary slide.
 *
 * The summary is deliberately NOT the row's slide 6. The row's slide 6 is a
 * headline and a line of body; the deck's last slide is the takeaway the app
 * has always built, the one a reader screenshots. The row's version goes into
 * the prompt as guidance so the close stays on the argument the sheet made.
 *
 * Nothing in this file may invent a citation. A slide whose row cell has no
 * `On-slide source` renders with an empty citation, and that is correct.
 */
import type { CarouselContent, CarouselContentSlide, Hook } from "./types";
import { captionRules } from "./carousel-prompts";
import { contentSlides, coverHeadline, isBuildable, summaryGuidance, type CarouselRow } from "./carousel-rows";

/**
 * The floor under an expansion. A sheet body at or above this stands on its
 * own and is left exactly as written.
 *
 * Eighteen because of what the sheets actually hold: every content body in
 * the first 144-row export is 4 to 12 words, one clause, which reads as a
 * caption under the headline rather than a slide. Eighteen words is two real
 * clauses. It sits above everything in that export, so that sheet expands
 * whole, and below anything written as real body copy, so a sheet with fuller
 * lines is left alone. Sentence counting was tried and dropped: "For a 107 mg
 * coffee, the modeled window was 8.8 hours." splits into two on the decimal
 * point, and "not a fixed 4 p.m. rule" into three.
 */
export const MIN_BODY_WORDS = 18;

/** The ceiling on an expanded body. A slide's text zone is fixed, and copy
 *  that crowds it pushes the infographic below its legibility floor, where
 *  FitBox drops it. Same number the Longer control uses. */
export const MAX_BODY_WORDS = 55;

/** What the model is asked for, and all it is asked for. */
export type RowFinish = {
  caption: string;
  takeaway: NonNullable<CarouselContent["takeaway"]>;
  /** One expanded body per content slide, in order. A slide's entry may be
   *  absent or empty, and then the sheet's own line is used unchanged. */
  bodies?: (string | undefined)[];
};

const HOOK_KEYS = ["a", "b", "c"] as const;
const HOOK_LABEL: Record<(typeof HOOK_KEYS)[number], string> = { a: "Sheet hook A", b: "Sheet hook B", c: "Sheet hook C" };

/** The three hooks the picker offers, in A, B, C order, so the row's
 *  `selectedHook` and the deck's numeric `selectedHook` are the same choice. */
export function rowHooks(row: CarouselRow): Hook[] {
  const cover = row.slides[0];
  return HOOK_KEYS.filter((k) => row.hooks[k]).map((k) => ({
    headline: row.hooks[k],
    subline: cover?.body ?? "",
    sourceNote: cover?.onSlideSource ?? "",
    angle: HOOK_LABEL[k],
  }));
}

/** Index into `rowHooks` for the row's current choice. */
export function selectedHookIndex(row: CarouselRow): number {
  const offered = HOOK_KEYS.filter((k) => row.hooks[k]);
  const at = offered.indexOf(row.selectedHook);
  return at >= 0 ? at : 0;
}

/**
 * The four slides between the cover and the close. The citation is the row's
 * on-slide source or nothing at all.
 *
 * The sheet's bodies are one short line each, around eight words. That reads
 * as a caption, not a slide, so the finish call expands each one and the
 * expansion lands here. It is an expansion and not a rewrite: the headline is
 * untouched, no figure moves, and a body that comes back empty or over the
 * cap falls back to the sheet's line rather than shipping something unchecked.
 */
export function rowContentSlides(row: CarouselRow, bodies?: (string | undefined)[]): CarouselContentSlide[] {
  return contentSlides(row).map((s, i) => ({
    headline: s.headline,
    body: usableBody(bodies?.[i], s.body),
    citation: s.onSlideSource ?? "",
  }));
}

/** How many words a body carries. */
export function wordCount(text: string): number {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/** Whether a sheet body is too thin to stand on a slide on its own. A body
 *  that is already long enough is never rewritten, even if the model sends
 *  something for it. */
export function needsExpansion(body: string): boolean {
  return wordCount(body) < MIN_BODY_WORDS;
}

/** An expanded body, or the sheet's own line when the sheet's line was
 *  already enough, or when the expansion is missing, empty, over the cap, or
 *  shorter than what it replaced. */
export function usableBody(expanded: string | undefined, original: string): string {
  if (!needsExpansion(original)) return original;
  const next = (expanded ?? "").trim();
  if (!next) return original;
  if (wordCount(next) > MAX_BODY_WORDS) return original;
  if (next.length <= original.length) return original;
  return next;
}

/**
 * The deck, before the caption and the summary land on it. Split out from
 * `rowToCarousel` so the shape can be tested without a model.
 */
export function rowDeckSkeleton(row: CarouselRow, bodies?: (string | undefined)[]): Omit<CarouselContent, "caption" | "takeaway"> {
  const close = summaryGuidance(row);
  return {
    hooks: rowHooks(row),
    slides: rowContentSlides(row, bodies),
    // The cover's picture. The Editorial Scientific preset typesets the hook
    // into the image, and it only does that when a spec with a concept is on
    // the deck (see the editorial framework in generate-image). Without one
    // the engine renders a bare photograph and the cover comes out wordless,
    // which is exactly what shipped on 2026-09-22 before this line existed.
    // The sheet's Visual system column is already a one-sentence concept, so
    // it is the brief.
    ...(row.visualSystem.trim() ? { hookImageSpec: { concept: row.visualSystem.trim() } } : {}),
    // Kept for layouts that predate the takeaway slide. When a takeaway is
    // present the renderer merges the follow line into it and never draws a
    // separate CTA, which is how a row becomes six slides and not seven.
    cta: {
      headline: close?.headline ?? "",
      followLine: "Follow @lunia_life for science-based sleep strategies.",
    },
  };
}

/** The whole deck, once the model has returned what it writes. */
export function rowToCarousel(row: CarouselRow, finish: RowFinish): CarouselContent {
  return { ...rowDeckSkeleton(row, finish.bodies), caption: finish.caption, takeaway: finish.takeaway };
}

/**
 * The only prompt on this path. It is given the finished deck and asked for a
 * caption and a close, and it is told in as many words that the slides are not
 * its to rewrite.
 */
export function ROW_FINISH_PROMPT(row: CarouselRow, includeSeoFooter: boolean): string {
  const close = summaryGuidance(row);
  const slides = row.slides
    .map((s, i) => {
      const label = i === 0 ? "Slide 1 (cover)" : i === row.slides.length - 1 ? `Slide ${i + 1} (the sheet's close)` : `Slide ${i + 1}`;
      const src = s.onSlideSource ? `\n  Source shown on the slide: ${s.onSlideSource}` : "";
      return `${label}\n  Headline: ${s.headline}\n  Body: ${s.body}${src}`;
    })
    .join("\n");

  const content = contentSlides(row);
  const thin = content.map((s, i) => ({ s, i })).filter(({ s }) => needsExpansion(s.body));
  const bodiesBlock = thin.length === 0
    ? `1. Nothing. Every body on this deck is already long enough to stand on its own, so "bodies" comes back as an empty array. Do not rewrite a single one of them.`
    : `1. The expanded bodies. Return "bodies" as an array of ${content.length} strings, one per slide between the cover and the close, in order.
  ${thin.length === content.length
    ? "Every one of them needs expanding."
    : `Only these need expanding: ${thin.map(({ i }) => `slide ${i + 2}`).join(", ")}. For every other position return an empty string "": those bodies are already long enough and rewriting one is an error.`}
  This is an EXPANSION, not a rewrite. Start from the line that is already there and keep its meaning, its subject and its wording where the wording is doing work. Then add what the reader needs to understand it: the mechanism behind it, what it means for them, or the condition it holds under.
  2 to 3 sentences, at most ${MAX_BODY_WORDS} words in total. Sentence length varies.
  You may NOT introduce a number, a percentage, a study, an author, a year, a dose or a finding that is not already somewhere on the six slides above. If the expansion you want needs a fact you do not have, write a shorter one that does not.
  Every figure already in the line stays exactly as written. "Twenty-two of 25" does not become "88 percent" or "most".
  Do not repeat the slide's own headline back in its body, and do not restate the slide before it.`;

  return `You are writing for Lunia Life, a sleep supplement brand. A six-slide Instagram carousel has already been written and fact-checked by an editor. It is below, exactly as it will be published.

The headlines are final and are not yours to touch.${thin.length > 0 ? " The bodies under them are too short to stand on a slide, so you are expanding the ones named below." : " The bodies under them are already long enough and are not yours to touch either."} You are also writing the close and the caption. Nothing else.

SUBJECT: ${row.subject}
EDITORIAL NOTE (internal, never quote it): ${row.why}
CITATION ON FILE (internal, never quote it): ${row.citation}
COVER HEADLINE IN USE: ${coverHeadline(row)}

THE DECK
${slides}

WHAT TO WRITE

${bodiesBlock}

2. The takeaway, the deck's last slide. It replaces the sheet's slide 6 on the artwork, so it has to close the same argument the sheet closed, in fresh language. The sheet's close reads "${close?.headline ?? ""}" / "${close?.body ?? ""}" — treat that as guidance on WHERE the deck lands, not as copy to reuse or paraphrase.
  takeaway.headline: the claim in the reader's words. UPPERCASE, max 6 words, not a question. It says what the deck showed, never a riddle about it.
  takeaway.points: exactly 3 lines, each max 12 words, no period. Point 1 answers the question the deck was made for; point 2 is the thing to remember and why it holds; point 3 is what the reader does with it. Every point must be true to the slides above. Never a cause or a motive the slides do not contain. No citations, no hedging.
  takeaway.interaction: ONE explicit ask, matched to the deck.
    - type "save" when the deck is a routine or how-to the reader acts on later.
    - type "send" when the deck is relatable or diagnostic, something the reader knows applies to one person they know.
    - type "comment" when the deck poses a question or invites the reader to self-identify.
    label: a short second-person instruction that names WHY, max 12 words, carrying the deck's own image. Never a generic "save this post".

3. The caption.
${captionRules(includeSeoFooter)}

ACCURACY. Every number, mechanism and claim you use, in a body as much as in the caption, must already appear on a slide above. You have no other source and you may not reach for one. If the slides do not support a line you want to write, write a different line. Do not name a study, a journal, an author or a year anywhere in the caption or the takeaway: the sources that belong on this deck are already printed on the slides.

VOICE. Plain words a tired adult understands on first read. No em dashes. No exclamation marks. Sentence length varies. Never "game changer", "life changing", "obsessed", "holy grail", "click the link". Never claim the product treats, cures, prevents or fixes anything.

Return ONLY valid JSON, no other text:
{
  "bodies": [${content.map((c, i) => (needsExpansion(c.body) ? `"expanded body for slide ${i + 2}"` : `""`)).join(", ")}],
  "takeaway": {
    "headline": "string",
    "points": ["string", "string", "string"],
    "interaction": { "type": "save" | "send" | "comment", "label": "string" }
  },
  "caption": "string"
}`;
}

/** Read the model's reply, keeping only what is well formed. Throws with a
 *  usable message rather than shipping half a close. */
export function parseRowFinish(value: unknown): RowFinish {
  const o = (value ?? {}) as Record<string, unknown>;
  // Bodies are best effort on purpose. A missing or unusable one falls back to
  // the sheet's own line in usableBody, so a bad expansion costs a thin slide
  // and never the deck.
  const bodies = Array.isArray(o.bodies)
    ? o.bodies.map((b) => (typeof b === "string" && b.trim() ? b.trim() : undefined))
    : undefined;
  const caption = typeof o.caption === "string" ? o.caption.trim() : "";
  if (!caption) throw new Error("the caption came back empty");
  const t = (o.takeaway ?? {}) as Record<string, unknown>;
  const headline = typeof t.headline === "string" ? t.headline.trim() : "";
  const points = Array.isArray(t.points)
    ? t.points.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim()).slice(0, 3)
    : [];
  const inter = (t.interaction ?? {}) as Record<string, unknown>;
  const type = inter.type === "send" || inter.type === "comment" ? inter.type : "save";
  const label = typeof inter.label === "string" ? inter.label.trim() : "";
  if (!headline || points.length === 0 || !label) {
    throw new Error("the takeaway came back without a headline, its points, or an ask");
  }
  return { caption, takeaway: { headline, points, interaction: { type, label } }, ...(bodies ? { bodies } : {}) };
}

/** The guard the route runs before spending anything. */
export function rowBuildBlocker(row: CarouselRow): string | null {
  if (row.build !== "YES") {
    return `This row was reviewed as NO and has no slides. The reason on file: ${row.why || "none given"}.`;
  }
  if (!isBuildable(row)) return "This row is marked YES but did not import its six slides. Re-import the sheet.";
  return null;
}
