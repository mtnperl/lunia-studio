"use client";

export const BRAND = {
  // Colors
  bg: "#0D0C0A",
  surface: "#171512",
  text: "#EDE8DF",
  muted: "#7A7268",
  accent: "#C8A96E",       // warm gold
  accentDim: "rgba(200,169,110,0.15)",
  border: "#2A2723",

  // Typography sizes (px at 1080w)
  fontDisplay: 96,
  fontHero: 72,
  fontHeadline: 56,
  fontSubline: 32,
  fontStat: 120,
  fontCaption: 22,

  // Spacing
  paddingX: 64,
  paddingY: 80,
} as const;

export type BrandTokens = typeof BRAND;
