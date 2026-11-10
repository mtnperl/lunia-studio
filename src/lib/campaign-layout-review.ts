// The design review every generated email has to pass before it is shown.
//
// Deterministic on purpose. The model is good at writing a layout and bad at
// noticing that it just wrote three paragraphs in a row, so the check is code
// and only the FIX is a model call (see buildLayoutFixPrompt). The rules are
// the ones a DTC email designer applies on a redline pass:
//
//   - two plain paragraphs never sit back to back
//   - no paragraph runs past ~60 words; long copy becomes a lead, a list,
//     steps or a picture block
//   - an email with real copy has at least one picture
//   - a long email changes type at least once (lead, section heading, pull
//     quote, stat or header image) instead of one size and weight throughout
//   - the same structured kind does not repeat back to back
//
// "error" findings trigger the fix pass; "warn" findings are passed along to
// it but never trigger one on their own.
import type { CampaignBlock, CampaignBlockKind } from "./types";
import { blockToSourceText } from "./campaign-layout-prompts";

export type LayoutIssue = {
  code: "prose-run" | "text-stack" | "wall" | "no-picture" | "flat-type" | "repeat-kind";
  severity: "error" | "warn";
  /** 1-based block numbers the finding is about, for the prompt and the UI. */
  blocks: number[];
  message: string;
};

/** Plain paragraphs: the blocks that read as "a block of text". */
const PROSE = new Set<CampaignBlockKind>(["text", "founder"]);
/** Blocks that are words set in a row with no structure or picture. */
const TEXTY = new Set<CampaignBlockKind>(["text", "founder", "lead", "pullquote", "heading"]);
/** Blocks that change the type size or weight of the email. */
const TYPE_CHANGE = new Set<CampaignBlockKind>(["lead", "heading", "pullquote", "stat", "headerimage"]);
/** Blocks that carry, or are about to carry, a picture. A restructure returns
 *  picture blocks with a prompt and no url yet, so the kind is what counts. */
const PICTURE = new Set<CampaignBlockKind>(["imagetext", "imagebullets", "grid", "headerimage", "image"]);
// "product" is deliberately not in PICTURE: a product card shows a bottle,
// and an email whose only picture is the bottle still reads as text.

export const MAX_PARAGRAPH_WORDS = 60;
const PICTURE_FROM_WORDS = 120;
const TYPE_CHANGE_FROM_WORDS = 150;

const kindOf = (b: CampaignBlock): CampaignBlockKind => b.kind ?? "text";
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function reviewLayout(blocks: CampaignBlock[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const kinds = blocks.map(kindOf);
  const totalWords = blocks.reduce((n, b) => n + words(blockToSourceText(b)), 0);

  for (let i = 1; i < blocks.length; i++) {
    if (PROSE.has(kinds[i - 1]!) && PROSE.has(kinds[i]!)) {
      issues.push({
        code: "prose-run", severity: "error", blocks: [i, i + 1],
        message: `Blocks ${i} and ${i + 1} are both plain paragraphs. Merge them, or turn one into a lead, a list, steps, a pull quote or a picture block.`,
      });
    }
  }

  // Three or more word-only blocks in a row, even when they are different
  // kinds: a heading, a lead and a paragraph still read as one grey column.
  let runStart = -1;
  for (let i = 0; i <= blocks.length; i++) {
    const texty = i < blocks.length && TEXTY.has(kinds[i]!);
    if (texty && runStart < 0) runStart = i;
    if (!texty && runStart >= 0) {
      const len = i - runStart;
      if (len >= 3) {
        issues.push({
          code: "text-stack", severity: "error",
          blocks: Array.from({ length: len }, (_, k) => runStart + k + 1),
          message: `Blocks ${runStart + 1} to ${i} are ${len} word-only blocks in a row. Break the run with a picture, a list, steps, badges, a stat or a table.`,
        });
      }
      runStart = -1;
    }
  }

  blocks.forEach((b, i) => {
    if (!PROSE.has(kinds[i]!)) return;
    const n = words(b.body ?? "");
    if (n > MAX_PARAGRAPH_WORDS) {
      issues.push({
        code: "wall", severity: "error", blocks: [i + 1],
        message: `Block ${i + 1} is a ${n}-word paragraph. Keep paragraphs under ${MAX_PARAGRAPH_WORDS} words: open with a lead line, then move the rest into a list, steps or a picture block.`,
      });
    }
  });

  if (totalWords >= PICTURE_FROM_WORDS && !kinds.some((k) => PICTURE.has(k))) {
    issues.push({
      code: "no-picture", severity: "error", blocks: [],
      message: `The email has about ${totalWords} words and no picture. Put the most concrete idea in an imagetext, imagebullets or grid block.`,
    });
  }

  if (totalWords >= TYPE_CHANGE_FROM_WORDS && !kinds.some((k) => TYPE_CHANGE.has(k))) {
    issues.push({
      code: "flat-type", severity: "error", blocks: [],
      message: "Every line is the same size and weight. Open with a lead (large, light) or add a section heading or a pull quote.",
    });
  }

  for (let i = 1; i < blocks.length; i++) {
    const k = kinds[i]!;
    // Alternating picture rows (left, then right) are the editorial look, not
    // a repeat, so two picture-beside-copy blocks on opposite sides pass.
    const alternating = (k === "imagetext" || k === "imagebullets") && (blocks[i]!.imagePosition ?? "left") !== (blocks[i - 1]!.imagePosition ?? "left");
    if (k === kinds[i - 1] && !PROSE.has(k) && !alternating) {
      issues.push({
        code: "repeat-kind", severity: "warn", blocks: [i, i + 1],
        message: `Blocks ${i} and ${i + 1} are both "${k}". Merge them or change one.`,
      });
    }
  }

  return issues;
}

export const hasBlockingIssues = (issues: LayoutIssue[]) => issues.some((i) => i.severity === "error");

/** Lower is better. Errors outweigh warnings, so a fix that trades an error
 *  for a warning counts as an improvement. */
export function layoutScore(issues: LayoutIssue[]): number {
  return issues.reduce((n, i) => n + (i.severity === "error" ? 10 : 1), 0);
}

/** The findings as a numbered list for the fix prompt. */
export function formatIssues(issues: LayoutIssue[]): string {
  return issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.message}`).join("\n");
}
