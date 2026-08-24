// Colour roles for the campaign email renderer.
//
// WHY ROLES AND NOT A HEX MAP: the literals this replaces are polysemous. The
// cream literal was used as ink (stat values, discount codes, stars, timeline
// labels, checkmarks), as a border, AND as a panel background. The navy literal
// was both the shell background and the ink drawn ON a cream panel. A 1:1
// hex -> token map therefore cannot be written: send the cream literal to a
// panel background and every stat value turns white-on-ivory; send it to ink
// and the ingredients panel turns ivory-on-ivory. Each site had to be
// classified by the job it does.
//
// WHAT THE SNAPSHOT CANNOT TELL YOU: byte-identity on the navy theme holds
// under ANY self-consistent mapping, so the string snapshot proves the refactor
// changed nothing on the default theme, and proves nothing at all about whether
// a role is correct. The cream output needs human eyes per block kind.
import type { CampaignContent } from "./types";

export type CampaignThemeId = "navy" | "cream";

export type CampaignTheme = {
  id: CampaignThemeId;
  /** Page + container background. */
  shell: string;
  /** Body copy on `shell`. */
  text: string;
  /** Accent-coloured copy on `shell` — stat values, codes, stars, labels. */
  inkAccent: string;
  /** Solid accent border on `shell`. */
  accentBorder: string;
  /** Faint accent border on `shell` (the un-emphasised comparison card). */
  accentBorderSoft: string;
  /** Hairline divider on `shell` (between timeline rows). */
  ruleOnShell: string;
  /** Filled panel surface: ingredients panel, promo band, emphasised card. */
  panelBg: string;
  /** Copy on `panelBg`. */
  inkOnPanel: string;
  /** Secondary copy on `panelBg` (the ingredients footnote). */
  mutedOnPanel: string;
  /** Hairline divider on `panelBg` (between ingredient rows). */
  ruleOnPanel: string;
  /** Fill for an image slot with no image yet. */
  placeholder: string;
  /** Top-banner `**mark**` pill. */
  highlight: string;
  highlightText: string;
  /** Gradient scrim under text laid over a photo. Kept dark on BOTH themes:
   *  it sits on the photograph, not on the shell. */
  scrimFrom: string;
  scrimTo: string;
  /** Text over that scrim. Also theme-independent — a photo is dark under the
   *  scrim regardless of the email's background, so flipping these to the
   *  cream theme's dark ink would make the overlay unreadable. */
  onImageAccent: string;
  onImageText: string;
  /** The white strips that frame the Lunia logo asset. Deliberately NOT
   *  themed: the logo needs a white field on both themes. Declared here so
   *  that is a stated decision rather than a stray literal someone "fixes". */
  stripBg: string;
  stripText: string;
  stripRule: string;
};

/** Built from the renderer's own original lowercase literals, NOT from
 *  BRAND_COLORS. `#01253F` and `#01253f` are the same colour and a different
 *  string, and the byte-identity snapshot compares strings. */
export const NAVY_THEME: CampaignTheme = {
  id: "navy",
  shell: "#01253f",
  text: "#ffffff",
  inkAccent: "#f5f5e9",
  accentBorder: "#f5f5e9",
  accentBorderSoft: "rgba(245,245,233,0.3)",
  ruleOnShell: "rgba(245,245,233,0.2)",
  panelBg: "#f5f5e9",
  inkOnPanel: "#01253f",
  mutedOnPanel: "#4d6a7d",
  ruleOnPanel: "#dcd7c6",
  placeholder: "#0c3354",
  highlight: "#ffd800",
  highlightText: "#01253f",
  scrimFrom: "rgba(1,37,63,0)",
  scrimTo: "rgba(1,37,63,0.82)",
  onImageAccent: "#f5f5e9",
  onImageText: "#ffffff",
  stripBg: "#ffffff",
  stripText: "#01253f",
  stripRule: "rgba(0,0,0,0.08)",
};

/** Soft Ivory ground with Rich Navy ink — the treatment the brand handbook
 *  documents for a light email (BRAND_COLORS.softIvory). Chosen over the
 *  renderer's existing #f5f5e9 cream precisely because that value is not in
 *  BRAND_COLORS at all: standardising on it would have added a fourth
 *  competing background to the three TODOS.md:154 already tracks, instead of
 *  resolving one of them. #f5f5e9 stays exactly where it was, as the accent
 *  fill on the navy theme. */
export const CREAM_THEME: CampaignTheme = {
  id: "cream",
  shell: "#F7F4EF",
  text: "#102635",
  inkAccent: "#01253F",
  accentBorder: "#01253F",
  accentBorderSoft: "rgba(1,37,63,0.25)",
  ruleOnShell: "rgba(1,37,63,0.18)",
  panelBg: "#ffffff",
  inkOnPanel: "#01253F",
  mutedOnPanel: "#4d6a7d",
  ruleOnPanel: "#dcd7c6",
  placeholder: "#e5e0d6",
  highlight: "#ffd800",
  highlightText: "#01253F",
  scrimFrom: "rgba(1,37,63,0)",
  scrimTo: "rgba(1,37,63,0.82)",
  onImageAccent: "#f5f5e9",
  onImageText: "#ffffff",
  stripBg: "#ffffff",
  stripText: "#01253F",
  stripRule: "rgba(0,0,0,0.08)",
};

/** Unset resolves to navy, so every campaign saved before themes existed
 *  renders exactly as it did. */
export function resolveTheme(id: CampaignContent["theme"]): CampaignTheme {
  return id === "cream" ? CREAM_THEME : NAVY_THEME;
}

/** CTA colours for a button style under a theme.
 *
 *  On the navy theme this reproduces the shipped behaviour exactly: "cream"
 *  (the default) is a cream pill with navy text, "navy" inverts it.
 *
 *  On the cream theme both options collapse to the handbook treatment, ivory
 *  on Rich Navy, because a cream pill on an ivory ground is invisible. The
 *  editor disables the control and says so rather than silently ignoring the
 *  stored value, and `cta.style` is left untouched so switching back to navy
 *  restores the user's choice. */
export function resolveCta(
  style: "cream" | "navy" | undefined,
  theme: CampaignTheme,
  bgRole?: BrandColorRole,
): { bg: string; fg: string } {
  // An explicit role wins, on BOTH themes. That is the whole point of it: the
  // cream theme used to force navy and the editor disabled the control, so a
  // CTA colour was something you could pick and then watch be ignored.
  //
  // No legibility substitution here, unlike resolveBrandColor: the ink is
  // chosen to suit the ground rather than the ground being overridden, so
  // every role stays available and none of them can be unreadable.
  if (bgRole && bgRole in BRAND_ROLE_HEX) {
    const bg = BRAND_ROLE_HEX[bgRole];
    return { bg, fg: ctaInkFor(bg) };
  }
  // Unset: byte-for-byte the original behaviour, so every campaign saved
  // before roles existed renders exactly as it did.
  if (theme.id === "cream") return { bg: "#01253F", fg: "#F7F4EF" };
  return style === "navy"
    ? { bg: theme.shell, fg: theme.text }
    : { bg: theme.panelBg, fg: theme.inkOnPanel };
}

/** The two brand inks a CTA label can use. */
const CTA_INKS = ["#F7F4EF", "#01253F"] as const;

/** Whichever brand ink reads better on `bg`. The CTA is the one element in the
 *  email that must never be hard to read, so this picks by measured contrast
 *  rather than by a per-role lookup somebody has to keep in step. */
export function ctaInkFor(bg: string): string {
  return contrast(CTA_INKS[0], bg) >= contrast(CTA_INKS[1], bg) ? CTA_INKS[0] : CTA_INKS[1];
}

// ─── Brand colour roles (user-choosable accents) ────────────────────────────
//
// One vocabulary, shared by the bullet-marker colour on `imagebullets` and by
// the inline text-styling tokens. Both persist into the same un-migratable
// Redis blob, so two vocabularies would mean two resolvers and no migration
// path between them.
//
// Roles, never hex. That is what makes an off-brand colour unrepresentable,
// and it is what lets the resolver below rescue a pick that would be
// illegible on the active theme.

export const BRAND_COLOR_ROLES = ["ivory", "aqua", "yellow", "navy", "slate", "muted"] as const;
export type BrandColorRole = (typeof BRAND_COLOR_ROLES)[number];

/** Role → hex. Theme-independent; legibility is handled by the resolver.
 *  Exported so the editor's swatches are the same values the email renders —
 *  a second copy in the editor is a palette that can drift. */
export const BRAND_ROLE_HEX: Record<BrandColorRole, string> = {
  ivory: "#F7F4EF",
  aqua: "#BFFBF8",
  yellow: "#FFD800",
  navy: "#01253F",
  slate: "#2C3F51",
  muted: "#4d6a7d",
};

/** Human labels for the editor swatches. */
export const BRAND_ROLE_LABELS: Record<BrandColorRole, string> = {
  ivory: "Ivory",
  aqua: "Aqua",
  yellow: "Yellow",
  navy: "Navy",
  slate: "Slate",
  muted: "Muted",
};

function channels(hex: string): number[] {
  const h = hex.replace("#", "");
  const parts = h.length === 3 ? h.split("").map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  return parts.map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast ratio between two hex colours, 1 (identical) to 21. */
export function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Minimum contrast a user-chosen accent must clear against the background it
 *  lands on. WCAG AA for large/bold text, which is what these accents are
 *  used for (bullet markers, emphasised words). */
export const MIN_ACCENT_CONTRAST = 3;

/** Resolve a brand colour role against the active theme.
 *
 *  Substitutes the theme's own accent ink when the chosen role would not be
 *  legible on the shell. Checking CONTRAST rather than exact equality matters:
 *  navy-on-navy is caught by either, but slate on the navy shell is a distinct
 *  hex and still unreadable, and only a contrast check catches that. So a
 *  colour picked while on one theme cannot turn into invisible text on the
 *  other. */
export function resolveBrandColor(
  role: BrandColorRole | undefined,
  theme: CampaignTheme,
  fallback?: string,
): string {
  const base = fallback ?? theme.inkAccent;
  if (!role || !(role in BRAND_ROLE_HEX)) return base;
  const hex = BRAND_ROLE_HEX[role];
  return contrast(hex, theme.shell) >= MIN_ACCENT_CONTRAST ? hex : base;
}
