"use client";
import { useLayoutEffect, type RefObject } from "react";

export type Placement = "top" | "bottom" | "left" | "right" | "bottom-start" | "bottom-end" | "top-start" | "top-end";

/** Positions a fixed-position floating element next to an anchor, flipping to
 *  the opposite side when it would leave the viewport and clamping to the
 *  edges. Writes `top`, `left` and `visibility` straight onto the floating
 *  element, so there is no render round-trip and no layout flash. Render the
 *  floating element with `visibility: hidden` and let this reveal it. */
export function usePosition(
  anchor: RefObject<HTMLElement | null> | RefObject<DOMRect | null>,
  floating: RefObject<HTMLElement | null>,
  open: boolean,
  placement: Placement = "bottom-start",
  gap = 6,
) {
  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const cur = anchor.current;
      const a = cur instanceof DOMRect ? cur : cur?.getBoundingClientRect();
      const el = floating.current;
      const f = el?.getBoundingClientRect();
      if (!a || !f || !el) return;
      const vw = window.innerWidth, vh = window.innerHeight, pad = 8;
      let side = placement.split("-")[0] as "top" | "bottom" | "left" | "right";
      const align = placement.split("-")[1] as "start" | "end" | undefined;
      if (side === "bottom" && a.bottom + gap + f.height > vh - pad && a.top - gap - f.height > pad) side = "top";
      else if (side === "top" && a.top - gap - f.height < pad && a.bottom + gap + f.height < vh - pad) side = "bottom";
      else if (side === "right" && a.right + gap + f.width > vw - pad && a.left - gap - f.width > pad) side = "left";
      else if (side === "left" && a.left - gap - f.width < pad && a.right + gap + f.width < vw - pad) side = "right";
      let top = 0, left = 0;
      if (side === "bottom" || side === "top") {
        top = side === "bottom" ? a.bottom + gap : a.top - gap - f.height;
        left = align === "end" ? a.right - f.width : align === "start" ? a.left : a.left + a.width / 2 - f.width / 2;
      } else {
        left = side === "right" ? a.right + gap : a.left - gap - f.width;
        top = a.top + a.height / 2 - f.height / 2;
      }
      left = Math.max(pad, Math.min(left, vw - f.width - pad));
      top = Math.max(pad, Math.min(top, vh - f.height - pad));
      el.style.setProperty("top", `${Math.round(top)}px`);
      el.style.setProperty("left", `${Math.round(left)}px`);
      el.style.setProperty("visibility", "visible");
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, placement, gap, anchor, floating]);
}
