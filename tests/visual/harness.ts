// Visual-regression harness core — shared by the carousel + email suites.
//
// Responsibilities:
//   - screenshot a URL in headless Chromium at a fixed viewport
//   - compare a PNG buffer against an approved baseline with pixelmatch
//   - in --update mode, (re)write the baseline instead of comparing
//
// A test FAILS when either the pixel-diff ratio exceeds THRESHOLD or the
// caller reports a hard layout violation (out-of-bounds / clipped content).
// The pixel diff catches silent visual drift; the layout assertion catches the
// specific overflow-past-bounds class of bug this suite exists to prevent.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export const UPDATE = process.argv.includes("--update") || process.env.UPDATE_BASELINES === "1";
export const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:3030";

const ROOT = path.join(process.cwd(), "tests", "visual");
const BASELINE_DIR = path.join(ROOT, "baselines");
const OUTPUT_DIR = path.join(ROOT, "output");

/** Max fraction of differing pixels tolerated before a case fails. Small but
 *  non-zero: antialiasing and sub-pixel font hinting vary slightly across
 *  Chromium patch releases. Real overflow moves far more than this. */
export const THRESHOLD = 0.001;

for (const d of [BASELINE_DIR, OUTPUT_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

export type DiffResult =
  | { status: "updated" }
  | { status: "created" }
  | { status: "ok"; ratio: number }
  | { status: "diff"; ratio: number; diffPath: string }
  | { status: "size-mismatch"; expected: string; actual: string };

/** Compare (or in UPDATE mode, write) a screenshot against its baseline. */
export function compareToBaseline(name: string, actual: Buffer): DiffResult {
  const baselinePath = path.join(BASELINE_DIR, `${name}.png`);
  const actualPath = path.join(OUTPUT_DIR, `${name}.png`);
  // `name` may contain a subdir (e.g. "carousel/foo") — ensure it exists.
  mkdirSync(path.dirname(baselinePath), { recursive: true });
  mkdirSync(path.dirname(actualPath), { recursive: true });
  writeFileSync(actualPath, actual);

  if (UPDATE || !existsSync(baselinePath)) {
    writeFileSync(baselinePath, actual);
    return { status: UPDATE ? "updated" : "created" };
  }

  const base = PNG.sync.read(readFileSync(baselinePath));
  const cur = PNG.sync.read(actual);
  if (base.width !== cur.width || base.height !== cur.height) {
    return {
      status: "size-mismatch",
      expected: `${base.width}x${base.height}`,
      actual: `${cur.width}x${cur.height}`,
    };
  }

  const diff = new PNG({ width: base.width, height: base.height });
  const mismatched = pixelmatch(base.data, cur.data, diff.data, base.width, base.height, {
    threshold: 0.1,
  });
  const ratio = mismatched / (base.width * base.height);
  if (ratio > THRESHOLD) {
    const diffPath = path.join(OUTPUT_DIR, `${name}.diff.png`);
    writeFileSync(diffPath, PNG.sync.write(diff));
    return { status: "diff", ratio, diffPath };
  }
  return { status: "ok", ratio };
}
