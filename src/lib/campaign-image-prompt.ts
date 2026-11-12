// Writes the image prompt that sits ready on any block holding a picture.
//
// The point is that a block arrives with a prompt you can read, edit, and then
// press Generate on. Nothing here calls a model or spends anything: it composes
// from copy the email already contains, so it is instant and free, and it is
// tied to THIS email rather than being a generic wellness stock brief.
//
// Deliberately describes the SCENE only. generateCampaignSlotImage appends the
// house style and the safety constraints (no text, no packaging, no bottles),
// so repeating them here would just crowd the prompt the user is reading.
import { stripDashes } from "./strip-dashes";
import { stripInlineTokens } from "./campaign-inline-style";
import type { CampaignBlock, CampaignBlockKind } from "./types";

/** Longest slice of email copy worth feeding into a scene description. */
const MAX_CONTEXT = 180;

/** What the email is about, drawn from whatever the campaign already has. */
export type EmailImageContext = {
  subject?: string;
  topic?: string;
  /** Body copy from the rest of the email, most relevant first. */
  copy?: string[];
};

function clean(s: string | undefined): string {
  if (!s) return "";
  return stripDashes(stripInlineTokens(s)).replace(/\s+/g, " ").trim();
}

/** The block's own words, which are the closest thing to what its picture
 *  should be about. */
export function blockOwnText(b: Partial<CampaignBlock>): string {
  const parts = [
    b.imageHeading,
    b.headerHeadline,
    b.headerPillText,
    b.body,
    ...(b.bulletItems ?? []),
    ...(b.gridCells ?? []).flatMap((c) => [c.heading, c.caption]),
  ];
  return clean(parts.filter(Boolean).join(". "));
}

/** A scene each kind wants, so a grid cell and a full-bleed header do not get
 *  the same picture brief. */
function framingFor(kind: CampaignBlockKind | undefined): string {
  switch (kind) {
    case "headerimage":
      return "A wide, calm opening image with room at the top for a headline to sit over it";
    case "grid":
      return "A simple, close-up still life with one clear subject and plenty of space around it";
    case "imagebullets":
      return "An unstaged moment that suits a short list of benefits beside it";
    default:
      return "An unstaged, natural-light moment";
  }
}

/**
 * Compose the ready-to-use prompt for a block's picture.
 *
 * Order matters: the block's own copy leads, because that is what the picture
 * sits beside, then the email's subject or topic for wider context. If the
 * block has no copy yet the email context carries it alone, so a freshly-added
 * block is still specific to the email rather than generic.
 */
export function suggestImagePrompt(
  block: Partial<CampaignBlock>,
  ctx: EmailImageContext = {},
): string {
  const own = blockOwnText(block).slice(0, MAX_CONTEXT);
  const subject = clean(ctx.subject);
  const topic = clean(ctx.topic);
  const nearby = clean((ctx.copy ?? []).filter(Boolean).join(". ")).slice(0, MAX_CONTEXT);

  const about = own || subject || topic || nearby;
  if (!about) {
    // Nothing to go on yet. Still better than an empty field: it names the
    // product's world so Generate does something sensible on a blank block.
    return `${framingFor(block.kind)} from an evening wind-down routine at home, shortly before bed.`;
  }

  const wider = [subject && subject !== own ? subject : "", topic && topic !== own ? topic : ""]
    .filter(Boolean)
    .join(". ")
    .slice(0, MAX_CONTEXT);

  return [
    `${framingFor(block.kind)} for an email about: ${about}`,
    wider ? `Wider context: ${wider}` : "",
    "Show a real person or a real place from an evening wind-down routine, not a diagram or a concept.",
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\.\.+/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fill in `imagePrompt` on any image-bearing block that has none, leaving an
 *  existing prompt (the user's, or the model's) untouched. */
export function withImagePrompt(block: CampaignBlock, ctx: EmailImageContext = {}): CampaignBlock {
  const kind = block.kind;
  if (kind === "grid") {
    return {
      ...block,
      gridCells: (block.gridCells ?? []).map((c) =>
        c.imagePrompt?.trim()
          ? c
          : { ...c, imagePrompt: suggestImagePrompt({ kind, gridCells: [c] }, ctx) },
      ),
    };
  }
  if (kind === "imagetext" || kind === "imagebullets" || kind === "headerimage") {
    if (block.imagePrompt?.trim()) return block;
    return { ...block, imagePrompt: suggestImagePrompt(block, ctx) };
  }
  return block;
}
