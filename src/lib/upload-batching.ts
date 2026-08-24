// Pack a pile of chosen files into upload requests.
//
// Vercel rejects a request body over 4.5 MB before the route runs, so a bulk
// drop cannot be one request. Splitting is also what keeps the library's
// single Redis key safe: each request appends once, and the client sends the
// requests one after another, so two appends are never in flight together.

/** Bytes per request, with room under the 4.5 MB body limit for the multipart
 *  envelope. */
export const CHUNK_BYTES = 3.5 * 1024 * 1024;

/** Files per request. Matches the route's own cap, and bounds how much work a
 *  single function invocation takes on — each file there is a blob write plus
 *  a caption call. */
export const CHUNK_FILES = 8;

export type PreparedFile = { blob: Blob; name: string };

/**
 * Greedy packing, preserving the order the files were chosen in.
 *
 * Not optimal packing, and it does not need to be: the order matters more,
 * because it makes the progress count move in the order shown in the picker.
 * A single file over the byte budget still gets its own request rather than
 * being dropped for not fitting — the route's own size check is the thing
 * entitled to refuse it, not this.
 */
export function chunkForUpload(
  files: PreparedFile[],
  maxBytes = CHUNK_BYTES,
  maxFiles = CHUNK_FILES,
): PreparedFile[][] {
  const out: PreparedFile[][] = [];
  let current: PreparedFile[] = [];
  let bytes = 0;

  for (const f of files) {
    if (current.length > 0 && (bytes + f.blob.size > maxBytes || current.length >= maxFiles)) {
      out.push(current);
      current = [];
      bytes = 0;
    }
    current.push(f);
    bytes += f.blob.size;
  }
  if (current.length > 0) out.push(current);
  return out;
}
