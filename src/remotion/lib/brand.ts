"use client";

import type { VideoStyle } from "@/lib/types";

export const BRAND = {
  // Brand colors
  bg: "#102635",
  surface: "#2c3f51",
  text: "#F7F4EF",
  muted: "#8faabb",
  accent: "#ffd800",        // yellow
  accentDim: "rgba(255,216,0,0.15)",
  secondary: "#bffbf8",     // cyan — stat numbers, highlights
  border: "#1e3548",

  // Typography sizes (px at 1080w) — scale with fontScale prop
  fontDisplay: 96,
  fontHero: 80,
  fontHeadline: 60,
  fontSubline: 34,
  fontStat: 128,
  fontCaption: 24,

  // Font family — Helvetica; falls back to Arial for Lambda renders
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",

  // Spacing
  paddingX: 64,
  paddingY: 80,
} as const;

export type BrandTokens = typeof BRAND;

export type SceneStyleTokens = {
  bg: string;
  surface: string;
  overlayOpacity: number;
  accentColor: string;
  headlineColor: string;
  sublineColor: string;
  statColor: string;
  captionColor: string;
  fontHero: number;
  fontHeadline: number;
  fontSubline: number;
};

export function getSceneStyle(videoStyle: VideoStyle = "cinematic"): SceneStyleTokens {
  switch (videoStyle) {
    case "serene":
      return {
        bg: "#1a3a4a",
        surface: "#243d4f",
        overlayOpacity: 0.18,          // near-transparent → image shows through fully
        accentColor: BRAND.secondary,  // cyan accent
        headlineColor: BRAND.text,
        sublineColor: "rgba(191,251,248,0.85)",
        statColor: BRAND.accent,
        captionColor: BRAND.muted,
        fontHero: Math.round(BRAND.fontHero * 0.9),
        fontHeadline: Math.round(BRAND.fontHeadline * 0.95),
        fontSubline: BRAND.fontSubline,
      };
    case "bold":
      return {
        bg: "#000000",
        surface: "#0d0d0d",
        overlayOpacity: 0.0,           // pure image, no overlay needed for bold
        accentColor: "#ffffff",
        headlineColor: "#ffffff",
        sublineColor: "rgba(255,255,255,0.72)",
        statColor: BRAND.accent,       // gold pops on black
        captionColor: "rgba(255,255,255,0.45)",
        fontHero: Math.round(BRAND.fontHero * 1.1),
        fontHeadline: Math.round(BRAND.fontHeadline * 1.05),
        fontSubline: BRAND.fontSubline,
      };
    default: // cinematic
      return {
        bg: BRAND.bg,
        surface: BRAND.surface,
        overlayOpacity: 0.52,
        accentColor: BRAND.accent,
        headlineColor: BRAND.text,
        sublineColor: BRAND.muted,
        statColor: BRAND.secondary,
        captionColor: BRAND.muted,
        fontHero: BRAND.fontHero,
        fontHeadline: BRAND.fontHeadline,
        fontSubline: BRAND.fontSubline,
      };
  }
}
