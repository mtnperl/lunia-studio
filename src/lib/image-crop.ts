// What shape each block image has to be, and the arithmetic for cropping to it.
//
// Generated images have always been cropped to an exact aspect by
// cropToAspect. Library picks and pasted URLs were not, and email HTML renders
// with `height:auto` — it shows whatever shape the source is. Two grid cells
// with different source aspects therefore render at different heights and
// their captions cannot line up. Cropping on the way in is the only fix an
// inbox will honour.
import type { ImageCrop } from "./types";

/** width / height. */
export type AspectRatio = number;

export const ASPECTS = {
  square: 1,
  portrait: 4 / 5,
  landscape: 16 / 9,
} as const;

/**
 * The ratio behind the aspect NAME the image controls already pass to the
 * generator. Deriving from that rather than from the block kind is what makes
 * a generated and a picked image on the same block come out the same shape —
 * there is one source of truth for "what shape does this slot want", and it is
 * the prop that was already there.
 */
export function aspectRatioFor(name: string | undefined): AspectRatio {
  switch (name) {
    case "16:9": return ASPECTS.landscape;
    case "4:5": return ASPECTS.portrait;
    // "1:1" and anything unrecognised. Square keeps two grid cells the same
    // height, which is the whole point of cropping them.
    default: return ASPECTS.square;
  }
}

/** The largest centred region of a `sw`x`sh` image with the given aspect,
 *  expressed as fractions. This is the default crop — what you get before
 *  touching anything. */
export function centreCrop(sw: number, sh: number, aspect: AspectRatio): ImageCrop {
  if (!(sw > 0) || !(sh > 0)) return { x: 0, y: 0, w: 1, h: 1 };
  const sourceAspect = sw / sh;
  if (sourceAspect > aspect) {
    // Source is wider than the target: keep full height, trim the sides.
    const w = aspect / sourceAspect;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  // Taller than the target: keep full width, trim top and bottom.
  const h = sourceAspect / aspect;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}

/** Hold a crop inside the image. A pan that would run off the edge stops at
 *  it rather than exposing blank space — there is no pixel data out there, so
 *  allowing it would only produce a border the user did not ask for. */
export function clampCrop(c: ImageCrop): ImageCrop {
  const w = Math.min(1, Math.max(0.05, c.w));
  const h = Math.min(1, Math.max(0.05, c.h));
  return {
    w, h,
    x: Math.min(1 - w, Math.max(0, c.x)),
    y: Math.min(1 - h, Math.max(0, c.y)),
  };
}

/**
 * Re-scale a crop around its own centre. `factor` > 1 keeps more of the source
 * (zooms out), < 1 keeps less (zooms in). The aspect is preserved because both
 * sides scale together, and the result is clamped, so zooming out near an edge
 * slides the region inward rather than off.
 */
export function zoomCrop(c: ImageCrop, factor: number): ImageCrop {
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const w = c.w * factor;
  const h = c.h * factor;
  // Cap at the largest region that still fits, so a zoom-out cannot change
  // the aspect by hitting one edge before the other.
  const fit = Math.min(1 / w, 1 / h, 1);
  const fw = w * fit;
  const fh = h * fit;
  return clampCrop({ x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh });
}

// ─── Zoom as a level, not as a region size ──────────────────────────────────
//
// The zoom control used to read `min(crop.w, crop.h)` as its position. That is
// not a zoom measure: for a 1024x1536 source cropped square the base region is
// already {w:1, h:0.667}, so the slider opened at 33 out of 100 and the bottom
// third of the track was unreachable — every drag into it snapped the thumb
// back out from under the cursor, which is what "it moves when I zoom" was.
//
// Zoom is measured against the BASE instead: the largest region of the right
// aspect that fits, which is what you see before touching anything. Level 1 is
// that region, and the whole track is live whatever shape the source is.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

/** How far the current region is zoomed in, relative to the base. */
export function zoomLevelOf(base: ImageCrop, current: ImageCrop): number {
  if (!(current.w > 0)) return MIN_ZOOM;
  return clampZoom(base.w / current.w);
}

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/**
 * The region at zoom level `z`, keeping `current`'s centre.
 *
 * Derived from `base` rather than from the current region, so the level always
 * means the same thing and repeated moves cannot drift: setting 2 twice lands
 * in the same place, and there is no dead zone at either end.
 */
export function zoomTo(base: ImageCrop, current: ImageCrop, z: number): ImageCrop {
  const level = clampZoom(z);
  const cx = current.x + current.w / 2;
  const cy = current.y + current.h / 2;
  const w = base.w / level;
  const h = base.h / level;
  return clampCrop({ x: cx - w / 2, y: cy - h / 2, w, h });
}

/**
 * Centre the region on a point of the SOURCE, given in fractions where
 * (0,0) is the top-left and (1,1) the bottom-right.
 *
 * Dragging already moves the region, but "which part of this photo is the
 * subject" is a thing you know before you start nudging, and on an axis with
 * no slack — a portrait cropped square at zoom 1 has no horizontal play at
 * all — dragging silently does nothing. Asking directly always lands
 * somewhere: the clamp turns an unreachable anchor into the nearest reachable
 * one rather than refusing.
 */
export function anchorCrop(c: ImageCrop, ax: number, ay: number): ImageCrop {
  return clampCrop({ ...c, x: ax - c.w / 2, y: ay - c.h / 2 });
}

/** The nine anchors, in reading order. Values are the point of the source that
 *  ends up centred. */
export const ANCHORS: { x: number; y: number; label: string }[] = [
  { x: 0,   y: 0,   label: "Top left" },
  { x: 0.5, y: 0,   label: "Top" },
  { x: 1,   y: 0,   label: "Top right" },
  { x: 0,   y: 0.5, label: "Left" },
  { x: 0.5, y: 0.5, label: "Centre" },
  { x: 1,   y: 0.5, label: "Right" },
  { x: 0,   y: 1,   label: "Bottom left" },
  { x: 0.5, y: 1,   label: "Bottom" },
  { x: 1,   y: 1,   label: "Bottom right" },
];

/** Where the region sits on one axis: 0, 0.5, 1, or null when it is between.
 *
 *  An axis with no slack reports 0.5. That is not a fudge — a portrait cropped
 *  square is pinned horizontally, so left, centre and right are all the same
 *  position, and reporting "left" there would light up a button the user did
 *  not press. Centre is the honest answer for an axis with no choice in it. */
function axisAnchor(pos: number, size: number): number | null {
  const slack = 1 - size;
  if (slack <= 1e-9) return 0.5;
  const t = pos / slack;
  for (const v of [0, 0.5, 1]) if (Math.abs(t - v) < 1e-6) return v;
  return null;
}

/** Which anchor the region is sitting on, or null if it is between them.
 *  Drives the pressed state, so dragging clears it rather than leaving a
 *  button looking selected when the frame has moved off it. */
export function activeAnchor(c: ImageCrop): { x: number; y: number } | null {
  const x = axisAnchor(c.x, c.w);
  const y = axisAnchor(c.y, c.h);
  return x === null || y === null ? null : { x, y };
}

/** The crop in source pixels, ready for canvas drawImage. */
export function cropToPixels(c: ImageCrop, sw: number, sh: number) {
  return {
    sx: Math.round(c.x * sw),
    sy: Math.round(c.y * sh),
    sWidth: Math.max(1, Math.round(c.w * sw)),
    sHeight: Math.max(1, Math.round(c.h * sh)),
  };
}

/** Output size for a cropped image. Width is fixed at the largest the email
 *  ever renders these at (552px inset column, doubled for retina); height
 *  follows the aspect. Bigger would be bytes nobody sees. */
export const CROP_OUTPUT_WIDTH = 1104;
export function outputSize(aspect: AspectRatio) {
  return { width: CROP_OUTPUT_WIDTH, height: Math.round(CROP_OUTPUT_WIDTH / aspect) };
}
