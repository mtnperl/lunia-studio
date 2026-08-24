import type { Metadata } from "next";
import "./globals.css";
import { GOOGLE_FONTS_CSS_URL_UI } from "@/lib/brand-tokens";

export const metadata: Metadata = {
  title: "Lunia Studio",
  description: "Creator productivity suite for Lunia Life",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fonts load here, not from globals.css. A remote `@import` in the
            stylesheet is dropped by Tailwind v4's bundler — silently, with the
            page still rendering in fallback faces — which is how the whole app
            ran on system fonts while the headless capture, which uses a <link>
            of its own, rendered the real ones. Same family list as the capture,
            so the preview and the exported PNG measure identically. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_CSS_URL_UI} />
      </head>
      <body>{children}</body>
    </html>
  );
}
