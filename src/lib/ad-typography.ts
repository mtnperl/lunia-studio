/**
 * Lunia Ad Typography System — Framework #4
 *
 * Editorial type hierarchy for programmatic canvas composition.
 * Drives AdCompositor.tsx — every font/size/color decision lives here.
 *
 * Brand Color Book (non-negotiable):
 *   Deep Navy   #102635  — primary text, headers
 *   Slate Blue  #2c3f51  — secondary text, captions
 *   Soft Ivory  #F7F4EF  — backgrounds, inverse text
 *   Aqua Accent #bffbf8  — rare highlights (≤10% of any layout)
 *   Signal Yel. #ffd800  — CTAs only
 *
 * Font families (loaded via globals.css Google Fonts CDN):
 *   Display  → Cormorant Garamond (serif) — headlines
 *   Caption  → Inter (sans)              — body / labels / overlay
 *   Tag      → Fira Code (mono)          — compliance / credential tags
 */

// ─── Brand Tokens ─────────────────────────────────────────────────────────────

export const BRAND_COLORS = {
  navy:    "#102635",
  slate:   "#2c3f51",
  ivory:   "#F7F4EF",
  aqua:    "#bffbf8",
  yellow:  "#ffd800",
} as const;

export type BrandColor = keyof typeof BRAND_COLORS;

// ─── Type Families ────────────────────────────────────────────────────────────

export const AD_FONTS = {
  display: "'Cormorant Garamond', Georgia, serif",
  caption: "'Inter', system-ui, sans-serif",
  tag:     "'Fira Code', 'Menlo', monospace",
} as const;

// ─── Canvas Size Specs ────────────────────────────────────────────────────────

export type AdAspectKey = "1:1" | "4:5";

export const CANVAS_DIMS: Record<AdAspectKey, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

// ─── Type Scale (px, both aspect ratios) ─────────────────────────────────────

export type AdTypeScale = {
  headlineSize:   number;   // display serif, weight 300
  headlineLeading: number;  // line-height
  captionSize:    number;   // inter body, weight 400
  captionLeading: number;
  overlaySize:    number;   // overlay call-out, weight 700
  overlayLeading: number;
  tagSize:        number;   // mono credential, weight 400
};

export const TYPE_SCALE: Record<AdAspectKey, AdTypeScale> = {
  "1:1": {
    headlineSize:    80,   // ~7.4% of 1080px — large but not overwhelming
    headlineLeading: 88,
    captionSize:     32,
    captionLeading:  46,
    overlaySize:     48,
    overlayLeading:  56,
    tagSize:         22,
  },
  "4:5": {
    headlineSize:    88,   // slightly larger — more vertical space available
    headlineLeading: 96,
    captionSize:     34,
    captionLeading:  48,
    overlaySize:     52,
    overlayLeading:  62,
    tagSize:         24,
  },
};

// ─── Layout Margins ───────────────────────────────────────────────────────────

export const CANVAS_MARGIN = 72; // px — outer safe zone on all sides

// ─── Typography Layer Specs ───────────────────────────────────────────────────
// These describe how each text element is rendered by AdCompositor.
// Color flips based on backgroundTone (dark vs light).

export type TextLayer = {
  family:      string;
  size:        number;
  leading:     number;
  weight:      300 | 400 | 500 | 600 | 700;
  tracking:    number;           // em — letter-spacing
  colorOnDark: string;           // hex — used when background is dark
  colorOnLight: string;          // hex — used when background is light/ivory
  maxWidthFraction: number;      // fraction of canvas width before wrapping
  textTransform?: "uppercase" | "lowercase" | "none";
};

export function getTypeLayers(aspect: AdAspectKey): Record<"headline" | "caption" | "overlay" | "tag", TextLayer> {
  const scale = TYPE_SCALE[aspect];
  return {
    headline: {
      family:           AD_FONTS.display,
      size:             scale.headlineSize,
      leading:          scale.headlineLeading,
      weight:           300,
      tracking:         -0.02,
      colorOnDark:      BRAND_COLORS.ivory,
      colorOnLight:     BRAND_COLORS.navy,
      maxWidthFraction: 0.72,
      textTransform:    "none",
    },
    caption: {
      family:           AD_FONTS.caption,
      size:             scale.captionSize,
      leading:          scale.captionLeading,
      weight:           400,
      tracking:         0,
      colorOnDark:      "rgba(247,244,239,0.80)",  // ivory 80%
      colorOnLight:     BRAND_COLORS.slate,
      maxWidthFraction: 0.62,
      textTransform:    "none",
    },
    overlay: {
      // The "scroll-stopper" overlay text — big, concise, high-contrast
      family:           AD_FONTS.caption,
      size:             scale.overlaySize,
      leading:          scale.overlayLeading,
      weight:           700,
      tracking:         -0.01,
      colorOnDark:      BRAND_COLORS.ivory,
      colorOnLight:     BRAND_COLORS.navy,
      maxWidthFraction: 0.80,
      textTransform:    "none",
    },
    tag: {
      // Mono credential tag — e.g. "700 STUDIES" / "MELATONIN-FREE"
      family:           AD_FONTS.tag,
      size:             scale.tagSize,
      leading:          scale.tagSize * 1.5,
      weight:           400,
      tracking:         0.08,
      colorOnDark:      BRAND_COLORS.aqua,
      colorOnLight:     BRAND_COLORS.slate,
      maxWidthFraction: 0.5,
      textTransform:    "uppercase",
    },
  };
}

// ─── Accent Element Specs ─────────────────────────────────────────────────────

export type AccentElement = "aqua-rule" | "yellow-dot" | "none";

export const ACCENT_SPECS = {
  "aqua-rule": {
    color:     BRAND_COLORS.aqua,
    thickness: 2,   // px — thin horizontal rule above headline
    width:     120, // px — short, editorial
  },
  "yellow-dot": {
    color:  BRAND_COLORS.yellow,
    radius: 6,  // px — small filled circle, used as punctuation
  },
  "none": null,
} as const;

// ─── Logo Placement ───────────────────────────────────────────────────────────

export const LOGO_SPEC = {
  anchor:        "top-right" as const,
  heightFraction: 0.065,    // logo height = 6.5% of canvas height
  margin:        CANVAS_MARGIN,
} as const;

// ─── Background Tone → CSS/Canvas colors ─────────────────────────────────────

export type BackgroundTone = "dark-navy" | "soft-ivory" | "mid-slate";

export const BG_TONE_COLORS: Record<BackgroundTone, string> = {
  "dark-navy":  BRAND_COLORS.navy,
  "soft-ivory": BRAND_COLORS.ivory,
  "mid-slate":  BRAND_COLORS.slate,
};

export function isDarkTone(tone: BackgroundTone): boolean {
  return tone === "dark-navy" || tone === "mid-slate";
}
