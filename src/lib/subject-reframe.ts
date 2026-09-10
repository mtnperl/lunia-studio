// Rewrite a subject for a frozen format. "How caffeine blocks adenosine
// receptors" is a fine Structured deck and has nothing to chart; for the
// Chartbook it becomes "Caffeine half-life by dose, in hours". The draft
// tier proposes three such rewrites and the editor picks one, or keeps the
// original. The rewrite is a topic line only: the format's own generator
// still does the research and the writing.

import { createContentMessage, DRAFT_MODEL, DRAFT_MAX_TOKENS_SHORT } from "@/lib/anthropic";
import { parseModelJson } from "@/lib/model-json";
import { z } from "zod";
import { SUBJECT_FORMAT_LABEL, type SubjectFormat } from "@/lib/subject-fit";

const FORMAT_NEEDS: Record<SubjectFormat, string> = {
  did_you_know: `Did you know: two slides. Slide 1 is one surprising, citable claim in a sentence, ideally carrying a number a published study reported. Slide 2 is the "By" line: the mechanism in two short paragraphs. A topic fits when it can be reduced to ONE fact a reader did not know. A "how X works" explainer does not fit until it is narrowed to its most surprising finding.`,
  chartbook: `Chartbook: two slides. Slide 1 is a question. Slide 2 is ONE figure drawn from published numbers: a measure across 3 to 5 categories, two measures for the same groups, 6 to 10 items ranked, one choice with two outcomes, or a common belief against a number. A topic fits when it names a comparison or a distribution that a real paper reported: by age, per drink, X vs Y, ranked, dose against effect. Mechanism and "why" topics do not fit until they are turned into a measurable comparison.`,
  primer: `Primer: two slides. Slide 1 is a cover. Slide 2 is ONE reference slide: a glossary of 6 to 11 terms, one term with its formula and a threshold, an either-or with conditions for each side, or a creed of 5 to 8 "without X, no Y" lines. A topic fits when it is a reference the reader keeps: terms, a formula, a decision, a checklist. A narrative finding does not fit until it is recast as the reference behind it.`,
};

export const ReframeResponseSchema = z.object({
  proposals: z.array(z.object({
    /** The rewritten topic line, 40 to 120 characters, sentence case. */
    text: z.string().min(8).max(200),
    /** Under 20 words: what the piece would show. */
    why: z.string().min(1),
  })).min(1).max(4),
});
export type ReframeProposal = z.infer<typeof ReframeResponseSchema>["proposals"][number];

export function reframePrompt(topic: string, format: SubjectFormat, category?: string): string {
  return `You are the editor of Lunia Life, a sleep and longevity brand writing for health-literate adults. A subject from the library was picked for a format it does not naturally fit. Rewrite it as three topic lines that DO fit, each a different angle on the same subject.

SUBJECT: "${topic}"${category ? `\nCATEGORY: ${category}` : ""}
FORMAT: ${SUBJECT_FORMAT_LABEL[format]}

WHAT THE FORMAT NEEDS
${FORMAT_NEEDS[format]}

RULES
- Stay on the subject. The reader picked it for a reason; do not drift to a neighbouring topic.
- Each line names something a published source has reported. Never invent a number in the line; name the measure, not a made-up value ("Caffeine half-life by dose, in hours", not "Caffeine lasts 9.3 hours").
- Sentence case, 40 to 120 characters, no em dashes, no product names, no medical claims (cures, treats, prevents, heals).
- The three lines must be meaningfully different angles, not paraphrases.
- "why" is one line, under 20 words, on what the piece would show.

Return ONLY valid JSON: {"proposals":[{"text":"...","why":"..."},{"text":"...","why":"..."},{"text":"...","why":"..."}]}. No commentary, no markdown fences.`;
}

export async function reframeSubject(topic: string, format: SubjectFormat, category?: string): Promise<ReframeProposal[]> {
  const msg = await createContentMessage({
    model: DRAFT_MODEL,
    max_tokens: DRAFT_MAX_TOKENS_SHORT,
    messages: [{ role: "user", content: [{ type: "text", text: reframePrompt(topic, format, category) }] }],
  });
  const result = ReframeResponseSchema.safeParse(parseModelJson(msg, "subject reframe"));
  if (!result.success) throw new Error(`Invalid response shape: ${result.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return result.data.proposals
    .map((p) => ({ text: p.text.replace(/[—–]/g, ",").trim(), why: p.why.trim() }))
    .filter((p) => p.text.length >= 8);
}
