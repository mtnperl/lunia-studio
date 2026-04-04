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
import { rm } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entryPoint = path.join(__dirname, "../src/remotion/Root.tsx");
const outDir = path.join(__dirname, "../public/remotion");

// Clean previous bundle
await rm(outDir, { recursive: true, force: true });

console.log("Bundling Remotion composition...");

const bundlePath = await bundle({
  entryPoint,
  outDir,
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
