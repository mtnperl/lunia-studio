"use client";

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
