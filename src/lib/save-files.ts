// Getting a PNG from the browser into the user's hands, on every device.
//
// One rule set for every preview and share view, lifted from the standard
// deck's share client so the two-slide formats behave the same way:
//   - A device that can share files (iOS Safari, Android Chrome) gets the
//     native share sheet with EVERY file in one call, so "Save Image" puts
//     the whole set into Photos in one go.
//   - Everything else gets a blob-URL download per file.
//   - iOS without file sharing (some in-app browsers): open the blob so the
//     user can long-press and save, since <a download> is a no-op there.
//
// iOS only honours navigator.share inside a user gesture, and a gesture
// expires within a second or so. Callers must have the files BUILT before
// the tap: render them ahead of time, then share the cached File objects.

export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.share === "function"
    && typeof navigator.canShare === "function"
    && files.length > 0
    && navigator.canShare({ files });
}

/** Whether this device can put files on a share sheet at all, decided with a
 *  throwaway PNG so the UI can label the button before any file exists. */
export function deviceSharesFiles(): boolean {
  try {
    return canShareFiles([new File([new Uint8Array([137, 80, 78, 71])], "probe.png", { type: "image/png" })]);
  } catch {
    return false;
  }
}

function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function downloadBlob(file: File) {
  const url = URL.createObjectURL(file);
  if (isIOS()) {
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Save one file. Throws AbortError when the user dismisses the sheet. */
export async function saveFile(file: File): Promise<void> {
  if (canShareFiles([file])) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      // Share refused (an in-app browser, an expired gesture): fall through.
    }
  }
  downloadBlob(file);
}

/** Save a set of files: one share sheet for all of them where the device
 *  allows, one download each otherwise. Throws AbortError on dismiss. */
export async function saveFiles(files: File[], title: string): Promise<void> {
  if (files.length === 0) return;
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
    }
  }
  for (const f of files) await saveFile(f);
}
