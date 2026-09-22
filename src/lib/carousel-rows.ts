/**
 * The row library: one spreadsheet row is one six-slide Instagram carousel.
 *
 * This replaced the 496-line subject library and the claims ledger on
 * 2026-09-22. The difference is where the words come from. A subject was a
 * topic line and the writer invented a deck around it, with the ledger
 * feeding it whatever numbers were on file. A row already IS the deck: six
 * headlines, six bodies, the hooks, the on-slide sources and the citation,
 * all reviewed before they reach the app. The model no longer decides what
 * the deck says. It writes the caption and the image prompts, and that is
 * the whole of its remaining job on this path.
 *
 * Consequences worth knowing before editing this file:
 *   - Nothing here invents a citation. A slide with no `On-slide source` in
 *     the sheet renders with no citation, and that is the correct result.
 *   - Slide 1's headline is Hook option A in every row of the export. The
 *     hook picker still offers B and C; choosing one replaces the cover
 *     headline and nothing else.
 *   - `Build` is carried verbatim. A NO row imports, stores its `Why`, and
 *     cannot be built. It is not deleted, because the reason it was rejected
 *     is the useful part.
 *
 * Pure functions only. Storage lives in kv.ts, HTTP in the routes.
 */

/** Columns the importer requires, by exact name. A file missing any of these
 *  is rejected whole rather than half-imported. */
export const REQUIRED_COLUMNS = [
  "Subject",
  "Carousel type",
  "Evidence",
  "Story",
  "Build",
  "Why",
  "Citation",
  "Visual system",
  "Hook option A",
  "Hook option B",
  "Hook option C",
  "Slide 1",
  "Slide 2",
  "Slide 3",
  "Slide 4",
  "Slide 5",
  "Slide 6",
] as const;

/** Every slide cell is a set of labelled lines. These are the labels that
 *  carry meaning; anything else is kept as part of the line above it, so a
 *  wrapped body does not silently lose its tail. */
const SLIDE_LABELS = ["Headline", "Body", "On-slide source", "Brand mark"] as const;
type SlideLabel = (typeof SLIDE_LABELS)[number];

export const SLIDES_PER_ROW = 6;

export type RowSlide = {
  /** Visible primary text. */
  headline: string;
  /** Visible supporting text. */
  body: string;
  /** Small author-and-year note, on the slides that carry a figure. Absent on
   *  most slides, and absent is a result, not a gap to fill. */
  onSlideSource?: string;
  /** Production instruction, never body copy to print. Slide 6 only. */
  brandMark?: string;
};

export type HookOption = "a" | "b" | "c";

/** Where a row sits in production. Imported means draft, never approved. */
export const ROW_STATUSES = ["draft", "in-production", "published", "parked"] as const;
export type RowStatus = (typeof ROW_STATUSES)[number];

export type CarouselRow = {
  /** Minted on import and stable for the life of the row. Row position in the
   *  file is NOT an id: the export is a suggested shooting order and it moves. */
  id: string;
  /** Position in the file it came from, for reference only. 1-based. */
  sourceRow: number;
  importedAt: string;
  subject: string;
  carouselType: string;
  /** 1 to 5 research strength. Triage, not publication approval. */
  evidence: number;
  /** 1 to 5 scroll-worthiness. Editorial judgement, not a forecast. */
  story: number;
  build: "YES" | "NO";
  /** Internal rationale. Never printed on a slide. */
  why: string;
  /** Full citation for the deck, usually with a URL. Internal, for review. */
  citation: string;
  /** The URL lifted out of `citation`, when it has one. */
  citationUrl?: string;
  /** Concept-level art direction for the whole deck, not six image prompts. */
  visualSystem: string;
  hooks: { a: string; b: string; c: string };
  /** Which hook the cover currently uses. Defaults to A on import. */
  selectedHook: HookOption;
  /** Exactly six, in story order. Empty for a NO row. */
  slides: RowSlide[];
  status: RowStatus;
  /** ISO date the row was last built into a deck, and which deck. */
  usedAt?: string;
  lastCarouselId?: string;
};

/** One row the importer could not read, with enough detail to fix the sheet. */
export type RowImportError = { sourceRow: number; subject: string; problem: string };

export type RowImportResult = {
  rows: CarouselRow[];
  errors: RowImportError[];
};

// ─── Parsing ──────────────────────────────────────────────────────────────────

/** The label a line opens with, or null when the line is a continuation.
 *  Only the four known labels count: a body reading "Tip: keep it short"
 *  opens with something that looks like a label and is not one. */
function labelOf(line: string): SlideLabel | null {
  const at = line.indexOf(":");
  if (at <= 0) return null;
  const head = line.slice(0, at).trim();
  return (SLIDE_LABELS as readonly string[]).includes(head) ? (head as SlideLabel) : null;
}

/**
 * Read one `Slide N` cell. Returns null when the cell is blank, which is what
 * a NO row looks like.
 *
 * Continuation lines append to whatever label is open, so a body the sheet
 * wrapped over two lines arrives whole. Text before the first label is
 * discarded: it has no slot to land in and guessing would put unreviewed
 * words on a slide.
 */
export function parseSlideCell(cell: string): RowSlide | null {
  if (!cell || !cell.trim()) return null;
  const parts: Partial<Record<SlideLabel, string[]>> = {};
  let open: SlideLabel | null = null;
  for (const raw of cell.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const label = labelOf(line);
    if (label) {
      open = label;
      const value = line.slice(line.indexOf(":") + 1).trim();
      (parts[label] ??= []).push(value);
    } else if (open) {
      (parts[open] ??= []).push(line);
    }
  }
  const join = (l: SlideLabel) => (parts[l] ?? []).join(" ").replace(/\s+/g, " ").trim();
  const headline = join("Headline");
  const body = join("Body");
  if (!headline && !body) return null;
  const onSlideSource = join("On-slide source");
  const brandMark = join("Brand mark");
  return {
    headline,
    body,
    ...(onSlideSource ? { onSlideSource } : {}),
    ...(brandMark ? { brandMark } : {}),
  };
}

/** The columns a file is missing, by name. Empty means the file can be read. */
export function missingColumns(headers: string[]): string[] {
  const have = new Set(headers.map((h) => h.trim()));
  return REQUIRED_COLUMNS.filter((c) => !have.has(c));
}

const URL_RE = /https?:\/\/[^\s)<>"']+/;

/** The URL inside a citation, trailing punctuation trimmed. */
export function citationUrl(citation: string): string | undefined {
  const m = URL_RE.exec(citation ?? "");
  if (!m) return undefined;
  return m[0].replace(/[.,;)]+$/, "");
}

function score(raw: string): number {
  const n = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 0;
}

/**
 * Turn a parsed sheet into rows. `mintId` is injected so the caller owns id
 * generation (crypto.randomUUID on the server, a counter in tests).
 *
 * A row is rejected, never repaired, when its Subject is blank or when it is
 * marked YES and cannot produce six slides. Half a deck is worse than no deck:
 * it looks buildable and is not.
 */
export function parseRows(
  table: { headers: string[]; rows: Record<string, string>[] },
  mintId: () => string,
  now: string = new Date().toISOString(),
): RowImportResult {
  const rows: CarouselRow[] = [];
  const errors: RowImportError[] = [];

  table.rows.forEach((raw, i) => {
    const sourceRow = i + 1;
    const get = (c: string) => (raw[c] ?? "").trim();
    const subject = get("Subject");
    if (!subject) {
      errors.push({ sourceRow, subject: "", problem: "Subject is blank" });
      return;
    }
    const build = get("Build").toUpperCase() === "YES" ? "YES" : "NO";
    const slides: RowSlide[] = [];
    for (let n = 1; n <= SLIDES_PER_ROW; n++) {
      const slide = parseSlideCell(raw[`Slide ${n}`] ?? "");
      if (slide) slides.push(slide);
    }
    if (build === "YES" && slides.length !== SLIDES_PER_ROW) {
      errors.push({
        sourceRow,
        subject,
        problem: `marked YES but has ${slides.length} of ${SLIDES_PER_ROW} slides`,
      });
      return;
    }
    const citation = get("Citation");
    const url = citationUrl(citation);
    rows.push({
      id: mintId(),
      sourceRow,
      importedAt: now,
      subject,
      carouselType: get("Carousel type"),
      evidence: score(get("Evidence")),
      story: score(get("Story")),
      build,
      why: get("Why"),
      citation,
      ...(url ? { citationUrl: url } : {}),
      visualSystem: get("Visual system"),
      hooks: { a: get("Hook option A"), b: get("Hook option B"), c: get("Hook option C") },
      selectedHook: "a",
      slides: build === "YES" ? slides : [],
      status: "draft",
    });
  });

  return { rows, errors };
}

// ─── Reading a row ────────────────────────────────────────────────────────────

/** The headline the cover carries: the selected hook, falling back to A and
 *  then to slide 1, so a sheet with a blank hook column still renders. */
export function coverHeadline(row: CarouselRow): string {
  return row.hooks[row.selectedHook] || row.hooks.a || row.slides[0]?.headline || row.subject;
}

/** A row is buildable when it was approved and carries its six slides. */
export function isBuildable(row: CarouselRow): boolean {
  return row.build === "YES" && row.slides.length === SLIDES_PER_ROW;
}

/** The four content slides: everything between the cover and the summary. */
export function contentSlides(row: CarouselRow): RowSlide[] {
  return row.slides.slice(1, SLIDES_PER_ROW - 1);
}

/** The row's own slide 6. Guidance for the summary the deck writes, never
 *  copy to render: the app's summary slide stays the app's. */
export function summaryGuidance(row: CarouselRow): RowSlide | undefined {
  return row.slides[SLIDES_PER_ROW - 1];
}

/** Merge a re-import over the library. Rows are matched on their subject line,
 *  so editing a slide in the sheet and re-importing updates the row in place
 *  and keeps its id, status and build history. Rows the new file does not
 *  mention are left alone. */
export function mergeRows(existing: CarouselRow[], incoming: CarouselRow[]): {
  merged: CarouselRow[];
  added: number;
  updated: number;
} {
  const key = (s: string) => s.trim().toLowerCase();
  const bySubject = new Map(existing.map((r) => [key(r.subject), r]));
  let added = 0;
  let updated = 0;
  const merged = [...existing];
  for (const row of incoming) {
    const prior = bySubject.get(key(row.subject));
    if (!prior) {
      merged.push(row);
      added++;
      continue;
    }
    const next: CarouselRow = {
      ...row,
      id: prior.id,
      importedAt: prior.importedAt,
      selectedHook: prior.selectedHook,
      status: prior.status,
      ...(prior.usedAt ? { usedAt: prior.usedAt } : {}),
      ...(prior.lastCarouselId ? { lastCarouselId: prior.lastCarouselId } : {}),
    };
    merged[merged.indexOf(prior)] = next;
    updated++;
  }
  return { merged, added, updated };
}
