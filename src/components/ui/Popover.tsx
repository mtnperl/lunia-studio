"use client";
import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { usePosition, type Placement } from "./usePosition";

/** Floating panel anchored to an element. Closes on Escape and on outside
 *  click. Focus moves into the popover on open and back to the opener on
 *  close. For lists of actions use `Menu`, which builds on this and adds
 *  roving focus. */
export function Popover({ open, onClose, anchorRef, anchorRect, placement = "bottom-start", children, menu = false, ariaLabel, width }: {
  open: boolean;
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  /** Alternative to `anchorRef`: an explicit rect (for context menus at the pointer). */
  anchorRect?: DOMRect | null;
  placement?: Placement;
  children: ReactNode;
  menu?: boolean;
  ariaLabel?: string;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  // Written in a layout effect declared BEFORE usePosition so the rect is in
  // place when the positioning effect runs in the same commit.
  useLayoutEffect(() => { rectRef.current = anchorRect ?? null; }, [anchorRect]);
  const anchor: RefObject<HTMLElement | null> | RefObject<DOMRect | null> = anchorRect !== undefined || !anchorRef ? rectRef : anchorRef;
  usePosition(anchor, ref, open, placement);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>("[autofocus], button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    (first ?? el)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchorRef?.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      role={menu ? "menu" : "dialog"}
      aria-label={ariaLabel}
      tabIndex={-1}
      className={`ui-popover${menu ? " ui-popover--menu" : ""}`}
      style={{ top: 0, left: 0, visibility: "hidden", width }}
    >
      {children}
    </div>,
    document.body,
  );
}
