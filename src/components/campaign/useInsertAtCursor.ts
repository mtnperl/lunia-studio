"use client";
import { useCallback, useRef } from "react";

/** Tracks which block's textarea is focused and its cursor position, so an
 *  "Insert…" button elsewhere on the page (snippets, personalization tokens,
 *  brand facts) can drop text into the right place instead of just appending
 *  to the end. Shared by every "insert at cursor" feature — build once here,
 *  not as an incidental detail of any single one of them. */
export function useInsertAtCursor() {
  const textareas = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const focusedId = useRef<string | null>(null);

  /** Attach to a block's textarea: `ref={registerTextarea(block.id)}`. */
  const registerTextarea = useCallback(
    (id: string) => (el: HTMLTextAreaElement | null) => {
      if (el) textareas.current.set(id, el);
      else textareas.current.delete(id);
    },
    [],
  );

  /** Attach to a block's textarea: `onFocus={() => onFocusBlock(block.id)}`. */
  const onFocusBlock = useCallback((id: string) => {
    focusedId.current = id;
  }, []);

  /** Spread onto any "Insert…" trigger button. Without this, the button's
   *  click fires AFTER the textarea's blur, which has already cleared
   *  selectionStart/selectionEnd — the insert would silently fall back to
   *  "append at the end" instead of the actual cursor position. */
  const preserveSelectionOnClick = { onMouseDown: (e: React.MouseEvent) => e.preventDefault() };

  /** Insert `text` into the last-focused block's textarea at its cursor
   *  (replacing any selection), or append to the end if no block is
   *  focused / the ref is gone. `blockId` overrides which block to target. */
  const insertAtCursor = useCallback(
    (text: string, currentValue: string, onChange: (next: string) => void, blockId?: string) => {
      const id = blockId ?? focusedId.current;
      const el = id ? textareas.current.get(id) : undefined;
      if (!el) {
        onChange(currentValue ? `${currentValue} ${text}` : text);
        return;
      }
      const start = el.selectionStart ?? currentValue.length;
      const end = el.selectionEnd ?? currentValue.length;
      const next = currentValue.slice(0, start) + text + currentValue.slice(end);
      onChange(next);
      const cursor = start + text.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [],
  );

  return { registerTextarea, onFocusBlock, insertAtCursor, preserveSelectionOnClick, focusedId };
}
