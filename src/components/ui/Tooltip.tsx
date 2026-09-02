"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePosition, type Placement } from "./usePosition";
import { Shortcut } from "./Kbd";

/** Hover and focus tooltip. Appears after a short delay, never on touch, and
 *  is announced through `aria-describedby` on the wrapped control. Pass
 *  `shortcut` to show key caps next to the label ("mod+s"). Wraps its child
 *  in a `display: contents` span so layout is untouched. */
export function Tooltip({ label, shortcut, placement = "top", delay = 400, children }: {
  label: ReactNode;
  shortcut?: string;
  placement?: Placement;
  delay?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const tip = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);
  const id = useId();
  usePosition(anchor, tip, open, placement, 8);

  useEffect(() => {
    const target = wrap.current?.firstElementChild as HTMLElement | null;
    anchor.current = target;
    if (!target) return;
    if (open) target.setAttribute("aria-describedby", id);
    else if (target.getAttribute("aria-describedby") === id) target.removeAttribute("aria-describedby");
  }, [open, id]);

  const show = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), delay); };
  const hide = () => { if (timer.current) window.clearTimeout(timer.current); setOpen(false); };

  return (
    <>
      <span
        ref={wrap}
        style={{ display: "contents" }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onTouchStart={hide}
      >
        {children}
      </span>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={tip} id={id} role="tooltip" className="ui-tooltip" style={{ top: 0, left: 0, visibility: "hidden" }}>
          <span>{label}</span>
          {shortcut && <Shortcut keys={shortcut} />}
        </div>,
        document.body,
      )}
    </>
  );
}
