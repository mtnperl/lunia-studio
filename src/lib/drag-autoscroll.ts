/**
 * Edge auto-scroll for a drag happening inside the campaign preview iframe.
 *
 * The preview iframe is sized to its content and has no scrollbar of its own —
 * the editor page scrolls instead. So a drag started inside the iframe can
 * never reach a block below the fold: the pointer runs out of window, and
 * nothing moves the page. The iframe reports its pointer position out, and the
 * editor scrolls on its behalf.
 *
 * The ramp lives here, apart from the requestAnimationFrame loop that drives
 * it, because a hidden tab pauses rAF entirely — which makes the loop
 * unobservable in a headless check while this function stays perfectly
 * testable.
 */

export type AutoScrollGeometry = {
  /** Pointer position in PAGE coordinates. */
  pageY: number;
  /** Height of the visible window. */
  viewportHeight: number;
  /** Distance from an edge at which scrolling starts. */
  edge?: number;
  /** Pixels per frame at the very edge. */
  max?: number;
};

/**
 * Pixels to scroll this frame. Negative is up.
 *
 * Speed ramps with depth into the edge zone rather than switching on: a
 * pointer resting just inside the boundary creeps, and one pinned to the edge
 * moves at full speed. A flat rate makes precise drops near the fold
 * impossible because the page runs away the moment you enter the zone.
 */
export function autoScrollDelta({
  pageY,
  viewportHeight,
  edge = 90,
  max = 18,
}: AutoScrollGeometry): number {
  // A viewport smaller than two edge zones would have them overlap, and every
  // position would scroll in both directions. Nothing sensible to do — hold.
  if (viewportHeight <= edge * 2) return 0;

  if (pageY < edge) {
    const depth = (edge - Math.max(0, pageY)) / edge; // 0 at the boundary, 1 at the top
    return -max * depth;
  }
  const bottom = viewportHeight - edge;
  if (pageY > bottom) {
    const depth = (Math.min(pageY, viewportHeight) - bottom) / edge;
    return max * depth;
  }
  return 0;
}

/**
 * Convert a pointer reported in the iframe's own unscaled coordinates into a
 * page position.
 *
 * The scale is derived from live geometry rather than passed in: the preview
 * is CSS-transformed, and the message listener that drives the loop has an
 * empty dependency array, so anything captured from the first render is stale
 * — including the scale, which is 0 before the pane has been measured.
 */
export function iframePointToPageY(
  rectTop: number,
  rectHeight: number,
  nativeHeight: number,
  pointerY: number,
): number {
  const scale = nativeHeight > 0 ? rectHeight / nativeHeight : 1;
  return rectTop + pointerY * scale;
}
