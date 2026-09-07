// The essay body has two shapes: a paragraph, or a lead sentence over list
// lines. A list line starts with "- ". Fewer than two list lines is a
// paragraph, so a stray dash never turns prose into a list.

const LIST_ITEM = /^\s*[-\u2022\u00b7]\s+/;

export function splitEssayBody(body: string): { lead: string; items: string[] } {
  const lines = (body ?? "").split("\n");
  const items = lines.filter((l) => LIST_ITEM.test(l)).map((l) => l.replace(LIST_ITEM, "").trim()).filter(Boolean);
  if (items.length < 2) return { lead: body ?? "", items: [] };
  const lead = lines.filter((l) => !LIST_ITEM.test(l)).join("\n").trim();
  return { lead, items };
}

// ─── The one figure an essay deck may carry ──────────────────────────────────
//
// The cut is told at most one graphic per deck, from a short list, with real
// numbers. The general graphic catalogue in the prompt pulls the other way,
// so the rule is enforced here: the first slide whose graphic is an allowed
// component with a number in it keeps it, every other slide's graphic is
// cleared. A bar chart of words ("MORE RECALLED" vs "NO CHANGE") is not a
// figure; it is the body again, drawn.

export const ESSAY_GRAPHIC_COMPONENTS: ReadonlySet<string> = new Set(["bars", "split", "stackedBar", "stat", "spectrum", "timeline"]);

function hasDigit(v: unknown): boolean {
  return typeof v === "string" ? /\d/.test(v) : typeof v === "number";
}

/** True when the graphic is one the essay look draws and it carries a number. */
export function isEssayGraphic(raw: string | undefined): boolean {
  if (!raw || !raw.trim()) return false;
  let spec: { component?: unknown; data?: Record<string, unknown> };
  try { spec = JSON.parse(raw); } catch { return false; }
  const c = typeof spec.component === "string" ? spec.component : "";
  if (!ESSAY_GRAPHIC_COMPONENTS.has(c)) return false;
  const d = spec.data ?? {};
  switch (c) {
    case "bars": return Array.isArray(d.items) && d.items.length >= 2 && (d.items as { value?: unknown }[]).every((i) => hasDigit(i?.value));
    case "split": return Array.isArray(d.parts) && d.parts.length >= 2 && (d.parts as { percent?: unknown }[]).every((i) => typeof i?.percent === "number");
    case "stackedBar": return Array.isArray(d.segments) && d.segments.length >= 2 && (d.segments as { percent?: unknown }[]).every((i) => typeof i?.percent === "number");
    case "stat": return hasDigit(d.stat);
    case "spectrum": return typeof d.from === "number" && typeof d.to === "number";
    case "timeline": return Array.isArray(d.events) && d.events.length >= 2;
    default: return false;
  }
}

/** Keep the first essay-worthy graphic in the deck and clear the rest.
 *  Returns the slides (new objects) and how many graphics were cleared. */
export function keepOneEssayGraphic<T extends { graphic?: string }>(slides: T[]): { slides: T[]; cleared: number } {
  let kept = false;
  let cleared = 0;
  const out = slides.map((s) => {
    if (!s.graphic || !s.graphic.trim()) return s;
    if (!kept && isEssayGraphic(s.graphic)) { kept = true; return s; }
    cleared += 1;
    return { ...s, graphic: "" };
  });
  return { slides: out, cleared };
}
