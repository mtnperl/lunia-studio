'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// useLayoutEffect warns during SSR; the slides are client-rendered (and rendered
// in headless Chromium by Remotion), so prefer layout timing in the browser and
// fall back to useEffect on the server to stay quiet.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Scales its child to FIT the bounded box this renders into — shrinking a
 * graphic that's too big for its box, and (up to `maxScale`) growing one
 * that's too small, so a sparse graphic doesn't float at its tiny natural
 * size leaving a dead gap before the citation. The box MUST be
 * height-constrained by its parent (e.g. a `flex: 1 1 auto; min-height: 0;
 * max-height: N; overflow: hidden` zone that can flex-grow to claim slack);
 * FitBox fills 100% of it and clips as a hard backstop.
 *
 * Why this exists: carousel graphics render at fixed pixel sizes (e.g. a 168px
 * hero number). When a slide's headline + body are long, the space left for the
 * graphic shrinks below the graphic's natural height — without scaling, the
 * centred graphic spilled over the citation below it. FitBox guarantees no
 * graphic, old or new, can overlap neighbouring text. Growth is capped well
 * under 2x so a single sparse stat doesn't blow up to a comical size.
 *
 * LEGIBILITY FLOOR: shrink-to-fit alone had no lower bound, so a long
 * headline + body could squeeze the zone to ~40px and the graphic was scaled
 * to ~0.10 — text rendering at ~1.4px on a 1080px slide, illegible but still
 * "in bounds", which is why the overflow harness happily passed it. Below the
 * floor the graphic is DROPPED instead of shrunk: an empty band reads as
 * deliberate space, a microscopic diagram reads as a bug. The drop latches
 * (once out, it stays out) so no measure/re-measure loop can flicker it back.
 *
 * Measurement uses offsetWidth/offsetHeight + clientWidth/clientHeight, which
 * are LAYOUT sizes unaffected by ancestor CSS transforms — so the ratio is
 * correct under the editor's preview `scale` and in Remotion's still render.
 */

/** Hard floor on the scale factor, whatever the type sizes involved. */
const MIN_SCALE = 0.5;
/** Floor on the SMALLEST rendered glyph size, in slide pixels (1080px-wide
 *  slide). Below this, labels stop being readable in-feed. */
const MIN_LEGIBLE_PX = 11;

/** Smallest font-size (px) among descendants that actually paint text. */
function smallestTextPx(root: HTMLElement): number | null {
  let min: number | null = null;
  const walk = (el: Element) => {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim()) {
        const size = parseFloat(getComputedStyle(el as HTMLElement).fontSize);
        if (size > 0 && (min === null || size < min)) min = size;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child as Element);
      }
    }
  };
  walk(root);
  return min;
}

export default function FitBox({
  children,
  align = 'center',
  maxScale = 1.3,
  onDrop,
}: {
  children: React.ReactNode;
  /** Vertical anchor when the scaled child is shorter than the box. */
  align?: 'center' | 'top';
  /** Upper bound on grow-to-fill scaling. 1 disables growth (shrink-only). */
  maxScale?: number;
  /** Fired once when the graphic is dropped for being below the legibility
   *  floor, so the slide can collapse the zone it was occupying. */
  onDrop?: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const droppedRef = useRef(false);
  const [scale, setScale] = useState(1);
  const [dropped, setDropped] = useState(false);

  useIsoLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;

    const measure = () => {
      if (droppedRef.current) return;
      const boxH = box.clientHeight;
      const boxW = box.clientWidth;
      // offset* are pre-transform layout sizes — the child's NATURAL footprint.
      const naturalH = inner.offsetHeight;
      const naturalW = inner.offsetWidth;
      if (!boxH || !naturalH || !naturalW) return;
      const next = Math.min(maxScale, boxH / naturalH, boxW / naturalW);

      // Legibility gate — only ever applies when we're shrinking.
      const smallest = smallestTextPx(inner);
      const illegible = next < 1 && (
        next < MIN_SCALE ||
        (smallest !== null && smallest * next < MIN_LEGIBLE_PX)
      );
      if (illegible) {
        droppedRef.current = true;
        setDropped(true);
        onDrop?.();
        return;
      }

      // Guard against re-render churn / ResizeObserver loops.
      setScale((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children, maxScale, onDrop]);

  if (dropped) return null;

  return (
    <div
      ref={boxRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        justifyContent: 'center',
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: '100%',
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: align === 'center' ? 'center center' : 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
