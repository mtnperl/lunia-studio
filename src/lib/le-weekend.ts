// "Le week-end": one sleep topic as a page from a French weekend magazine's
// sleep column. Everything the theme owns that is not React lives here: its
// tokens, the post schema, the word limits and copy lint, the grid planner,
// the photo text-colour pick and the seeded demo posts. Safe to import from
// the client; the Claude call lives in le-weekend-generate.ts.

import { z } from "zod";
import { scanBannedTerms } from "./banned-terms";
import { hasForbiddenDash } from "./strip-dashes";

// ─── Tokens (theme scoped: nothing global reads these) ───────────────────────

export const LW_COLORS = {
  ivory: "#FCFCF8",
  /** Text on ivory. */
  deepNavy: "#102635",
  /** The courrier page ground. */
  richNavy: "#01253F",
  /** Secondary text. */
  slate: "#2C3F51",
} as const;

export const LW_SERIF = "'Bodoni Moda', Didot, 'Bodoni 72', Georgia, serif";
export const LW_SANS = "Inter, system-ui, sans-serif";
export const LW_W = 1080;
export const LW_H = 1350;
export const LW_PAD = { y: 80, x: 96 } as const;
export const LW_CAPTION_END = "For more sleep science content follow lunialife";

// ─── Schema ──────────────────────────────────────────────────────────────────

export const LW_COLUMNS = ["chronique", "lexique", "courrier", "rituel", "regles"] as const;
export const LW_COVERS = ["photo", "ivory", "navy"] as const;
export type LwColumn = (typeof LW_COLUMNS)[number];
export type LwCover = (typeof LW_COVERS)[number];

export const LW_COLUMN_LABEL: Record<LwColumn, string> = {
  chronique: "La chronique",
  lexique: "Le lexique",
  courrier: "Le courrier",
  rituel: "Le rituel",
  regles: "Les règles",
};

/** The type pages a photo cover may be followed by, and an ivory cover opens with. */
export const LW_TYPE_TEMPLATES = ["chronique", "chronique-number", "lexique", "regles"] as const;

/** Which type pages each column writes. Courrier is its own navy page. */
export const LW_COLUMN_TEMPLATES: Record<LwColumn, readonly string[]> = {
  chronique: ["chronique", "chronique-number"],
  lexique: ["lexique"],
  courrier: ["courrier"],
  rituel: ["chronique", "chronique-number", "regles"],
  regles: ["regles"],
};

/** Courrier is always the navy page; every other column is photo or ivory. */
export function coversForColumn(column: LwColumn): LwCover[] {
  return column === "courrier" ? ["navy"] : ["photo", "ivory"];
}

const str = z.string().min(1);

export const LwFigureSchema = z.object({
  /** Heights 0..1, left to right, drawn as one stroke. */
  curve: z.array(z.number().min(0).max(1)).min(3).max(24),
  /** Exactly two labelled points, by index into `curve`. */
  marks: z.tuple([z.object({ at: z.number().int().min(0), label: str }), z.object({ at: z.number().int().min(0), label: str })]),
  /** Time axis labels, spread evenly under the curve. */
  axis: z.array(str).min(2).max(5),
});

export const LwSlideSchema = z.discriminatedUnion("template", [
  z.object({ template: z.literal("chronique"), fields: z.object({ headline: str, figure: LwFigureSchema.optional(), column1: str, column2: str }) }),
  z.object({ template: z.literal("chronique-number"), fields: z.object({ figure: str, sideNote: str, headline: str, body: str }) }),
  z.object({ template: z.literal("lexique"), fields: z.object({ word: str, pronunciation: str, gender: z.enum(["n.f.", "n.m."]), definitions: z.tuple([str, str, str]) }) }),
  z.object({ template: z.literal("courrier"), fields: z.object({ letter: str, signature: str, reply: str }) }),
  z.object({ template: z.literal("regles"), fields: z.object({ title: str, dos: z.tuple([str, str, str, str]), donts: z.tuple([str, str, str, str]) }) }),
  z.object({ template: z.literal("photo"), fields: z.object({ headline: str, subline: str }) }),
]);

export const LwPostSchema = z.object({
  series: z.literal("le-week-end"),
  topic: str,
  column: z.enum(LW_COLUMNS),
  cover: z.enum(LW_COVERS),
  dateFr: str,
  folio: z.number().int().min(1).max(9999),
  slides: z.array(LwSlideSchema).min(1).max(4),
  imagePrompt: z.string().optional(),
  /** The approved photograph: a fal URL, a Blob URL once saved, or an upload as a data URL. */
  imageUrl: z.string().optional(),
  /** Picked from the photo's top 40%; absent until the photo has been read. */
  photoTone: z.enum(["ivory", "navy"]).optional(),
  /** The footer's own tone, picked from the bottom 15% of the photo. */
  photoFootTone: z.enum(["ivory", "navy"]).optional(),
  caption: str,
  claimsToVerify: z.array(z.string()),
  violations: z.array(z.string()).optional(),
}).superRefine((p, ctx) => {
  const first = p.slides[0]?.template;
  const want = p.cover === "photo" ? ["photo"] : p.cover === "navy" ? ["courrier"] : LW_TYPE_TEMPLATES;
  if (first && !(want as readonly string[]).includes(first)) ctx.addIssue({ code: "custom", path: ["slides", 0], message: `a ${p.cover} cover opens with ${want.join(" or ")}, not ${first}` });
  p.slides.slice(1).forEach((s, i) => {
    if (!(LW_TYPE_TEMPLATES as readonly string[]).includes(s.template)) ctx.addIssue({ code: "custom", path: ["slides", i + 1], message: `${s.template} can only be the first slide` });
  });
});

export type LwSlide = z.infer<typeof LwSlideSchema>;
export type LwTemplate = LwSlide["template"];
export type LwFigure = z.infer<typeof LwFigureSchema>;
export type LwPost = z.infer<typeof LwPostSchema>;

// ─── Word limits (warnings, never a silent shrink) ───────────────────────────

export function wordCount(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

type Limit = { label: string; text: string; max: number };

function limitsFor(s: LwSlide): Limit[] {
  switch (s.template) {
    case "chronique": { const f = s.fields; return [
      { label: "headline", text: f.headline, max: 8 },
      { label: "column 1", text: f.column1, max: 45 },
      { label: "column 2", text: f.column2, max: 45 },
    ]; }
    case "chronique-number": { const f = s.fields; return [
      { label: "headline", text: f.headline, max: 8 },
      { label: "side note", text: f.sideNote, max: 15 },
      { label: "body", text: f.body, max: 40 },
    ]; }
    case "lexique": { const f = s.fields; return f.definitions.map((d, i) => ({ label: `definition ${i + 1}`, text: d, max: 14 })); }
    case "courrier": { const f = s.fields; return [
      { label: "letter", text: f.letter, max: 30 },
      { label: "reply", text: f.reply, max: 40 },
    ]; }
    case "regles": { const f = s.fields; return [
      { label: "title", text: f.title, max: 2 },
      ...f.dos.map((d, i) => ({ label: `ce qui se fait ${i + 1}`, text: d, max: 8 })),
      ...f.donts.map((d, i) => ({ label: `ce qui ne se fait pas ${i + 1}`, text: d, max: 8 })),
    ]; }
    case "photo": { const f = s.fields; return [
      { label: "headline", text: f.headline, max: 3 },
      { label: "subline", text: f.subline, max: 8 },
    ]; }
  }
}

export function wordLimitIssues(post: LwPost): string[] {
  const out: string[] = [];
  post.slides.forEach((s, i) => {
    for (const l of limitsFor(s)) {
      const n = wordCount(l.text);
      if (n > l.max) out.push(`Slide ${i + 1} ${l.label}: ${n} words (max ${l.max})`);
    }
    if (s.template === "chronique-number" && s.fields.sideNote.split("\n").length > 3) out.push(`Slide ${i + 1} side note: more than 3 lines`);
  });
  return out;
}

// ─── Copy lint (blocks export, names the string) ─────────────────────────────

/** Every published string, labelled. Claims and the image prompt are not published. */
export function publishedStrings(post: LwPost): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  post.slides.forEach((s, i) => {
    const push = (k: string, t: string) => out.push({ where: `Slide ${i + 1} ${k}`, text: t });
    const f = s.fields as Record<string, unknown>;
    for (const [k, v] of Object.entries(f)) {
      if (typeof v === "string") push(k, v);
      else if (Array.isArray(v)) v.forEach((x, j) => typeof x === "string" && push(`${k} ${j + 1}`, x));
      else if (k === "figure" && v && typeof v === "object") {
        const fig = v as LwFigure;
        fig.marks.forEach((m, j) => push(`figure point ${j + 1}`, m.label));
        fig.axis.forEach((a, j) => push(`figure axis ${j + 1}`, a));
      }
    }
  });
  out.push({ where: "Caption", text: post.caption });
  return out;
}

const NOT_X_ITS_Y = [
  /\b(?:is|are|was|were)\s+not\s+[^.;:!?]{1,60}?,\s*(?:it|they|this|that|he|she)\s*(?:is|are|was|were|['’]s|['’]re)\b/i,
  /\b(?:isn['’]t|aren['’]t|wasn['’]t|weren['’]t)\s+[^.;:!?]{1,60}?,\s*(?:it|they|this|that|he|she)\s*(?:is|are|was|were|['’]s|['’]re)\b/i,
];
const CLINICAL_DOSE = /\bclinical(?:ly)?[- ]dos(?:ed|es?|ing)\b/i;
const CELESTIAL = /\b(?:moons?|moonlit|moonlight|lunar|stars?|starry|starlit|celestial|constellations?|galax(?:y|ies)|cosmic|cosmos|astral|zodiac|planets?)\b/i;
const WEIGHT_LOSS = /\b(?:weight[- ]loss|lose weight|losing weight|fat[- ]burn\w*|slimming)\b/i;
const MAG_OVERCLAIM = /(?:blood[- ]brain barrier|GABA[- ]?A\b|potentiat)/i;
const GLYCINE_OUTCOME = /\b(?:improv|boost|increas|deepen|lower|reduc|enhanc)\w*/i;
const ACRONYMS = new Set(["REM", "NREM", "GABA", "GABA-A", "HRV", "CBT", "CBT-I", "ADHD", "OSA", "SWS", "LUNIA", "LIFE"]);

function quote(t: string, at: number, len: number): string {
  const s = Math.max(0, at - 18), e = Math.min(t.length, at + len + 18);
  return `${s > 0 ? "…" : ""}${t.slice(s, e)}${e < t.length ? "…" : ""}`;
}

export function copyIssues(post: LwPost): string[] {
  const out: string[] = [];
  const flag = (where: string, what: string, text: string, m: RegExpMatchArray | null) =>
    out.push(`${where}: ${what} in "${m && m.index !== undefined ? quote(text, m.index, m[0].length) : text.slice(0, 60)}"`);

  for (const { where, text } of publishedStrings(post)) {
    const dash = text.match(/[—–]/);
    if (dash && hasForbiddenDash(text)) flag(where, "dash", text, dash);
    const bang = text.match(/!/);
    if (bang) flag(where, "exclamation mark", text, bang);
    for (const re of NOT_X_ITS_Y) { const m = text.match(re); if (m) flag(where, `"X is not Y, it is Z"`, text, m); }
    const dose = text.match(CLINICAL_DOSE);
    if (dose) flag(where, `"${dose[0]}" (write "full doses")`, text, dose);
    const sky = text.match(CELESTIAL);
    if (sky) flag(where, `celestial reference "${sky[0]}"`, text, sky);
    const wl = text.match(WEIGHT_LOSS);
    if (wl) flag(where, `weight-loss claim "${wl[0]}"`, text, wl);
    for (const hit of scanBannedTerms(text)) flag(where, `banned term "${hit.term}"`, text, text.slice(hit.range[0]).match(/^\S+/));
    for (const sentence of text.split(/(?<=[.?;])\s+/)) {
      if (/magnesium/i.test(sentence) && MAG_OVERCLAIM.test(sentence)) out.push(`${where}: magnesium overclaim (blood-brain barrier / GABA-A) in "${sentence.slice(0, 80)}"`);
      if (/glycine/i.test(sentence) && GLYCINE_OUTCOME.test(sentence)) out.push(`${where}: glycine outcome claim in "${sentence.slice(0, 80)}"`);
    }
    for (const m of text.matchAll(/\b[A-Z][A-Z-]{3,}\b/g)) {
      if (!ACRONYMS.has(m[0])) { flag(where, `all caps "${m[0]}" (sentence case)`, text, m); break; }
    }
  }

  post.slides.forEach((s, i) => {
    if (s.template === "lexique") return;
    const text = JSON.stringify(s.fields);
    if (/Lunia Restore|\bRestore\b/.test(text)) out.push(`Slide ${i + 1}: names the product (only the caption or a lexique definition may)`);
  });

  const lines = post.caption.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines[lines.length - 1] !== LW_CAPTION_END) out.push(`Caption: must end with the exact line "${LW_CAPTION_END}"`);
  const tag = post.caption.match(/(?:^|\s)#\w+/);
  if (tag) out.push(`Caption: hashtag "${tag[0].trim()}"`);
  return out;
}

export function lintLeWeekend(post: LwPost): { copy: string[]; words: string[] } {
  return { copy: copyIssues(post), words: wordLimitIssues(post) };
}

// ─── Grid rhythm ─────────────────────────────────────────────────────────────

/**
 * The next `count` covers after `last`: every other post is a photo, and the
 * non-photo covers alternate ivory then navy. `lastNonPhoto` is the most
 * recent ivory or navy post, when the last post was a photo; without it the
 * next non-photo cover is ivory.
 */
export function planGrid(last: LwCover | null, count: number, lastNonPhoto?: "ivory" | "navy"): LwCover[] {
  const out: LwCover[] = [];
  let prev = last;
  let nonPhoto: "ivory" | "navy" = last === "ivory" || last === "navy" ? last : lastNonPhoto ?? "navy";
  for (let i = 0; i < count; i++) {
    if (prev !== "photo") {
      out.push("photo");
      prev = "photo";
    } else {
      nonPhoto = nonPhoto === "ivory" ? "navy" : "ivory";
      out.push(nonPhoto);
      prev = nonPhoto;
    }
  }
  return out;
}

// ─── Photo text colour ───────────────────────────────────────────────────────

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function hexLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Mean relative luminance of the top `fraction` of an RGBA buffer. */
export function topLuminance(rgba: ArrayLike<number>, width: number, height: number, fraction = 0.4): number {
  const rows = Math.max(1, Math.round(height * fraction));
  let sum = 0, n = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      sum += 0.2126 * channel(rgba[i]) + 0.7152 * channel(rgba[i + 1]) + 0.0722 * channel(rgba[i + 2]);
      n++;
    }
  }
  return n ? sum / n : 0;
}

/** Ivory or deep navy, whichever has the higher WCAG contrast against the
 *  photo's average. The crossover sits near 0.21 relative luminance. */
export function photoToneFor(luminance: number): "ivory" | "navy" {
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return contrast(luminance, hexLuminance(LW_COLORS.deepNavy)) > contrast(luminance, hexLuminance(LW_COLORS.ivory)) ? "navy" : "ivory";
}

// ─── Dates and folios ────────────────────────────────────────────────────────

/** "Samedi 21 novembre". */
export function frenchDate(d: Date): string {
  const s = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Today if it is the weekend, else the coming Saturday. */
export function nextWeekendDate(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay();
  if (day !== 0 && day !== 6) d.setDate(d.getDate() + (6 - day));
  return d;
}

/** The page number printed on slide `index` (0-based): the folio counts on. */
export function pageNumber(post: Pick<LwPost, "folio">, index: number): number {
  return post.folio + index;
}

export function exportFilename(post: Pick<LwPost, "folio" | "column">, index: number): string {
  return `leweekend_${post.folio}_${post.column}_${index + 1}.jpg`;
}

// ─── Reference posts: the seeded demo and the few-shot examples ──────────────

export const LW_DEMO_POSTS: LwPost[] = [
  {
    series: "le-week-end",
    topic: "Adenosine and sleep pressure",
    column: "lexique",
    cover: "ivory",
    dateFr: "Dimanche 29 novembre",
    folio: 4,
    slides: [{
      template: "lexique",
      fields: {
        word: "adénosine",
        pronunciation: "/a.de.no.zin/",
        gender: "n.f.",
        definitions: [
          "A molecule that builds in the brain for every hour you are awake.",
          "The reason you are sleepy at 11 p.m.",
          "What your 4 p.m. espresso is quietly blocking.",
        ],
      },
    }],
    caption: [
      "Adenosine is the slow clock behind the urge to sleep.",
      "",
      "1. The molecule. Adenosine accumulates in the brain the longer you stay awake.",
      "2. The pressure. As it builds, it quiets the neurons that keep you alert, which is why late evening feels heavy.",
      "3. The espresso. Caffeine sits on adenosine receptors without switching them on, so the signal goes unheard for hours.",
      "4. What to do. Keep the last coffee at least six hours before bed.",
      "",
      "Sleep is when the slate is wiped clean.",
      "",
      LW_CAPTION_END,
    ].join("\n"),
    claimsToVerify: [
      "Adenosine accumulates in the brain during waking hours and is cleared during sleep",
      "Adenosine signalling reduces the activity of wake-promoting neurons",
      "Caffeine is an adenosine receptor antagonist",
      "Caffeine taken six hours before bed reduced total sleep in a controlled study (Drake et al., 2013, J Clin Sleep Med)",
    ],
  },
  {
    series: "le-week-end",
    topic: "Waking at 3 a.m.",
    column: "courrier",
    cover: "navy",
    dateFr: "Samedi 21 novembre",
    folio: 3,
    slides: [{
      template: "courrier",
      fields: {
        letter: "I wake at 3 a.m. almost every night, then lie there counting the hours left. Is something wrong with me?",
        signature: "Insomniaque, Brooklyn",
        reply: "Probably not. Everyone wakes briefly between sleep cycles; most of us never remember it. The trouble starts when you check the time.",
      },
    }],
    caption: [
      "Waking in the small hours is common, and usually less alarming than it feels.",
      "",
      "1. The cycle. A night runs in cycles of about 90 minutes, and brief wakings between them are normal.",
      "2. The memory. Most of these wakings last seconds, too short to be remembered.",
      "3. The clock. Checking the time starts a count, and counting keeps the mind alert.",
      "4. What to do. Turn the clock to the wall and let the next cycle arrive.",
      "",
      "If it happens nightly and leaves you tired by day, raise it with a doctor.",
      "",
      LW_CAPTION_END,
    ].join("\n"),
    claimsToVerify: [
      "Sleep cycles last roughly 90 minutes",
      "Brief awakenings between sleep cycles are normal and mostly not remembered",
      "Clock-watching at night is associated with longer time to fall back asleep",
    ],
  },
];
