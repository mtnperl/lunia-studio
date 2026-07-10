import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["remotion", "@remotion/player", "@remotion/lambda"],
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "@sparticuz/chromium",
    // Platform-specific compositor binaries loaded dynamically by @remotion/renderer
    "@remotion/compositor-linux-x64-gnu",
    "@remotion/compositor-linux-x64-musl",
    "@remotion/compositor-linux-arm64-gnu",
    "@remotion/compositor-linux-arm64-musl",
    "@remotion/compositor-darwin-x64",
    "@remotion/compositor-darwin-arm64",
    "@remotion/compositor-win32-x64-msvc",
  ],
  // Native binaries are not JS — file tracing won't detect them automatically.
  // Explicitly include them so Vercel deploys them alongside the render function.
  // Native binaries are not JS — file tracing won't detect them automatically.
  // Explicitly include them so Vercel deploys them alongside each Puppeteer route.
  outputFileTracingIncludes: {
    "/api/video/render": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/@remotion/compositor-*/**/*",
      "./public/remotion/**/*",
    ],
    "/api/carousel/export": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/carousel/generate-pdf": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    // v2 Chromium routes — these were added without tracing the brotli-packed
    // Chromium binary, so the functions shipped without bin/ and threw
    // "input directory .../@sparticuz/chromium/bin does not exist" at launch.
    // That silently broke Preview HD (no fallback) and made the crisp/in-bounds
    // PNG + PDF paths fall back to html-to-image in prod.
    "/api/carousel-v2/render-slide": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/carousel-v2/export": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/carousel-v2/generate-pdf": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
  turbopack: {
    // Project root. Avoid `__dirname` — it is undefined when Vercel's build
    // CLI evaluates this ESM config, which crashed the deploy. `process.cwd()`
    // is the project root during both `next build` and `next dev`.
    root: process.cwd(),
  },
};

export default nextConfig;
