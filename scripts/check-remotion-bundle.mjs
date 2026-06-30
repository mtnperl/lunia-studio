/**
 * Drift guard for the committed Remotion bundle (public/remotion).
 *
 * Why this exists: `prebuild` is `--skip-on-vercel`, so production serves the
 * COMMITTED public/remotion/*.js — Vercel never rebuilds it. If someone edits a
 * carousel graphic / slide (src/components/carousel/**) or the Remotion entry
 * (src/remotion/**) but forgets to run `npm run bundle-remotion`, the live
 * in-app preview (built from source) silently diverges from every HD render and
 * exported PNG (built from the stale bundle) — with no error anywhere.
 *
 * This script rebuilds the bundle into a TEMP dir and compares only the served
 * `.js` files against what's committed. It never touches public/remotion, so
 * it's safe to run locally (`npm run check:bundle`) as well as in CI.
 *
 * Source maps (*.map) are intentionally ignored: they embed the absolute build
 * path (e.g. /Users/you/lunia-studio vs /home/runner/...), so they differ per
 * machine and are not part of the rendered output.
 *
 * Exit 0 = in sync. Exit 1 = drift (with the list of stale files + the fix).
 */
import { bundle } from "@remotion/bundler";
import { readFile, readdir, rm, mkdir, mkdtemp } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const committedDir = path.join(repoRoot, "public", "remotion");

/** sha256 → hex of a file's bytes. */
async function hashFile(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

/** Map of { "<filename>": "<sha256>" } for every served .js in a dir (no .map). */
async function jsHashes(dir) {
  const entries = await readdir(dir).catch(() => []);
  const jsFiles = entries.filter((f) => f.endsWith(".js"));
  const out = {};
  for (const f of jsFiles) out[f] = await hashFile(path.join(dir, f));
  return out;
}

async function buildToTemp() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "remotion-drift-"));
  const emptyPublicDir = await mkdtemp(path.join(os.tmpdir(), "remotion-empty-"));
  await mkdir(outDir, { recursive: true });
  await bundle({
    entryPoint: path.join(repoRoot, "src", "remotion", "Root.tsx"),
    outDir,
    publicDir: emptyPublicDir,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: { ...config.resolve?.alias, "@": path.join(repoRoot, "src") },
      },
    }),
  });
  return { outDir, emptyPublicDir };
}

console.log("Rebuilding Remotion bundle into a temp dir to check for drift…");
const { outDir, emptyPublicDir } = await buildToTemp();

try {
  const [fresh, committed] = await Promise.all([
    jsHashes(outDir),
    jsHashes(committedDir),
  ]);

  const drifted = [];
  const stale = []; // committed file content differs from a fresh build
  const orphan = []; // committed but no longer produced

  for (const [file, hash] of Object.entries(fresh)) {
    if (!(file in committed)) drifted.push(`${file} (missing from public/remotion)`);
    else if (committed[file] !== hash) stale.push(file);
  }
  for (const file of Object.keys(committed)) {
    if (!(file in fresh)) orphan.push(`${file} (no longer produced by the build)`);
  }

  const problems = [...drifted, ...stale.map((f) => `${f} (out of date)`), ...orphan];

  if (problems.length === 0) {
    console.log(`✓ public/remotion is in sync with source (${Object.keys(committed).length} served .js files).`);
    process.exit(0);
  }

  console.error("\n✗ Committed Remotion bundle is STALE — it does not match the current source.\n");
  for (const p of problems) console.error(`  • ${p}`);
  console.error(
    "\nThe in-app preview will diverge from HD renders and exported PNGs.\n" +
      "Fix:\n" +
      "  npm run bundle-remotion\n" +
      "  git add public/remotion && git commit\n",
  );
  process.exit(1);
} finally {
  await rm(outDir, { recursive: true, force: true });
  await rm(emptyPublicDir, { recursive: true, force: true });
}
