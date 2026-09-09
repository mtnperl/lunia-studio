/**
 * Dry-run the carousel caption prompt locally before shipping a prompt change.
 *
 *   npx tsx scripts/dry-run-caption.ts [topic ...]
 *
 * Runs the same two stages as /api/carousel-v2/generate (brief, then deck)
 * for a few topics, prints only the caption, and scores each caption with
 * the avoid-ai-writing detector. Also scores the captions of the most recent
 * saved decks as a before/after baseline. Nothing is written anywhere.
 */
import { createRequire } from "node:module";
import path from "node:path";

process.loadEnvFile(path.join(process.cwd(), ".env.local"));

const require = createRequire(import.meta.url);

const DEFAULT_TOPICS = [
  "Why magnesium glycinate helps you fall asleep faster",
  "The 3am wake-up: what cortisol is doing to your sleep",
  "Blue light before bed and melatonin timing",
];

interface DetectorIssue { type: string; match?: string; text?: string }
interface DetectorResult { issues: DetectorIssue[]; score?: number; [k: string]: unknown }
interface Detector { analyzeText(text: string): DetectorResult }

function loadDetector(): Detector {
  const AIDetector = require(path.join(process.cwd(), ".claude/skills/avoid-ai-writing/detector/patterns.js"));
  return typeof AIDetector === "function" ? new AIDetector() : AIDetector;
}

function summarize(det: Detector, caption: string): string {
  const r = det.analyzeText(caption);
  const byType = new Map<string, number>();
  for (const i of r.issues) byType.set(i.type, (byType.get(i.type) ?? 0) + 1);
  const types = [...byType.entries()].map(([t, n]) => `${t}×${n}`).join(", ");
  const words = caption.trim().split(/\s+/).length;
  const score = typeof r.score === "number" ? ` score=${r.score}` : "";
  return `${r.issues.length} issue(s)${score}, ${words} words${types ? ` [${types}]` : ""}`;
}

async function main(): Promise<void> {
  const topics = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TOPICS;
  const det = loadDetector();

  const { createContentMessage, extractText, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_LONG, CONTENT_MAX_TOKENS_SHORT, EFFORT_MEDIUM } = await import("../src/lib/anthropic");
  const { BRIEF_PROMPT, parseBrief } = await import("../src/lib/carousel-brief");
  const { GENERATE_CAROUSEL_PROMPT } = await import("../src/lib/carousel-prompts");

  // Baseline: captions already in the library, written by the previous prompt.
  try {
    const { getCarousels } = await import("../src/lib/kv");
    const saved = (await getCarousels()) as Array<{ topic?: string; content?: { caption?: string }; createdAt?: string | number; updatedAt?: string | number }>;
    const recent = saved
      .filter((c) => c.content?.caption)
      .sort((a, b) => String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? "")))
      .slice(0, 3);
    console.log(`\n===== BEFORE: ${recent.length} most recent saved captions =====`);
    for (const c of recent) {
      console.log(`\n--- ${c.topic ?? "(untitled)"}\n${c.content!.caption}\n>> ${summarize(det, c.content!.caption!)}`);
    }
  } catch (err) {
    console.log(`(baseline skipped: ${err instanceof Error ? err.message : err})`);
  }

  console.log(`\n===== AFTER: ${topics.length} fresh generations with the current prompt =====`);
  await Promise.all(topics.map(async (topic) => {
    const briefMsg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      output_config: { effort: EFFORT_MEDIUM },
      messages: [{ role: "user", content: BRIEF_PROMPT(topic, "", undefined, "") }],
    });
    const brief = parseBrief(extractText(briefMsg));
    const prompt = GENERATE_CAROUSEL_PROMPT(topic, "educational", false, null, undefined, true, true, "editorial-scientific", true, undefined, undefined, brief ?? undefined);
    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      output_config: { effort: EFFORT_MEDIUM },
      messages: [{ role: "user", content: prompt }],
    });
    const raw = extractText(msg);
    const text = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(text) as { caption?: string };
    const caption = parsed.caption ?? "(no caption in output)";
    console.log(`\n--- ${topic}\n${caption}\n>> ${summarize(det, caption)}`);
  }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
