// Inline styling for a SUBSET of the text inside a block.
//
// Grammar: [[mods]]text[[/]] where mods is a comma-separated list drawn from a
// closed allowlist. Colours are brand ROLES, never hex, resolved through the
// active theme — that is what makes an off-brand or illegible colour
// unrepresentable rather than merely discouraged.
//
// Nesting is explicitly rejected. After an opening token the parser takes
// everything up to the NEXT [[/]]; a [[ inside is literal text. Inner content
// is escaped and nothing else — no bold, no links, no recursion — which is
// what makes "never double-escape" provable in a single left-to-right pass.
//
// Every malformed shape degrades to literal escaped text rather than throwing
// or swallowing the rest of the email. A reader may see a stray [[lg]]; they
// will never see a broken document or an unescaped script tag.
import { BRAND_COLOR_ROLES, type BrandColorRole } from "./campaign-theme";

export const INLINE_SIZES = { xs: "13px", sm: "15px", lg: "22px", xl: "28px" } as const;
export type InlineSize = keyof typeof INLINE_SIZES;

export const INLINE_STYLE_MODS = ["b", "i", "u", "caps"] as const;
export type InlineStyleMod = (typeof INLINE_STYLE_MODS)[number];

export type InlineMods = {
  size?: InlineSize;
  color?: BrandColorRole;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  caps?: boolean;
};

const SIZE_KEYS = Object.keys(INLINE_SIZES) as InlineSize[];

/** Every token a user can write, for the toolbar and for validation. */
export const INLINE_MOD_KEYS: string[] = [
  ...SIZE_KEYS,
  ...INLINE_STYLE_MODS,
  ...BRAND_COLOR_ROLES,
];

/** Parse a mods string. Unknown keys are dropped rather than failing: a token
 *  written by a newer build, or a typo, degrades to whatever was recognised. */
export function parseMods(raw: string): InlineMods {
  const mods: InlineMods = {};
  for (const partRaw of raw.split(",")) {
    const part = partRaw.trim().toLowerCase();
    if (!part) continue;
    if ((SIZE_KEYS as string[]).includes(part)) mods.size = part as InlineSize;
    else if ((INLINE_STYLE_MODS as readonly string[]).includes(part)) mods[part as InlineStyleMod] = true;
    else if ((BRAND_COLOR_ROLES as readonly string[]).includes(part)) mods.color = part as BrandColorRole;
  }
  return mods;
}

/** True when nothing in the token was recognised, so the span would carry no
 *  styling and should render as plain text. */
export function isEmptyMods(m: InlineMods): boolean {
  return !m.size && !m.color && !m.b && !m.i && !m.u && !m.caps;
}

/** CSS for a parsed mod set. `color` is resolved by the caller, which owns the
 *  theme, so this module never needs to know about hex at all. */
export function modsToCss(m: InlineMods, resolvedColor?: string): string {
  const css: string[] = [];
  if (m.size) css.push(`font-size:${INLINE_SIZES[m.size]}`);
  if (m.b) css.push("font-weight:600");
  if (m.i) css.push("font-style:italic");
  if (m.u) css.push("text-decoration:underline");
  if (m.caps) css.push("text-transform:uppercase", "letter-spacing:0.08em");
  if (resolvedColor) css.push(`color:${resolvedColor}`);
  return css.join(";");
}

/** Serialise mods back to the token form, in a stable order so a round trip
 *  through the toolbar does not churn the text. */
export function modsToToken(m: InlineMods): string {
  const parts: string[] = [];
  if (m.size) parts.push(m.size);
  for (const k of INLINE_STYLE_MODS) if (m[k]) parts.push(k);
  if (m.color) parts.push(m.color);
  return parts.join(",");
}

/** Strip every token marker, leaving the text a reader would see. Used for the
 *  preheader, one-line block previews, and anything that lints plain copy. */
export function stripInlineTokens(text: string): string {
  return text.replace(/\[\[[a-z0-9,]+\]\]/gi, "").replace(/\[\[\/\]\]/g, "");
}

/** True when every opening token has a matching close. Used to reject an LLM
 *  restructure that split a styled span across two blocks, which would
 *  otherwise print a literal [[lg]] in the email. */
export function hasBalancedTokens(text: string): boolean {
  const opens = (text.match(/\[\[[a-z0-9,]+\]\]/gi) ?? []).length;
  const closes = (text.match(/\[\[\/\]\]/g) ?? []).length;
  return opens === closes;
}

export type SelectionEdit = { text: string; selStart: number; selEnd: number };

/** Wrap the current selection in a token, or merge into the token already
 *  wrapping it.
 *
 *  A collapsed caret is a no-op: inserting an empty [[lg]][[/]] pair into a
 *  controlled textarea and asking the user to type between the markers loses
 *  the caret on the next re-render, so the toolbar disables itself instead.
 *
 *  Never nests. If the selection is exactly wrapped by a token, the new mods
 *  are merged onto that token rather than a second one being added. */
export function applyInlineToken(text: string, selStart: number, selEnd: number, mods: InlineMods): SelectionEdit {
  const unchanged = { text, selStart, selEnd };
  if (selStart >= selEnd) return unchanged;
  if (selStart < 0 || selEnd > text.length) return unchanged;
  if (isEmptyMods(mods)) return unchanged;

  const before = text.slice(0, selStart);
  const selected = text.slice(selStart, selEnd);
  const after = text.slice(selEnd);

  // Already exactly wrapped? Merge instead of nesting.
  const openMatch = before.match(/\[\[([a-z0-9,]+)\]\]$/i);
  const closesRight = after.startsWith("[[/]]");
  if (openMatch && closesRight) {
    const merged = { ...parseMods(openMatch[1]!), ...mods };
    const token = modsToToken(merged);
    const newBefore = before.slice(0, before.length - openMatch[0].length) + `[[${token}]]`;
    return {
      text: newBefore + selected + after,
      selStart: newBefore.length,
      selEnd: newBefore.length + selected.length,
    };
  }

  // Selecting text that already carries tokens inside it would nest. Strip
  // them first, so the result is one flat span rather than a broken one.
  const flat = stripInlineTokens(selected);
  const token = `[[${modsToToken(mods)}]]`;
  const newText = before + token + flat + "[[/]]" + after;
  return {
    text: newText,
    selStart: before.length + token.length,
    selEnd: before.length + token.length + flat.length,
  };
}

/** Remove any token wrapping the selection, leaving the text in place. */
export function clearInlineToken(text: string, selStart: number, selEnd: number): SelectionEdit {
  if (selStart >= selEnd) return { text, selStart, selEnd };
  const before = text.slice(0, selStart);
  const selected = text.slice(selStart, selEnd);
  const after = text.slice(selEnd);
  const openMatch = before.match(/\[\[([a-z0-9,]+)\]\]$/i);
  if (openMatch && after.startsWith("[[/]]")) {
    const newBefore = before.slice(0, before.length - openMatch[0].length);
    return {
      text: newBefore + selected + after.slice("[[/]]".length),
      selStart: newBefore.length,
      selEnd: newBefore.length + selected.length,
    };
  }
  const flat = stripInlineTokens(selected);
  return { text: before + flat + after, selStart: before.length, selEnd: before.length + flat.length };
}

/** Every string a block carries, for token-integrity checking. */
function blockStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => blockStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => blockStrings(x, out));
  return out;
}

/** True when nothing in the block splits a styled span.
 *
 *  The restructure prompt asks the model to keep a token pair together, but a
 *  prompt is a request. This is the check. Without it a model that split a
 *  span across two blocks would leave an unterminated opener in one and an
 *  orphan close in the other, and the parser would faithfully print a literal
 *  "[[lg]]" into the email — the kind of thing that reads as noise in a 600px
 *  preview and gets accepted. */
export function blockTokensBalanced(block: unknown): boolean {
  return blockStrings(block).every(hasBalancedTokens);
}
