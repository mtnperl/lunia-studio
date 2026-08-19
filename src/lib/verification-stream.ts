// NDJSON framing for a streaming verification run.
//
// One JSON object per line. Chosen over SSE because there is no need for event
// names, retry hints or a persistent channel — the run emits a handful of
// frames and ends — and because a line-delimited body is trivial to decode on
// both sides with no protocol library.
//
// Pure and dependency-free: the route encodes with it and the client component
// decodes with it, so the two can never drift out of sync.

import type { VerifyFrame } from "./types";

/** One frame, newline-terminated. Newlines inside strings are JSON-escaped. */
export function encodeFrame(frame: VerifyFrame): string {
  return `${JSON.stringify(frame)}\n`;
}

/**
 * Incremental NDJSON decoder.
 *
 * A network chunk boundary lands wherever it likes, routinely mid-object, so
 * decoding has to buffer the tail until a newline proves the line is complete.
 * Parsing a partial line is the failure that would make a run look like it died
 * halfway, so this never calls JSON.parse on anything but a whole line.
 *
 * Unparseable lines are skipped rather than thrown: one corrupt frame should
 * cost its own unit's progress row, not the entire run.
 */
export function createFrameDecoder(): {
  push: (chunk: string) => VerifyFrame[];
  flush: () => VerifyFrame[];
} {
  let buffer = "";

  function drain(final: boolean): VerifyFrame[] {
    const lines = buffer.split("\n");
    // Without a trailing newline the last element is an incomplete line; hold
    // it back for the next chunk. On flush there is no next chunk, so take it.
    buffer = final ? "" : (lines.pop() ?? "");
    const frames: VerifyFrame[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        frames.push(JSON.parse(trimmed) as VerifyFrame);
      } catch {
        // Skip the malformed line — see the note above.
      }
    }
    return frames;
  }

  return {
    push(chunk: string) {
      buffer += chunk;
      return drain(false);
    },
    flush() {
      return drain(true);
    },
  };
}
