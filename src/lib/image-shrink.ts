// Get an oversized photo under the upload ceiling, in the browser.
//
// A camera-resolution photo is routinely 8–12 MB. Before this, both upload
// buttons answered one with "File too large. Maximum size is 5 MB." and left
// you to go and find an image editor — for a picture the app was going to
// downscale into an email anyway.
//
// The ceiling that actually bites is not our own 5 MB check: Vercel rejects a
// request body over 4.5 MB before the route runs at all, so a 4.7 MB file
// failed with a platform error rather than ours. Hence a 4 MB target, with
// room underneath for the multipart envelope.
//
// Browser-only — every path here needs `document` and `canvas`. Import it from
// client components.

/** Files at or above this are re-encoded before upload. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function fmtSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Whether this file both needs shrinking and can be shrunk.
 *
 * GIFs are excluded deliberately: a canvas keeps a single frame, so
 * "shrinking" an animation would quietly throw the animation away and hand
 * back a still. SVG is vector and never large enough to be the problem.
 */
export function needsShrinking(file: File): boolean {
  if (file.size <= MAX_UPLOAD_BYTES) return false;
  return file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
}

/** Progressively smaller passes. The first that fits wins, so a mildly
 *  oversized photo keeps most of its resolution instead of being flattened to
 *  the smallest setting on principle. */
const ATTEMPTS: { edge: number; quality: number }[] = [
  { edge: 2400, quality: 0.85 },
  { edge: 2000, quality: 0.8 },
  { edge: 1600, quality: 0.75 },
  { edge: 1200, quality: 0.7 },
];

/**
 * Re-encode a photo to fit under MAX_UPLOAD_BYTES.
 *
 * WebP rather than JPEG: it keeps transparency — a PNG cut-out flattened onto
 * black would be a worse outcome than the file size it was avoiding — and
 * compresses harder at the same visual quality.
 *
 * Never throws. An image that cannot be decoded comes back untouched, so a
 * failure here costs some quality at worst and never the upload itself.
 */
export function shrinkForUpload(file: File): Promise<{ blob: Blob; name: string }> {
  const rename = (n: string) => `${n.replace(/\.[^.]+$/, "")}.webp`;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ blob: file, name: file.name });

      let best: Blob | null = null;
      for (const { edge, quality } of ATTEMPTS) {
        const scale = Math.min(1, edge / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
        if (!blob) continue;
        best = blob;
        if (blob.size <= MAX_UPLOAD_BYTES) break;
      }
      resolve(best ? { blob: best, name: rename(file.name) } : { blob: file, name: file.name });
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve({ blob: file, name: file.name }); };
    img.src = url;
  });
}
