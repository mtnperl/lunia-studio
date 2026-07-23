"use client";
import { useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "ref" | "value"> & {
  value: string;
  /** Optional external ref callback (e.g. the insert-at-cursor
   *  registerTextarea) merged with the internal auto-resize ref. */
  registerRef?: (el: HTMLTextAreaElement | null) => void;
  /** Floor height in px so an empty field isn't a single cramped line. */
  minHeight?: number;
};

/** A textarea that grows to fit its content — no manual drag-resize, no
 *  inner scrollbar, no re-dragging every time the copy changes. Resizes on
 *  input AND whenever `value` changes externally (undo/redo, AI improve,
 *  insert-at-cursor), so it always shows the whole text. */
export function AutoTextarea({ value, registerRef, minHeight = 48, style, onInput, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      ref.current = el;
      registerRef?.(el);
    },
    [registerRef],
  );

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [minHeight]);

  // Runs before paint on every value change (typing, undo, AI rewrite, insert).
  useLayoutEffect(() => { resize(); }, [value, resize]);

  return (
    <textarea
      {...rest}
      ref={setRef}
      value={value}
      onInput={(e) => { resize(); onInput?.(e); }}
      style={{ ...style, resize: "none", overflow: "hidden" }}
    />
  );
}
