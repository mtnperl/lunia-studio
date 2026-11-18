// Server half of "Le week-end": the theme's system prompt, the Claude call
// through the shared content client, one reprompt when the lint fails, and
// the one-in-five product rotation read off the saved posts.

import { createContentMessage, CONTENT_MODEL, CONTENT_MAX_TOKENS_LONG, CONTENT_THINKING, DRAFT_MAX_TOKENS_SHORT, DRAFT_MODEL, DRAFT_THINKING, EFFORT_MEDIUM } from "./anthropic";
import { parseModelJson } from "./model-json";
import { getCarousels } from "./kv";
import {
  LW_CAPTION_END, LW_COLUMNS, LW_COLUMN_LABEL, LW_COLUMN_TEMPLATES, LW_DEMO_POSTS, LW_TYPE_TEMPLATES,
  LwPostSchema, lintLeWeekend, type LwColumn, type LwCover, type LwPost,
} from "./le-weekend";

export type LwRequest = { topic: string; column: LwColumn; cover: LwCover; dateFr: string; folio: number; slideCount: number };

export const LE_WEEKEND_SYSTEM = `You write "Le week-end", the sleep column of a well-edited French weekend magazine, for Lunia Life (a sleep supplement brand). The copy is in English. Only the section labels are French: La chronique, Le lexique, Le courrier, Le rituel, Les règles, Chère Lunia, La réponse, Ce qui se fait, Ce qui ne se fait pas.

Voice: dry, warm, precise. Short sentences. One idea per post. An adult reader, real terms defined once.

Hard copy rules:
- No em dashes or en dashes anywhere. No exclamation marks.
- Never use the construction "X is not Y, it is Z" (or "isn't Y, it's Z").
- Sentence case everywhere. Never all caps.
- Compliant claim language only: "supports", "may help", "associated with", "shown in studies". No disease claims (cure, treat, prevent, diagnose, heal), no outcome guarantees, no weight-loss claims.
- Never write "clinically dosed" or "clinical doses". Write "full doses".
- Do not claim magnesium crosses the blood-brain barrier or potentiates GABA-A. Apigenin carries the GABA-A story. No glycine outcome claims.
- No moon, star or celestial references.
- The product, Lunia Restore (magnesium glycinate, L-theanine 300 mg, apigenin 50 mg, melatonin-free), appears in at most one post in five, and only late and soft, in the caption or in a lexique definition. Never on any other slide.

Caption structure: one framing sentence; then 3 to 5 short numbered points, each "N. Name. Biology. What to do." in one or two sentences; a one-line close; then the exact final line "${LW_CAPTION_END}". No hashtags.

claimsToVerify: list every number, study and physiological claim that appears in the slides or the caption, one per entry, phrased so a human can check it against a source before posting. Never invent a study; if you name one, it must be real.

Return JSON only. No commentary, no markdown fences.`;

const TEMPLATE_SPEC: Record<string, string> = {
  chronique: `"chronique": { "headline": max 8 words, "column1": max 45 words, "column2": max 45 words, "figure"?: { "curve": 6 to 14 heights 0..1 left to right, one smooth physiological curve over time, "marks": exactly 2 [{ "at": index into curve, "label": 1 to 3 words }], "axis": 2 to 4 time labels like "18h", "22h", "2h", "6h" } }. Include a figure only when one curve over time is the point. The body reads straight on from column1 into column2.`,
  "chronique-number": `"chronique-number": { "figure": one short figure, max 4 characters, like "18°" or "90'", "sideNote": up to 3 short lines separated by \\n, max 15 words in all, "headline": max 8 words, "body": max 40 words }`,
  lexique: `"lexique": { "word": one lowercase French word with French spelling, "pronunciation": IPA between slashes, "gender": "n.f." or "n.m.", "definitions": exactly 3, each max 14 words; the third may be wry }`,
  courrier: `"courrier": { "letter": a reader's letter, max 30 words, "signature": "Pseudonym, Neighborhood" such as "Insomniaque, Brooklyn", "reply": max 40 words }`,
  regles: `"regles": { "title": a 2-word French title ending in a full stop, like "Au lit.", "dos": exactly 4 items for "Ce qui se fait", "donts": exactly 4 items for "Ce qui ne se fait pas", each max 8 words }`,
  photo: `"photo": { "headline": a time or 2 to 3 words, like "21h30" or "Dimanche, 8h.", "subline": max 8 words }`,
};

const IMAGE_RULES = `"imagePrompt" (required, the photo is approved by a human before it is generated): vertical 4:5 interiors or still-life reportage for a French weekend magazine, shot in a real lived-in home, not a styled set. Maximalist and cluttered, the opposite of minimalism: patterned wallpaper, a crowded gallery wall of mismatched frames, stacked paperbacks, a worn rug, mismatched lamps, plants, clothes on a chair, a half-finished drink. Old Paris apartment or café details. Slightly off-centre framing, uneven natural or lamp light, visible wear and dust. The top third of the frame is visually calmer (plain wall, sky or shadow) so a headline reads over it. No people, no phones or screens, no readable text on books or prints, no logos, no landmarks, no alcohol, no moon or stars, no purple, no product. Write it as one paragraph of plain description.`;

function slidePlan(req: LwRequest): string {
  const own = LW_COLUMN_TEMPLATES[req.column];
  const typeChoices = own.filter((t) => (LW_TYPE_TEMPLATES as readonly string[]).includes(t));
  const lines: string[] = [];
  for (let i = 0; i < req.slideCount; i++) {
    if (i === 0 && req.cover === "photo") lines.push(`Slide 1: "photo" (the grid tile; the photograph with a headline over it).`);
    else if (i === 0 && req.cover === "navy") lines.push(`Slide 1: "courrier".`);
    else lines.push(`Slide ${i + 1}: one of ${(typeChoices.length ? typeChoices : LW_TYPE_TEMPLATES).map((t) => `"${t}"`).join(", ")}.`);
  }
  return lines.join("\n");
}

function fewShot(): string {
  return LW_DEMO_POSTS.map((p) => JSON.stringify({ slides: p.slides, caption: p.caption, claimsToVerify: p.claimsToVerify }, null, 1)).join("\n\n");
}

function userPrompt(req: LwRequest, productAllowed: boolean, violations?: string[]): string {
  const templates = Array.from(new Set([...(req.cover === "photo" ? ["photo"] : []), ...(req.cover === "navy" ? ["courrier"] : []), ...LW_COLUMN_TEMPLATES[req.column]]));
  return `Write one post for the column ${LW_COLUMN_LABEL[req.column]} about: "${req.topic}".

Slides, in order:
${slidePlan(req)}

Template fields:
${templates.map((t) => `- ${TEMPLATE_SPEC[t]}`).join("\n")}

${req.cover === "photo" ? IMAGE_RULES : `No imagePrompt: this post has no photograph.`}

${productAllowed ? "The product may appear this time, softly, in the caption or a lexique definition, if it fits. It does not have to." : "Do not mention the product or Lunia Restore anywhere in this post: it appeared in one of the last four posts."}

Two published posts from this column, for voice and shape:
${fewShot()}

Return exactly:
{ "slides": [{ "template": "...", "fields": { ... } }], ${req.cover === "photo" ? `"imagePrompt": "...", ` : ""}"caption": "...", "claimsToVerify": ["..."] }${violations?.length ? `\n\nYour previous draft broke these rules. Fix every one:\n${violations.map((v) => `- ${v}`).join("\n")}` : ""}`;
}

/** At most one post in five names the product: none of the last four may. */
async function productAllowed(): Promise<boolean> {
  const all = await getCarousels().catch(() => []);
  const recent = all
    .filter((c) => c.format === "le_week_end" && c.leWeekendContent)
    .sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""))
    .slice(0, 4);
  return !recent.some((c) => /Lunia Restore|\bRestore\b/.test(JSON.stringify(c.leWeekendContent)));
}

async function draft(req: LwRequest, allowed: boolean, violations?: string[]): Promise<LwPost> {
  const msg = await createContentMessage({
    model: CONTENT_MODEL,
    max_tokens: CONTENT_MAX_TOKENS_LONG,
    thinking: CONTENT_THINKING,
    output_config: { effort: EFFORT_MEDIUM },
    system: LE_WEEKEND_SYSTEM,
    messages: [{ role: "user", content: userPrompt(req, allowed, violations) }],
  });
  console.log(`[generate/le_week_end] stop=${msg.stop_reason} out=${msg.usage?.output_tokens ?? "?"}`);
  const json = parseModelJson(msg, "le week-end generation") as Record<string, unknown>;
  const parsed = LwPostSchema.safeParse({
    ...json,
    series: "le-week-end",
    topic: req.topic,
    column: req.column,
    cover: req.cover,
    dateFr: req.dateFr,
    folio: req.folio,
    claimsToVerify: Array.isArray(json.claimsToVerify) ? json.claimsToVerify : [],
  });
  if (!parsed.success) {
    throw new Error(`Invalid response shape: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}

/** Column and slide count for a topic when the studio leaves them on auto.
 *  The cover comes from the grid rhythm, and a navy slot can only be courrier. */
export async function pickLayout(topic: string, cover: LwCover, column?: LwColumn): Promise<{ column: LwColumn; slideCount: number }> {
  const fallback = (c: LwColumn) => ({ column: c, slideCount: cover === "photo" ? 2 : 1 });
  if (cover === "navy") return fallback("courrier");
  const choices = LW_COLUMNS.filter((c) => c !== "courrier" && (!column || c === column));
  try {
    const msg = await createContentMessage({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS_SHORT,
      thinking: DRAFT_THINKING,
      messages: [{ role: "user", content: `Pick the column of "Le week-end", a French weekend magazine's sleep column, that fits this topic best: "${topic}".
Columns:
- chronique: a short essay on one mechanism, optionally with one curve over time, or one striking number.
- lexique: a dictionary entry for one French word that names the idea.
- rituel: an evening or morning routine, essay pages plus a list of dos and don'ts.
- regles: four dos and four don'ts, nothing else.
Allowed: ${choices.join(", ")}.
Slides: 1 to 4 pages. ${cover === "photo" ? "Slide 1 is a photograph, so at least 2." : ""} Use more pages only when the topic needs them.
Return JSON only: { "column": "...", "slideCount": n }` }],
    });
    const json = parseModelJson(msg, "le week-end layout") as { column?: string; slideCount?: number };
    const picked = choices.find((c) => c === json.column) ?? choices[0];
    const min = cover === "photo" ? 2 : 1;
    return { column: picked, slideCount: Math.max(min, Math.min(4, Math.round(Number(json.slideCount) || min))) };
  } catch (err) {
    console.warn("[generate/le_week_end] layout pick failed:", err instanceof Error ? err.message : err);
    return fallback(choices[0]);
  }
}

/** One draft, linted; one reprompt with the violations; what still fails rides along. */
export async function generateLeWeekend(req: LwRequest): Promise<LwPost> {
  const allowed = await productAllowed();
  const first = await draft(req, allowed);
  const lint = lintLeWeekend(first);
  const issues = [...lint.copy, ...lint.words];
  if (issues.length === 0) return first;
  console.warn("[generate/le_week_end] lint:", issues);
  try {
    const fixed = await draft(req, allowed, issues);
    const re = lintLeWeekend(fixed);
    const left = [...re.copy, ...re.words];
    return left.length ? { ...fixed, violations: left } : fixed;
  } catch (err) {
    console.error("[generate/le_week_end] reprompt failed:", err instanceof Error ? err.message : err);
    return { ...first, violations: issues };
  }
}
