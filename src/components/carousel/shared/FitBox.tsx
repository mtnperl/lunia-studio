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
 * Measurement uses offsetWidth/offsetHeight + clientWidth/clientHeight, which
 * are LAYOUT sizes unaffected by ancestor CSS transforms — so the ratio is
 * correct under the editor's preview `scale` and in Remotion's still render.
 */
export default function FitBox({
  children,
  align = 'center',
  maxScale = 1.3,
}: {
  children: React.ReactNode;
  /** Vertical anchor when the scaled child is shorter than the box. */
  align?: 'center' | 'top';
  /** Upper bound on grow-to-fill scaling. 1 disables growth (shrink-only). */
  maxScale?: number;
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
      const next = Math.min(maxScale, boxH / naturalH, boxW / naturalW);
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
