import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUNIA SCRIPT STUDIO",
  description: "UGC script generator for Lunia Life",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
