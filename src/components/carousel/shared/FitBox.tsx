'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// useLayoutEffect warns during SSR; the slides are client-rendered (and rendered
// in headless Chromium by Remotion), so prefer layout timing in the browser and
// fall back to useEffect on the server to stay quiet.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Scales its child DOWN (never up — capped at scale 1) so the child always fits
 * inside the bounded box this renders into. The box MUST be height-constrained
 * by its parent (e.g. a `flex: 1 1 0; min-height: 0; overflow: hidden` zone);
 * FitBox fills 100% of it and clips as a hard backstop.
 *
 * Why this exists: carousel graphics render at fixed pixel sizes (e.g. a 168px
 * hero number). When a slide's headline + body are long, the space left for the
 * graphic shrinks below the graphic's natural height — without scaling, the
 * centred graphic spilled over the citation below it. FitBox guarantees no
 * graphic, old or new, can overlap neighbouring text.
 *
 * Measurement uses offsetWidth/offsetHeight + clientWidth/clientHeight, which
 * are LAYOUT sizes unaffected by ancestor CSS transforms — so the ratio is
 * correct under the editor's preview `scale` and in Remotion's still render.
 */
export default function FitBox({
  children,
  align = 'center',
}: {
  children: React.ReactNode;
  /** Vertical anchor when the scaled child is shorter than the box. */
  align?: 'center' | 'top';
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useIsoLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;

    const measure = () => {
      const boxH = box.clientHeight;
      const boxW = box.clientWidth;
      // offset* are pre-transform layout sizes — the child's NATURAL footprint.
      const naturalH = inner.offsetHeight;
      const naturalW = inner.offsetWidth;
      if (!boxH || !naturalH || !naturalW) return;
      const next = Math.min(1, boxH / naturalH, boxW / naturalW);
      // Guard against re-render churn / ResizeObserver loops.
      setScale((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);

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
