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
