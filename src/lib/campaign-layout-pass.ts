// One layout pass: ask for a layout, check it with the design review, and if
// the review blocks, ask once more with the findings. Shared by "Make it
// visual" (/api/campaign/restructure) and new emails (/api/campaign/generate),
// so both go through the same review before anything is shown.
//
// Server-only: it calls the model.
import {
  createContentMessage,
  CONTENT_MODEL,
  CONTENT_THINKING,
  DRAFT_THINKING,
  CONTENT_MAX_TOKENS_LONG,
  CONTENT_MAX_TOKENS_SHORT,
  extractText,
} from "./anthropic";
import {
  LayoutBlockSchema,
  LayoutEnvelopeSchema,
  MAX_LAYOUT_BLOCKS,
  layoutBlockToCampaignBlock,
  buildLayoutFixPrompt,
  blockToSourceText,
  type PictureRef,
  type SnippetRef,
} from "./campaign-layout-prompts";
import { reviewLayout, hasBlockingIssues, layoutScore, formatIssues, type LayoutIssue } from "./campaign-layout-review";
import { blockTokensBalanced } from "./campaign-inline-style";
import { stripDashes } from "./strip-dashes";
import type { CampaignBlock, CampaignImageSlot, CampaignSnippet } from "./types";

const randomUUID = () => crypto.randomUUID();

function stripJsonFence(raw: string): string {
  return raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
}

/** Every picture an email already carries, as references the model can reuse.
 *  Includes slot pictures placed by kind "image" blocks, grid cells and trust
 *  grid items, deduped by url. */
export function collectPictures(blocks: CampaignBlock[], images: CampaignImageSlot[] = []): PictureRef[] {
  const out: PictureRef[] = [];
  const seen = new Set<string>();
  const add = (url: string | null | undefined, about: string) => {
    const u = url?.trim();
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push({ ref: `P${out.length + 1}`, url: u, about: about.replace(/\s+/g, " ").trim() });
  };
  const slots = new Map(images.map((s) => [s.id, s]));
  for (const b of blocks) {
    const own = blockToSourceText(b).split("\n").slice(0, 2).join(". ");
    if (b.kind === "image" && b.imageSlotId) add(slots.get(b.imageSlotId)?.url, own || "an image in the email");
    add(b.imageUrl, own);
    b.gridCells?.forEach((c) => add(c.imageUrl, [c.heading, c.caption].filter(Boolean).join(". ")));
    b.trustItems?.forEach((t) => add(t.imageUrl, t.caption));
  }
  return out.slice(0, 12);
}

/** Saved snippets as references. Text only for the prompt; the full block is
 *  what gets inserted. */
export function snippetRefs(snippets: CampaignSnippet[]): (SnippetRef & { block: CampaignSnippet["block"] })[] {
  return snippets.slice(0, 12).map((s, i) => ({
    ref: `S${i + 1}`,
    name: s.name,
    text: blockToSourceText({ id: "", ...s.block }).replace(/\s+/g, " ").trim(),
    block: s.block,
  }));
}

type Expanded = {
  blocks: CampaignBlock[];
  /** The model's raw objects that survived, kept for the fix prompt. */
  raw: unknown[];
  droppedForSchema: number;
  droppedForTokens: number;
  meta: { topBanner?: string; promoBand?: string; ctaLabel?: string };
};

function expand(
  parsedJson: unknown,
  pictures: PictureRef[],
  snippets: (SnippetRef & { block: CampaignSnippet["block"] })[],
): Expanded | null {
  const envelope = LayoutEnvelopeSchema.safeParse(parsedJson);
  if (!envelope.success) return null;
  const picMap = Object.fromEntries(pictures.map((p) => [p.ref, p.url]));
  const snipMap = new Map(snippets.map((s) => [s.ref, s.block]));
  const blocks: CampaignBlock[] = [];
  const raw: unknown[] = [];
  const rejected: unknown[] = [];
  for (const b of envelope.data.blocks) {
    const obj = b as { kind?: unknown; ref?: unknown };
    // A snippet is placed exactly as the user saved it. Not a block kind, so
    // it is resolved here rather than in the zod union.
    if (obj?.kind === "snippet") {
      const block = typeof obj.ref === "string" ? snipMap.get(obj.ref.trim().toUpperCase()) : undefined;
      if (block) { blocks.push({ ...block, id: randomUUID() }); raw.push(b); }
      else rejected.push("snippet");
      continue;
    }
    const parsed = LayoutBlockSchema.safeParse(b);
    if (!parsed.success) { rejected.push(obj?.kind ?? "(no kind)"); continue; }
    blocks.push(layoutBlockToCampaignBlock(parsed.data, picMap));
    raw.push(b);
  }
  if (rejected.length) {
    console.warn(`[campaign-layout-pass] dropped ${rejected.length} block(s) with an unusable shape:`, JSON.stringify(rejected));
  }
  const capped = blocks.slice(0, MAX_LAYOUT_BLOCKS);
  // A split [[...]] [[/]] pair would print literally; drop the block instead.
  const balanced = capped.filter(blockTokensBalanced);
  return {
    blocks: balanced,
    raw: raw.slice(0, MAX_LAYOUT_BLOCKS),
    droppedForSchema: rejected.length,
    droppedForTokens: capped.length - balanced.length,
    meta: {
      topBanner: envelope.data.topBanner ? stripDashes(envelope.data.topBanner) : undefined,
      promoBand: envelope.data.promoBand ? stripDashes(envelope.data.promoBand) : undefined,
      ctaLabel: envelope.data.ctaLabel ? stripDashes(envelope.data.ctaLabel) : undefined,
    },
  };
}

async function ask(prompt: string, think: boolean): Promise<unknown | null> {
  const response = await createContentMessage({
    model: CONTENT_MODEL,
    max_tokens: think ? CONTENT_MAX_TOKENS_LONG : CONTENT_MAX_TOKENS_SHORT,
    thinking: think ? CONTENT_THINKING : DRAFT_THINKING,
    messages: [{ role: "user", content: prompt }],
  });
  const raw = extractText(response);
  try {
    return JSON.parse(stripJsonFence(raw));
  } catch {
    // A refusal is prose and lands here the same way malformed JSON does.
    console.error("[campaign-layout-pass] JSON parse failed:", raw.slice(0, 400));
    return null;
  }
}

export type LayoutPassResult =
  | {
      ok: true;
      blocks: CampaignBlock[];
      meta: Expanded["meta"];
      droppedForSchema: number;
      droppedForTokens: number;
      review: { before: LayoutIssue[]; after: LayoutIssue[]; fixed: boolean };
      /** The first answer as parsed JSON, for callers whose prompt asks for
       *  more than the layout (subject lines, a hero prompt). */
      firstJson: unknown;
    }
  | { ok: false; error: string };

/** Ask, review, and fix once if the review blocks. The fix is kept only when it
 *  scores better, so a worse second answer can never replace a good first one. */
export async function runLayoutPass(opts: {
  prompt: string;
  /** The copy the layout may draw on, for the fix prompt. A function when the
   *  copy is the model's own first draft (a new email has no source yet). */
  sourceText: string | ((firstDraft: CampaignBlock[]) => string);
  pictures?: PictureRef[];
  snippets?: (SnippetRef & { block: CampaignSnippet["block"] })[];
}): Promise<LayoutPassResult> {
  const pictures = opts.pictures ?? [];
  const snippets = opts.snippets ?? [];

  const first = await ask(opts.prompt, true);
  const a = first === null ? null : expand(first, pictures, snippets);
  if (!a || a.blocks.length === 0) return { ok: false, error: "Layout came back unusable, please try again." };

  const before = reviewLayout(a.blocks);
  if (!hasBlockingIssues(before)) {
    return { ok: true, blocks: a.blocks, meta: a.meta, droppedForSchema: a.droppedForSchema, droppedForTokens: a.droppedForTokens, review: { before, after: before, fixed: false }, firstJson: first };
  }

  // The fix pass. Fast (no thinking): the problems are named, the copy is set.
  let b: Expanded | null = null;
  try {
    const layoutJson = JSON.stringify({ ...a.meta, blocks: a.raw }, null, 1);
    const source = typeof opts.sourceText === "function" ? opts.sourceText(a.blocks) : opts.sourceText;
    const second = await ask(buildLayoutFixPrompt(layoutJson, formatIssues(before), source), false);
    b = second === null ? null : expand(second, pictures, snippets);
  } catch (err) {
    console.warn("[campaign-layout-pass] fix pass failed, keeping the first layout:", err);
  }
  const after = b && b.blocks.length ? reviewLayout(b.blocks) : null;
  if (b && after && layoutScore(after) < layoutScore(before)) {
    return {
      ok: true,
      blocks: b.blocks,
      meta: { ...a.meta, ...Object.fromEntries(Object.entries(b.meta).filter(([, v]) => v)) },
      droppedForSchema: b.droppedForSchema,
      droppedForTokens: b.droppedForTokens,
      review: { before, after, fixed: true },
      firstJson: first,
    };
  }
  return { ok: true, blocks: a.blocks, meta: a.meta, droppedForSchema: a.droppedForSchema, droppedForTokens: a.droppedForTokens, review: { before, after: before, fixed: false }, firstJson: first };
}
