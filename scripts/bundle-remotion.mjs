/**
 * Pre-bundles the Remotion composition to public/remotion/ so the render
 * API can use it as a serve URL without needing webpack at render time.
 *
 * The bundle is committed to git so Vercel deployments always have it.
 * On Vercel (VERCEL=1) or when --skip-on-vercel is passed, this is a no-op.
 * To rebuild locally: npm run bundle-remotion
 */
import { bundle } from "@remotion/bundler";
import path from "path";
import { fileURLToPath } from "url";
import { rm, mkdir } from "fs/promises";

// Skip on Vercel — bundle is committed to git, no need to rebuild
if (process.env.VERCEL === "1" || process.argv.includes("--skip-on-vercel")) {
  console.log("Skipping Remotion bundle (running on Vercel — using committed bundle).");
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entryPoint = path.join(__dirname, "../src/remotion/Root.tsx");
const outDir = path.join(__dirname, "../public/remotion");
// Empty publicDir prevents the bundler from copying public/ into the output.
// This avoids infinite recursion when outDir is itself inside public/.
const emptyPublicDir = path.join(__dirname, "../.remotion-public-empty");

// Clean previous bundle and prepare empty public dir
await rm(outDir, { recursive: true, force: true });
await mkdir(emptyPublicDir, { recursive: true });

console.log("Bundling Remotion composition...");

const bundlePath = await bundle({
  entryPoint,
  outDir,
  publicDir: emptyPublicDir,
  onProgress: (v) => process.stdout.write(`\r  ${v}%  `),
  webpackOverride: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@": path.join(__dirname, "../src"),
      },
    },
  }),
});

console.log(`\nBundle ready: ${bundlePath}`);
