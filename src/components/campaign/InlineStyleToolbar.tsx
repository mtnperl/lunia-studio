"use client";
// Style a SUBSET of the text inside a block.
//
// Writes visible markup tokens rather than driving a rich-text editor: the
// block body stays a plain string, so every existing path that reads or writes
// it — the AI rewrite, snippets, the Klaviyo importer, undo/redo — keeps
// working untouched.
//
// Buttons are DISABLED with no selection rather than inserting an empty
// [[lg]][[/]] pair for the user to type between. In a controlled textarea that
// pair loses the caret on the next re-render, so the "helpful" version is the
// one that does not work.
import { useEffect, useState } from "react";
import {
  applyInlineToken, clearInlineToken, parseMods,
  INLINE_SIZES, INLINE_STYLE_MODS,
} from "@/lib/campaign-inline-style";
import { BRAND_COLOR_ROLES, BRAND_ROLE_LABELS } from "@/lib/campaign-theme";

const SIZE_LABELS: Record<keyof typeof INLINE_SIZES, string> = { xs: "XS", sm: "S", lg: "L", xl: "XL" };
const STYLE_LABELS: Record<(typeof INLINE_STYLE_MODS)[number], string> = { b: "B", i: "I", u: "U", caps: "AA" };

export default function InlineStyleToolbar({
  blockId,
  value,
  onChange,
  getSelection,
  setSelection,
  preserveSelectionOnClick,
}: {
  blockId: string;
  value: string;
  onChange: (next: string) => void;
  getSelection: (id: string) => { start: number; end: number } | null;
  setSelection: (id: string, start: number, end: number) => void;
  preserveSelectionOnClick: { onMouseDown: (e: React.MouseEvent) => void };
}) {
  // Enabled state has to react to the user selecting text, so track it from
  // the document's selectionchange rather than reading on render.
  const [hasSelection, setHasSelection] = useState(false);
  useEffect(() => {
    const check = () => {
      const sel = getSelection(blockId);
      setHasSelection(!!sel && sel.end > sel.start);
    };
    document.addEventListener("selectionchange", check);
    check();
    return () => document.removeEventListener("selectionchange", check);
  }, [blockId, getSelection]);

  function apply(token: string) {
    const sel = getSelection(blockId);
    if (!sel || sel.end <= sel.start) return;
    const r = applyInlineToken(value, sel.start, sel.end, parseMods(token));
    if (r.text === value) return;
    onChange(r.text);
    setSelection(blockId, r.selStart, r.selEnd);
  }

  function clear() {
    const sel = getSelection(blockId);
    if (!sel || sel.end <= sel.start) return;
    const r = clearInlineToken(value, sel.start, sel.end);
    if (r.text === value) return;
    onChange(r.text);
    setSelection(blockId, r.selStart, r.selEnd);
  }

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "2px 7px", borderRadius: 4, fontSize: 11, fontFamily: "inherit",
    border: "1px solid var(--border)",
    background: active ? "var(--accent-dim)" : "var(--bg)",
    color: "var(--text)",
    cursor: hasSelection ? "pointer" : "not-allowed",
    opacity: hasSelection ? 1 : 0.4,
    lineHeight: 1.6,
  });

  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center", marginBottom: 5 }}
      title={hasSelection ? undefined : "Select some text first"}
    >
      {(Object.keys(SIZE_LABELS) as (keyof typeof SIZE_LABELS)[]).map((k) => (
        <button key={k} type="button" style={btn(false)} disabled={!hasSelection}
          {...preserveSelectionOnClick} onClick={() => apply(k)}
          title={`Size ${INLINE_SIZES[k]}`}>{SIZE_LABELS[k]}</button>
      ))}
      <span style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />
      {INLINE_STYLE_MODS.map((k) => (
        <button key={k} type="button" style={{ ...btn(false), fontWeight: k === "b" ? 700 : 400, fontStyle: k === "i" ? "italic" : "normal", textDecoration: k === "u" ? "underline" : "none" }}
          disabled={!hasSelection} {...preserveSelectionOnClick} onClick={() => apply(k)}
          title={{ b: "Bold", i: "Italic", u: "Underline", caps: "Uppercase" }[k]}>{STYLE_LABELS[k]}</button>
      ))}
      <span style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />
      {BRAND_COLOR_ROLES.map((role) => (
        <button key={role} type="button" style={btn(false)} disabled={!hasSelection}
          {...preserveSelectionOnClick} onClick={() => apply(role)}
          title={`${BRAND_ROLE_LABELS[role]} — a brand role, swapped automatically if it would be illegible on the current theme`}>
          {BRAND_ROLE_LABELS[role]}
        </button>
      ))}
      <span style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />
      <button type="button" style={btn(false)} disabled={!hasSelection}
        {...preserveSelectionOnClick} onClick={clear} title="Remove styling from the selection">Clear</button>
    </div>
  );
}
