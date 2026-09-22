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

/** What the model is asked for, and all it is asked for. */
export type RowFinish = {
  caption: string;
  takeaway: NonNullable<CarouselContent["takeaway"]>;
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

/** The four slides between the cover and the close. The citation is the row's
 *  on-slide source or nothing at all. */
export function rowContentSlides(row: CarouselRow): CarouselContentSlide[] {
  return contentSlides(row).map((s) => ({
    headline: s.headline,
    body: s.body,
    citation: s.onSlideSource ?? "",
  }));
}

/**
 * The deck, before the caption and the summary land on it. Split out from
 * `rowToCarousel` so the shape can be tested without a model.
 */
export function rowDeckSkeleton(row: CarouselRow): Omit<CarouselContent, "caption" | "takeaway"> {
  const close = summaryGuidance(row);
  return {
    hooks: rowHooks(row),
    slides: rowContentSlides(row),
    // Kept for layouts that predate the takeaway slide. When a takeaway is
    // present the renderer merges the follow line into it and never draws a
    // separate CTA, which is how a row becomes six slides and not seven.
    cta: {
      headline: close?.headline ?? "",
      followLine: "Follow @lunia_life for science-based sleep strategies.",
    },
  };
}

/** The whole deck, once the model has returned the two things it writes. */
export function rowToCarousel(row: CarouselRow, finish: RowFinish): CarouselContent {
  return { ...rowDeckSkeleton(row), caption: finish.caption, takeaway: finish.takeaway };
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

  return `You are writing for Lunia Life, a sleep supplement brand. A six-slide Instagram carousel has already been written and fact-checked by an editor. It is below, exactly as it will be published.

You are NOT writing or rewriting the slides. Do not restate them, do not improve them, do not correct them. Two things are missing and you are writing only those two.

SUBJECT: ${row.subject}
EDITORIAL NOTE (internal, never quote it): ${row.why}
CITATION ON FILE (internal, never quote it): ${row.citation}
COVER HEADLINE IN USE: ${coverHeadline(row)}

THE DECK
${slides}

WHAT TO WRITE

1. The takeaway, the deck's last slide. It replaces the sheet's slide 6 on the artwork, so it has to close the same argument the sheet closed, in fresh language. The sheet's close reads "${close?.headline ?? ""}" / "${close?.body ?? ""}" — treat that as guidance on WHERE the deck lands, not as copy to reuse or paraphrase.
  takeaway.headline: the claim in the reader's words. UPPERCASE, max 6 words, not a question. It says what the deck showed, never a riddle about it.
  takeaway.points: exactly 3 lines, each max 12 words, no period. Point 1 answers the question the deck was made for; point 2 is the thing to remember and why it holds; point 3 is what the reader does with it. Every point must be true to the slides above. Never a cause or a motive the slides do not contain. No citations, no hedging.
  takeaway.interaction: ONE explicit ask, matched to the deck.
    - type "save" when the deck is a routine or how-to the reader acts on later.
    - type "send" when the deck is relatable or diagnostic, something the reader knows applies to one person they know.
    - type "comment" when the deck poses a question or invites the reader to self-identify.
    label: a short second-person instruction that names WHY, max 12 words, carrying the deck's own image. Never a generic "save this post".

2. The caption.
${captionRules(includeSeoFooter)}

ACCURACY. Every number, mechanism and claim you use must already appear on a slide above. You have no other source and you may not reach for one. If the slides do not support a line you want to write, write a different line. Do not name a study, a journal, an author or a year anywhere in the caption or the takeaway: the sources that belong on this deck are already printed on the slides.

VOICE. Plain words a tired adult understands on first read. No em dashes. No exclamation marks. Sentence length varies. Never "game changer", "life changing", "obsessed", "holy grail", "click the link". Never claim the product treats, cures, prevents or fixes anything.

Return ONLY valid JSON, no other text:
{
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
  return { caption, takeaway: { headline, points, interaction: { type, label } } };
}

/** The guard the route runs before spending anything. */
export function rowBuildBlocker(row: CarouselRow): string | null {
  if (row.build !== "YES") {
    return `This row was reviewed as NO and has no slides. The reason on file: ${row.why || "none given"}.`;
  }
  if (!isBuildable(row)) return "This row is marked YES but did not import its six slides. Re-import the sheet.";
  return null;
}
