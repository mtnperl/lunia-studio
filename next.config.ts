import type { NextConfig } from "next";
import path from "path";

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
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
