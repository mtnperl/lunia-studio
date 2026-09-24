// Body copy formatting the editor can write and every content slide can draw.
//
// The body stays a plain string so saved decks, the generator, the rewrite
// routes and the inline editor all keep working unchanged. Formatting is
// carried by the text itself:
//   "• " / "- " / "· " at the start of a line  → bullet
//   "1. " / "1) " at the start of a line       → numbered item
//   an empty line                              → paragraph space
// A slide only switches to the formatted layout when the copy asks for it
// (see hasBodyFormatting), so a deck nobody formatted renders exactly as before.

export type BodyBlock =
  | { kind: "text"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "number"; text: string; marker: string }
  | { kind: "gap" };

const BULLET = /^\s*[-•·]\s+/;
const NUMBER = /^\s*(\d{1,2})[.)]\s+/;

export const BULLET_MARK = "• ";

/** Line spacing multiplier bounds. 1 is each preset's own leading. */
export const LINE_SPACING_MIN = 0.8;
export const LINE_SPACING_MAX = 2;

export function clampLineSpacing(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 1;
  return Math.min(LINE_SPACING_MAX, Math.max(LINE_SPACING_MIN, v));
}

function lineBlock(line: string): BodyBlock {
  const num = line.match(NUMBER);
  if (num) return { kind: "number", text: line.slice(num[0].length).trim(), marker: `${num[1]}.` };
  if (BULLET.test(line)) return { kind: "bullet", text: line.replace(BULLET, "").trim() };
  return { kind: "text", text: line.trim() };
}

/** Body as blocks, one per line. Runs of blank lines collapse into one gap;
 *  gaps at the start or end are dropped. */
export function parseBody(body: string): BodyBlock[] {
  const out: BodyBlock[] = [];
  for (const raw of (body ?? "").split("\n")) {
    if (!raw.trim()) {
      if (out.length > 0 && out[out.length - 1].kind !== "gap") out.push({ kind: "gap" });
      continue;
    }
    out.push(lineBlock(raw));
  }
  while (out.length > 0 && out[out.length - 1].kind === "gap") out.pop();
  return out;
}

/** True when any line of the body is a bullet or numbered item. */
export function hasListLines(body: string): boolean {
  return (body ?? "").split("\n").some((l) => BULLET.test(l) || NUMBER.test(l));
}

/** True when the body carries formatting a plain paragraph render would lose:
 *  list lines, or line breaks the author typed. */
export function hasBodyFormatting(body: string): boolean {
  const b = (body ?? "").trim();
  return b.includes("\n") || hasListLines(b);
}

// ─── Textarea editing ────────────────────────────────────────────────────────

export type TextEdit = { text: string; selStart: number; selEnd: number };

function lineRange(text: string, selStart: number, selEnd: number): [number, number] {
  const start = text.lastIndexOf("\n", Math.max(0, selStart - 1)) + 1;
  // A selection that ends right after a newline doesn't include the next line.
  const endFrom = selEnd > selStart && text[selEnd - 1] === "\n" ? selEnd - 1 : selEnd;
  const nl = text.indexOf("\n", endFrom);
  return [selStart === 0 ? 0 : start, nl < 0 ? text.length : nl];
}

function stripMarker(line: string): string {
  return line.replace(NUMBER, "").replace(BULLET, "");
}

/**
 * Turn the lines the selection touches into bullets or a numbered list, or
 * back into plain lines when every one of them already is that kind. Blank
 * lines are left alone. Returns the new text and a selection covering the
 * edited lines.
 */
export function toggleList(text: string, selStart: number, selEnd: number, kind: "bullet" | "number"): TextEdit {
  const [from, to] = lineRange(text, selStart, selEnd);
  const lines = text.slice(from, to).split("\n");
  const isKind = (l: string) => (kind === "bullet" ? BULLET.test(l) && !NUMBER.test(l) : NUMBER.test(l));
  const filled = lines.filter((l) => l.trim());
  const allKind = filled.length > 0 && filled.every(isKind);
  let n = 0;
  const next = lines.map((l) => {
    if (!l.trim()) return l;
    const bare = stripMarker(l).trimStart();
    if (allKind) return bare;
    n += 1;
    return kind === "bullet" ? `${BULLET_MARK}${bare}` : `${n}. ${bare}`;
  });
  const replaced = next.join("\n");
  return { text: text.slice(0, from) + replaced + text.slice(to), selStart: from, selEnd: from + replaced.length };
}

/** Put a blank line (paragraph space) after the line the caret is on. */
export function insertParagraphBreak(text: string, caret: number): TextEdit {
  const nl = text.indexOf("\n", caret);
  const at = nl < 0 ? text.length : nl;
  const next = text.slice(0, at) + "\n\n" + text.slice(nl < 0 ? at : at + 1);
  const pos = at + 2;
  return { text: next, selStart: pos, selEnd: pos };
}

/** Plain paragraph: drop every list marker and blank line in the selection's lines. */
export function clearFormatting(text: string, selStart: number, selEnd: number): TextEdit {
  const whole = selStart === selEnd;
  const [from, to] = whole ? [0, text.length] : lineRange(text, selStart, selEnd);
  const cleaned = text
    .slice(from, to)
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => stripMarker(l).trim())
    .join(whole ? " " : "\n");
  return { text: text.slice(0, from) + cleaned + text.slice(to), selStart: from, selEnd: from + cleaned.length };
}
