/**
 * Pre-bundles the Remotion composition to public/remotion/ so the render
 * API can use it as a serve URL without needing webpack at render time.
 *
 * Run automatically via `prebuild` in package.json before every `npm run build`.
 * The bundle is excluded from git via .gitignore.
 */
import { bundle } from "@remotion/bundler";
import path from "path";
import { fileURLToPath } from "url";
import { rm, mkdir } from "fs/promises";

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
