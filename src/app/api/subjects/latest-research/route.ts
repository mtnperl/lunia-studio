import { anthropic } from "@/lib/anthropic";
import { getSubjects, saveSubjects } from "@/lib/kv";
import type { Subject } from "@/lib/types";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // web_search can be slow — give it room

const LATEST_RESEARCH_CATEGORY = "Latest Research";

const SYSTEM_PROMPT = `You are a research scout for a sleep & circadian-health Instagram account (Lunia Life). Your job: surface recent peer-reviewed sleep findings and turn each into a single carousel-ready hook line.

Use the web_search tool to find research published in the last 60 days. Prioritise:
- PubMed / journal listings (Sleep, Journal of Sleep Research, Sleep Medicine, Nature Communications, Cell Reports, Lancet, JAMA, Science Advances)
- University press releases summarizing peer-reviewed work
- Reputable secondary coverage (Nature News, ScienceDaily, NIH, NIA) when it links to the primary paper

Reject: blogs, supplement marketing, opinion pieces, clickbait, anything older than 90 days, anything where you can't link to a primary or near-primary source.

Return ONLY a JSON array. Each item: { "phrasing": string, "sourceUrl": string }.
- "phrasing": one sentence, 60-130 chars, written as a topic seed for a carousel — concrete and specific. Examples: "New 2026 study: REM rebound after a single dose of caffeine", "Why a single night of sleep loss raises insulin resistance by 27%". Do NOT include the words "study finds" or "researchers say" — write it as the carousel topic itself.
- "sourceUrl": canonical URL to the paper / press release / journal page. Prefer DOIs or journal pages over secondary coverage.

Return 8-12 items. No prose, no markdown fences, JSON only.`;

const USER_PROMPT = `Find the most interesting sleep / circadian / chronobiology research findings from the last 60 days. Use web search. Return the JSON array described above.`;

type LatestItem = { phrasing: string; sourceUrl: string };

function extractJsonArray(raw: string): string {
  // 1. Prefer a fenced block: ```json ... ``` or ``` ... ``` — handles models that
  //    add prose before/after, including markdown notes that contain [link](url).
  const fence = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fence) return fence[1].trim();
  // 2. Fall back to balanced-bracket extraction starting at the first '[' so we
  //    don't get tricked by markdown links in surrounding prose.
  const start = raw.indexOf("[");
  if (start < 0) throw new Error("No JSON array found in model response");
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  throw new Error("Unmatched bracket in JSON array");
}

function parseLatestItems(raw: string): LatestItem[] {
  const block = extractJsonArray(raw);
  const parsed: unknown = JSON.parse(block);
  if (!Array.isArray(parsed)) throw new Error("Model response was not a JSON array");
  return parsed
    .filter((x): x is { phrasing: unknown; sourceUrl: unknown } =>
      typeof x === "object" && x !== null && "phrasing" in x && "sourceUrl" in x
    )
    .map((x) => ({
      phrasing: String((x as { phrasing: unknown }).phrasing).trim(),
      sourceUrl: String((x as { sourceUrl: unknown }).sourceUrl).trim(),
    }))
    .filter((x) => x.phrasing.length >= 8 && x.phrasing.length <= 200 && /^https?:\/\//i.test(x.sourceUrl));
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  let raw: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 6,
        },
      ],
      messages: [{ role: "user", content: USER_PROMPT }],
    });
    // Find the final text block (web_search produces tool_use + tool_result blocks before the final text)
    const textBlock = [...message.content].reverse().find((b) => b.type === "text");
    raw = textBlock && "text" in textBlock ? textBlock.text.trim() : "";
    if (!raw) {
      console.error("[api/subjects/latest-research] no text block in model response", message.content.map((b) => b.type));
      return Response.json({ error: "Claude returned no text response" }, { status: 502 });
    }
  } catch (err) {
    const status = (err as { status?: number })?.status;
    console.error("[api/subjects/latest-research] Anthropic API error", { status, err });
    if (status === 401 || status === 403) return Response.json({ error: "Anthropic API key invalid or revoked" }, { status: 401 });
    if (status === 429) return Response.json({ error: "Anthropic rate limited — try again in a moment" }, { status: 429 });
    if (status && status >= 500) return Response.json({ error: `Anthropic service error (${status}) — try again` }, { status: 502 });
    return Response.json({ error: `Latest-research call failed${status ? ` (${status})` : ""}` }, { status: 502 });
  }

  let items: LatestItem[];
  try {
    items = parseLatestItems(raw);
  } catch (err) {
    console.error("[api/subjects/latest-research] parse failed", { err, raw });
    return Response.json({ error: "Claude returned malformed JSON — try again" }, { status: 502 });
  }
  if (items.length === 0) {
    return Response.json({ error: "No usable research findings returned — try again" }, { status: 502 });
  }

  // Dedupe against existing subjects: skip anything that matches an existing sourceUrl
  // OR an existing case-insensitive text (in any category, not just Latest Research).
  const existing = await getSubjects();
  const haveUrls = new Set(
    existing.map((s) => s.sourceUrl?.trim().toLowerCase()).filter((u): u is string => !!u)
  );
  const haveTexts = new Set(existing.map((s) => s.text.trim().toLowerCase()));

  const newSubjects: Subject[] = [];
  let skipped = 0;
  for (const item of items) {
    const urlKey = item.sourceUrl.toLowerCase();
    const textKey = item.phrasing.toLowerCase();
    if (haveUrls.has(urlKey) || haveTexts.has(textKey)) {
      skipped++;
      continue;
    }
    newSubjects.push({
      id: randomUUID(),
      text: item.phrasing,
      category: LATEST_RESEARCH_CATEGORY,
      sourceUrl: item.sourceUrl,
    });
    haveUrls.add(urlKey);
    haveTexts.add(textKey);
  }

  if (newSubjects.length > 0) {
    // Prepend new findings so they appear at the top of the library
    await saveSubjects([...newSubjects, ...existing]);
  }

  return Response.json({ added: newSubjects.length, skipped, total: items.length });
}
