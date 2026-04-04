import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["remotion", "@remotion/player", "@remotion/lambda"],
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "@sparticuz/chromium",
  ],
  // Chromium brotli binaries are not JS — file tracing won't detect them automatically.
  // Explicitly include them so Vercel deploys them alongside the render function.
  outputFileTracingIncludes: {
    "/api/video/render": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
